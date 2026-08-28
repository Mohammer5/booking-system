import { resolveCourseLocalDateTime } from "./resolveCourseLocalDateTime.js";

/**
 * Create the future Module creation operation from time and persistence capabilities.
 *
 * @param {object} capabilities Module creation capabilities.
 * @param {() => string} capabilities.createModuleId Create a stable Module identity.
 * @param {(input: {adminUserId: string, courseTimezone: string, module: object}) => Promise<string>} capabilities.createModuleForActiveAdmin Persist only for a current Active Admin and unchanged Course.
 * @param {() => string} capabilities.now Read the definite current instant.
 * @returns {(input: object) => Promise<object>} The Module creation operation.
 */
export function createCreateModule({
  createModuleId,
  createModuleForActiveAdmin,
  now,
}) {
  return async function createModule(input) {
    const inputFailure = validateModuleInput(input);

    if (inputFailure !== null) {
      return inputFailure;
    }

    const schedule = resolveModuleSchedule(input, now());

    if (schedule.outcome !== "resolved") {
      return schedule;
    }

    const module = createModuleData(input, schedule, createModuleId());
    const persistenceOutcome = await createModuleForActiveAdmin({
      adminUserId: input.adminUser.id,
      courseTimezone: input.course.timezone,
      module,
    });

    return persistenceOutcome === "created"
      ? { outcome: "created", module }
      : { outcome: persistenceOutcome };
  };
}

/**
 * Validate actor, Course, and descriptive input before resolving time.
 *
 * @param {object} input Candidate Module input.
 * @returns {object | null} Refusal outcome or null.
 */
function validateModuleInput(input) {
  if (input.adminUser?.state !== "active") {
    return { outcome: "admin-not-active" };
  }

  if (input.course?.state !== "active") {
    return { outcome: "course-not-active" };
  }

  const invalidTextOutcome = validateModuleText(input);

  return invalidTextOutcome === null ? null : { outcome: invalidTextOutcome };
}

/**
 * Resolve and validate the complete definite Module interval.
 *
 * @param {object} input Candidate Module input.
 * @param {string} currentInstant Definite current instant.
 * @returns {object} Refusal or resolved interval.
 */
function resolveModuleSchedule(input, currentInstant) {
  const startsAt = resolveScheduleField(input, "startsAt");
  const startsAtFailure = scheduleFieldFailure("starts-at", startsAt);

  if (startsAtFailure !== null) {
    return startsAtFailure;
  }

  const endsAt = resolveScheduleField(input, "endsAt");
  const endsAtFailure = scheduleFieldFailure("ends-at", endsAt);

  if (endsAtFailure !== null) {
    return endsAtFailure;
  }

  if (hasUnresolvedOccurrence(startsAt, endsAt)) {
    return disambiguationOutcome(startsAt, endsAt);
  }

  if (Date.parse(startsAt.instant) <= Date.parse(currentInstant)) {
    return { outcome: "start-not-in-future" };
  }

  if (Date.parse(endsAt.instant) <= Date.parse(startsAt.instant)) {
    return { outcome: "end-not-after-start" };
  }

  return { outcome: "resolved", startsAt: startsAt.instant, endsAt: endsAt.instant };
}

/**
 * Resolve one named local schedule field through the Course timezone.
 *
 * @param {object} input Candidate Module input.
 * @param {"startsAt" | "endsAt"} field Input field prefix.
 * @returns {object} Local-time resolution.
 */
function resolveScheduleField(input, field) {
  return resolveCourseLocalDateTime({
    localDateTime: input[`${field}Local`],
    timezone: input.course.timezone,
    occurrence: input[`${field}Occurrence`],
  });
}

/**
 * Check whether either interval endpoint still needs an occurrence choice.
 *
 * @param {object} startsAt Start resolution.
 * @param {object} endsAt End resolution.
 * @returns {boolean} Whether explicit disambiguation remains.
 */
function hasUnresolvedOccurrence(startsAt, endsAt) {
  return [startsAt, endsAt].some(
    ({ outcome }) => outcome === "disambiguation-required",
  );
}

/**
 * Preserve both endpoint resolutions for browser disambiguation.
 *
 * @param {object} startsAt Start resolution.
 * @param {object} endsAt End resolution.
 * @returns {object} Schedule disambiguation outcome.
 */
function disambiguationOutcome(startsAt, endsAt) {
  return {
    outcome: "schedule-disambiguation-required",
    schedule: { startsAt, endsAt },
  };
}

/**
 * Create the minimal Scheduled Module plain data.
 *
 * @param {object} input Valid Module input.
 * @param {object} schedule Resolved definite interval.
 * @param {string} moduleId Stable Module identity.
 * @returns {object} Scheduled Module data.
 */
function createModuleData(input, schedule, moduleId) {
  return {
    id: moduleId,
    courseId: input.course.id,
    title: input.title,
    description: input.description ?? null,
    instructions: input.instructions ?? null,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    state: "scheduled",
  };
}

/**
 * Validate the minimal Module descriptive contract.
 *
 * @param {object} input Candidate Module input.
 * @returns {string | null} The first field outcome or null.
 */
function validateModuleText(input) {
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return "invalid-title";
  }

  if (!isValidOptionalText(input.description)) {
    return "invalid-description";
  }

  return isValidOptionalText(input.instructions)
    ? null
    : "invalid-instructions";
}

/**
 * Map local-time parsing and gap failures to one Module field.
 *
 * @param {"starts-at" | "ends-at"} field Schedule field name.
 * @param {object} resolution Local-time resolution outcome.
 * @returns {object | null} Module outcome or null for a usable resolution.
 */
function scheduleFieldFailure(field, resolution) {
  const outcomes = {
    "invalid-local-date-time": `invalid-${field}`,
    "invalid-timezone": "invalid-course-timezone",
    "nonexistent-local-time": `nonexistent-${field}`,
  };
  const outcome = outcomes[resolution.outcome];

  return outcome === undefined ? null : { outcome };
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
