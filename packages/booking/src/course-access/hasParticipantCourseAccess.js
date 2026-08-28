/**
 * Check current Participant membership against one current Course.
 *
 * @param {object} input Current access data.
 * @param {object | null} input.participant Current Participant.
 * @param {object | null} input.assignment Current Course Assignment.
 * @param {object | null} input.course Current Course.
 * @returns {boolean} Whether the Participant may access the Active Course.
 */
export function hasParticipantCourseAccess({
  participant,
  assignment,
  course,
}) {
  return (
    participant?.state === "active" &&
    assignment?.state === "active" &&
    course?.state === "active" &&
    assignment.participantId === participant.id &&
    assignment.courseId === course.id
  );
}
