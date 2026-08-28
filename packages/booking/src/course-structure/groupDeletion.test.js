import { describe, expect, it, vi } from "vitest";

import { createDeleteGroup } from "./createDeleteGroup.js";

const adminUser = { id: "admin-1", state: "active" };
const course = { id: "course-1", state: "active" };
const activeGroup = {
  id: "group-1",
  courseId: course.id,
  name: "Group One",
  normalizedName: "group one",
  details: "Room One",
  state: "active",
};

describe("Group deletion", () => {
  it.each(["active", "archived"])(
    "deletes an unreferenced %s Group without changing its representation",
    async (state) => {
      const deleteUnreferencedGroup = vi.fn().mockResolvedValue("deleted");
      const group = { ...activeGroup, state };
      const deleteGroup = createDeleteGroup({ deleteUnreferencedGroup });

      await expect(deleteGroup({
        adminUser,
        course,
        group,
        selectionContexts: [],
      })).resolves.toEqual({ outcome: "deleted", group });
      expect(deleteUnreferencedGroup).toHaveBeenCalledWith({
        adminUserId: adminUser.id,
        courseId: course.id,
        groupId: group.id,
      });
    },
  );

  it.each([
    ["upcoming", { moduleState: "scheduled", startsAt: "2027-01-01T10:00:00.000Z" }],
    ["exact start", { moduleState: "scheduled", startsAt: "2026-08-28T10:00:00.000Z" }],
    ["in progress", { moduleState: "scheduled", startsAt: "2026-08-28T09:00:00.000Z" }],
    ["ended", { moduleState: "scheduled", startsAt: "2026-08-27T09:00:00.000Z" }],
    ["Cancelled", { moduleState: "cancelled", startsAt: "2027-01-01T10:00:00.000Z" }],
  ])("blocks every retained %s Selection without consulting time or state", async (
    _label,
    selectionContext,
  ) => {
    const deleteUnreferencedGroup = vi.fn();
    const deleteGroup = createDeleteGroup({ deleteUnreferencedGroup });

    await expect(deleteGroup({
      adminUser,
      course,
      group: activeGroup,
      selectionContexts: [selectionContext],
    })).resolves.toEqual({ outcome: "group-deletion-blocked" });
    expect(deleteUnreferencedGroup).not.toHaveBeenCalled();
  });

  it("does not invent a past-reference blocker after removal or replacement", async () => {
    const deleteUnreferencedGroup = vi.fn().mockResolvedValue("deleted");
    const deleteGroup = createDeleteGroup({ deleteUnreferencedGroup });

    await expect(deleteGroup({
      adminUser,
      course,
      group: activeGroup,
      selectionContexts: [],
      removedPastReferences: ["selection-that-no-longer-exists"],
    })).resolves.toMatchObject({ outcome: "deleted" });
  });

  it.each([
    ["inactive Admin", { adminUser: { ...adminUser, state: "disabled" } }, "admin-not-active"],
    ["Archived Course", { course: { ...course, state: "archived" } }, "course-not-active"],
    ["cross-Course Group", { group: { ...activeGroup, courseId: "course-2" } }, "group-not-deletable"],
    ["unknown Group state", { group: { ...activeGroup, state: "deleted" } }, "group-not-deletable"],
    ["missing contexts", { selectionContexts: undefined }, "group-not-deletable"],
  ])("refuses an %s before persistence", async (_label, overrides, outcome) => {
    const deleteUnreferencedGroup = vi.fn();
    const deleteGroup = createDeleteGroup({ deleteUnreferencedGroup });

    await expect(deleteGroup({
      adminUser,
      course,
      group: activeGroup,
      selectionContexts: [],
      ...overrides,
    })).resolves.toEqual({ outcome });
    expect(deleteUnreferencedGroup).not.toHaveBeenCalled();
  });

  it("propagates an authoritative stale-reference refusal", async () => {
    const deleteGroup = createDeleteGroup({
      deleteUnreferencedGroup: vi.fn().mockResolvedValue("group-deletion-blocked"),
    });

    await expect(deleteGroup({
      adminUser,
      course,
      group: activeGroup,
      selectionContexts: [],
    })).resolves.toEqual({ outcome: "group-deletion-blocked" });
  });
});
