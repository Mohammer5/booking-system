import { getAdminAssistedModuleSelectionRefusal } from "./getAdminAssistedModuleSelectionRefusal.js";

/**
 * Create an Admin-assisted Selection set operation with atomic membership input.
 *
 * @param {object} capabilities Identity, time, and guarded persistence.
 * @returns {(input: object) => Promise<object>} Admin-assisted set operation.
 */
export function createSetParticipantModuleSelectionAsAdmin(capabilities) {
  return async function setParticipantModuleSelectionAsAdmin(input) {
    const currentInstant = capabilities.now();
    const refusal = getAdminAssistedModuleSelectionRefusal(
      { ...input, now: currentInstant },
      "set",
    );

    if (refusal !== null) return { outcome: refusal };

    const assignment = input.assignment ?? {
      id: capabilities.createCourseAssignmentId(),
      participantId: input.participant.id,
      courseId: input.course.id,
      state: "active",
    };
    const selection = input.selection ?? {
      id: capabilities.createModuleSelectionId(),
      participantId: input.participant.id,
      courseId: input.course.id,
      moduleId: input.module.id,
      groupId: input.group.id,
    };

    return capabilities.setParticipantModuleSelectionAsAdmin({
      adminUserId: input.adminUser.id,
      assignment: { ...assignment, state: "active" },
      selection: { ...selection, groupId: input.group.id },
      nowEpoch: Date.parse(currentInstant),
    });
  };
}
