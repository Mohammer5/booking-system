import { describe, expect, it, vi } from "vitest";

import {
  createArchiveGroup,
  isGroupArchivalBlocked,
} from "./createArchiveGroup.js";
import { createReactivateGroup } from "./createReactivateGroup.js";
import { createUpdateGroup } from "./createUpdateGroup.js";

const currentInstant = "2026-08-28T10:00:00.000Z";

describe("Group editing", () => {
  it.each([
    [null, course(), group(), validFields(), "admin-not-active"],
    [admin("disabled"), course(), group(), validFields(), "admin-not-active"],
    [admin(), course("archived"), group(), validFields(), "course-not-active"],
    [admin(), course(), null, validFields(), "group-not-editable"],
    [admin(), course(), group("active", { courseId: "other" }), validFields(), "group-not-editable"],
  ])("refuses invalid actor, Course, or Group before persistence", async (
    adminUser,
    currentCourse,
    target,
    fields,
    outcome,
  ) => {
    const capabilities = updateCapabilities();
    const updateGroup = createUpdateGroup(capabilities);

    await expect(
      updateGroup({
        adminUser,
        course: currentCourse,
        group: target,
        courseGroups: target === null ? [] : [target],
        ...fields,
      }),
    ).resolves.toEqual({ outcome });
    expect(capabilities.updateGroupForActiveAdmin).not.toHaveBeenCalled();
  });

  it.each([
    [{ name: "  " }, "invalid-name"],
    [{ details: undefined }, "invalid-details"],
    [{ details: 12 }, "invalid-details"],
  ])("refuses invalid complete fields %j", async (override, outcome) => {
    const capabilities = updateCapabilities();
    const updateGroup = createUpdateGroup(capabilities);

    await expect(updateGroup(updateInput(override))).resolves.toEqual({ outcome });
    expect(capabilities.updateGroupForActiveAdmin).not.toHaveBeenCalled();
  });

  it("updates an Active Group while preserving identity, ownership, state, and retained data", async () => {
    const capabilities = updateCapabilities();
    const updateGroup = createUpdateGroup(capabilities);
    const target = group("active", {
      selections: [{ id: "selection-1" }],
      stableMetadata: "retained",
    });

    await expect(
      updateGroup({
        adminUser: admin(),
        course: course(),
        group: target,
        courseGroups: [target],
        name: "  RENAMED Group  ",
        details: "  Updated details  ",
      }),
    ).resolves.toEqual({
      outcome: "updated",
      group: {
        ...target,
        name: "  RENAMED Group  ",
        normalizedName: "renamed group",
        details: "  Updated details  ",
      },
    });
    expect(capabilities.updateGroupForActiveAdmin).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      expectedState: "active",
      group: expect.objectContaining({
        id: "group-1",
        courseId: "course-1",
        state: "active",
        selections: [{ id: "selection-1" }],
      }),
    });
  });

  it("refuses a normalized Active-name conflict but permits it for an Archived edit", async () => {
    const activeTarget = group();
    const conflicting = group("active", {
      id: "group-2",
      name: " Group Two ",
      normalizedName: "group two",
    });
    const capabilities = updateCapabilities();
    const updateGroup = createUpdateGroup(capabilities);
    const fields = { name: "GROUP TWO", details: null };

    await expect(
      updateGroup({
        adminUser: admin(),
        course: course(),
        group: activeTarget,
        courseGroups: [activeTarget, conflicting],
        ...fields,
      }),
    ).resolves.toEqual({ outcome: "group-name-conflict" });
    expect(capabilities.updateGroupForActiveAdmin).not.toHaveBeenCalled();

    const archivedTarget = group("archived");
    await expect(
      updateGroup({
        adminUser: admin(),
        course: course(),
        group: archivedTarget,
        courseGroups: [archivedTarget, conflicting],
        ...fields,
      }),
    ).resolves.toMatchObject({
      outcome: "updated",
      group: { normalizedName: "group two", state: "archived" },
    });
  });

  it("preserves an authoritative stale update refusal", async () => {
    const updateGroup = createUpdateGroup({
      updateGroupForActiveAdmin: async () => "group-state-changed",
    });

    await expect(updateGroup(updateInput())).resolves.toEqual({
      outcome: "group-state-changed",
    });
  });
});

describe("Group archival", () => {
  it.each([
    ["upcoming Scheduled", "scheduled", "2026-08-28T10:00:00.001Z", true],
    ["exact start Scheduled", "scheduled", currentInstant, false],
    ["in-progress Scheduled", "scheduled", "2026-08-28T09:00:00.000Z", false],
    ["ended Scheduled", "scheduled", "2026-08-28T08:00:00.000Z", false],
    ["upcoming Cancelled", "cancelled", "2026-08-28T11:00:00.000Z", false],
    ["ended Cancelled", "cancelled", "2026-08-28T08:00:00.000Z", false],
  ])("classifies %s retained intent exactly", (_case, moduleState, startsAt, blocked) => {
    expect(
      isGroupArchivalBlocked(
        [{ moduleState, startsAt, endsAt: "2026-08-28T12:00:00.000Z" }],
        Date.parse(currentInstant),
      ),
    ).toBe(blocked);
  });

  it("refuses one upcoming Scheduled Selection without calling persistence", async () => {
    const archiveActiveGroup = vi.fn();
    const archiveGroup = createArchiveGroup({
      now: () => currentInstant,
      archiveActiveGroup,
    });

    await expect(
      archiveGroup(archiveInput([
        { moduleState: "cancelled", startsAt: "2026-08-28T11:00:00.000Z" },
        { moduleState: "scheduled", startsAt: "2026-08-28T11:00:00.000Z" },
      ])),
    ).resolves.toEqual({ outcome: "group-archival-blocked" });
    expect(archiveActiveGroup).not.toHaveBeenCalled();
  });

  it("archives the retained identity at the exact injected instant without rewriting data", async () => {
    const archiveActiveGroup = vi.fn(async () => "archived");
    const archiveGroup = createArchiveGroup({
      now: () => currentInstant,
      archiveActiveGroup,
    });
    const target = group("active", {
      details: "Retained details",
      selections: [{ id: "selection-history" }],
    });

    await expect(
      archiveGroup({
        adminUser: admin(),
        course: course(),
        group: target,
        selectionContexts: [
          { moduleState: "scheduled", startsAt: currentInstant },
          { moduleState: "cancelled", startsAt: "2026-08-28T11:00:00.000Z" },
        ],
      }),
    ).resolves.toEqual({
      outcome: "archived",
      group: { ...target, state: "archived" },
    });
    expect(archiveActiveGroup).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      courseId: "course-1",
      groupId: "group-1",
      nowEpoch: Date.parse(currentInstant),
    });
  });

  it.each([
    [null, course(), group(), "admin-not-active"],
    [admin(), course("archived"), group(), "course-not-active"],
    [admin(), course(), group("archived"), "group-not-active"],
  ])("refuses invalid archival current state", async (
    adminUser,
    currentCourse,
    target,
    outcome,
  ) => {
    const archiveActiveGroup = vi.fn();
    const archiveGroup = createArchiveGroup({
      now: () => currentInstant,
      archiveActiveGroup,
    });

    await expect(
      archiveGroup({
        adminUser,
        course: currentCourse,
        group: target,
        selectionContexts: [],
      }),
    ).resolves.toEqual({ outcome });
    expect(archiveActiveGroup).not.toHaveBeenCalled();
  });
});

describe("Group reactivation", () => {
  it("refuses a current normalized-name conflict", async () => {
    const reactivateArchivedGroup = vi.fn();
    const reactivateGroup = createReactivateGroup({ reactivateArchivedGroup });
    const target = group("archived");

    await expect(
      reactivateGroup({
        adminUser: admin(),
        course: course(),
        group: target,
        courseGroups: [
          target,
          group("active", { id: "group-2", normalizedName: "group one" }),
        ],
      }),
    ).resolves.toEqual({ outcome: "group-name-conflict" });
    expect(reactivateArchivedGroup).not.toHaveBeenCalled();
  });

  it("reactivates the same identity and details without restoring removed Selections", async () => {
    const reactivateArchivedGroup = vi.fn(async () => "reactivated");
    const reactivateGroup = createReactivateGroup({ reactivateArchivedGroup });
    const target = group("archived", {
      details: "Retained details",
      retainedSelections: [{ id: "selection-history" }],
      removedSelections: [],
    });

    await expect(
      reactivateGroup({
        adminUser: admin(),
        course: course(),
        group: target,
        courseGroups: [target],
      }),
    ).resolves.toEqual({
      outcome: "reactivated",
      group: { ...target, state: "active" },
    });
    expect(reactivateArchivedGroup).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      courseId: "course-1",
      groupId: "group-1",
    });
  });

  it.each([
    [null, course(), group("archived"), "admin-not-active"],
    [admin(), course("archived"), group("archived"), "course-not-active"],
    [admin(), course(), group("active"), "group-not-archived"],
  ])("refuses invalid reactivation current state", async (
    adminUser,
    currentCourse,
    target,
    outcome,
  ) => {
    const reactivateArchivedGroup = vi.fn();
    const reactivateGroup = createReactivateGroup({ reactivateArchivedGroup });

    await expect(
      reactivateGroup({
        adminUser,
        course: currentCourse,
        group: target,
        courseGroups: [target],
      }),
    ).resolves.toEqual({ outcome });
    expect(reactivateArchivedGroup).not.toHaveBeenCalled();
  });
});

/** @returns {object} Current Admin data. */
function admin(state = "active") {
  return { id: "admin-1", state };
}

/** @returns {object} Current Course data. */
function course(state = "active") {
  return { id: "course-1", state };
}

/** @returns {object} Current Group data. */
function group(state = "active", override = {}) {
  return {
    id: "group-1",
    courseId: "course-1",
    name: "Group One",
    normalizedName: "group one",
    details: null,
    state,
    ...override,
  };
}

/** @returns {object} Complete valid Group fields. */
function validFields(override = {}) {
  return { name: "Renamed", details: null, ...override };
}

/** @returns {object} Complete update operation input. */
function updateInput(override = {}) {
  const target = override.group ?? group();

  return {
    adminUser: admin(),
    course: course(),
    group: target,
    courseGroups: [target],
    ...validFields(),
    ...override,
  };
}

/** @returns {object} Complete archival operation input. */
function archiveInput(selectionContexts = []) {
  return {
    adminUser: admin(),
    course: course(),
    group: group(),
    selectionContexts,
  };
}

/** @returns {object} Observable update capability. */
function updateCapabilities() {
  return { updateGroupForActiveAdmin: vi.fn(async () => "updated") };
}
