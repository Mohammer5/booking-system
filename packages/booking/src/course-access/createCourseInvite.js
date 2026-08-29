/**
 * Create the first enabled shared Course Invite.
 *
 * @param {object} capabilities Invite creation capabilities.
 * @returns {(input: object) => Promise<object>} First-Invite operation.
 */
export function createCourseInvite(capabilities) {
  return async function createFirstCourseInvite(input) {
    if (input.adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (input.course?.state !== "active") {
      return { outcome: "course-not-active" };
    }

    if (input.currentInvite !== null) {
      return { outcome: "course-invite-already-exists" };
    }

    const invite = await createEnabledInvite(input.course.id, capabilities);
    const persistenceOutcome = await capabilities.createFirstEnabledCourseInvite({
      adminUserId: input.adminUser.id,
      invite,
    });

    return persistenceOutcome === "created"
      ? { outcome: "created", invite: toCourseInvite(invite) }
      : { outcome: persistenceOutcome };
  };
}

/** @returns {Promise<object>} One generated enabled persistence Invite. */
async function createEnabledInvite(courseId, capabilities) {
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
