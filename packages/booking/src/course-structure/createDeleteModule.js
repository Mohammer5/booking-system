/**
 * Create permanent Module deletion from current retained-reference state.
 *
 * @param {object} capabilities Module deletion capabilities.
 * @param {(input: object) => Promise<string>} capabilities.deleteUnreferencedModule Persist one guarded deletion.
 * @returns {(input: object) => Promise<object>} Module deletion operation.
 */
export function createDeleteModule({ deleteUnreferencedModule }) {
  return async function deleteModule(input) {
    const refusal = validateDeletionInput(input);

    if (refusal !== null) return { outcome: refusal };
    if (input.selectionContexts.length > 0) {
      return { outcome: "module-deletion-blocked" };
    }

    const persistenceOutcome = await deleteUnreferencedModule({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      moduleId: input.module.id,
    });

    return persistenceOutcome === "deleted"
      ? { outcome: "deleted", module: input.module }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First Module deletion refusal or null. */
function validateDeletionInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (
    !new Set(["scheduled", "cancelled"]).has(input.module?.state) ||
    input.module.courseId !== input.course.id
  ) {
    return "module-not-deletable";
  }

  return Array.isArray(input.selectionContexts)
    ? null
    : "module-not-deletable";
}
