/**
 * Create reversible Group archival with one injected definite instant.
 *
 * @param {object} capabilities Group archival capabilities.
 * @param {() => string} capabilities.now Read the definite current instant.
 * @param {(input: object) => Promise<string>} capabilities.archiveActiveGroup Persist one guarded Active-to-Archived transition.
 * @returns {(input: object) => Promise<object>} Group archival operation.
 */
export function createArchiveGroup({ now, archiveActiveGroup }) {
  return async function archiveGroup(input) {
    const refusal = validateArchivalInput(input);

    if (refusal !== null) return { outcome: refusal };

    const nowEpoch = Date.parse(now());

    if (isGroupArchivalBlocked(input.selectionContexts, nowEpoch)) {
      return { outcome: "group-archival-blocked" };
    }

    const persistenceOutcome = await archiveActiveGroup({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      groupId: input.group.id,
      nowEpoch,
    });

    return persistenceOutcome === "archived"
      ? {
          outcome: "archived",
          group: { ...input.group, state: "archived" },
        }
      : { outcome: persistenceOutcome };
  };
}

/**
 * Determine whether retained future booking intent blocks Group archival.
 *
 * @param {Array<object>} selectionContexts Retained Selection Module contexts.
 * @param {number} nowEpoch Definite current epoch milliseconds.
 * @returns {boolean} Whether an upcoming Scheduled Selection exists.
 */
export function isGroupArchivalBlocked(selectionContexts, nowEpoch) {
  return selectionContexts.some(
    ({ moduleState, startsAt }) =>
      moduleState === "scheduled" && Date.parse(startsAt) > nowEpoch,
  );
}

/** @returns {string | null} First Group archival refusal or null. */
function validateArchivalInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (
    input.group?.state !== "active" ||
    input.group.courseId !== input.course.id
  ) {
    return "group-not-active";
  }
  return Array.isArray(input.selectionContexts) ? null : "group-not-active";
}
