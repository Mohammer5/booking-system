const fixedOffsetPattern = /^[+-]\d{2}:\d{2}$/;

/**
 * Create Active-Course field editing from one authoritative persistence capability.
 *
 * @param {object} capabilities Course update capabilities.
 * @param {(input: object) => Promise<string>} capabilities.updateActiveCourseForActiveAdmin Persist one guarded complete field update.
 * @returns {(input: object) => Promise<object>} Course update operation.
 */
export function createUpdateCourse({ updateActiveCourseForActiveAdmin }) {
  return async function updateCourse(input) {
    const refusal = validateCourseUpdate(input);

    if (refusal !== null) {
      return { outcome: refusal };
    }

    const isTimezoneChanged = input.timezone !== input.course.timezone;

    if (isTimezoneChanged && input.course.hasEverHadModule) {
      return { outcome: "course-timezone-locked" };
    }

    const course = {
      ...input.course,
      name: input.name,
      description: input.description ?? null,
      timezone: input.timezone,
    };
    const persistenceOutcome = await updateActiveCourseForActiveAdmin({
      adminUserId: input.adminUser.id,
      course,
      expectedTimezone: input.course.timezone,
    });

    return persistenceOutcome === "updated"
      ? { outcome: "updated", course }
      : { outcome: persistenceOutcome };
  };
}

/**
 * Validate the actor, Course, and complete editable field representation.
 *
 * @param {object} input Candidate Course update.
 * @returns {string | null} First refusal outcome or null.
 */
function validateCourseUpdate(input) {
  if (input.adminUser?.state !== "active") {
    return "admin-not-active";
  }

  if (input.course?.state !== "active") {
    return "course-not-active";
  }

  if (typeof input.name !== "string" || input.name.trim().length === 0) {
    return "invalid-name";
  }

  if (!isValidOptionalDescription(input.description)) {
    return "invalid-description";
  }

  return typeof input.timezone === "string" && isIanaTimezone(input.timezone)
    ? null
    : "invalid-timezone";
}

/** @returns {boolean} Whether one optional Course description is valid. */
function isValidOptionalDescription(description) {
  return description === null || typeof description === "string";
}

/**
 * Validate a named timezone with runtime TZDB support and no fixed offsets.
 *
 * @param {string} timezone Candidate timezone identifier.
 * @returns {boolean} Whether the timezone is a valid named identifier.
 */
function isIanaTimezone(timezone) {
  if (timezone.trim().length === 0 || fixedOffsetPattern.test(timezone)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
