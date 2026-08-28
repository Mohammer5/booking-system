/**
 * Create narrow D1 capabilities owned by Course membership.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Booking-facing Course Assignment persistence capabilities.
 */
export function createCourseAssignmentPersistence(database) {
  return {
    async assignParticipantToActiveCourse({ adminUserId, assignment }) {
      const result = await insertAssignment(database, adminUserId, assignment);

      if (result.meta.changes === 1) {
        return {
          outcome: "created",
          assignment: await findAssignmentByPair(
            database,
            assignment.participantId,
            assignment.courseId,
          ),
        };
      }

      return classifyAssignmentOutcome(database, adminUserId, assignment);
    },

    async listAssignmentsByCourseId(courseId) {
      const { results } = await database
        .prepare(
          `select a.id, a.participant_id, a.course_id, a.state,
                  p.name as participant_name,
                  p.email as participant_email,
                  p.state as participant_state
             from course_assignments a
             join participants p on p.id = a.participant_id
            where a.course_id = ?
            order by p.name collate nocase, p.id`,
        )
        .bind(courseId)
        .all();

      return results.map(mapAssignmentWithParticipant);
    },
  };
}

/**
 * Attempt one guarded and idempotent direct Assignment insert.
 *
 * @param {object} database The application D1 binding.
 * @param {string} adminUserId Acting Admin identity.
 * @param {object} assignment Candidate Course Assignment.
 * @returns {Promise<object>} D1 mutation result.
 */
function insertAssignment(database, adminUserId, assignment) {
  return database
    .prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       select ?, ?, ?, ?
        where exists (
          select 1 from admin_users
           where id = ? and state = 'active'
        )
          and exists (
            select 1 from courses
             where id = ? and state = 'active'
          )
          and exists (
            select 1 from participants
             where id = ? and state in ('active', 'disabled')
          )
       on conflict (participant_id, course_id) do nothing`,
    )
    .bind(
      assignment.id,
      assignment.participantId,
      assignment.courseId,
      assignment.state,
      adminUserId,
      assignment.courseId,
      assignment.participantId,
    )
    .run();
}

/**
 * Classify a guarded or concurrent direct Assignment no-op from current state.
 *
 * @param {object} database The application D1 binding.
 * @param {string} adminUserId Acting Admin identity.
 * @param {object} assignment Candidate Course Assignment.
 * @returns {Promise<object>} Language-neutral persistence result.
 */
async function classifyAssignmentOutcome(database, adminUserId, assignment) {
  const currentState = await database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         exists(select 1 from participants
                 where id = ? and state in ('active', 'disabled'))
           as is_participant_assignable`,
    )
    .bind(adminUserId, assignment.courseId, assignment.participantId)
    .first();

  if (currentState.is_admin_active !== 1) {
    return { outcome: "admin-not-active" };
  }

  if (currentState.is_course_active !== 1) {
    return { outcome: "course-not-active" };
  }

  if (currentState.is_participant_assignable !== 1) {
    return { outcome: "participant-not-assignable" };
  }

  const existingAssignment = await findAssignmentByPair(
    database,
    assignment.participantId,
    assignment.courseId,
  );

  if (existingAssignment?.state === "active") {
    return { outcome: "already-active", assignment: existingAssignment };
  }

  return {
    outcome:
      existingAssignment?.state === "revoked"
        ? "assignment-not-active"
        : "assignment-not-created",
  };
}

/**
 * Resolve the retained Assignment for one Participant/Course pair.
 *
 * @param {object} database The application D1 binding.
 * @param {string} participantId Participant identity.
 * @param {string} courseId Course identity.
 * @returns {Promise<object | null>} Current Assignment or null.
 */
async function findAssignmentByPair(database, participantId, courseId) {
  const row = await database
    .prepare(
      `select id, participant_id, course_id, state
         from course_assignments
        where participant_id = ? and course_id = ?`,
    )
    .bind(participantId, courseId)
    .first();

  return row === null ? null : mapAssignment(row);
}

/**
 * Translate one D1 Assignment row to booking-domain plain data.
 *
 * @param {object} row A D1 Assignment row.
 * @returns {object} Booking-domain Course Assignment.
 */
function mapAssignment(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    courseId: row.course_id,
    state: row.state,
  };
}

/**
 * Translate one membership join to Assignment and Participant plain data.
 *
 * @param {object} row A joined D1 membership row.
 * @returns {object} Course Assignment with minimum Participant data.
 */
function mapAssignmentWithParticipant(row) {
  return {
    ...mapAssignment(row),
    participant: {
      id: row.participant_id,
      name: row.participant_name,
      email: row.participant_email,
      state: row.participant_state,
    },
  };
}
