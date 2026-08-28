import { describe, expect, it, vi } from "vitest";

import { createCancelModule } from "./createCancelModule.js";

const fixedNow = "2027-01-15T10:00:00.000Z";
const adminUser = { id: "admin-1", state: "active" };
const course = { id: "course-1", state: "active" };
const moduleData = {
  id: "module-1",
  courseId: course.id,
  title: "Cancellation Module",
  description: "Retained description",
  instructions: "Retained instructions",
  startsAt: "2027-01-15T11:00:00.000Z",
  endsAt: "2027-01-15T12:00:00.000Z",
  state: "scheduled",
};

describe("Module cancellation", () => {
  it.each([
    ["upcoming", moduleData],
    ["exact start", { ...moduleData, startsAt: fixedNow }],
    ["in progress", { ...moduleData, startsAt: "2027-01-15T09:00:00.000Z" }],
  ])("cancels a %s Module while preserving every other field", async (_label, module) => {
    const capabilities = cancellationCapabilities();
    const cancel = createCancelModule(capabilities);

    await expect(cancel(cancellationInput({ module }))).resolves.toEqual({
      outcome: "cancelled",
      module: { ...module, state: "cancelled" },
    });
    expect(capabilities.now).toHaveBeenCalledTimes(1);
    expect(capabilities.cancelScheduledModule).toHaveBeenCalledWith({
      adminUserId: adminUser.id,
      courseId: course.id,
      moduleId: module.id,
      nowEpoch: Date.parse(fixedNow),
    });
  });

  it.each([
    ["exact end", fixedNow],
    ["ended", "2027-01-15T09:59:59.999Z"],
  ])("refuses cancellation at %s", async (_label, endsAt) => {
    const capabilities = cancellationCapabilities();
    const cancel = createCancelModule(capabilities);

    await expect(cancel(cancellationInput({
      module: { ...moduleData, endsAt },
    }))).resolves.toEqual({
      outcome: "module-cancellation-deadline-reached",
    });
    expect(capabilities.cancelScheduledModule).not.toHaveBeenCalled();
  });

  it.each([
    [{ adminUser: { ...adminUser, state: "disabled" } }, "admin-not-active"],
    [{ course: { ...course, state: "archived" } }, "course-not-active"],
    [{ module: { ...moduleData, courseId: "course-2" } }, "module-not-cancellable"],
    [{ module: { ...moduleData, endsAt: "invalid" } }, "module-not-cancellable"],
    [{ module: { ...moduleData, state: "cancelled" } }, "module-not-scheduled"],
  ])("refuses invalid or terminal context %j", async (override, outcome) => {
    const capabilities = cancellationCapabilities();
    const cancel = createCancelModule(capabilities);

    await expect(cancel(cancellationInput(override))).resolves.toEqual({ outcome });
    expect(capabilities.now).not.toHaveBeenCalled();
    expect(capabilities.cancelScheduledModule).not.toHaveBeenCalled();
  });

  it.each([
    "admin-not-active",
    "course-not-active",
    "module-not-scheduled",
    "module-cancellation-deadline-reached",
  ])("propagates authoritative refusal %s", async (outcome) => {
    const capabilities = cancellationCapabilities();
    capabilities.cancelScheduledModule.mockResolvedValue(outcome);
    const cancel = createCancelModule(capabilities);

    await expect(cancel(cancellationInput())).resolves.toEqual({ outcome });
  });
});

/** @returns {object} Complete valid cancellation input. */
function cancellationInput(override = {}) {
  return { adminUser, course, module: moduleData, ...override };
}

/** @returns {object} Deterministic cancellation capabilities. */
function cancellationCapabilities() {
  return {
    now: vi.fn(() => fixedNow),
    cancelScheduledModule: vi.fn(async () => "cancelled"),
  };
}
