/**
 * Revoke one Active Admin Invite without any reactivation path.
 *
 * @param {object} capabilities Guarded Admin Invite persistence capabilities.
 * @returns {(input: object) => Promise<object>} Admin Invite Revoke operation.
 */
export function createRevokeAdminInvite(capabilities) {
  return async function revokeAdminInvite(input) {
    if (input.adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (input.invite === null) {
      return { outcome: "admin-invite-not-found" };
    }

    if (input.invite.state !== "active") {
      return { outcome: "admin-invite-not-active" };
    }

    const outcome = await capabilities.revokeActiveAdminInvite({
      adminUserId: input.adminUser.id,
      inviteId: input.invite.id,
    });

    return outcome === "revoked"
      ? { outcome, invite: { ...input.invite, state: "revoked" } }
      : { outcome };
  };
}
