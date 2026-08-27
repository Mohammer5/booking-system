import { describe, expect, it, vi } from "vitest";

import { createCreateCourse } from "./createCreateCourse.js";

describe("Course creation", () => {
  it.each([undefined, null, "", "  ", 12])(
    "refuses invalid name input %j before creating identity or persistence",
    async (name) => {
      const capabilities = createCapabilities();
      const createCourse = createCreateCourse(capabilities);

      await expect(
        createCourse({ adminUser: activeAdmin(), name }),
      ).resolves.toEqual({ outcome: "invalid-name" });
      expect(capabilities.createCourseId).not.toHaveBeenCalled();
      expect(capabilities.createCourseForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it.each([false, 12, {}, []])(
    "refuses invalid description input %j",
    async (description) => {
      const capabilities = createCapabilities();
      const createCourse = createCreateCourse(capabilities);

      await expect(
        createCourse({
          adminUser: activeAdmin(),
          name: "Course",
          description,
        }),
      ).resolves.toEqual({ outcome: "invalid-description" });
      expect(capabilities.createCourseForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it.each(["+01:00", "Mars/Olympus_Mons", 12])(
    "refuses invalid timezone input %j",
    async (timezone) => {
      const capabilities = createCapabilities();
      const createCourse = createCreateCourse(capabilities);

      await expect(
        createCourse({ adminUser: activeAdmin(), name: "Course", timezone }),
      ).resolves.toEqual({ outcome: "invalid-timezone" });
      expect(capabilities.createCourseForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, "", "  "])(
    "creates the minimal Active Course with default timezone for %j",
    async (timezone) => {
      const capabilities = createCapabilities();
      const createCourse = createCreateCourse(capabilities);

      await expect(
        createCourse({
          adminUser: activeAdmin(),
          name: "  Course name  ",
          timezone,
        }),
      ).resolves.toEqual({
        outcome: "created",
        course: {
          id: "course-1",
          name: "  Course name  ",
          description: null,
          timezone: "Europe/Berlin",
          state: "active",
        },
      });
      expect(capabilities.createCourseForActiveAdmin).toHaveBeenCalledWith({
        adminUserId: "admin-1",
        course: {
          id: "course-1",
          name: "  Course name  ",
          description: null,
          timezone: "Europe/Berlin",
          state: "active",
        },
      });
    },
  );

  it("preserves an optional description and selected IANA timezone", async () => {
    const createCourse = createCreateCourse(createCapabilities());

    await expect(
      createCourse({
        adminUser: activeAdmin(),
        name: "Course",
        description: "  Free text  ",
        timezone: "America/New_York",
      }),
    ).resolves.toMatchObject({
      outcome: "created",
      course: {
        description: "  Free text  ",
        timezone: "America/New_York",
      },
    });
  });

  it("accepts two independently created Courses with the same name", async () => {
    const capabilities = createCapabilities();
    capabilities.createCourseId
      .mockReturnValueOnce("course-1")
      .mockReturnValueOnce("course-2");
    const createCourse = createCreateCourse(capabilities);

    const results = await Promise.all([
      createCourse({ adminUser: activeAdmin(), name: "Same name" }),
      createCourse({ adminUser: activeAdmin(), name: "Same name" }),
    ]);

    expect(results).toMatchObject([
      { outcome: "created", course: { id: "course-1" } },
      { outcome: "created", course: { id: "course-2" } },
    ]);
    expect(capabilities.createCourseForActiveAdmin).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, null, { id: "admin-1", state: "disabled" }])(
    "refuses a non-Active Admin %j before any side effect",
    async (adminUser) => {
      const capabilities = createCapabilities();
      const createCourse = createCreateCourse(capabilities);

      await expect(
        createCourse({ adminUser, name: "Course" }),
      ).resolves.toEqual({ outcome: "admin-not-active" });
      expect(capabilities.createCourseId).not.toHaveBeenCalled();
      expect(capabilities.createCourseForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it("reports a stale persistence refusal without a created Course", async () => {
    const capabilities = createCapabilities();
    capabilities.createCourseForActiveAdmin.mockResolvedValue(
      "admin-not-active",
    );
    const createCourse = createCreateCourse(capabilities);

    await expect(
      createCourse({ adminUser: activeAdmin(), name: "Course" }),
    ).resolves.toEqual({ outcome: "admin-not-active" });
  });
});

/**
 * Create one deterministic Active Admin input.
 *
 * @returns {object} An Active Admin User.
 */
function activeAdmin() {
  return { id: "admin-1", state: "active" };
}

/**
 * Create observable narrow Course capabilities.
 *
 * @returns {object} Course identity and persistence test capabilities.
 */
function createCapabilities() {
  return {
    createCourseId: vi.fn(() => "course-1"),
    createCourseForActiveAdmin: vi.fn(async () => "created"),
  };
}
