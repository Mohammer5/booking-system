import { normalizeGroupName } from "./createCreateGroup.js";

/**
 * Create Group field editing from current Course state and guarded persistence.
 *
 * @param {object} capabilities Group update capabilities.
 * @param {(input: object) => Promise<string>} capabilities.updateGroupForActiveAdmin Persist one guarded complete Group update.
 * @returns {(input: object) => Promise<object>} Group update operation.
 */
export function createUpdateGroup({ updateGroupForActiveAdmin }) {
  return async function updateGroup(input) {
    const refusal = validateGroupUpdate(input);

    if (refusal !== null) {
      return { outcome: refusal };
    }

    const group = {
      ...input.group,
      name: input.name,
      normalizedName: normalizeGroupName(input.name),
      details: input.details,
    };

    if (
      group.state === "active" &&
      hasActiveGroupNameConflict(input.courseGroups, group)
    ) {
      return { outcome: "group-name-conflict" };
    }

    const persistenceOutcome = await updateGroupForActiveAdmin({
      adminUserId: input.adminUser.id,
      expectedState: input.group.state,
      group,
    });

    return persistenceOutcome === "updated"
      ? { outcome: "updated", group }
      : { outcome: persistenceOutcome };
  };
}

/**
 * Detect another current Active Group with the same normalized Course-local name.
 *
 * @param {Array<object>} courseGroups Current Course-owned Groups.
 * @param {object} candidate Candidate Group representation.
 * @returns {boolean} Whether another Active Group conflicts.
 */
export function hasActiveGroupNameConflict(courseGroups, candidate) {
  return courseGroups.some(
    (group) =>
      group.id !== candidate.id &&
      group.state === "active" &&
      group.normalizedName === candidate.normalizedName,
  );
}

/** @returns {string | null} First Group update refusal or null. */
function validateGroupUpdate(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (!isCourseGroup(input.group, input.course.id)) return "group-not-editable";
  if (typeof input.name !== "string" || input.name.trim().length === 0) {
    return "invalid-name";
  }
  if (!(input.details === null || typeof input.details === "string")) {
    return "invalid-details";
  }
  if (!Array.isArray(input.courseGroups)) return "group-not-editable";

  return null;
}

/** @returns {boolean} Whether one Group belongs to the Course and has a valid lifecycle state. */
function isCourseGroup(group, courseId) {
  return (
    typeof group?.id === "string" &&
    group.courseId === courseId &&
    new Set(["active", "archived"]).has(group.state)
  );
}
