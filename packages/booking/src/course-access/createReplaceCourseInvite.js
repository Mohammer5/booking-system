/**
 * Replace one exact current Course Invite with a new enabled identity.
 *
 * @param {object} capabilities Invite replacement capabilities.
 * @returns {(input: object) => Promise<object>} Replacement operation.
 */
export function createReplaceCourseInvite(capabilities) {
  return async function replaceCourseInvite(input) {
    const refusal = getReplacementRefusal(input);

    if (refusal !== null) return { outcome: refusal };

    const invite = await createReplacementInvite(input.course.id, capabilities);
    const persistenceOutcome = await capabilities.replaceCurrentCourseInvite({
      adminUserId: input.adminUser.id,
      courseId: input.course.id,
      currentInviteId: input.currentInvite.id,
      invite,
    });

    return persistenceOutcome === "replaced"
      ? { outcome: "replaced", invite: toCourseInvite(invite) }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {string | null} First invalid current-state outcome. */
function getReplacementRefusal(input) {
  if (input.adminUser?.state !== "active") return "admin-not-active";
  if (input.course?.state !== "active") return "course-not-active";

  return input.currentInvite?.courseId === input.course.id &&
    new Set(["enabled", "disabled"]).has(input.currentInvite.state)
    ? null
    : "course-invite-not-current";
}

/** @returns {Promise<object>} One generated replacement persistence Invite. */
async function createReplacementInvite(courseId, capabilities) {
  const token = capabilities.createCourseInviteToken();

  return {
    id: capabilities.createCourseInviteId(),
    courseId,
    state: "enabled",
    token,
    tokenDigest: await capabilities.hashCourseInviteToken(token),
  };
}

/** @returns {object} Course Invite without persistence-only digest. */
function toCourseInvite(invite) {
  return {
    id: invite.id,
    courseId: invite.courseId,
    state: invite.state,
    token: invite.token,
  };
}
