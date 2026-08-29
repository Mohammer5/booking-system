/**
 * Create guarded D1 capabilities for current Admin User lifecycle commands.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Disable, Re-enable, and delete persistence capabilities.
 */
export function createAdminUserLifecyclePersistence(database) {
  return {
    disableAuthorizedAdminUser: (input) =>
      changeAuthorizedAdminUserState(database, input, "disable"),
    reenableAuthorizedAdminUser: (input) =>
      changeAuthorizedAdminUserState(database, input, "re-enable"),
    deleteAuthorizedAdminUser: (input) =>
      deleteAuthorizedAdminUser(database, input),
  };
}

/** @returns {Promise<string>} Guarded state transition or exact refusal. */
async function changeAuthorizedAdminUserState(database, input, action) {
  const isDisable = action === "disable";
  const result = await database
    .prepare(
      `update admin_users
          set state = ?
        where id = ?
          and state = ?
          and exists (
            select 1 from admin_users actor
             where actor.id = ?
               and actor.state = 'active'
               and actor.id <> admin_users.id
               and (
                 actor.authority = 'super-admin'
                 or admin_users.authority = 'admin'
               )
          )
          and (
            ? = 're-enable'
            or exists (
              select 1 from admin_users active_super
               where active_super.state = 'active'
                 and active_super.authority = 'super-admin'
                 and (
                   admin_users.authority <> 'super-admin'
                   or active_super.id <> admin_users.id
                 )
            )
          )`,
    )
    .bind(
      isDisable ? "disabled" : "active",
      input.targetAdminUserId,
      isDisable ? "active" : "disabled",
      input.adminUserId,
      action,
    )
    .run();

  if (result.meta.changes === 1) {
    return isDisable ? "disabled" : "re-enabled";
  }

  return classifyAdminUserLifecycleRefusal(database, input, action);
}

/** @returns {Promise<string>} Guarded current Admin identity deletion. */
async function deleteAuthorizedAdminUser(database, input) {
  const result = await database
    .prepare(
      `delete from admin_users
        where id = ?
          and exists (
            select 1 from admin_users actor
             where actor.id = ?
               and actor.state = 'active'
               and actor.id <> admin_users.id
               and (
                 actor.authority = 'super-admin'
                 or admin_users.authority = 'admin'
               )
          )
          and exists (
            select 1 from admin_users active_super
             where active_super.state = 'active'
               and active_super.authority = 'super-admin'
               and (
                 admin_users.state <> 'active'
                 or admin_users.authority <> 'super-admin'
                 or active_super.id <> admin_users.id
               )
          )`,
    )
    .bind(input.targetAdminUserId, input.adminUserId)
    .run();

  return result.meta.changes === 1
    ? "deleted"
    : classifyAdminUserLifecycleRefusal(database, input, "delete");
}

/** @returns {Promise<string>} Current actor, target, invariant, or stale result. */
async function classifyAdminUserLifecycleRefusal(database, input, action) {
  const [adminUser, targetAdminUser, activeSuperAdminCount] = await Promise.all([
    database
      .prepare("select id, state, authority from admin_users where id = ?")
      .bind(input.adminUserId)
      .first(),
    database
      .prepare("select id, state, authority from admin_users where id = ?")
      .bind(input.targetAdminUserId)
      .first(),
    database
      .prepare(
        `select count(*) as count from admin_users
          where state = 'active' and authority = 'super-admin'`,
      )
      .first("count"),
  ]);

  if (adminUser?.state !== "active") return "admin-not-active";
  if (targetAdminUser === null) return "admin-user-not-found";

  if (adminUser.id === targetAdminUser.id) {
    return "admin-user-self-protected";
  }

  if (
    adminUser.authority !== "super-admin" &&
    targetAdminUser.authority === "super-admin"
  ) {
    return "admin-user-not-manageable";
  }

  if (action === "disable" && targetAdminUser.state !== "active") {
    return "admin-user-not-active";
  }

  if (action === "re-enable" && targetAdminUser.state !== "disabled") {
    return "admin-user-not-disabled";
  }

  const removesActiveSuperAdmin =
    targetAdminUser.state === "active" &&
    targetAdminUser.authority === "super-admin";

  if (
    action !== "re-enable" &&
    (activeSuperAdminCount === 0 ||
      (removesActiveSuperAdmin && activeSuperAdminCount === 1))
  ) {
    return "admin-user-last-active-super";
  }

  return {
    disable: "admin-user-not-disabled",
    "re-enable": "admin-user-not-re-enabled",
    delete: "admin-user-not-deleted",
  }[action];
}
