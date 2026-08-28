/**
 * Create direct Course Assignment from narrow identity and persistence capabilities.
 *
 * @param {object} capabilities Assignment capabilities.
 * @param {() => string} capabilities.createCourseAssignmentId Create a stable Assignment identity.
 * @param {(input: {adminUserId: string, assignment: object}) => Promise<object>} capabilities.assignParticipantToActiveCourse Persist one current valid membership outcome.
 * @returns {(input: {adminUser: object, course: object, participant: object}) => Promise<object>} The direct Assignment operation.
 */
export function createAssignParticipantToCourse({
  createCourseAssignmentId,
  assignParticipantToActiveCourse,
}) {
  return async function assignParticipantToCourse({
    adminUser,
    course,
    participant,
  }) {
    if (adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (course?.state !== "active") {
      return { outcome: "course-not-active" };
    }

    if (!isAssignableParticipant(participant)) {
      return { outcome: "participant-not-assignable" };
    }

    const assignment = {
      id: createCourseAssignmentId(),
      participantId: participant.id,
      courseId: course.id,
      state: "active",
    };
    const persistenceResult = await assignParticipantToActiveCourse({
      adminUserId: adminUser.id,
      assignment,
    });

    if (persistenceResult.outcome === "created") {
      return { outcome: "created", assignment };
    }

    return persistenceResult;
  };
}

/**
 * Check whether current Participant data represents an assignable registered target.
 *
 * @param {unknown} participant Current Participant data.
 * @returns {boolean} Whether the Participant may receive direct membership.
 */
function isAssignableParticipant(participant) {
  return (
    typeof participant?.id === "string" &&
    participant.id.length > 0 &&
    new Set(["active", "disabled"]).has(participant.state)
  );
}
