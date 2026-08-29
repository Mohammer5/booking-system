/**
 * Resolve one Admin-assisted Selection refusal from current domain state.
 *
 * @param {object} input Current actor, target, structure, and definite time.
 * @param {"set" | "remove"} action Selection mutation kind.
 * @returns {string | null} Language-neutral refusal or null when eligible.
 */
export function getAdminAssistedModuleSelectionRefusal(input, action) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.participant?.state !== "active") return "participant-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (!isSelectableModule(input)) return "module-not-selectable";
  if (!isBeforeModuleStart(input.now, input.module.startsAt)) {
    return "selection-deadline-reached";
  }

  if (action === "set" && !isAssignableMembership(input)) {
    return "assignment-not-assignable";
  }

  if (action === "set" && !isSelectableGroup(input)) {
    return "group-not-selectable";
  }

  return isCurrentSelectionOwned(input) ? null : "selection-not-current";
}

/** @returns {boolean} Whether an optional retained Assignment has exact owners. */
function isAssignableMembership({ assignment, participant, course }) {
  return assignment === null || (
    new Set(["active", "revoked"]).has(assignment?.state) &&
    assignment.participantId === participant.id &&
    assignment.courseId === course.id
  );
}

/** @returns {boolean} Whether an optional Selection has exact owners. */
function isCurrentSelectionOwned({ selection, participant, course, module }) {
  return selection === undefined || selection === null || (
    selection.participantId === participant.id &&
    selection.courseId === course.id &&
    selection.moduleId === module.id
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
