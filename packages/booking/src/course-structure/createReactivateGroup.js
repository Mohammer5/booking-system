import { hasActiveGroupNameConflict } from "./createUpdateGroup.js";

/**
 * Create retained-identity Group reactivation with current name uniqueness.
 *
 * @param {object} capabilities Group reactivation capabilities.
 * @param {(input: object) => Promise<string>} capabilities.reactivateArchivedGroup Persist one guarded Archived-to-Active transition.
 * @returns {(input: object) => Promise<object>} Group reactivation operation.
 */
export function createReactivateGroup({ reactivateArchivedGroup }) {
  return async function reactivateGroup(input) {
    const refusal = validateReactivationInput(input);

    if (refusal !== null) return { outcome: refusal };
    if (hasActiveGroupNameConflict(input.courseGroups, input.group)) {
      return { outcome: "group-name-conflict" };
    }

    const persistenceOutcome = await reactivateArchivedGroup({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      groupId: input.group.id,
    });

    return persistenceOutcome === "reactivated"
      ? {
          outcome: "reactivated",
          group: { ...input.group, state: "active" },
        }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First Group reactivation refusal or null. */
function validateReactivationInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (
    input.group?.state !== "archived" ||
    input.group.courseId !== input.course.id
  ) {
    return "group-not-archived";
  }
  return Array.isArray(input.courseGroups) ? null : "group-not-archived";
}
