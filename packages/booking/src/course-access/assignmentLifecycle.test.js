import { describe, expect, it, vi } from "vitest";

import { createAssignParticipantToCourse } from "./createAssignParticipantToCourse.js";
import { createRevokeCourseAssignment } from "./createRevokeCourseAssignment.js";

const currentInstant = "2026-08-28T10:00:00.000Z";

describe("Course Assignment revocation", () => {
  it.each([
    [null, course(), assignment(), "admin-not-active"],
    [{ id: "admin-a", state: "disabled" }, course(), assignment(), "admin-not-active"],
    [admin(), null, assignment(), "course-not-revocable"],
    [admin(), { id: "course-a", state: "pending" }, assignment(), "course-not-revocable"],
    [admin(), course(), null, "assignment-not-revocable"],
    [admin(), course(), { ...assignment(), courseId: "course-b" }, "assignment-not-revocable"],
  ])(
    "refuses invalid actor, Course, or Assignment before persistence",
    async (adminUser, currentCourse, currentAssignment, outcome) => {
      const now = vi.fn();
      const revokeActiveCourseAssignment = vi.fn();
      const revoke = createRevokeCourseAssignment({
        now,
        revokeActiveCourseAssignment,
      });

      await expect(
        revoke({
          adminUser,
          course: currentCourse,
          assignment: currentAssignment,
        }),
      ).resolves.toEqual({ outcome });
      expect(now).not.toHaveBeenCalled();
      expect(revokeActiveCourseAssignment).not.toHaveBeenCalled();
    },
  );

  it.each(["active", "archived"])(
    "passes the exact current instant for a %s Course",
    async (courseState) => {
      const persisted = {
        outcome: "revoked",
        assignment: assignment("revoked"),
        removedSelectionCount: 1,
      };
      const revokeActiveCourseAssignment = vi.fn().mockResolvedValue(persisted);
      const revoke = createRevokeCourseAssignment({
        now: () => currentInstant,
        revokeActiveCourseAssignment,
      });

      await expect(
        revoke({
          adminUser: admin(),
          course: course(courseState),
          assignment: assignment(),
        }),
      ).resolves.toEqual(persisted);
      expect(revokeActiveCourseAssignment).toHaveBeenCalledWith({
        adminUserId: "admin-a",
        assignmentId: "assignment-a",
        courseId: "course-a",
        nowEpoch: Date.parse(currentInstant),
      });
    },
  );

  it("preserves an authoritative already-Revoked idempotent outcome", async () => {
    const persisted = {
      outcome: "already-revoked",
      assignment: assignment("revoked"),
      removedSelectionCount: 0,
    };
    const revoke = createRevokeCourseAssignment({
      now: () => currentInstant,
      revokeActiveCourseAssignment: async () => persisted,
    });

    await expect(
      revoke({
        adminUser: admin(),
        course: course(),
        assignment: assignment("revoked"),
      }),
    ).resolves.toEqual(persisted);
  });
});

describe("Course Assignment reactivation", () => {
  it("returns the retained Assignment and reactivated outcome", async () => {
    const retained = assignment();
    const assign = createAssignParticipantToCourse({
      createCourseAssignmentId: () => "assignment-unused",
      assignParticipantToActiveCourse: async () => ({
        outcome: "reactivated",
        assignment: retained,
      }),
    });

    await expect(
      assign({
        adminUser: admin(),
        course: course(),
        participant: { id: "participant-a", state: "disabled" },
      }),
    ).resolves.toEqual({ outcome: "reactivated", assignment: retained });
  });
});

/** @returns {object} Active Admin data. */
function admin() {
  return { id: "admin-a", state: "active" };
}

/** @returns {object} Course data. */
function course(state = "active") {
  return { id: "course-a", state };
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
