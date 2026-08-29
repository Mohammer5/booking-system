/**
 * List non-secret Admin Invite metadata for one Active Admin.
 *
 * @param {object} capabilities Admin Invite read capabilities.
 * @returns {(input: object) => Promise<object>} Admin Invite list operation.
 */
export function createListAdminInvites(capabilities) {
  return async function listAdminInvites(input) {
    if (input.adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    const invites = await capabilities.listAdminInvites(input.adminUser.id);

    return Array.isArray(invites)
      ? { outcome: "listed", invites }
      : { outcome: invites };
  };
}
