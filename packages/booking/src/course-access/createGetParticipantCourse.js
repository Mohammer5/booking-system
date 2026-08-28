import { hasParticipantCourseAccess } from "./hasParticipantCourseAccess.js";

/**
 * Create stable Participant Course detail from a narrow guarded read capability.
 *
 * @param {object} capabilities Participant Course read capabilities.
 * @param {(participantId: string, courseId: string) => Promise<object | null>} capabilities.findParticipantCourseMembership Find one current membership and structure.
 * @returns {(input: {participant: object | null, courseId: string}) => Promise<object>} The Participant Course-detail operation.
 */
export function createGetParticipantCourse({
  findParticipantCourseMembership,
}) {
  return async function getParticipantCourse({ participant, courseId }) {
    if (participant?.state !== "active") {
      return { outcome: "participant-not-active" };
    }

    const membership = await findParticipantCourseMembership(
      participant.id,
      courseId,
    );
    const hasAccess =
      membership !== null &&
      membership.course.id === courseId &&
      hasParticipantCourseAccess({
        participant,
        assignment: membership.assignment,
        course: membership.course,
      });

    return hasAccess
      ? {
          outcome: "course-available",
          assignment: membership.assignment,
          course: membership.course,
          groups: membership.groups,
          modules: membership.modules,
        }
      : { outcome: "course-unavailable" };
  };
}
