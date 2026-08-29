/**
 * Decide whether one current Admin may edit another current Admin's name.
 *
 * @param {object} input Current actor and target Admin Users.
 * @returns {boolean} Whether name editing is currently authorized.
 */
export function isAdminUserNameEditable({ adminUser, targetAdminUser }) {
  if (
    adminUser?.state !== "active" ||
    !new Set(["active", "disabled"]).has(targetAdminUser?.state)
  ) {
    return false;
  }

  if (adminUser.id === targetAdminUser.id) {
    return true;
  }

  return (
    adminUser.authority === "super-admin" ||
    (adminUser.authority === "admin" && targetAdminUser.authority === "admin")
  );
}
