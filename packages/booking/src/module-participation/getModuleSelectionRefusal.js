/**
 * Resolve the first current-state refusal for one Participant Selection action.
 *
 * @param {object} input Current Participant, membership, structure, and time.
 * @param {"set" | "remove"} action Selection mutation kind.
 * @returns {string | null} Language-neutral refusal or null when eligible.
 */
export function getModuleSelectionRefusal(input, action) {
  if (input.participant?.state !== "active") {
    return "participant-not-active";
  }

  if (input.course?.state !== "active") {
    return "course-not-active";
  }

  if (!hasActiveMatchingAssignment(input)) {
    return "assignment-not-active";
  }

  if (!isSelectableModule(input)) {
    return "module-not-selectable";
  }

  if (!isBeforeModuleStart(input.now, input.module.startsAt)) {
    return "selection-deadline-reached";
  }

  return action === "set" && !isSelectableGroup(input)
    ? "group-not-selectable"
    : null;
}

/** @returns {boolean} Whether membership is Active and matches both owners. */
function hasActiveMatchingAssignment({ participant, assignment, course }) {
  return (
    assignment?.state === "active" &&
    assignment.participantId === participant.id &&
    assignment.courseId === course.id
  );
}

/** @returns {boolean} Whether the Module is Scheduled in the current Course. */
function isSelectableModule({ module, course }) {
  return module?.state === "scheduled" && module.courseId === course.id;
}

/** @returns {boolean} Whether the Group is Active in the current Course. */
function isSelectableGroup({ group, course }) {
  return group?.state === "active" && group.courseId === course.id;
}

/** @returns {boolean} Whether two definite instants preserve the deadline. */
function isBeforeModuleStart(now, startsAt) {
  const currentEpoch = Date.parse(now);
  const startsAtEpoch = Date.parse(startsAt);

  return (
    Number.isFinite(currentEpoch) &&
    Number.isFinite(startsAtEpoch) &&
    currentEpoch < startsAtEpoch
  );
}
