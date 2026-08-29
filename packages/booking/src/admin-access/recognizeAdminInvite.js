/**
 * Reveal only whether one Admin Invite can begin onboarding.
 *
 * @param {object | null} invite Current non-secret Admin Invite state.
 * @returns {object} Available or one privacy-preserving unavailable result.
 */
export function recognizeAdminInvite(invite) {
  return invite?.state === "active"
    ? { outcome: "available" }
    : { outcome: "invite-unavailable" };
}
