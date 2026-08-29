/**
 * Create invited Admin onboarding from narrow identity and claim capabilities.
 *
 * @param {object} capabilities Identity generation and atomic claim capability.
 * @returns {(input: object) => Promise<object>} Invited Admin onboarding operation.
 */
export function createClaimAdminInvite(capabilities) {
  return async function claimAdminInvite(input) {
    if (!isValidAdminName(input.name)) {
      return { outcome: "invalid-name" };
    }

    if (input.currentAdminUser !== null) {
      return { outcome: "admin-user-already-exists" };
    }

    if (input.invite?.state !== "active") {
      return { outcome: "invite-unavailable" };
    }

    const adminUser = {
      id: capabilities.createAdminUserId(),
      externalPrincipalId: input.externalPrincipalId,
      name: input.name,
      state: "active",
      authority: "admin",
    };
    const outcome = await capabilities.claimActiveAdminInvite({
      inviteId: input.invite.id,
      adminUser,
    });

    if (outcome === "claimed") {
      return { outcome: "created", adminUser };
    }

    return {
      outcome: outcome === "admin-user-already-exists"
        ? outcome
        : "invite-unavailable",
    };
  };
}

/** @returns {boolean} Whether one explicit booking-system name is valid. */
function isValidAdminName(name) {
  return typeof name === "string" && name.trim().length > 0;
}
