import { getParticipantProfileInput } from "./getParticipantProfileInput.js";

/**
 * Create Active-Admin editing of one registered Participant profile.
 *
 * @param {object} capabilities Guarded Admin profile-edit persistence.
 * @returns {(input: object) => Promise<object>} Profile update operation.
 */
export function createUpdateParticipantProfileAsAdmin({
  updateParticipantProfileAsActiveAdmin,
}) {
  return async function updateParticipantProfileAsAdmin(input) {
    if (input.adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (!new Set(["active", "disabled"]).has(input.participant?.state)) {
      return { outcome: "participant-not-editable" };
    }

    const profileInput = getParticipantProfileInput(input);

    if (profileInput.outcome !== "valid-profile") {
      return profileInput;
    }

    const result = await updateParticipantProfileAsActiveAdmin({
      adminUserId: input.adminUser.id,
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
