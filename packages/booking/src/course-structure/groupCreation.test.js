import { describe, expect, it, vi } from "vitest";

import {
  createCreateGroup,
  normalizeGroupName,
} from "./createCreateGroup.js";

describe("Group creation", () => {
  it.each([undefined, null, "", "  ", 12])(
    "refuses invalid name input %j before identity or persistence",
    async (name) => {
      const capabilities = createCapabilities();
      const createGroup = createCreateGroup(capabilities);

      await expect(
        createGroup({ adminUser: activeAdmin(), course: activeCourse(), name }),
      ).resolves.toEqual({ outcome: "invalid-name" });
      expect(capabilities.createGroupId).not.toHaveBeenCalled();
      expect(capabilities.createGroupForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it.each([false, 12, {}, []])(
    "refuses invalid details input %j",
    async (details) => {
      const capabilities = createCapabilities();
      const createGroup = createCreateGroup(capabilities);

      await expect(
        createGroup({
          adminUser: activeAdmin(),
          course: activeCourse(),
          name: "Group",
          details,
        }),
      ).resolves.toEqual({ outcome: "invalid-details" });
      expect(capabilities.createGroupForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it.each([
    [undefined, "admin-not-active"],
    [{ id: "admin-1", state: "disabled" }, "admin-not-active"],
  ])("refuses non-Active Admin input %j", async (adminUser, outcome) => {
    const capabilities = createCapabilities();
    const createGroup = createCreateGroup(capabilities);

    await expect(
      createGroup({ adminUser, course: activeCourse(), name: "Group" }),
    ).resolves.toEqual({ outcome });
    expect(capabilities.createGroupId).not.toHaveBeenCalled();
  });

  it.each([undefined, null, { id: "course-1", state: "archived" }])(
    "refuses non-Active Course input %j",
    async (course) => {
      const capabilities = createCapabilities();
      const createGroup = createCreateGroup(capabilities);

      await expect(
        createGroup({ adminUser: activeAdmin(), course, name: "Group" }),
      ).resolves.toEqual({ outcome: "course-not-active" });
      expect(capabilities.createGroupId).not.toHaveBeenCalled();
    },
  );

  it("creates a stable Active Course-wide Group and preserves free text", async () => {
    const capabilities = createCapabilities();
    const createGroup = createCreateGroup(capabilities);

    await expect(
      createGroup({
        adminUser: activeAdmin(),
        course: activeCourse(),
        name: "  Gruppe Ä  ",
        details: "  Raum A oder Link  ",
      }),
    ).resolves.toEqual({
      outcome: "created",
      group: {
        id: "group-1",
        courseId: "course-1",
        name: "  Gruppe Ä  ",
        normalizedName: "gruppe ä",
        details: "  Raum A oder Link  ",
        state: "active",
      },
    });
    expect(capabilities.createGroupForActiveAdmin).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      group: expect.objectContaining({
        id: "group-1",
        courseId: "course-1",
        normalizedName: "gruppe ä",
      }),
    });
  });

  it.each([undefined, null])(
    "stores omitted optional details %j as null",
    async (details) => {
      const createGroup = createCreateGroup(createCapabilities());

      await expect(
        createGroup({
          adminUser: activeAdmin(),
          course: activeCourse(),
          name: "Group",
          details,
        }),
      ).resolves.toMatchObject({ group: { details: null } });
    },
  );

  it.each([
    "admin-not-active",
    "course-not-active",
    "group-name-conflict",
  ])("returns persistence refusal %s without a created Group", async (outcome) => {
    const capabilities = createCapabilities();
    capabilities.createGroupForActiveAdmin.mockResolvedValue(outcome);
    const createGroup = createCreateGroup(capabilities);

    await expect(
      createGroup({
        adminUser: activeAdmin(),
        course: activeCourse(),
        name: "Group",
      }),
    ).resolves.toEqual({ outcome });
  });
});

describe("Group name normalization", () => {
  it.each([
    [" Group A ", "group a"],
    ["GROUP A", "group a"],
    ["Gruppe Ä", "gruppe ä"],
    ["Group  A", "group  a"],
  ])("normalizes %j to %j", (name, normalizedName) => {
    expect(normalizeGroupName(name)).toBe(normalizedName);
  });
});

/**
 * Create deterministic Active Admin input.
 *
 * @returns {object} Active Admin User.
 */
function activeAdmin() {
  return { id: "admin-1", state: "active" };
}

/**
 * Create deterministic Active Course input.
 *
 * @returns {object} Active Course.
 */
function activeCourse() {
  return { id: "course-1", state: "active" };
}

/**
 * Create observable Group identity and persistence capabilities.
 *
 * @returns {object} Group creation capabilities.
 */
function createCapabilities() {
  return {
    createGroupId: vi.fn(() => "group-1"),
    createGroupForActiveAdmin: vi.fn(async () => "created"),
  };
}
