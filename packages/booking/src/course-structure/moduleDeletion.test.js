import { describe, expect, it, vi } from "vitest";

import { createDeleteModule } from "./createDeleteModule.js";

const adminUser = { id: "admin-1", state: "active" };
const course = { id: "course-1", state: "active" };
const scheduledModule = {
  id: "module-1",
  courseId: course.id,
  title: "Module One",
  description: "Details",
  instructions: "Instructions",
  startsAt: "2027-01-15T11:00:00.000Z",
  endsAt: "2027-01-15T12:00:00.000Z",
  state: "scheduled",
};

describe("Module deletion", () => {
  it.each([
    ["upcoming Scheduled", scheduledModule],
    ["exact-start Scheduled", {
      ...scheduledModule,
      startsAt: "2027-01-15T10:00:00.000Z",
    }],
    ["in-progress Scheduled", {
      ...scheduledModule,
      startsAt: "2027-01-15T09:00:00.000Z",
    }],
    ["ended Scheduled", {
      ...scheduledModule,
      startsAt: "2027-01-15T08:00:00.000Z",
      endsAt: "2027-01-15T09:00:00.000Z",
    }],
    ["Cancelled", { ...scheduledModule, state: "cancelled" }],
  ])("deletes an unreferenced %s Module without consulting time", async (
    _label,
    module,
  ) => {
    const deleteUnreferencedModule = vi.fn().mockResolvedValue("deleted");
    const deleteModule = createDeleteModule({ deleteUnreferencedModule });

    await expect(deleteModule(deletionInput({ module }))).resolves.toEqual({
      outcome: "deleted",
      module,
    });
    expect(deleteUnreferencedModule).toHaveBeenCalledWith({
      adminUserId: adminUser.id,
      courseId: course.id,
      moduleId: module.id,
    });
  });

  it.each([
    ["upcoming", { phase: "upcoming", meaning: "live" }],
    ["exact start", { phase: "in-progress", meaning: "live" }],
    ["in progress", { phase: "in-progress", meaning: "live" }],
    ["ended", { phase: "historical", meaning: "historical" }],
    ["Cancelled", { phase: "historical", meaning: "historical" }],
  ])("blocks every retained %s Selection", async (_label, context) => {
    const deleteUnreferencedModule = vi.fn();
    const deleteModule = createDeleteModule({ deleteUnreferencedModule });

    await expect(deleteModule(deletionInput({
      selectionContexts: [context],
    }))).resolves.toEqual({ outcome: "module-deletion-blocked" });
    expect(deleteUnreferencedModule).not.toHaveBeenCalled();
  });

  it("does not invent a past-reference blocker after Selection removal", async () => {
    const deleteUnreferencedModule = vi.fn().mockResolvedValue("deleted");
    const deleteModule = createDeleteModule({ deleteUnreferencedModule });

    await expect(deleteModule(deletionInput({
      removedPastReferences: ["selection-that-no-longer-exists"],
    }))).resolves.toMatchObject({ outcome: "deleted" });
  });

  it.each([
    ["inactive Admin", { adminUser: { ...adminUser, state: "disabled" } }, "admin-not-active"],
    ["Archived Course", { course: { ...course, state: "archived" } }, "course-not-active"],
    ["cross-Course Module", { module: { ...scheduledModule, courseId: "course-2" } }, "module-not-deletable"],
    ["unknown Module state", { module: { ...scheduledModule, state: "deleted" } }, "module-not-deletable"],
    ["missing contexts", { selectionContexts: undefined }, "module-not-deletable"],
  ])("refuses %s before persistence", async (_label, overrides, outcome) => {
    const deleteUnreferencedModule = vi.fn();
    const deleteModule = createDeleteModule({ deleteUnreferencedModule });

    await expect(deleteModule(deletionInput(overrides))).resolves.toEqual({
      outcome,
    });
    expect(deleteUnreferencedModule).not.toHaveBeenCalled();
  });

  it("propagates an authoritative stale-reference refusal", async () => {
    const deleteModule = createDeleteModule({
      deleteUnreferencedModule: vi
        .fn()
        .mockResolvedValue("module-deletion-blocked"),
    });

    await expect(deleteModule(deletionInput())).resolves.toEqual({
      outcome: "module-deletion-blocked",
    });
  });
});

/** @returns {object} Complete valid Module deletion input. */
function deletionInput(overrides = {}) {
  return {
    adminUser,
    course,
    module: scheduledModule,
    selectionContexts: [],
    ...overrides,
  };
}
