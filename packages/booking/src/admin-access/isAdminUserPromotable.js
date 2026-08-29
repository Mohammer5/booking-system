/**
 * Decide whether one current Admin may promote another current Admin.
 *
 * @param {object} input Current actor and target Admin Users.
 * @returns {boolean} Whether promotion is currently authorized.
 */
export function isAdminUserPromotable({ adminUser, targetAdminUser }) {
  return (
    adminUser?.state === "active" &&
    adminUser.authority === "super-admin" &&
    targetAdminUser?.state === "active" &&
    targetAdminUser.authority === "admin" &&
    adminUser.id !== targetAdminUser.id
  );
}
