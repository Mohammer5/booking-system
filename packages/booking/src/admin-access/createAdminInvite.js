/**
 * Create one independently Active Admin Invite.
 *
 * @param {object} capabilities Identity, secret, time, and persistence capabilities.
 * @returns {(input: object) => Promise<object>} Admin Invite creation operation.
 */
export function createAdminInvite(capabilities) {
  return async function createActiveAdminInvite(input) {
    if (input.adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    const token = capabilities.createAdminInviteToken();
    const invite = {
      id: capabilities.createAdminInviteId(),
      createdAt: capabilities.now(),
      createdByAdminUserId: input.adminUser.id,
      state: "active",
      tokenDigest: await capabilities.hashAdminInviteToken(token),
    };
    const outcome = await capabilities.createActiveAdminInvite(invite);

    return outcome === "created"
      ? {
          outcome,
          invite: {
            id: invite.id,
            createdAt: invite.createdAt,
            state: invite.state,
            token,
          },
        }
      : { outcome };
  };
}
