/**
 * Create Active-Admin Participant Re-enable from narrow current-state capabilities.
 *
 * @param {object} capabilities Participant Re-enable capabilities.
 * @param {(input: object) => Promise<object>} capabilities.reenableDisabledParticipant Persist one retained-identity transition.
 * @returns {(input: {adminUser: object, participant: object}) => Promise<object>} Participant Re-enable operation.
 */
export function createReenableParticipant({ reenableDisabledParticipant }) {
  return async function reenableParticipant({ adminUser, participant }) {
    if (adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (participant?.state !== "disabled") {
      return { outcome: "participant-not-disabled" };
    }

    const result = await reenableDisabledParticipant({
      adminUserId: adminUser.id,
      participantId: participant.id,
    });

    return result.outcome === "re-enabled"
      ? {
          outcome: "re-enabled",
          participant: { ...participant, state: "active" },
        }
      : result;
  };
}
