import { getModuleSelectionRefusal } from "./getModuleSelectionRefusal.js";

/**
 * Create Participant Selection set/change from narrow persistence capabilities.
 *
 * @param {object} capabilities Selection capabilities.
 * @param {() => string} capabilities.createModuleSelectionId Create stable identity.
 * @param {() => string} capabilities.now Read the definite current instant.
 * @param {(input: object) => Promise<object>} capabilities.setParticipantModuleSelection Persist one guarded current choice.
 * @returns {(input: object) => Promise<object>} Participant set/change operation.
 */
export function createSetParticipantModuleSelection({
  createModuleSelectionId,
  now,
  setParticipantModuleSelection: persistParticipantModuleSelection,
}) {
  return async function setParticipantModuleSelection(input) {
    const currentInstant = now();
    const refusal = getModuleSelectionRefusal(
      { ...input, now: currentInstant },
      "set",
    );

    if (refusal !== null) {
      return { outcome: refusal };
    }

    const selection = {
      id: createModuleSelectionId(),
      participantId: input.participant.id,
      courseId: input.course.id,
      moduleId: input.module.id,
      groupId: input.group.id,
    };

    return persistParticipantModuleSelection({
      selection,
      nowEpoch: Date.parse(currentInstant),
    });
  };
}
