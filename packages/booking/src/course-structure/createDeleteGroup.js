/**
 * Create permanent Group deletion from current retained-reference state.
 *
 * @param {object} capabilities Group deletion capabilities.
 * @param {(input: object) => Promise<string>} capabilities.deleteUnreferencedGroup Persist one guarded deletion.
 * @returns {(input: object) => Promise<object>} Group deletion operation.
 */
export function createDeleteGroup({ deleteUnreferencedGroup }) {
  return async function deleteGroup(input) {
    const refusal = validateDeletionInput(input);

    if (refusal !== null) return { outcome: refusal };
    if (input.selectionContexts.length > 0) {
      return { outcome: "group-deletion-blocked" };
    }

    const persistenceOutcome = await deleteUnreferencedGroup({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      groupId: input.group.id,
    });

    return persistenceOutcome === "deleted"
      ? { outcome: "deleted", group: input.group }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First Group deletion refusal or null. */
function validateDeletionInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (
    !new Set(["active", "archived"]).has(input.group?.state) ||
    input.group.courseId !== input.course.id
  ) {
    return "group-not-deletable";
  }

  return Array.isArray(input.selectionContexts)
    ? null
    : "group-not-deletable";
}
