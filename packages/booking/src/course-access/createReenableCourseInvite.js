/**
 * Re-enable one exact current disabled Course Invite.
 *
 * @param {object} capabilities Invite re-enablement capabilities.
 * @returns {(input: object) => Promise<object>} Re-enablement operation.
 */
export function createReenableCourseInvite({ reenableDisabledCourseInvite }) {
  return async function reenableCourseInvite(input) {
    const refusal = getReenablementRefusal(input);

    if (refusal !== null) return { outcome: refusal };

    const persistenceOutcome = await reenableDisabledCourseInvite({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      inviteId: input.currentInvite.id,
    });

    return persistenceOutcome === "re-enabled"
      ? {
          outcome: "re-enabled",
          invite: { ...input.currentInvite, state: "enabled" },
        }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First invalid current-state outcome. */
function getReenablementRefusal(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";

  return input.currentInvite?.courseId === input.course.id &&
    input.currentInvite.state === "disabled"
    ? null
    : "course-invite-not-disabled";
}
