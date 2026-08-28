import { describe, expect, it, vi } from "vitest";

import { createRescheduleModule } from "./createRescheduleModule.js";
import { createUpdateModuleDetails } from "./createUpdateModuleDetails.js";

const fixedNow = "2027-01-15T09:30:00.000Z";
const adminUser = { id: "admin-1", state: "active" };
const course = {
  id: "course-1",
  state: "active",
  timezone: "Europe/Berlin",
};
const scheduledModule = {
  id: "module-1",
  courseId: course.id,
  title: "Original",
  description: "Old description",
  instructions: "Old instructions",
  startsAt: "2027-01-15T10:00:00.000Z",
  endsAt: "2027-01-15T11:00:00.000Z",
  state: "scheduled",
};

describe("Module descriptive editing", () => {
  it.each([
    ["upcoming Scheduled", scheduledModule],
    ["in-progress Scheduled", {
      ...scheduledModule,
      startsAt: "2027-01-15T08:00:00.000Z",
      endsAt: "2027-01-15T10:00:00.000Z",
    }],
    ["ended Scheduled", {
      ...scheduledModule,
      startsAt: "2027-01-15T07:00:00.000Z",
      endsAt: "2027-01-15T08:00:00.000Z",
    }],
    ["Cancelled", { ...scheduledModule, state: "cancelled" }],
  ])("updates all text for a %s Module only", async (_label, module) => {
    const updateModuleDetailsForActiveAdmin = vi.fn(async () => "updated");
    const update = createUpdateModuleDetails({
      updateModuleDetailsForActiveAdmin,
    });

    await expect(update(detailInput({ module }))).resolves.toEqual({
      outcome: "updated",
      module: {
        ...module,
        title: "Updated",
        description: null,
        instructions: "New instructions",
      },
    });
    expect(updateModuleDetailsForActiveAdmin).toHaveBeenCalledWith({
      adminUserId: adminUser.id,
      module: expect.objectContaining({
        id: module.id,
        courseId: module.courseId,
        startsAt: module.startsAt,
        endsAt: module.endsAt,
        state: module.state,
      }),
    });
  });

  it.each([
    [{ title: "  " }, "invalid-title"],
    [{ description: undefined }, "invalid-description"],
    [{ description: 1 }, "invalid-description"],
    [{ instructions: undefined }, "invalid-instructions"],
    [{ instructions: false }, "invalid-instructions"],
  ])("refuses invalid complete text %j", async (override, outcome) => {
    const persistence = vi.fn();
    const update = createUpdateModuleDetails({
      updateModuleDetailsForActiveAdmin: persistence,
    });

    await expect(update(detailInput(override))).resolves.toEqual({ outcome });
    expect(persistence).not.toHaveBeenCalled();
  });

  it.each([
    [{ adminUser: { ...adminUser, state: "disabled" } }, "admin-not-active"],
    [{ course: { ...course, state: "archived" } }, "course-not-active"],
    [{ module: { ...scheduledModule, courseId: "course-2" } }, "module-not-editable"],
    [{ module: { ...scheduledModule, state: "unknown" } }, "module-not-editable"],
  ])("refuses invalid editing context %j", async (override, outcome) => {
    const persistence = vi.fn();
    const update = createUpdateModuleDetails({
      updateModuleDetailsForActiveAdmin: persistence,
    });

    await expect(update(detailInput(override))).resolves.toEqual({ outcome });
    expect(persistence).not.toHaveBeenCalled();
  });

  it("propagates an authoritative stale detail refusal", async () => {
    const update = createUpdateModuleDetails({
      updateModuleDetailsForActiveAdmin: vi.fn(async () => "course-not-active"),
    });

    await expect(update(detailInput())).resolves.toEqual({
      outcome: "course-not-active",
    });
  });
});

describe("Module rescheduling", () => {
  it("replaces both instants while preserving identity, text, and state", async () => {
    const capabilities = rescheduleCapabilities();
    const reschedule = createRescheduleModule(capabilities);

    await expect(reschedule(scheduleInput())).resolves.toEqual({
      outcome: "rescheduled",
      module: {
        ...scheduledModule,
        startsAt: "2027-01-15T11:00:00.000Z",
        endsAt: "2027-01-15T12:00:00.000Z",
      },
    });
    expect(capabilities.rescheduleModuleForActiveAdmin).toHaveBeenCalledWith({
      acceptedNowEpoch: Date.parse(fixedNow),
      adminUserId: adminUser.id,
      courseTimezone: course.timezone,
      expectedStartsAt: scheduledModule.startsAt,
      expectedEndsAt: scheduledModule.endsAt,
      module: expect.objectContaining({
        id: scheduledModule.id,
        title: scheduledModule.title,
        state: "scheduled",
      }),
    });
  });

  it.each([
    ["exact current start", fixedNow],
    ["after current start", "2027-01-15T09:29:00.000Z"],
  ])("locks the schedule at %s", async (_label, startsAt) => {
    const capabilities = rescheduleCapabilities();
    const reschedule = createRescheduleModule(capabilities);

    await expect(reschedule(scheduleInput({
      module: { ...scheduledModule, startsAt },
    }))).resolves.toEqual({ outcome: "module-schedule-locked" });
    expect(capabilities.rescheduleModuleForActiveAdmin).not.toHaveBeenCalled();
  });

  it("always locks a Cancelled Module schedule", async () => {
    const capabilities = rescheduleCapabilities();
    const reschedule = createRescheduleModule(capabilities);

    await expect(reschedule(scheduleInput({
      module: { ...scheduledModule, state: "cancelled" },
    }))).resolves.toEqual({ outcome: "module-schedule-locked" });
    expect(capabilities.now).not.toHaveBeenCalled();
  });

  it.each([
    [{ startsAtLocal: "2027-01-15T10:29" }, "start-not-in-future"],
    [{ startsAtLocal: "2027-01-15T10:30" }, "start-not-in-future"],
    [{ endsAtLocal: "2027-01-15T12:00" }, "end-not-after-start"],
    [{ startsAtLocal: "2027-03-28T02:30" }, "nonexistent-starts-at"],
    [{ endsAtLocal: "bad" }, "invalid-ends-at"],
  ])("refuses invalid new interval %j", async (override, outcome) => {
    const capabilities = rescheduleCapabilities();
    const reschedule = createRescheduleModule(capabilities);

    await expect(reschedule(scheduleInput(override))).resolves.toEqual({ outcome });
    expect(capabilities.rescheduleModuleForActiveAdmin).not.toHaveBeenCalled();
  });

  it("requires an explicit overlap occurrence before persistence", async () => {
    const capabilities = rescheduleCapabilities();
    const reschedule = createRescheduleModule(capabilities);

    await expect(reschedule(scheduleInput({
      startsAtLocal: "2027-10-31T02:30",
      endsAtLocal: "2027-10-31T03:30",
    }))).resolves.toMatchObject({
      outcome: "schedule-disambiguation-required",
      schedule: {
        startsAt: {
          outcome: "disambiguation-required",
          candidates: [
            { occurrence: "earlier", instant: "2027-10-31T00:30:00.000Z" },
            { occurrence: "later", instant: "2027-10-31T01:30:00.000Z" },
          ],
        },
      },
    });
    expect(capabilities.rescheduleModuleForActiveAdmin).not.toHaveBeenCalled();
  });

  it.each([
    "admin-not-active",
    "course-not-active",
    "course-timezone-changed",
    "module-schedule-locked",
    "module-schedule-changed",
  ])("propagates guarded persistence refusal %s", async (outcome) => {
    const capabilities = rescheduleCapabilities();
    capabilities.rescheduleModuleForActiveAdmin.mockResolvedValue(outcome);
    const reschedule = createRescheduleModule(capabilities);

    await expect(reschedule(scheduleInput())).resolves.toEqual({ outcome });
  });
});

/** @returns {object} Complete valid detail input. */
function detailInput(override = {}) {
  return {
    adminUser,
    course,
    module: scheduledModule,
    title: "Updated",
    description: null,
    instructions: "New instructions",
    ...override,
  };
}

/** @returns {object} Complete valid reschedule input. */
function scheduleInput(override = {}) {
  return {
    adminUser,
    course,
    module: scheduledModule,
    startsAtLocal: "2027-01-15T12:00",
    endsAtLocal: "2027-01-15T13:00",
    ...override,
  };
}

/** @returns {object} Deterministic reschedule capabilities. */
function rescheduleCapabilities() {
  return {
    now: vi.fn(() => fixedNow),
    rescheduleModuleForActiveAdmin: vi.fn(async () => "rescheduled"),
  };
}
