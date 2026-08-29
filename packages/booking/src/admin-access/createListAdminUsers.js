/**
 * List every current Admin User for one Active Admin actor.
 *
 * @param {object} capabilities Guarded Admin User read capabilities.
 * @returns {(input: object) => Promise<object>} Current directory operation.
 */
export function createListAdminUsers({ listCurrentAdminUsers }) {
  return async function listAdminUsers({ adminUser }) {
    if (adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    const adminUsers = await listCurrentAdminUsers(adminUser.id);

    return Array.isArray(adminUsers)
      ? { outcome: "listed", adminUsers }
      : { outcome: adminUsers };
  };
}
