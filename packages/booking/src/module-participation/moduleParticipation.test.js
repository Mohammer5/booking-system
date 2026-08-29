import { describe, expect, it, vi } from "vitest";

import { createRemoveParticipantModuleSelectionAsAdmin } from "./createRemoveParticipantModuleSelectionAsAdmin.js";
import { createRemoveParticipantModuleSelection } from "./createRemoveParticipantModuleSelection.js";
import { createSetParticipantModuleSelectionAsAdmin } from "./createSetParticipantModuleSelectionAsAdmin.js";
import { createSetParticipantModuleSelection } from "./createSetParticipantModuleSelection.js";
import { deriveAdminAssistedModuleSelectionAvailability } from "./deriveAdminAssistedModuleSelectionAvailability.js";
import { deriveModuleSelectionAvailability } from "./deriveModuleSelectionAvailability.js";
import { deriveModuleSelectionPresentation } from "./deriveModuleSelectionPresentation.js";

const beforeStart = "2026-09-01T09:00:00.000Z";

describe("Participant Module Selection set/change", () => {
  it.each([
    ["Disabled Participant", { participant: participant("disabled") }, "participant-not-active"],
    ["Archived Course", { course: course("archived") }, "course-not-active"],
    ["Revoked Assignment", { assignment: assignment("revoked") }, "assignment-not-active"],
    ["other Participant Assignment", { assignment: { ...assignment(), participantId: "other" } }, "assignment-not-active"],
    ["Cancelled Module", { module: moduleData("cancelled") }, "module-not-selectable"],
    ["cross-Course Module", { module: { ...moduleData(), courseId: "other" } }, "module-not-selectable"],
    ["Archived Group", { group: group("archived") }, "group-not-selectable"],
    ["cross-Course Group", { group: { ...group(), courseId: "other" } }, "group-not-selectable"],
  ])("refuses %s before identity or persistence", async (_case, replacement, outcome) => {
    const capabilities = setCapabilities();
    const setSelection = createSetParticipantModuleSelection(capabilities);

    await expect(setSelection({ ...eligibleInput(), ...replacement })).resolves.toEqual({ outcome });
    expect(capabilities.createModuleSelectionId).not.toHaveBeenCalled();
    expect(capabilities.setParticipantModuleSelection).not.toHaveBeenCalled();
  });

  it.each([
    [beforeStart, "created"],
    [beforeStart, "already-selected"],
    [beforeStart, "changed"],
  ])("preserves guarded persistence outcome %s", async (now, outcome) => {
    const persisted = { outcome, selection: selection() };
    const capabilities = setCapabilities(now, persisted);
    const setSelection = createSetParticipantModuleSelection(capabilities);

    await expect(setSelection(eligibleInput())).resolves.toEqual(persisted);
    expect(capabilities.setParticipantModuleSelection).toHaveBeenCalledWith({
      selection: selection(),
      nowEpoch: Date.parse(now),
    });
  });

  it.each([
    ["2026-09-01T10:00:00.000Z", "selection-deadline-reached"],
    ["2026-09-01T10:00:00.001Z", "selection-deadline-reached"],
    ["not-an-instant", "selection-deadline-reached"],
  ])("stops at the exact startsAt boundary %s", async (now, outcome) => {
    const capabilities = setCapabilities(now);
    const setSelection = createSetParticipantModuleSelection(capabilities);

    await expect(setSelection(eligibleInput())).resolves.toEqual({ outcome });
    expect(capabilities.setParticipantModuleSelection).not.toHaveBeenCalled();
  });

  it("does not inspect other Module intervals and therefore permits overlaps", async () => {
    const capabilities = setCapabilities();
    const setSelection = createSetParticipantModuleSelection(capabilities);

    await setSelection(eligibleInput());
    await setSelection({
      ...eligibleInput(),
      module: { ...moduleData(), id: "module-overlap" },
    });

    expect(capabilities.setParticipantModuleSelection).toHaveBeenCalledTimes(2);
  });
});

describe("Participant Module Selection removal", () => {
  it("removes an eligible pre-start Selection without creating membership", async () => {
    const removeParticipantModuleSelection = vi.fn().mockResolvedValue({
      outcome: "removed",
    });
    const removeSelection = createRemoveParticipantModuleSelection({
      now: () => beforeStart,
      removeParticipantModuleSelection,
    });

    await expect(removeSelection(eligibleInput())).resolves.toEqual({
      outcome: "removed",
    });
    expect(removeParticipantModuleSelection).toHaveBeenCalledWith({
      participantId: "participant-a",
      courseId: "course-a",
      moduleId: "module-a",
      nowEpoch: Date.parse(beforeStart),
    });
  });

  it("treats already-absent persistence as an idempotent success", async () => {
    const removeSelection = createRemoveParticipantModuleSelection({
      now: () => beforeStart,
      removeParticipantModuleSelection: async () => ({
        outcome: "already-absent",
      }),
    });

    await expect(removeSelection(eligibleInput())).resolves.toEqual({
      outcome: "already-absent",
    });
  });

  it("does not require a Group to remove current participation", async () => {
    const removeParticipantModuleSelection = vi.fn().mockResolvedValue({
      outcome: "removed",
    });
    const removeSelection = createRemoveParticipantModuleSelection({
      now: () => beforeStart,
      removeParticipantModuleSelection,
    });

    await removeSelection({ ...eligibleInput(), group: null });

    expect(removeParticipantModuleSelection).toHaveBeenCalledOnce();
  });
});

describe("Admin-assisted Module Selection set/change", () => {
  it.each([
    ["Disabled Admin", { adminUser: adminUser("disabled") }, "admin-not-active"],
    ["Disabled Participant", { participant: participant("disabled") }, "participant-not-active"],
    ["Archived Course", { course: course("archived") }, "course-not-active"],
    ["Cancelled Module", { module: moduleData("cancelled") }, "module-not-selectable"],
    ["cross-Course Module", { module: { ...moduleData(), courseId: "other" } }, "module-not-selectable"],
    ["Archived Group", { group: group("archived") }, "group-not-selectable"],
    ["cross-Course Group", { group: { ...group(), courseId: "other" } }, "group-not-selectable"],
    ["cross-Participant Assignment", { assignment: { ...assignment(), participantId: "other" } }, "assignment-not-assignable"],
    ["cross-Course Assignment", { assignment: { ...assignment(), courseId: "other" } }, "assignment-not-assignable"],
    ["cross-Participant Selection", { selection: { ...selection(), participantId: "other" } }, "selection-not-current"],
    ["cross-Course Selection", { selection: { ...selection(), courseId: "other" } }, "selection-not-current"],
    ["cross-Module Selection", { selection: { ...selection(), moduleId: "other" } }, "selection-not-current"],
  ])("refuses %s before creating identities or persistence", async (_case, replacement, outcome) => {
    const capabilities = adminSetCapabilities();
    const setSelection = createSetParticipantModuleSelectionAsAdmin(capabilities);

    await expect(
      setSelection({ ...adminEligibleInput(), ...replacement }),
    ).resolves.toEqual({ outcome });
    expect(capabilities.createCourseAssignmentId).not.toHaveBeenCalled();
    expect(capabilities.createModuleSelectionId).not.toHaveBeenCalled();
    expect(capabilities.setParticipantModuleSelectionAsAdmin).not.toHaveBeenCalled();
  });

  it.each([
    ["2026-09-01T10:00:00.000Z"],
    ["2026-09-01T10:00:00.001Z"],
    ["not-an-instant"],
  ])("refuses the exact or invalid deadline %s without membership", async (now) => {
    const capabilities = adminSetCapabilities(now);
    const setSelection = createSetParticipantModuleSelectionAsAdmin(capabilities);

    await expect(setSelection(adminEligibleInput())).resolves.toEqual({
      outcome: "selection-deadline-reached",
    });
    expect(capabilities.setParticipantModuleSelectionAsAdmin).not.toHaveBeenCalled();
  });

  it("composes missing membership and Selection into one guarded input", async () => {
    const capabilities = adminSetCapabilities();
    const setSelection = createSetParticipantModuleSelectionAsAdmin(capabilities);

    await expect(setSelection(adminEligibleInput())).resolves.toMatchObject({
      outcome: "created",
      assignmentOutcome: "created",
    });
    expect(capabilities.setParticipantModuleSelectionAsAdmin).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      assignment: assignment("active", "assignment-created"),
      selection: selection("selection-created"),
      nowEpoch: Date.parse(beforeStart),
    });
  });

  it.each(["active", "revoked"])(
    "retains an existing %s Assignment identity and Selection identity",
    async (assignmentState) => {
      const capabilities = adminSetCapabilities();
      const setSelection = createSetParticipantModuleSelectionAsAdmin(capabilities);

      await setSelection({
        ...adminEligibleInput(),
        assignment: assignment(assignmentState),
        selection: selection(),
        group: { ...group(), id: "group-b" },
      });

      expect(capabilities.createCourseAssignmentId).not.toHaveBeenCalled();
      expect(capabilities.createModuleSelectionId).not.toHaveBeenCalled();
      expect(capabilities.setParticipantModuleSelectionAsAdmin).toHaveBeenCalledWith({
        adminUserId: "admin-a",
        assignment: assignment("active"),
        selection: { ...selection(), groupId: "group-b" },
        nowEpoch: Date.parse(beforeStart),
      });
    },
  );

  it.each([
    ["created", "created"],
    ["already-selected", "already-active"],
    ["changed", "reactivated"],
  ])("preserves %s/%s persistence meaning", async (outcome, assignmentOutcome) => {
    const persisted = {
      outcome,
      assignmentOutcome,
      assignment: assignment(),
      selection: selection(),
    };
    const capabilities = adminSetCapabilities(beforeStart, persisted);

    await expect(
      createSetParticipantModuleSelectionAsAdmin(capabilities)(adminEligibleInput()),
    ).resolves.toEqual(persisted);
  });

  it("does not inspect other Module intervals and permits overlaps", async () => {
    const capabilities = adminSetCapabilities();
    const setSelection = createSetParticipantModuleSelectionAsAdmin(capabilities);

    await setSelection(adminEligibleInput());
    await setSelection({
      ...adminEligibleInput(),
      module: { ...moduleData(), id: "module-overlap" },
    });

    expect(capabilities.setParticipantModuleSelectionAsAdmin).toHaveBeenCalledTimes(2);
  });
});

describe("Admin-assisted Module Selection removal", () => {
  it("removes before start without inspecting or composing Assignment state", async () => {
    const persist = vi.fn().mockResolvedValue({ outcome: "removed" });
    const removeSelection = createRemoveParticipantModuleSelectionAsAdmin({
      now: () => beforeStart,
      removeParticipantModuleSelectionAsAdmin: persist,
    });

    await expect(
      removeSelection({ ...adminEligibleInput(), assignment: assignment("revoked") }),
    ).resolves.toEqual({ outcome: "removed" });
    expect(persist).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      participantId: "participant-a",
      courseId: "course-a",
      moduleId: "module-a",
      nowEpoch: Date.parse(beforeStart),
    });
  });

  it("preserves already-absent as an idempotent success", async () => {
    const removeSelection = createRemoveParticipantModuleSelectionAsAdmin({
      now: () => beforeStart,
      removeParticipantModuleSelectionAsAdmin: async () => ({
        outcome: "already-absent",
      }),
    });

    await expect(
      removeSelection({ ...adminEligibleInput(), selection: null }),
    ).resolves.toEqual({ outcome: "already-absent" });
  });

  it.each([
    ["Disabled Admin", { adminUser: adminUser("disabled") }, "admin-not-active"],
    ["Disabled Participant", { participant: participant("disabled") }, "participant-not-active"],
    ["Archived Course", { course: course("archived") }, "course-not-active"],
    ["Cancelled Module", { module: moduleData("cancelled") }, "module-not-selectable"],
    ["exact start", { now: "2026-09-01T10:00:00.000Z" }, "selection-deadline-reached"],
  ])("refuses %s without a persistence call", async (_case, replacement, outcome) => {
    const persist = vi.fn();
    const removeSelection = createRemoveParticipantModuleSelectionAsAdmin({
      now: () => replacement.now ?? beforeStart,
      removeParticipantModuleSelectionAsAdmin: persist,
    });
    const inputReplacement = { ...replacement };

    delete inputReplacement.now;

    await expect(
      removeSelection({ ...adminEligibleInput(), ...inputReplacement }),
    ).resolves.toEqual({ outcome });
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("Admin-assisted Module Selection availability", () => {
  it.each([
    [beforeStart, {}, "open"],
    ["2026-09-01T10:00:00.000Z", {}, "closed"],
    [beforeStart, { adminUser: adminUser("disabled") }, "closed"],
    [beforeStart, { participant: participant("disabled") }, "closed"],
    [beforeStart, { course: course("archived") }, "closed"],
    [beforeStart, { module: moduleData("cancelled") }, "closed"],
  ])("derives current availability at %s", (now, replacement, availability) => {
    expect(
      deriveAdminAssistedModuleSelectionAvailability({
        ...adminEligibleInput(),
        now,
        ...replacement,
      }),
    ).toBe(availability);
  });
});

describe("derived Module Selection presentation", () => {
  it.each([
    [beforeStart, {}, "open"],
    ["2026-09-01T10:00:00.000Z", {}, "closed"],
    [beforeStart, { module: moduleData("cancelled") }, "closed"],
    [beforeStart, { assignment: assignment("revoked") }, "closed"],
  ])("derives authoritative mutation availability at %s", (now, replacement, availability) => {
    expect(
      deriveModuleSelectionAvailability({
        ...eligibleInput(),
        now,
        ...replacement,
      }),
    ).toBe(availability);
  });

  it.each([
    ["before start", beforeStart, {}, "live", "upcoming"],
    ["exact start", "2026-09-01T10:00:00.000Z", {}, "live", "in-progress"],
    ["in progress", "2026-09-01T10:30:00.000Z", {}, "live", "in-progress"],
    ["exact end", "2026-09-01T11:00:00.000Z", {}, "historical", "historical"],
    ["Disabled Participant", beforeStart, { participant: participant("disabled") }, "historical", "historical"],
    ["Revoked Assignment", beforeStart, { assignment: assignment("revoked") }, "historical", "historical"],
    ["Archived Course", beforeStart, { course: course("archived") }, "historical", "historical"],
    ["Cancelled Module", beforeStart, { module: moduleData("cancelled") }, "historical", "historical"],
  ])("derives %s without storing status", (_case, now, replacement, meaning, phase) => {
    const result = deriveModuleSelectionPresentation({
      ...eligibleInput(),
      selection: selection(),
      now,
      ...replacement,
    });

    expect(result).toEqual({ ...selection(), meaning, phase });
    expect(selection()).not.toHaveProperty("meaning");
  });

  it("preserves absence as non-participation", () => {
    expect(
      deriveModuleSelectionPresentation({
        ...eligibleInput(),
        selection: null,
        now: beforeStart,
      }),
    ).toBeNull();
  });

  it("makes a retained in-progress Selection live only after Assignment reactivation", () => {
    const input = {
      ...eligibleInput(),
      module: {
        ...moduleData(),
        startsAt: "2026-09-01T09:00:00.000Z",
      },
      selection: selection(),
      now: "2026-09-01T10:30:00.000Z",
    };

    expect(
      deriveModuleSelectionPresentation({
        ...input,
        assignment: assignment("revoked"),
      }),
    ).toMatchObject({ meaning: "historical", phase: "historical" });
    expect(deriveModuleSelectionPresentation(input)).toMatchObject({
      meaning: "live",
      phase: "in-progress",
    });
    expect(
      deriveModuleSelectionPresentation({ ...input, selection: null }),
    ).toBeNull();
  });

  it("makes retained in-progress participation live only after eligible Re-enable", () => {
    const input = {
      ...eligibleInput(),
      module: {
        ...moduleData(),
        startsAt: "2026-09-01T09:00:00.000Z",
      },
      selection: selection(),
      now: "2026-09-01T10:30:00.000Z",
    };

    expect(
      deriveModuleSelectionPresentation({
        ...input,
        participant: participant("disabled"),
      }),
    ).toMatchObject({ meaning: "historical", phase: "historical" });
    expect(deriveModuleSelectionPresentation(input)).toMatchObject({
      meaning: "live",
      phase: "in-progress",
    });
    expect(
      deriveModuleSelectionPresentation({
        ...input,
        now: input.module.endsAt,
      }),
    ).toMatchObject({ meaning: "historical", phase: "historical" });
    expect(
      deriveModuleSelectionPresentation({
        ...input,
        assignment: assignment("revoked"),
      }),
    ).toMatchObject({ meaning: "historical", phase: "historical" });
  });

  it("retains Archived Group identity and details in derived participation", () => {
    const archivedGroupSelection = {
      ...selection(),
      group: {
        id: "group-a",
        name: "Historische Gruppe",
        details: "Unveränderte Gruppendetails",
        state: "archived",
      },
    };
    const result = deriveModuleSelectionPresentation({
      ...eligibleInput(),
      module: {
        ...moduleData(),
        startsAt: "2026-09-01T09:00:00.000Z",
      },
      selection: archivedGroupSelection,
      now: "2026-09-01T10:30:00.000Z",
    });

    expect(result).toEqual({
      ...archivedGroupSelection,
      meaning: "live",
      phase: "in-progress",
    });
    expect(result.group).toBe(archivedGroupSelection.group);
  });
});

/** @returns {object} Deterministic set-operation capabilities. */
function setCapabilities(now = beforeStart, result = { outcome: "created", selection: selection() }) {
  return {
    createModuleSelectionId: vi.fn(() => "selection-a"),
    now: () => now,
    setParticipantModuleSelection: vi.fn().mockResolvedValue(result),
  };
}

/** @returns {object} Deterministic Admin-assisted set capabilities. */
function adminSetCapabilities(now = beforeStart, result = {
  outcome: "created",
  assignmentOutcome: "created",
  assignment: assignment(),
  selection: selection(),
}) {
  return {
    createCourseAssignmentId: vi.fn(() => "assignment-created"),
    createModuleSelectionId: vi.fn(() => "selection-created"),
    now: () => now,
    setParticipantModuleSelectionAsAdmin: vi.fn().mockResolvedValue(result),
  };
}

/** @returns {object} Complete Admin-assisted input without prior rows. */
function adminEligibleInput() {
  return {
    ...eligibleInput(),
    adminUser: adminUser(),
    assignment: null,
    selection: null,
  };
}

/** @returns {object} Admin User data. */
function adminUser(state = "active") {
  return { id: "admin-a", state };
}

/** @returns {object} Complete eligible current Selection input. */
function eligibleInput() {
  return {
    participant: participant(),
    assignment: assignment(),
    course: course(),
    module: moduleData(),
    group: group(),
  };
}

/** @returns {object} Participant data. */
function participant(state = "active") {
  return { id: "participant-a", state };
}

/** @returns {object} Course Assignment data. */
function assignment(state = "active", id = "assignment-a") {
  return {
    id,
    participantId: "participant-a",
    courseId: "course-a",
    state,
  };
}

/** @returns {object} Course data. */
function course(state = "active") {
  return { id: "course-a", state };
}

/** @returns {object} Module data. */
function moduleData(state = "scheduled") {
  return {
    id: "module-a",
    courseId: "course-a",
    startsAt: "2026-09-01T10:00:00.000Z",
    endsAt: "2026-09-01T11:00:00.000Z",
    state,
  };
}

/** @returns {object} Group data. */
function group(state = "active") {
  return { id: "group-a", courseId: "course-a", state };
}

/** @returns {object} Stored Selection without derived status. */
function selection(id = "selection-a") {
  return {
    id,
    participantId: "participant-a",
    courseId: "course-a",
    moduleId: "module-a",
    groupId: "group-a",
  };
}
