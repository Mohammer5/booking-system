/**
 * Create narrow D1 capabilities for Course Join through a shared Invite.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Invite Join persistence capabilities.
 */
export function createCourseInviteJoinPersistence(database) {
  return {
    findAssignmentByParticipantAndCourse: (participantId, courseId) =>
      findAssignmentByPair(database, participantId, courseId),
    joinParticipantToInvitedCourse: (input) =>
      joinParticipantToInvitedCourse(database, input),
  };
}

/** @returns {Promise<object>} Atomic joined/idempotent/refused outcome. */
async function joinParticipantToInvitedCourse(database, input) {
  try {
    const result = await insertInvitedAssignment(database, input);

    if (result.meta.changes === 1) {
      return {
        outcome: "joined",
        assignment: await findAssignmentById(database, input.assignment.id),
        course: await findCourseIdentity(database, input.courseId),
      };
    }

    return classifyInvitedAssignmentOutcome(database, input);
  } catch (error) {
    const outcome = await classifyInvitedAssignmentOutcome(database, input);

    if (outcome.outcome !== "assignment-not-created") return outcome;
    throw error;
  }
}

/** @returns {object} One guarded no-reactivation Invite Join statement. */
function insertInvitedAssignment(database, input) {
  return database
    .prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       select ?, p.id, c.id, 'active'
         from course_invites i
         join courses c on c.id = i.course_id
         join participants p on p.id = ?
        where i.id = ? and i.course_id = ?
          and i.is_current = 1 and i.is_enabled = 1
          and c.state = 'active' and p.state = 'active'
          and not exists (
            select 1 from course_assignments a
             where a.participant_id = p.id and a.course_id = c.id
          )
       on conflict (participant_id, course_id) do nothing`,
    )
    .bind(
      input.assignment.id,
      input.participantId,
      input.inviteId,
      input.courseId,
    )
    .run();
}

/** @returns {Promise<object>} Exact current-state Invite Join no-op. */
async function classifyInvitedAssignmentOutcome(database, input) {
  const [invite, participant] = await Promise.all([
    findJoinableInvite(database, input.inviteId, input.courseId),
    database.prepare("select state from participants where id = ?")
      .bind(input.participantId).first(),
  ]);

  if (invite === null) return { outcome: "invite-not-joinable" };
  if (participant?.state !== "active") {
    return { outcome: "participant-not-active" };
  }

  const assignment = await findAssignmentByPair(
    database,
    input.participantId,
    input.courseId,
  );

  if (assignment?.state === "active") {
    return {
      outcome: "already-joined",
      assignment,
      course: { id: invite.courseId, name: invite.courseName },
    };
  }

  return assignment?.state === "revoked"
    ? { outcome: "assignment-revoked", assignment }
    : { outcome: "assignment-not-created" };
}

/** @returns {Promise<object | null>} Current exact joinable Invite context. */
async function findJoinableInvite(database, inviteId, courseId) {
  const row = await database.prepare(
    `select c.id as course_id, c.name as course_name
       from course_invites i
       join courses c on c.id = i.course_id
      where i.id = ? and i.course_id = ?
        and i.is_current = 1 and i.is_enabled = 1
        and c.state = 'active'`,
  ).bind(inviteId, courseId).first();

  return row === null
    ? null
    : { courseId: row.course_id, courseName: row.course_name };
}

/** @returns {Promise<object | null>} One retained Assignment pair. */
async function findAssignmentByPair(database, participantId, courseId) {
  const row = await database.prepare(
    `select id, participant_id, course_id, state
       from course_assignments
      where participant_id = ? and course_id = ?`,
  ).bind(participantId, courseId).first();

  return row === null ? null : mapAssignment(row);
}

/** @returns {Promise<object | null>} One retained Assignment identity. */
async function findAssignmentById(database, assignmentId) {
  const row = await database.prepare(
    `select id, participant_id, course_id, state
       from course_assignments where id = ?`,
  ).bind(assignmentId).first();

  return row === null ? null : mapAssignment(row);
}

/** @returns {Promise<object | null>} Minimal accepted Course identity. */
function findCourseIdentity(database, courseId) {
  return database.prepare(
    "select id, name from courses where id = ?",
  ).bind(courseId).first();
}

/** @returns {object} Plain domain Assignment data. */
function mapAssignment(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    courseId: row.course_id,
    state: row.state,
  };
}
