/**
 * Disable one exact current enabled Course Invite.
 *
 * @param {object} capabilities Invite disablement capabilities.
 * @returns {(input: object) => Promise<object>} Disablement operation.
 */
export function createDisableCourseInvite({ disableEnabledCourseInvite }) {
  return async function disableCourseInvite(input) {
    const refusal = getDisablementRefusal(input);

    if (refusal !== null) return { outcome: refusal };

    const persistenceOutcome = await disableEnabledCourseInvite({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      inviteId: input.currentInvite.id,
    });

    return persistenceOutcome === "disabled"
      ? {
          outcome: "disabled",
          invite: { ...input.currentInvite, state: "disabled" },
        }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First invalid current-state outcome. */
function getDisablementRefusal(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";

  return input.currentInvite?.courseId === input.course.id &&
    input.currentInvite.state === "enabled"
    ? null
    : "course-invite-not-enabled";
}
