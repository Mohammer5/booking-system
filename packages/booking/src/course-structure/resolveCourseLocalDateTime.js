const localDateTimePattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})$/;
const fixedOffsetPattern = /^[+-]\d{2}:\d{2}$/;
const searchHours = 36;
const millisecondsPerHour = 60 * 60 * 1000;
const millisecondsPerMinute = 60 * 1000;

/**
 * Resolve one Course-local wall-clock minute to definite instant candidates.
 *
 * @param {object} input Local-time resolution input.
 * @param {unknown} input.localDateTime Local `YYYY-MM-DDTHH:mm` value.
 * @param {unknown} input.timezone Course IANA/TZDB timezone.
 * @param {unknown} [input.occurrence] Explicit `earlier` or `later` overlap choice.
 * @returns {object} Invalid, nonexistent, disambiguation-required, or resolved outcome.
 */
export function resolveCourseLocalDateTime({
  localDateTime,
  timezone,
  occurrence,
}) {
  const localParts = parseLocalDateTime(localDateTime);

  if (localParts === null) {
    return { outcome: "invalid-local-date-time" };
  }

  const formatter = createTimezoneFormatter(timezone);

  if (formatter === null) {
    return { outcome: "invalid-timezone" };
  }

  const candidateInstants = findCandidateInstants(localParts, formatter);

  if (candidateInstants.length === 0) {
    return { outcome: "nonexistent-local-time" };
  }

  const candidates = labelCandidates(candidateInstants);

  if (candidates.length === 1) {
    return { outcome: "resolved", ...candidates[0] };
  }

  const selectedCandidate = candidates.find(
    (candidate) => candidate.occurrence === occurrence,
  );

  return selectedCandidate === undefined
    ? { outcome: "disambiguation-required", candidates }
    : { outcome: "resolved", ...selectedCandidate };
}

/**
 * Strictly parse the browser-facing local minute representation.
 *
 * @param {unknown} localDateTime Candidate local date and time.
 * @returns {object | null} Valid calendar parts and pseudo-UTC epoch.
 */
function parseLocalDateTime(localDateTime) {
  if (typeof localDateTime !== "string") {
    return null;
  }

  const match = localDateTimePattern.exec(localDateTime);

  if (match === null) {
    return null;
  }

  const parts = Object.fromEntries(
    Object.entries(match.groups).map(([key, value]) => [key, Number(value)]),
  );
  const pseudoDate = new Date(0);

  pseudoDate.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  pseudoDate.setUTCHours(parts.hour, parts.minute, 0, 0);

  return hasSameParts(parts, partsFromDate(pseudoDate))
    ? { ...parts, pseudoEpoch: pseudoDate.getTime() }
    : null;
}

/**
 * Create the runtime-TZDB formatter for one Course timezone.
 *
 * @param {unknown} timezone Candidate timezone.
 * @returns {Intl.DateTimeFormat | null} Formatter or null for an invalid zone.
 */
function createTimezoneFormatter(timezone) {
  if (typeof timezone !== "string" || fixedOffsetPattern.test(timezone)) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat("en-CA", {
      calendar: "iso8601",
      numberingSystem: "latn",
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

/**
 * Enumerate offsets near the local value and retain exact round-trip matches.
 *
 * @param {object} localParts Valid local date/time parts.
 * @param {Intl.DateTimeFormat} formatter Course-timezone formatter.
 * @returns {Array<object>} Sorted definite candidates.
 */
function findCandidateInstants(localParts, formatter) {
  const offsets = new Set();

  for (let hour = -searchHours; hour <= searchHours; hour += 1) {
    const sampleEpoch = localParts.pseudoEpoch + hour * millisecondsPerHour;
    const sampleParts = partsFromFormatter(formatter, sampleEpoch);

    offsets.add(epochFromParts(sampleParts) - sampleEpoch);
  }

  return [...offsets]
    .map((offset) => ({
      epoch: localParts.pseudoEpoch - offset,
      offsetMinutes: offset / millisecondsPerMinute,
    }))
    .filter(({ epoch }) =>
      hasSameParts(localParts, partsFromFormatter(formatter, epoch)),
    )
    .filter(
      (candidate, index, candidates) =>
        candidates.findIndex(({ epoch }) => epoch === candidate.epoch) === index,
    )
    .sort((left, right) => left.epoch - right.epoch);
}

/**
 * Attach stable occurrence names and serialize candidate instants.
 *
 * @param {Array<object>} candidates Sorted definite candidates.
 * @returns {Array<object>} Browser-safe candidate data.
 */
function labelCandidates(candidates) {
  return candidates.map((candidate, index) => ({
    occurrence:
      candidates.length === 1 ? "only" : index === 0 ? "earlier" : "later",
    instant: new Date(candidate.epoch).toISOString(),
    offsetMinutes: candidate.offsetMinutes,
  }));
}

/**
 * Read comparable calendar parts from a definite instant in one timezone.
 *
 * @param {Intl.DateTimeFormat} formatter Course-timezone formatter.
 * @param {number} epoch Definite epoch milliseconds.
 * @returns {object} Numeric local calendar parts.
 */
function partsFromFormatter(formatter, epoch) {
  return Object.fromEntries(
    formatter
      .formatToParts(new Date(epoch))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
}

/**
 * Read comparable UTC calendar parts from a Date.
 *
 * @param {Date} date UTC Date representation.
 * @returns {object} Numeric calendar parts.
 */
function partsFromDate(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

/**
 * Convert calendar parts to the corresponding pseudo-UTC epoch.
 *
 * @param {object} parts Numeric calendar parts.
 * @returns {number} Pseudo-UTC epoch milliseconds.
 */
function epochFromParts(parts) {
  const date = new Date(0);

  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, 0, 0);
  return date.getTime();
}

/**
 * Compare only local calendar fields relevant to minute-precision input.
 *
 * @param {object} expected Expected calendar parts.
 * @param {object} actual Actual calendar parts.
 * @returns {boolean} Whether all fields match.
 */
function hasSameParts(expected, actual) {
  return ["year", "month", "day", "hour", "minute"].every(
    (key) => expected[key] === actual[key],
  );
}
