/**
 * Derive lifecycle commands one current Admin may perform on another.
 *
 * @param {object} input Current actor and target Admin Users.
 * @returns {object} Permitted commands and any stable presentation restriction.
 */
export function deriveAdminUserLifecycleActions({
  adminUser,
  targetAdminUser,
}) {
  const isActiveActor = adminUser?.state === "active";
  const isSelf =
    adminUser !== null &&
    adminUser !== undefined &&
    targetAdminUser !== null &&
    targetAdminUser !== undefined &&
    adminUser.id === targetAdminUser.id;
  const isProtectedSuperAdmin =
    adminUser?.authority !== "super-admin" &&
    targetAdminUser?.authority === "super-admin";
  const isManageable =
    isActiveActor &&
    targetAdminUser !== null &&
    targetAdminUser !== undefined &&
    !isSelf &&
    !isProtectedSuperAdmin;

  return {
    canDisable: isManageable && targetAdminUser.state === "active",
    canReenable: isManageable && targetAdminUser.state === "disabled",
    canDelete: isManageable,
    restriction: isSelf
      ? "self-protected"
      : isProtectedSuperAdmin
        ? "super-admin-protected"
        : null,
  };
}

/** @returns {string | null} Exact pre-persistence lifecycle refusal. */
export function adminUserLifecycleRefusal(input, action) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.targetAdminUser === null) return "admin-user-not-found";

  const actions = deriveAdminUserLifecycleActions(input);

  if (actions.restriction === "self-protected") {
    return "admin-user-self-protected";
  }

  if (actions.restriction === "super-admin-protected") {
    return "admin-user-not-manageable";
  }

  if (action === "disable" && !actions.canDisable) {
    return "admin-user-not-active";
  }

  if (action === "re-enable" && !actions.canReenable) {
    return "admin-user-not-disabled";
  }

  return action === "delete" && !actions.canDelete
    ? "admin-user-not-manageable"
    : null;
}
