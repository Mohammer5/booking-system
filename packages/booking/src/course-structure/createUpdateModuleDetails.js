import { validateModuleText } from "./validateModuleText.js";

/**
 * Create complete Module descriptive editing with guarded persistence.
 *
 * @param {object} capabilities Module detail-editing capabilities.
 * @returns {(input: object) => Promise<object>} Module detail operation.
 */
export function createUpdateModuleDetails({ updateModuleDetailsForActiveAdmin }) {
  return async function updateModuleDetails(input) {
    const refusal = validateUpdateInput(input);

    if (refusal !== null) return { outcome: refusal };

    const module = {
      ...input.module,
      title: input.title,
      description: input.description,
      instructions: input.instructions,
    };
    const persistenceOutcome = await updateModuleDetailsForActiveAdmin({
      adminUserId: input.adminUser.id,
      module,
    });

    return persistenceOutcome === "updated"
      ? { outcome: "updated", module }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First detail-editing refusal or null. */
function validateUpdateInput(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";
  if (!isEditableCourseModule(input.module, input.course.id)) {
    return "module-not-editable";
  }

  return validateModuleText(input);
}

/** @returns {boolean} Whether a retained Module belongs to the Course. */
function isEditableCourseModule(module, courseId) {
  return (
    typeof module?.id === "string" &&
    module.courseId === courseId &&
    new Set(["scheduled", "cancelled"]).has(module.state)
  );
}
