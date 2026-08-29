import { describe, expect, it, vi } from "vitest";

import { createArchiveCourse } from "./createArchiveCourse.js";

const currentInstant = "2026-08-29T10:00:00.000Z";

describe("Course archival", () => {
  it.each([
    ["zero Modules", []],
    ["one exact-end Scheduled Module", [moduleData("scheduled", currentInstant)]],
    ["one ended Scheduled Module", [moduleData("scheduled", "2026-08-29T09:59:59.999Z")]],
    ["one future Cancelled Module", [moduleData("cancelled", "2026-08-29T11:00:00.000Z")]],
    [
      "mixed ended and Cancelled Modules",
      [
        moduleData("scheduled", "2026-08-29T09:00:00.000Z", "module-ended"),
        moduleData("cancelled", "2026-08-29T12:00:00.000Z", "module-cancelled"),
      ],
    ],
  ])("archives %s without rewriting retained Course data", async (_label, modules) => {
    const archiveActiveCourse = vi.fn().mockResolvedValue("archived");
    const archive = createArchiveCourse({
      now: () => currentInstant,
      archiveActiveCourse,
    });

    await expect(archive({
      adminUser: activeAdmin(),
      course: activeCourse(),
      modules,
    })).resolves.toEqual({
      outcome: "archived",
      course: { ...activeCourse(), state: "archived" },
    });
    expect(archiveActiveCourse).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      courseId: "course-a",
      nowEpoch: Date.parse(currentInstant),
    });
  });

  it.each([
    ["upcoming", "2026-08-29T12:00:00.000Z"],
    ["in progress", "2026-08-29T10:00:00.001Z"],
  ])("blocks an unresolved %s Scheduled Module", async (_label, endsAt) => {
    const capabilities = archivalCapabilities();
    const archive = createArchiveCourse(capabilities);

    await expect(archive({
      adminUser: activeAdmin(),
      course: activeCourse(),
      modules: [moduleData("scheduled", endsAt)],
    })).resolves.toEqual({ outcome: "course-archival-blocked" });
    expect(capabilities.archiveActiveCourse).not.toHaveBeenCalled();
  });

  it("blocks when any one Module in a mixed Course is unresolved", async () => {
    const capabilities = archivalCapabilities();
    const archive = createArchiveCourse(capabilities);

    await expect(archive({
      adminUser: activeAdmin(),
      course: activeCourse(),
      modules: [
        moduleData("scheduled", currentInstant, "module-ended"),
        moduleData("cancelled", "2026-08-29T13:00:00.000Z", "module-cancelled"),
        moduleData("scheduled", "2026-08-29T10:00:00.001Z", "module-open"),
      ],
    })).resolves.toEqual({ outcome: "course-archival-blocked" });
    expect(capabilities.archiveActiveCourse).not.toHaveBeenCalled();
  });

  it.each([
    ["missing Admin", null, activeCourse(), [], "admin-not-active"],
    ["Disabled Admin", { id: "admin-a", state: "disabled" }, activeCourse(), [], "admin-not-active"],
    ["missing Course", activeAdmin(), null, [], "course-not-active"],
    ["already Archived Course", activeAdmin(), { ...activeCourse(), state: "archived" }, [], "course-not-active"],
    ["missing Module context", activeAdmin(), activeCourse(), null, "course-not-archivable"],
    ["cross-Course Module", activeAdmin(), activeCourse(), [{ ...moduleData(), courseId: "course-b" }], "course-not-archivable"],
    ["unknown Module state", activeAdmin(), activeCourse(), [{ ...moduleData(), state: "pending" }], "course-not-archivable"],
    ["invalid Module end", activeAdmin(), activeCourse(), [moduleData("scheduled", "invalid")], "course-not-archivable"],
  ])("refuses %s before reading time or persisting", async (
    _label,
    adminUser,
    course,
    modules,
    outcome,
  ) => {
    const capabilities = archivalCapabilities();
    const archive = createArchiveCourse(capabilities);

    await expect(archive({ adminUser, course, modules })).resolves.toEqual({
      outcome,
    });
    expect(capabilities.now).not.toHaveBeenCalled();
    expect(capabilities.archiveActiveCourse).not.toHaveBeenCalled();
  });

  it("refuses an invalid authoritative instant without persistence", async () => {
    const capabilities = archivalCapabilities("not-an-instant");
    const archive = createArchiveCourse(capabilities);

    await expect(archive({
      adminUser: activeAdmin(),
      course: activeCourse(),
      modules: [],
    })).resolves.toEqual({ outcome: "course-not-archivable" });
    expect(capabilities.now).toHaveBeenCalledOnce();
    expect(capabilities.archiveActiveCourse).not.toHaveBeenCalled();
  });

  it.each([
    "admin-not-active",
    "course-not-active",
    "course-archival-blocked",
    "course-not-archived",
  ])("preserves authoritative persistence refusal %s", async (outcome) => {
    const archive = createArchiveCourse({
      now: () => currentInstant,
      archiveActiveCourse: async () => outcome,
    });

    await expect(archive({
      adminUser: activeAdmin(),
      course: activeCourse(),
      modules: [],
    })).resolves.toEqual({ outcome });
  });
});

/** @returns {object} Deterministic archival capabilities. */
function archivalCapabilities(now = currentInstant) {
  return {
    now: vi.fn(() => now),
    archiveActiveCourse: vi.fn().mockResolvedValue("archived"),
  };
}

/** @returns {object} Current Active Admin. */
function activeAdmin() {
  return { id: "admin-a", state: "active" };
}

/** @returns {object} Current Active Course with retained fields/history. */
function activeCourse() {
  return {
    id: "course-a",
    name: "Course A",
    description: "Retained description",
    timezone: "Europe/Berlin",
    state: "active",
    hasEverHadModule: true,
  };
}

/** @returns {object} One same-Course Module. */
function moduleData(
  state = "scheduled",
  endsAt = currentInstant,
  id = "module-a",
) {
  return {
    id,
    courseId: "course-a",
    state,
    endsAt,
  };
}
