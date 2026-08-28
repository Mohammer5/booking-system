import { describe, expect, it, vi } from "vitest";

import { createGetParticipantCourse } from "./createGetParticipantCourse.js";
import { createListParticipantCourses } from "./createListParticipantCourses.js";
import { hasParticipantCourseAccess } from "./hasParticipantCourseAccess.js";

describe("Participant Course access predicate", () => {
  it("grants an Active Participant access through a matching Active Assignment to an Active Course", () => {
    expect(hasParticipantCourseAccess(activeMembership())).toBe(true);
  });

  it.each([
    ["missing Participant", { participant: null }],
    ["Disabled Participant", { participant: participant("a", "disabled") }],
    ["missing Assignment", { assignment: null }],
    ["Revoked Assignment", { assignment: assignment("a", "a", "revoked") }],
    ["Archived Course", { course: course("a", "archived") }],
    ["another Participant", { assignment: assignment("a", "other") }],
    ["another Course", { assignment: assignment("other", "a") }],
  ])("refuses %s", (_case, replacement) => {
    expect(
      hasParticipantCourseAccess({ ...activeMembership(), ...replacement }),
    ).toBe(false);
  });
});

describe("Participant Course list", () => {
  it.each([
    ["missing", null],
    ["Disabled", participant("a", "disabled")],
  ])("refuses a %s Participant before a Course read", async (_case, value) => {
    const listParticipantCourseMemberships = vi.fn();
    const listCourses = createListParticipantCourses({
      listParticipantCourseMemberships,
    });

    await expect(listCourses(value)).resolves.toEqual({
      outcome: "participant-not-active",
    });
    expect(listParticipantCourseMemberships).not.toHaveBeenCalled();
  });

  it.each([
    [[], []],
    [[membership("bravo")], [course("bravo")]],
    [
      [membership("alpha"), membership("bravo")],
      [course("alpha"), course("bravo")],
    ],
  ])("preserves independent ordered zero, one, or multiple memberships", async (
    memberships,
    expectedCourses,
  ) => {
    const listCourses = createListParticipantCourses({
      listParticipantCourseMemberships: async () => memberships,
    });

    await expect(listCourses(participant("a"))).resolves.toEqual({
      outcome: "courses-available",
      courses: expectedCourses,
    });
  });

  it("excludes ineligible and cross-Participant membership data without effects", async () => {
    const createAssignment = vi.fn();
    const createSelection = vi.fn();
    const listCourses = createListParticipantCourses({
      createAssignment,
      createSelection,
      listParticipantCourseMemberships: async () => [
        membership("active"),
        { ...membership("revoked"), assignment: assignment("revoked", "a", "revoked") },
        { ...membership("archived"), course: course("archived", "archived") },
        { ...membership("other"), assignment: assignment("other", "other") },
      ],
    });

    await expect(listCourses(participant("a"))).resolves.toEqual({
      outcome: "courses-available",
      courses: [course("active")],
    });
    expect(createAssignment).not.toHaveBeenCalled();
    expect(createSelection).not.toHaveBeenCalled();
  });
});

describe("Participant Course detail", () => {
  it("returns current Course structure for one matching membership", async () => {
    const findParticipantCourseMembership = vi
      .fn()
      .mockResolvedValue({ ...membership("a"), groups: [], modules: [] });
    const getCourse = createGetParticipantCourse({
      findParticipantCourseMembership,
    });

    await expect(
      getCourse({ participant: participant("a"), courseId: "course-a" }),
    ).resolves.toEqual({
      outcome: "course-available",
      course: course("a"),
      groups: [],
      modules: [],
    });
    expect(findParticipantCourseMembership).toHaveBeenCalledWith(
      "participant-a",
      "course-a",
    );
  });

  it.each([
    ["missing membership", null],
    ["Revoked membership", { ...membership("a"), assignment: assignment("a", "a", "revoked") }],
    ["inactive Course", { ...membership("a"), course: course("a", "archived") }],
    ["cross-Participant membership", { ...membership("a"), assignment: assignment("a", "other") }],
    ["identifier mismatch", membership("other")],
  ])("uses one unavailable result for %s", async (_case, value) => {
    const getCourse = createGetParticipantCourse({
      findParticipantCourseMembership: async () =>
        value === null ? null : { ...value, groups: [], modules: [] },
    });

    await expect(
      getCourse({ participant: participant("a"), courseId: "course-a" }),
    ).resolves.toEqual({ outcome: "course-unavailable" });
  });

  it("has no Assignment or Selection side effect", async () => {
    const createAssignment = vi.fn();
    const createSelection = vi.fn();
    const getCourse = createGetParticipantCourse({
      createAssignment,
      createSelection,
      findParticipantCourseMembership: async () => ({
        ...membership("a"),
        groups: [],
        modules: [],
      }),
    });

    await getCourse({ participant: participant("a"), courseId: "course-a" });

    expect(createAssignment).not.toHaveBeenCalled();
    expect(createSelection).not.toHaveBeenCalled();
  });
});

/** @returns {object} Current matching membership data. */
function activeMembership() {
  return {
    participant: participant("a"),
    assignment: assignment("a", "a"),
    course: course("a"),
  };
}

/** @returns {object} Current Participant data. */
function participant(suffix, state = "active") {
  return { id: `participant-${suffix}`, state };
}

/** @returns {object} Current Course data. */
function course(suffix, state = "active") {
  return { id: `course-${suffix}`, name: `Course ${suffix}`, state };
}

/** @returns {object} Current Course Assignment data. */
function assignment(courseSuffix, participantSuffix, state = "active") {
  return {
    id: `assignment-${participantSuffix}-${courseSuffix}`,
    participantId: `participant-${participantSuffix}`,
    courseId: `course-${courseSuffix}`,
    state,
  };
}

/** @returns {object} One current membership joined to its Course. */
function membership(suffix) {
  return {
    assignment: assignment(suffix, "a"),
    course: course(suffix),
  };
}
