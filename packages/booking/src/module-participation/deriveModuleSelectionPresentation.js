/**
 * Derive current Selection meaning from authoritative surrounding state.
 *
 * @param {object} input Current Selection and surrounding state.
 * @returns {object | null} Selection with derived meaning, or no Selection.
 */
export function deriveModuleSelectionPresentation(input) {
  if (input.selection === null) {
    return null;
  }

  const isLive = isModuleSelectionLive(input);

  return {
    ...input.selection,
    meaning: isLive ? "live" : "historical",
    phase: isLive
      ? Date.parse(input.now) < Date.parse(input.module.startsAt)
        ? "upcoming"
        : "in-progress"
      : "historical",
  };
}

/** @returns {boolean} Whether one retained Selection currently represents live intent. */
function isModuleSelectionLive(input) {
  const currentEpoch = Date.parse(input.now);
  const endsAtEpoch = Date.parse(input.module?.endsAt);

  return (
    Number.isFinite(currentEpoch) &&
    Number.isFinite(endsAtEpoch) &&
    input.participant?.state === "active" &&
    input.course?.state === "active" &&
    input.assignment?.state === "active" &&
    input.assignment.participantId === input.participant.id &&
    input.assignment.courseId === input.course.id &&
    input.module?.state === "scheduled" &&
    input.module.courseId === input.course.id &&
    input.selection.participantId === input.participant.id &&
    input.selection.courseId === input.course.id &&
    input.selection.moduleId === input.module.id &&
    currentEpoch < endsAtEpoch
  );
}
