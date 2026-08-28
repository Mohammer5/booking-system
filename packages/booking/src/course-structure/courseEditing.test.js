import { describe, expect, it, vi } from "vitest";

import { createUpdateCourse } from "./createUpdateCourse.js";

describe("Course editing", () => {
  it.each([
    ["missing Admin", null, activeCourse(), validFields(), "admin-not-active"],
    [
      "Disabled Admin",
      admin("disabled"),
      activeCourse(),
      validFields(),
      "admin-not-active",
    ],
    [
      "missing Course",
      admin(),
      null,
      validFields(),
      "course-not-active",
    ],
    [
      "Archived Course",
      admin(),
      activeCourse({ state: "archived" }),
      validFields(),
      "course-not-active",
    ],
  ])("refuses %s before persistence", async (_case, actor, course, fields, outcome) => {
    const capabilities = createCapabilities();
    const updateCourse = createUpdateCourse(capabilities);

    await expect(
      updateCourse({ adminUser: actor, course, ...fields }),
    ).resolves.toEqual({ outcome });
    expect(capabilities.updateActiveCourseForActiveAdmin).not.toHaveBeenCalled();
  });

  it.each([
    [{ name: "  " }, "invalid-name"],
    [{ description: undefined }, "invalid-description"],
    [{ description: 12 }, "invalid-description"],
    [{ timezone: "" }, "invalid-timezone"],
    [{ timezone: "+01:00" }, "invalid-timezone"],
    [{ timezone: "Unknown/Timezone" }, "invalid-timezone"],
  ])("refuses invalid complete fields %j", async (override, outcome) => {
    const capabilities = createCapabilities();
    const updateCourse = createUpdateCourse(capabilities);

    await expect(
      updateCourse(validInput(override)),
    ).resolves.toEqual({ outcome });
    expect(capabilities.updateActiveCourseForActiveAdmin).not.toHaveBeenCalled();
  });

  it("updates complete fields while preserving Course identity and relationships", async () => {
    const capabilities = createCapabilities();
    const updateCourse = createUpdateCourse(capabilities);
    const course = activeCourse({
      groups: [{ id: "group-1" }],
      modules: [],
      assignments: [{ id: "assignment-1" }],
    });

    await expect(
      updateCourse({
        adminUser: admin(),
        course,
        name: " Same name remains allowed ",
        description: "New description",
        timezone: "America/New_York",
      }),
    ).resolves.toEqual({
      outcome: "updated",
      course: {
        ...course,
        name: " Same name remains allowed ",
        description: "New description",
        timezone: "America/New_York",
      },
    });
    expect(capabilities.updateActiveCourseForActiveAdmin).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      expectedTimezone: "Europe/Berlin",
      course: {
        ...course,
        name: " Same name remains allowed ",
        description: "New description",
        timezone: "America/New_York",
      },
    });
  });

  it("allows descriptive edits after scheduling history when timezone is unchanged", async () => {
    const updateCourse = createUpdateCourse(createCapabilities());

    await expect(
      updateCourse(
        validInput({
          course: activeCourse({ hasEverHadModule: true }),
          name: "Renamed",
        }),
      ),
    ).resolves.toMatchObject({
      outcome: "updated",
      course: { name: "Renamed", timezone: "Europe/Berlin" },
    });
  });

  it("permanently refuses a timezone change after any successful Module", async () => {
    const capabilities = createCapabilities();
    const updateCourse = createUpdateCourse(capabilities);

    await expect(
      updateCourse(
        validInput({
          course: activeCourse({ hasEverHadModule: true }),
          timezone: "America/New_York",
        }),
      ),
    ).resolves.toEqual({ outcome: "course-timezone-locked" });
    expect(capabilities.updateActiveCourseForActiveAdmin).not.toHaveBeenCalled();
  });

  it.each([
    "admin-not-active",
    "course-not-active",
    "course-timezone-locked",
    "course-timezone-changed",
    "course-not-updated",
  ])("preserves authoritative persistence refusal %s", async (outcome) => {
    const capabilities = createCapabilities();
    capabilities.updateActiveCourseForActiveAdmin.mockResolvedValue(outcome);
    const updateCourse = createUpdateCourse(capabilities);

    await expect(updateCourse(validInput())).resolves.toEqual({ outcome });
  });
});

/** @returns {object} Current Admin input. */
function admin(state = "active") {
  return { id: "admin-1", state };
}

/** @returns {object} Current Course input. */
function activeCourse(override = {}) {
  return {
    id: "course-1",
    name: "Course",
    description: null,
    timezone: "Europe/Berlin",
    state: "active",
    hasEverHadModule: false,
    ...override,
  };
}

/** @returns {object} Complete valid editable fields. */
function validFields(override = {}) {
  return {
    name: "Updated Course",
    description: null,
    timezone: "Europe/Berlin",
    ...override,
  };
}

/** @returns {object} Complete valid Course update input. */
function validInput(override = {}) {
  return {
    adminUser: admin(),
    course: activeCourse(),
    ...validFields(),
    ...override,
  };
}

/** @returns {object} Observable Course update capabilities. */
function createCapabilities() {
  return {
    updateActiveCourseForActiveAdmin: vi.fn(async () => "updated"),
  };
}
