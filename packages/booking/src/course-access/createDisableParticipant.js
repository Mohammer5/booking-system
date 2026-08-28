/**
 * Create Active-Admin Participant Disable from narrow current-state capabilities.
 *
 * @param {object} capabilities Participant Disable capabilities.
 * @param {() => string} capabilities.now Read the definite current instant.
 * @param {(input: object) => Promise<object>} capabilities.disableActiveParticipant Persist one atomic global lifecycle outcome.
 * @returns {(input: {adminUser: object, participant: object}) => Promise<object>} Participant Disable operation.
 */
export function createDisableParticipant({
  now,
  disableActiveParticipant,
}) {
  return async function disableParticipant({ adminUser, participant }) {
    if (adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (participant?.state !== "active") {
      return { outcome: "participant-not-active" };
    }

    const result = await disableActiveParticipant({
      adminUserId: adminUser.id,
      participantId: participant.id,
      nowEpoch: Date.parse(now()),
    });

    return result.outcome === "disabled"
      ? {
          outcome: "disabled",
          participant: { ...participant, state: "disabled" },
          removedSelectionCount: result.removedSelectionCount,
        }
      : result;
  };
}
