import { getModuleSelectionRefusal } from "./getModuleSelectionRefusal.js";

/**
 * Create Participant Selection removal from narrow persistence capabilities.
 *
 * @param {object} capabilities Selection capabilities.
 * @param {() => string} capabilities.now Read the definite current instant.
 * @param {(input: object) => Promise<object>} capabilities.removeParticipantModuleSelection Persist one guarded absence.
 * @returns {(input: object) => Promise<object>} Participant removal operation.
 */
export function createRemoveParticipantModuleSelection({
  now,
  removeParticipantModuleSelection: persistParticipantModuleSelectionRemoval,
}) {
  return async function removeParticipantModuleSelection(input) {
    const currentInstant = now();
    const refusal = getModuleSelectionRefusal(
      { ...input, now: currentInstant },
      "remove",
    );

    if (refusal !== null) {
      return { outcome: refusal };
    }

    return persistParticipantModuleSelectionRemoval({
      participantId: input.participant.id,
      courseId: input.course.id,
      moduleId: input.module.id,
      nowEpoch: Date.parse(currentInstant),
    });
  };
}
