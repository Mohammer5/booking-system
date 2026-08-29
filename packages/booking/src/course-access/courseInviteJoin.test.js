import { describe, expect, it, vi } from "vitest";

import { createJoinCourseThroughInvite } from "./createJoinCourseThroughInvite.js";

describe("Course Join through a shared Invite", () => {
  it("creates one candidate membership only after explicit Join", async () => {
    const capabilities = joinCapabilities({
      outcome: "joined",
      assignment: assignment(),
      course: { id: "course-a", name: "Course A" },
    });
    const joinCourse = createJoinCourseThroughInvite(capabilities);

    await expect(joinCourse(joinInput())).resolves.toEqual({
      outcome: "joined",
      assignment: assignment(),
      course: { id: "course-a", name: "Course A" },
    });
    expect(capabilities.joinParticipantToInvitedCourse).toHaveBeenCalledWith({
      participantId: "participant-a",
      inviteId: "invite-a",
      courseId: "course-a",
      assignment: assignment(),
    });
  });

  it.each(["active", "revoked"])(
    "reuses a retained %s Assignment identity while revalidating persistence",
    async (state) => {
      const retained = assignment(state, "assignment-retained");
      const outcome = state === "active" ? "already-joined" : "assignment-revoked";
      const capabilities = joinCapabilities({ outcome, assignment: retained });

      await expect(createJoinCourseThroughInvite(capabilities)(
        joinInput({ assignment: retained }),
      )).resolves.toEqual({ outcome, assignment: retained });
      expect(capabilities.createCourseAssignmentId).not.toHaveBeenCalled();
      expect(capabilities.joinParticipantToInvitedCourse)
        .toHaveBeenCalledWith(expect.objectContaining({ assignment: retained }));
    },
  );

  it.each([
    [null, joinableInvite(), "participant-not-active"],
    [{ id: "participant-a", state: "disabled" }, joinableInvite(), "participant-not-active"],
    [participant(), null, "invite-not-joinable"],
    [participant(), { ...joinableInvite(), isCurrent: false }, "invite-not-joinable"],
    [participant(), { ...joinableInvite(), inviteState: "disabled" }, "invite-not-joinable"],
    [participant(), { ...joinableInvite(), courseState: "archived" }, "invite-not-joinable"],
  ])("refuses invalid current context without membership input", async (
    currentParticipant,
    invite,
    outcome,
  ) => {
    const capabilities = joinCapabilities();

    await expect(createJoinCourseThroughInvite(capabilities)({
      participant: currentParticipant,
      invite,
      assignment: null,
    })).resolves.toEqual({ outcome });
    expect(capabilities.createCourseAssignmentId).not.toHaveBeenCalled();
    expect(capabilities.joinParticipantToInvitedCourse).not.toHaveBeenCalled();
  });

  it.each([
    "participant-not-active",
    "invite-not-joinable",
    "assignment-revoked",
    "assignment-not-created",
  ])("preserves authoritative persistence outcome %s", async (outcome) => {
    const capabilities = joinCapabilities({ outcome });

    await expect(createJoinCourseThroughInvite(capabilities)(joinInput()))
      .resolves.toEqual({ outcome });
  });
});

/** @returns {object} Join factory capabilities. */
function joinCapabilities(result = { outcome: "assignment-not-created" }) {
  return {
    createCourseAssignmentId: vi.fn(() => "assignment-a"),
    joinParticipantToInvitedCourse: vi.fn().mockResolvedValue(result),
  };
}

/** @returns {object} Complete explicit Join input. */
function joinInput(overrides = {}) {
  return {
    participant: participant(),
    invite: joinableInvite(),
    assignment: null,
    ...overrides,
  };
}

/** @returns {object} Current Active Participant. */
function participant() {
  return { id: "participant-a", state: "active" };
}

/** @returns {object} Current enabled Invite recognition context. */
function joinableInvite() {
  return {
    id: "invite-a",
    courseId: "course-a",
    courseName: "Course A",
    courseState: "active",
    inviteState: "enabled",
    isCurrent: true,
  };
}

/** @returns {object} Ordinary Course Assignment. */
function assignment(state = "active", id = "assignment-a") {
  return {
    id,
    participantId: "participant-a",
    courseId: "course-a",
    state,
  };
}
