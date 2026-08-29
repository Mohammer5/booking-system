/**
 * Create guarded D1 capabilities for shared Course Invite management.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Narrow Course Invite persistence.
 */
export function createCourseInvitePersistence(database) {
  return {
    createFirstEnabledCourseInvite: (input) =>
      createFirstEnabledCourseInvite(database, input),
    disableEnabledCourseInvite: (input) =>
      updateCourseInviteEnabledState(database, input, {
        expectedEnabled: true,
        nextEnabled: false,
      }),
    findCurrentCourseInvite: (courseId) =>
      findCurrentCourseInvite(database, courseId),
    findRecognizedCourseInviteByDigest: (tokenDigest) =>
      findRecognizedCourseInviteByDigest(database, tokenDigest),
    reenableDisabledCourseInvite: (input) =>
      updateCourseInviteEnabledState(database, input, {
        expectedEnabled: false,
        nextEnabled: true,
      }),
    replaceCurrentCourseInvite: (input) =>
      replaceCurrentCourseInvite(database, input),
  };
}

/** @returns {Promise<string>} Created or exact current-state refusal. */
async function createFirstEnabledCourseInvite(database, input) {
  try {
    const result = await database
      .prepare(
        `insert into course_invites
           (id, course_id, token_digest, recoverable_token,
            is_enabled, is_current, replaces_invite_id, replacement_invite_id)
         select ?, ?, ?, ?, 1, 1, null, null
          where exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
            and exists (
              select 1 from courses
               where id = ? and state = 'active'
            )
            and not exists (
              select 1 from course_invites
               where course_id = ? and is_current = 1
            )`,
      )
      .bind(
        input.invite.id,
        input.invite.courseId,
        input.invite.tokenDigest,
        input.invite.token,
        input.adminUserId,
        input.invite.courseId,
        input.invite.courseId,
      )
      .run();

    return result.meta.changes === 1
      ? "created"
      : classifyCourseInviteRefusal(database, input);
  } catch (error) {
    const refusal = await classifyCourseInviteRefusal(database, input);

    if (refusal !== "course-invite-not-created") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Updated or exact current-state refusal. */
async function updateCourseInviteEnabledState(
  database,
  input,
  stateChange,
) {
  const outcome = stateChange.nextEnabled ? "re-enabled" : "disabled";
  const expectedStateOutcome = stateChange.nextEnabled
    ? "course-invite-not-disabled"
    : "course-invite-not-enabled";

  try {
    const result = await database
      .prepare(
        `update course_invites
            set is_enabled = ?
          where id = ? and course_id = ? and is_current = 1
            and is_enabled = ?
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )
            and exists (
              select 1 from courses
               where id = ? and state = 'active'
            )`,
      )
      .bind(
        Number(stateChange.nextEnabled),
        input.inviteId,
        input.courseId,
        Number(stateChange.expectedEnabled),
        input.adminUserId,
        input.courseId,
      )
      .run();

    if (result.meta.changes === 1) return outcome;

    return classifyCourseInviteRefusal(
      database,
      input,
      expectedStateOutcome,
    );
  } catch (error) {
    const refusal = await classifyCourseInviteRefusal(
      database,
      input,
      expectedStateOutcome,
    );

    if (refusal !== "course-invite-not-updated") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Replaced or exact current-state refusal. */
async function replaceCurrentCourseInvite(database, input) {
  try {
    const [predecessorResult, inviteResult] = await database.batch([
      replacePredecessorStatement(database, input),
      insertReplacementStatement(database, input),
    ]);

    return predecessorResult.meta.changes === 1 &&
      inviteResult.meta.changes === 1
      ? "replaced"
      : classifyCourseInviteRefusal(database, input);
  } catch (error) {
    const refusal = await classifyCourseInviteRefusal(database, input);

    if (refusal !== "course-invite-not-replaced") return refusal;
    throw error;
  }
}

/** @returns {object} Guard and invalidate one exact predecessor. */
function replacePredecessorStatement(database, input) {
  return database
    .prepare(
      `update course_invites
          set is_current = 0,
              recoverable_token = null,
              replacement_invite_id = ?
        where id = ? and course_id = ? and is_current = 1
          and replacement_invite_id is null
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
          and exists (
            select 1 from courses
             where id = ? and state = 'active'
          )`,
    )
    .bind(
      input.invite.id,
      input.currentInviteId,
      input.courseId,
      input.adminUserId,
      input.courseId,
    );
}

/** @returns {object} Insert one replacement tied to its guarded predecessor. */
function insertReplacementStatement(database, input) {
  return database
    .prepare(
      `insert into course_invites
         (id, course_id, token_digest, recoverable_token,
          is_enabled, is_current, replaces_invite_id, replacement_invite_id)
       select ?, ?, ?, ?, 1, 1, ?, null
        where exists (
          select 1 from admin_users
           where id = ? and state = 'active'
        )
          and exists (
            select 1 from courses
             where id = ? and state = 'active'
          )`,
    )
    .bind(
      input.invite.id,
      input.courseId,
      input.invite.tokenDigest,
      input.invite.token,
      input.currentInviteId,
      input.adminUserId,
      input.courseId,
    );
}

/** @returns {Promise<object | null>} Current recoverable Admin Invite. */
async function findCurrentCourseInvite(database, courseId) {
  const row = await database
    .prepare(
      `select id, course_id, recoverable_token, is_enabled
         from course_invites
        where course_id = ? and is_current = 1`,
    )
    .bind(courseId)
    .first();

  return row === null ? null : mapCurrentCourseInvite(row);
}

/** @returns {Promise<object | null>} Narrow current/predecessor recognition. */
async function findRecognizedCourseInviteByDigest(database, tokenDigest) {
  const row = await database
    .prepare(
      `select i.id, i.course_id, c.name as course_name,
              c.state as course_state,
              i.is_enabled, i.is_current
         from course_invites i
         join courses c on c.id = i.course_id
        where i.token_digest = ?`,
    )
    .bind(tokenDigest)
    .first();

  return row === null
    ? null
    : {
        id: row.id,
        courseId: row.course_id,
        courseName: row.course_name,
        courseState: row.course_state,
        inviteState: row.is_enabled === 1 ? "enabled" : "disabled",
        isCurrent: row.is_current === 1,
      };
}

/** @returns {Promise<string>} Exact guarded-write refusal. */
async function classifyCourseInviteRefusal(
  database,
  input,
  expectedStateOutcome,
) {
  const courseId = input.courseId ?? input.invite.courseId;
  const [adminUser, course, currentInvite] = await Promise.all([
    database.prepare("select state from admin_users where id = ?")
      .bind(input.adminUserId).first(),
    database.prepare("select state from courses where id = ?")
      .bind(courseId).first(),
    findCurrentCourseInvite(database, courseId),
  ]);

  if (adminUser?.state !== "active") return "admin-not-active";
  if (course?.state !== "active") return "course-not-active";

  if (input.inviteId !== undefined || input.currentInviteId !== undefined) {
    const expectedId = input.inviteId ?? input.currentInviteId;

    if (currentInvite?.id !== expectedId) return "course-invite-not-current";
    if (expectedStateOutcome !== undefined) {
      const expectedState = expectedStateOutcome === "course-invite-not-enabled"
        ? "enabled"
        : "disabled";

      return currentInvite.state === expectedState
        ? "course-invite-not-updated"
        : expectedStateOutcome;
    }
    return "course-invite-not-replaced";
  }

  return currentInvite === null
    ? "course-invite-not-created"
    : "course-invite-already-exists";
}

/** @returns {object} Current Invite domain data with recoverable token. */
function mapCurrentCourseInvite(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    state: row.is_enabled === 1 ? "enabled" : "disabled",
    token: row.recoverable_token,
  };
}
