import { describe, expect, it } from "vitest";

import { resolveCourseLocalDateTime } from "./resolveCourseLocalDateTime.js";

describe("Course-local date/time resolution", () => {
  it.each([
    undefined,
    null,
    12,
    "2027-01-15",
    "2027-1-15T10:30",
    "2027-02-29T10:30",
    "2028-02-30T10:30",
    "2027-01-15T24:00",
    "2027-01-15T10:60",
  ])("refuses malformed or impossible local input %j", (localDateTime) => {
    expect(
      resolveCourseLocalDateTime({
        localDateTime,
        timezone: "Europe/Berlin",
      }),
    ).toEqual({ outcome: "invalid-local-date-time" });
  });

  it.each([undefined, null, 12, "+01:00", "Unknown/Timezone"])(
    "refuses invalid Course timezone %j",
    (timezone) => {
      expect(
        resolveCourseLocalDateTime({
          localDateTime: "2027-01-15T10:30",
          timezone,
        }),
      ).toEqual({ outcome: "invalid-timezone" });
    },
  );

  it("resolves an ordinary Berlin local value to one definite instant", () => {
    expect(
      resolveCourseLocalDateTime({
        localDateTime: "2027-01-15T10:30",
        timezone: "Europe/Berlin",
      }),
    ).toEqual({
      outcome: "resolved",
      occurrence: "only",
      instant: "2027-01-15T09:30:00.000Z",
      offsetMinutes: 60,
    });
  });

  it("supports a valid IANA zone with a non-hour offset", () => {
    expect(
      resolveCourseLocalDateTime({
        localDateTime: "2027-01-15T10:30",
        timezone: "Asia/Kathmandu",
      }),
    ).toEqual({
      outcome: "resolved",
      occurrence: "only",
      instant: "2027-01-15T04:45:00.000Z",
      offsetMinutes: 345,
    });
  });

  it("rejects a nonexistent Berlin spring-forward wall time", () => {
    expect(
      resolveCourseLocalDateTime({
        localDateTime: "2027-03-28T02:30",
        timezone: "Europe/Berlin",
      }),
    ).toEqual({ outcome: "nonexistent-local-time" });
  });

  it("requires an explicit occurrence for a Berlin fall-back wall time", () => {
    expect(
      resolveCourseLocalDateTime({
        localDateTime: "2027-10-31T02:30",
        timezone: "Europe/Berlin",
      }),
    ).toEqual({
      outcome: "disambiguation-required",
      candidates: [
        {
          occurrence: "earlier",
          instant: "2027-10-31T00:30:00.000Z",
          offsetMinutes: 120,
        },
        {
          occurrence: "later",
          instant: "2027-10-31T01:30:00.000Z",
          offsetMinutes: 60,
        },
      ],
    });
  });

  it.each([
    ["earlier", "2027-10-31T00:30:00.000Z", 120],
    ["later", "2027-10-31T01:30:00.000Z", 60],
  ])("resolves the explicit %s overlap occurrence", (occurrence, instant, offsetMinutes) => {
    expect(
      resolveCourseLocalDateTime({
        localDateTime: "2027-10-31T02:30",
        timezone: "Europe/Berlin",
        occurrence,
      }),
    ).toEqual({ outcome: "resolved", occurrence, instant, offsetMinutes });
  });
});
