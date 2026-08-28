import { resolveCourseLocalDateTime } from "./resolveCourseLocalDateTime.js";

/**
 * Resolve one Course-local Module interval that must begin after now.
 *
 * @param {object} input Local schedule and Course timezone.
 * @param {string} currentInstant Definite current instant.
 * @returns {object} Refusal, disambiguation, or resolved interval.
 */
export function resolveFutureModuleSchedule(input, currentInstant) {
  const startsAt = resolveScheduleField(input, "startsAt");
  const startsAtFailure = scheduleFieldFailure("starts-at", startsAt);

  if (startsAtFailure !== null) return startsAtFailure;

  const endsAt = resolveScheduleField(input, "endsAt");
  const endsAtFailure = scheduleFieldFailure("ends-at", endsAt);

  if (endsAtFailure !== null) return endsAtFailure;
  if (hasUnresolvedOccurrence(startsAt, endsAt)) {
    return {
      outcome: "schedule-disambiguation-required",
      schedule: { startsAt, endsAt },
    };
  }

  if (Date.parse(startsAt.instant) <= Date.parse(currentInstant)) {
    return { outcome: "start-not-in-future" };
  }

  if (Date.parse(endsAt.instant) <= Date.parse(startsAt.instant)) {
    return { outcome: "end-not-after-start" };
  }

  return { outcome: "resolved", startsAt: startsAt.instant, endsAt: endsAt.instant };
}

/** @returns {object} Local-time resolution for one named endpoint. */
function resolveScheduleField(input, field) {
  return resolveCourseLocalDateTime({
    localDateTime: input[`${field}Local`],
    timezone: input.course.timezone,
    occurrence: input[`${field}Occurrence`],
  });
}

/** @returns {boolean} Whether either endpoint still needs an occurrence. */
function hasUnresolvedOccurrence(startsAt, endsAt) {
  return [startsAt, endsAt].some(
    ({ outcome }) => outcome === "disambiguation-required",
  );
}

/** @returns {object | null} Named field failure or null. */
function scheduleFieldFailure(field, resolution) {
  const outcomes = {
    "invalid-local-date-time": `invalid-${field}`,
    "invalid-timezone": "invalid-course-timezone",
    "nonexistent-local-time": `nonexistent-${field}`,
  };
  const outcome = outcomes[resolution.outcome];

  return outcome === undefined ? null : { outcome };
}
