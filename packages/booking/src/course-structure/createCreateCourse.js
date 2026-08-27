const defaultCourseTimezone = "Europe/Berlin";
const fixedOffsetPattern = /^[+-]\d{2}:\d{2}$/;

/**
 * Create the Course creation operation from narrow identity and persistence capabilities.
 *
 * @param {object} capabilities Course creation capabilities.
 * @param {() => string} capabilities.createCourseId Create a stable Course identity.
 * @param {(input: {adminUserId: string, course: object}) => Promise<"created" | "admin-not-active">} capabilities.createCourseForActiveAdmin Persist only for a current Active Admin.
 * @returns {(input: {adminUser: object, name: unknown, description?: unknown, timezone?: unknown}) => Promise<object>} The Course creation operation.
 */
export function createCreateCourse({
  createCourseId,
  createCourseForActiveAdmin,
}) {
  return async function createCourse({
    adminUser,
    name,
    description,
    timezone,
  }) {
    if (adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (!isValidRequiredText(name)) {
      return { outcome: "invalid-name" };
    }

    if (!isValidOptionalDescription(description)) {
      return { outcome: "invalid-description" };
    }

    const courseTimezone = resolveCourseTimezone(timezone);

    if (courseTimezone === null) {
      return { outcome: "invalid-timezone" };
    }

    const course = {
      id: createCourseId(),
      name,
      description: description ?? null,
      timezone: courseTimezone,
      state: "active",
    };
    const persistenceOutcome = await createCourseForActiveAdmin({
      adminUserId: adminUser.id,
      course,
    });

    if (persistenceOutcome === "admin-not-active") {
      return { outcome: "admin-not-active" };
    }

    return { outcome: "created", course };
  };
}

/**
 * Check one required text value without normalizing its stored representation.
 *
 * @param {unknown} value Candidate text.
 * @returns {boolean} Whether the value remains nonblank after validation trimming.
 */
function isValidRequiredText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check the optional Course description data contract.
 *
 * @param {unknown} description Candidate description.
 * @returns {boolean} Whether the value is absent, null, or free text.
 */
function isValidOptionalDescription(description) {
  return (
    description === undefined ||
    description === null ||
    typeof description === "string"
  );
}

/**
 * Resolve omitted timezone input to the default and reject invalid identifiers.
 *
 * @param {unknown} timezone Candidate timezone.
 * @returns {string | null} A valid preserved IANA timezone or null.
 */
function resolveCourseTimezone(timezone) {
  if (
    timezone === undefined ||
    timezone === null ||
    (typeof timezone === "string" && timezone.trim().length === 0)
  ) {
    return defaultCourseTimezone;
  }

  if (typeof timezone !== "string" || !isIanaTimezone(timezone)) {
    return null;
  }

  return timezone;
}

/**
 * Validate a timezone with the runtime TZDB while excluding fixed offsets.
 *
 * @param {string} timezone Candidate timezone identifier.
 * @returns {boolean} Whether the runtime recognizes it as a named timezone.
 */
function isIanaTimezone(timezone) {
  if (fixedOffsetPattern.test(timezone)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
