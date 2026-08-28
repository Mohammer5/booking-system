import { describe, expect, it, vi } from "vitest";

import { createRemoveParticipantModuleSelection } from "./createRemoveParticipantModuleSelection.js";
import { createSetParticipantModuleSelection } from "./createSetParticipantModuleSelection.js";
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
});

/** @returns {object} Deterministic set-operation capabilities. */
function setCapabilities(now = beforeStart, result = { outcome: "created", selection: selection() }) {
  return {
    createModuleSelectionId: vi.fn(() => "selection-a"),
    now: () => now,
    setParticipantModuleSelection: vi.fn().mockResolvedValue(result),
  };
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
function assignment(state = "active") {
  return {
    id: "assignment-a",
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
function selection() {
  return {
    id: "selection-a",
    participantId: "participant-a",
    courseId: "course-a",
    moduleId: "module-a",
    groupId: "group-a",
  };
}
