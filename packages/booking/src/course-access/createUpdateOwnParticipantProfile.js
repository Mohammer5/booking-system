import { getParticipantProfileInput } from "./getParticipantProfileInput.js";

/**
 * Create Active Participant self-service profile editing.
 *
 * @param {object} capabilities Guarded Participant profile persistence.
 * @returns {(input: object) => Promise<object>} Profile update operation.
 */
export function createUpdateOwnParticipantProfile({
  updateActiveParticipantProfile,
}) {
  return async function updateOwnParticipantProfile(input) {
    if (input.participant?.state !== "active") {
      return { outcome: "participant-not-active" };
    }

    const profileInput = getParticipantProfileInput(input);

    if (profileInput.outcome !== "valid-profile") {
      return profileInput;
    }

    const result = await updateActiveParticipantProfile({
      participantId: input.participant.id,
      profile: profileInput.profile,
    });

    return result.outcome === "updated"
      ? {
          outcome: "updated",
          participant: {
            ...input.participant,
            name: profileInput.profile.name,
            email: profileInput.profile.email,
          },
        }
      : result;
  };
}
