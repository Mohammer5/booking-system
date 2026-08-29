/**
 * Create terminal Course archival from one authoritative definite instant.
 *
 * @param {object} capabilities Course archival capabilities.
 * @param {() => string} capabilities.now Read the current definite instant.
 * @param {(input: object) => Promise<string>} capabilities.archiveActiveCourse Persist one guarded transition.
 * @returns {(input: object) => Promise<object>} Course archival operation.
 */
export function createArchiveCourse({ now, archiveActiveCourse }) {
  return async function archiveCourse(input) {
    const refusal = validateArchiveInput(input);

    if (refusal !== null) return { outcome: refusal };

    const nowEpoch = Date.parse(now());

    if (!Number.isFinite(nowEpoch)) {
      return { outcome: "course-not-archivable" };
    }

    if (hasUnresolvedScheduledModule(input.modules, nowEpoch)) {
      return { outcome: "course-archival-blocked" };
    }

    const persistenceOutcome = await archiveActiveCourse({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      nowEpoch,
    });

    return persistenceOutcome === "archived"
      ? {
          outcome: "archived",
          course: { ...input.course, state: "archived" },
        }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First Course archival refusal or null. */
function validateArchiveInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";

  return Array.isArray(input.modules) && input.modules.every((module) =>
    isCurrentCourseModule(module, input.course.id))
    ? null
    : "course-not-archivable";
}

/** @returns {boolean} Whether one Module is valid current Course context. */
function isCurrentCourseModule(module, courseId) {
  return (
    module?.courseId === courseId &&
    new Set(["scheduled", "cancelled"]).has(module.state) &&
    Number.isFinite(Date.parse(module.endsAt))
  );
}

/** @returns {boolean} Whether any Scheduled Module has not reached exact end. */
function hasUnresolvedScheduledModule(modules, nowEpoch) {
  return modules.some((module) =>
    module.state === "scheduled" && Date.parse(module.endsAt) > nowEpoch);
}
