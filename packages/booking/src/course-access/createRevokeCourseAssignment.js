/**
 * Create Admin Course Assignment revocation from narrow current-state capabilities.
 *
 * @param {object} capabilities Revocation capabilities.
 * @param {() => string} capabilities.now Read the definite current instant.
 * @param {(input: object) => Promise<object>} capabilities.revokeActiveCourseAssignment Persist one atomic retained-membership outcome.
 * @returns {(input: {adminUser: object, course: object, assignment: object}) => Promise<object>} The Assignment revocation operation.
 */
export function createRevokeCourseAssignment({
  now,
  revokeActiveCourseAssignment,
}) {
  return async function revokeCourseAssignment({
    adminUser,
    course,
    assignment,
  }) {
    if (adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (!isRevocableCourse(course)) {
      return { outcome: "course-not-revocable" };
    }

    if (!isCourseAssignment(assignment, course.id)) {
      return { outcome: "assignment-not-revocable" };
    }

    return revokeActiveCourseAssignment({
      adminUserId: adminUser.id,
      assignmentId: assignment.id,
      courseId: course.id,
      nowEpoch: Date.parse(now()),
    });
  };
}

/** @returns {boolean} Whether current Course state permits access revocation. */
function isRevocableCourse(course) {
  return (
    typeof course?.id === "string" &&
    course.id.length > 0 &&
    new Set(["active", "archived"]).has(course.state)
  );
}

/** @returns {boolean} Whether data is one retained Assignment for the Course. */
function isCourseAssignment(assignment, courseId) {
  return (
    typeof assignment?.id === "string" &&
    assignment.id.length > 0 &&
    assignment.courseId === courseId &&
    typeof assignment.participantId === "string" &&
    new Set(["active", "revoked"]).has(assignment.state)
  );
}
