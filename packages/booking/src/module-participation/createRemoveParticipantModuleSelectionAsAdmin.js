import { getAdminAssistedModuleSelectionRefusal } from "./getAdminAssistedModuleSelectionRefusal.js";

/**
 * Create an Admin-assisted Selection removal without membership composition.
 *
 * @param {object} capabilities Time and guarded removal persistence.
 * @returns {(input: object) => Promise<object>} Admin-assisted remove operation.
 */
export function createRemoveParticipantModuleSelectionAsAdmin(capabilities) {
  return async function removeParticipantModuleSelectionAsAdmin(input) {
    const currentInstant = capabilities.now();
    const refusal = getAdminAssistedModuleSelectionRefusal(
      { ...input, now: currentInstant },
      "remove",
    );

    if (refusal !== null) return { outcome: refusal };

    return capabilities.removeParticipantModuleSelectionAsAdmin({
      adminUserId: input.adminUser.id,
      participantId: input.participant.id,
      courseId: input.course.id,
      moduleId: input.module.id,
      nowEpoch: Date.parse(currentInstant),
    });
  };
}
