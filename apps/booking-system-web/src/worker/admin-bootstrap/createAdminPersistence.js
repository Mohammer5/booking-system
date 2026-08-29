import { createAdminUserLifecyclePersistence } from "./createAdminUserLifecyclePersistence.js";

/**
 * Create the narrow D1 capabilities owned by Admin User identity management.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Booking-facing persistence capabilities.
 */
export function createAdminPersistence(database) {
  return {
    ...createAdminUserLifecyclePersistence(database),
    findAdminUserById: (adminUserId) =>
      findAdminUserById(database, adminUserId),

    hasAdminUserEverBeenCreated: () => hasAdminUserEverBeenCreated(database),
    findAdminUserByExternalPrincipalId: (externalPrincipalId) =>
      findAdminUserByExternalPrincipalId(database, externalPrincipalId),

    listCurrentAdminUsers: (adminUserId) =>
      listCurrentAdminUsers(database, adminUserId),
    promoteAuthorizedAdminUser: (input) =>
      promoteAuthorizedAdminUser(database, input),
    updateAuthorizedAdminUserName: (input) =>
      updateAuthorizedAdminUserName(database, input),

    async claimFirstAdmin(candidateAdminUser) {
      try {
        await database.batch([
          database
            .prepare(
              `insert into admin_users
                 (id, external_principal_id, name, state, authority)
               values (?, ?, ?, ?, ?)`,
            )
            .bind(
              candidateAdminUser.id,
              candidateAdminUser.externalPrincipalId,
              candidateAdminUser.name,
              candidateAdminUser.state,
              candidateAdminUser.authority,
            ),
          database
            .prepare(
              `insert into admin_bootstrap_history
                 (singleton, first_admin_user_id, completed_at)
               values (1, ?, unixepoch())`,
            )
            .bind(candidateAdminUser.id),
        ]);

        return "created";
      } catch (error) {
        const history = await database
          .prepare(
            "select singleton from admin_bootstrap_history where singleton = 1",
          )
          .first();

        if (history !== null) {
          return "bootstrap-unavailable";
        }

        throw error;
      }
    },
  };
}

/** @returns {Promise<boolean>} Whether permanent first-Admin history exists. */
async function hasAdminUserEverBeenCreated(database) {
  const history = await database
    .prepare(
      "select singleton from admin_bootstrap_history where singleton = 1",
    )
    .first();

  return history !== null;
}

/** @returns {Promise<object | null>} One current Admin by external principal. */
async function findAdminUserByExternalPrincipalId(
  database,
  externalPrincipalId,
) {
  const row = await database
    .prepare(
      `select id, external_principal_id, name, state, authority
         from admin_users
        where external_principal_id = ?`,
    )
    .bind(externalPrincipalId)
    .first();

  return row === null ? null : mapAdminUser(row);
}

/** @returns {Promise<object | null>} One current Admin by domain identity. */
async function findAdminUserById(database, adminUserId) {
  const row = await database
    .prepare(
      `select id, external_principal_id, name, state, authority
         from admin_users
        where id = ?`,
    )
    .bind(adminUserId)
    .first();

  return row === null ? null : mapAdminUser(row);
}

/** @returns {Promise<Array<object> | string>} Guarded current Admin directory. */
async function listCurrentAdminUsers(database, adminUserId) {
  const [actorResult, directoryResult] = await database.batch([
    database
      .prepare("select id from admin_users where id = ? and state = 'active'")
      .bind(adminUserId),
    database.prepare(
      `select id, external_principal_id, name, state, authority
         from admin_users
        order by name collate nocase, id`,
    ),
  ]);

  return actorResult.results.length === 0
    ? "admin-not-active"
    : directoryResult.results.map(mapAdminUser);
}

/** @returns {Promise<string>} Guarded one-way Admin User promotion. */
async function promoteAuthorizedAdminUser(database, input) {
  const result = await database
    .prepare(
      `update admin_users
          set authority = 'super-admin'
        where id = ?
          and id <> ?
          and state = 'active'
          and authority = 'admin'
          and exists (
            select 1 from admin_users actor
             where actor.id = ?
               and actor.state = 'active'
               and actor.authority = 'super-admin'
          )`,
    )
    .bind(
      input.targetAdminUserId,
      input.adminUserId,
      input.adminUserId,
    )
    .run();

  return result.meta.changes === 1
    ? "promoted"
    : classifyAdminUserPromotionRefusal(database, input);
}

/** @returns {Promise<string>} Exact stale actor or target promotion refusal. */
async function classifyAdminUserPromotionRefusal(database, input) {
  const [adminUser, targetAdminUser] = await loadAdminUserPair(database, input);

  if (adminUser?.state !== "active") {
    return "admin-not-active";
  }

  if (targetAdminUser === null) {
    return "admin-user-not-found";
  }

  const isPromotable =
    adminUser.authority === "super-admin" &&
    targetAdminUser.state === "active" &&
    targetAdminUser.authority === "admin" &&
    adminUser.id !== targetAdminUser.id;

  return isPromotable
    ? "admin-user-not-promoted"
    : "admin-user-not-promotable";
}

/** @returns {Promise<string>} Guarded name-only Admin User update. */
async function updateAuthorizedAdminUserName(database, input) {
  const result = await database
    .prepare(
      `update admin_users
          set name = ?
        where id = ?
          and exists (
            select 1 from admin_users actor
             where actor.id = ? and actor.state = 'active'
               and (
                 actor.id = admin_users.id
                 or actor.authority = 'super-admin'
                 or admin_users.authority = 'admin'
               )
          )`,
    )
    .bind(input.name, input.targetAdminUserId, input.adminUserId)
    .run();

  return result.meta.changes === 1
    ? "updated"
    : classifyAdminUserNameRefusal(database, input);
}

/** @returns {Promise<string>} Exact stale actor or target edit refusal. */
async function classifyAdminUserNameRefusal(database, input) {
  const [adminUser, targetAdminUser] = await loadAdminUserPair(database, input);

  if (adminUser?.state !== "active") {
    return "admin-not-active";
  }

  if (targetAdminUser === null) {
    return "admin-user-not-found";
  }

  const isAuthorized =
    adminUser.id === targetAdminUser.id ||
    adminUser.authority === "super-admin" ||
    targetAdminUser.authority === "admin";

  return isAuthorized
    ? "admin-user-not-updated"
    : "admin-user-not-editable";
}

/** @returns {Promise<Array<object | null>>} Current actor and target rows. */
function loadAdminUserPair(database, input) {
  return Promise.all([
    database
      .prepare("select id, state, authority from admin_users where id = ?")
      .bind(input.adminUserId)
      .first(),
    database
      .prepare("select id, state, authority from admin_users where id = ?")
      .bind(input.targetAdminUserId)
      .first(),
  ]);
}

/**
 * Translate one technical persistence row to booking-domain plain data.
 *
 * @param {object} row A D1 Admin row.
 * @returns {object} The booking-domain Admin User representation.
 */
function mapAdminUser(row) {
  return {
    id: row.id,
    externalPrincipalId: row.external_principal_id,
    name: row.name,
    state: row.state,
    authority: row.authority,
  };
}
