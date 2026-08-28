import { hasParticipantCourseAccess } from "./hasParticipantCourseAccess.js";

/**
 * Create the current Participant Course-list operation from a narrow read capability.
 *
 * @param {object} capabilities Participant Course read capabilities.
 * @param {(participantId: string) => Promise<Array<object>>} capabilities.listParticipantCourseMemberships List current membership data.
 * @returns {(participant: object | null) => Promise<object>} The Participant Course-list operation.
 */
export function createListParticipantCourses({
  listParticipantCourseMemberships,
}) {
  return async function listParticipantCourses(participant) {
    if (participant?.state !== "active") {
      return { outcome: "participant-not-active" };
    }

    const memberships = await listParticipantCourseMemberships(participant.id);
    const courses = memberships
      .filter(({ assignment, course }) =>
        hasParticipantCourseAccess({ participant, assignment, course }),
      )
      .map(({ course }) => course);

    return { outcome: "courses-available", courses };
  };
}
