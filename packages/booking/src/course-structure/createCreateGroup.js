/**
 * Create the Group creation operation from narrow identity and persistence capabilities.
 *
 * @param {object} capabilities Group creation capabilities.
 * @param {() => string} capabilities.createGroupId Create a stable Group identity.
 * @param {(input: {adminUserId: string, group: object}) => Promise<string>} capabilities.createGroupForActiveAdmin Persist only for a current Active Admin and Course.
 * @returns {(input: {adminUser: object, course: object, name: unknown, details?: unknown}) => Promise<object>} The Group creation operation.
 */
export function createCreateGroup({
  createGroupId,
  createGroupForActiveAdmin,
}) {
  return async function createGroup({ adminUser, course, name, details }) {
    if (adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (course?.state !== "active") {
      return { outcome: "course-not-active" };
    }

    if (!isValidRequiredText(name)) {
      return { outcome: "invalid-name" };
    }

    if (!isValidOptionalText(details)) {
      return { outcome: "invalid-details" };
    }

    const group = {
      id: createGroupId(),
      courseId: course.id,
      name,
      normalizedName: normalizeGroupName(name),
      details: details ?? null,
      state: "active",
    };
    const persistenceOutcome = await createGroupForActiveAdmin({
      adminUserId: adminUser.id,
      group,
    });

    return persistenceOutcome === "created"
      ? { outcome: "created", group }
      : { outcome: persistenceOutcome };
  };
}

/**
 * Normalize one Group name for Course-local Active-name comparison.
 *
 * @param {string} name Valid Group name.
 * @returns {string} The stable case-insensitive comparison key.
 */
export function normalizeGroupName(name) {
  return name.trim().toLowerCase();
}

/**
 * Check one required text value without normalizing its stored representation.
 *
 * @param {unknown} value Candidate text.
 * @returns {boolean} Whether the value remains nonblank after trimming.
 */
function isValidRequiredText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check one optional free-text value.
 *
 * @param {unknown} value Candidate optional text.
 * @returns {boolean} Whether the value is absent, null, or a string.
 */
function isValidOptionalText(value) {
  return value === undefined || value === null || typeof value === "string";
}
