/**
 * Create one explicit shared-Invite Course Join operation.
 *
 * @param {object} capabilities Join identity and persistence capabilities.
 * @returns {(input: object) => Promise<object>} Course Join operation.
 */
export function createJoinCourseThroughInvite(capabilities) {
  return async function joinCourseThroughInvite(input) {
    if (input.participant?.state !== "active") {
      return { outcome: "participant-not-active" };
    }

    if (!isJoinableInvite(input.invite)) {
      return { outcome: "invite-not-joinable" };
    }

    const assignment = currentOrCandidateAssignment(input, capabilities);

    return capabilities.joinParticipantToInvitedCourse({
      participantId: input.participant.id,
      inviteId: input.invite.id,
      courseId: input.invite.courseId,
      assignment,
    });
  };
}

/** @returns {boolean} Whether recognition currently permits an attempt. */
function isJoinableInvite(invite) {
  return (
    typeof invite?.id === "string" &&
    invite.id.length > 0 &&
    typeof invite.courseId === "string" &&
    invite.courseId.length > 0 &&
    invite.courseState === "active" &&
    invite.inviteState === "enabled" &&
    invite.isCurrent === true
  );
}

/** @returns {object} Retained identity or one new candidate Assignment. */
function currentOrCandidateAssignment(input, capabilities) {
  if (
    input.assignment?.participantId === input.participant.id &&
    input.assignment.courseId === input.invite.courseId &&
    new Set(["active", "revoked"]).has(input.assignment.state)
  ) {
    return input.assignment;
  }

  return {
    id: capabilities.createCourseAssignmentId(),
    participantId: input.participant.id,
    courseId: input.invite.courseId,
    state: "active",
  };
}
