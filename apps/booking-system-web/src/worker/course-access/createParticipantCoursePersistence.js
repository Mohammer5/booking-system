/**
 * Create narrow D1 reads owned by Participant-facing Course access.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Guarded Participant Course read capabilities.
 */
export function createParticipantCoursePersistence(database) {
  return {
    listParticipantCourseMemberships: (participantId) =>
      listParticipantCourseMemberships(database, participantId),
    findParticipantCourseMembership: (participantId, courseId) =>
      findParticipantCourseMembership(database, participantId, courseId),
  };
}

/**
 * List only current Active Course memberships for one current Active Participant.
 *
 * @param {object} database The application D1 binding.
 * @param {string} participantId Server-resolved Participant identity.
 * @returns {Promise<Array<object>>} Ordered membership and Course data.
 */
async function listParticipantCourseMemberships(database, participantId) {
  const { results } = await database
    .prepare(
      `select a.id as assignment_id,
              a.participant_id as assignment_participant_id,
              a.course_id as assignment_course_id,
              a.state as assignment_state,
              c.id as course_id, c.name as course_name,
              c.description as course_description,
              c.timezone as course_timezone, c.state as course_state
         from participants p
         join course_assignments a on a.participant_id = p.id
         join courses c on c.id = a.course_id
        where p.id = ? and p.state = 'active'
          and a.state = 'active' and c.state = 'active'
        order by c.name collate nocase, c.id`,
    )
    .bind(participantId)
    .all();

  return results.map(mapMembership);
}

/**
 * Read one identifier-isolated current membership and its Participant structure.
 *
 * @param {object} database The application D1 binding.
 * @param {string} participantId Server-resolved Participant identity.
 * @param {string} courseId Requested stable Course identity.
 * @returns {Promise<object | null>} Guarded membership and structure or null.
 */
async function findParticipantCourseMembership(
  database,
  participantId,
  courseId,
) {
  const [membershipResult, groupResult, moduleResult] = await database.batch([
    membershipStatement(database, participantId, courseId),
    groupStatement(database, participantId, courseId),
    moduleStatement(database, participantId, courseId),
  ]);
  const membershipRow = membershipResult.results[0];

  return membershipRow === undefined
    ? null
    : {
        ...mapMembership(membershipRow),
        groups: groupResult.results.map(mapGroup),
        modules: moduleResult.results.map(mapModule),
      };
}

/** @returns {object} Guarded membership query statement. */
function membershipStatement(database, participantId, courseId) {
  return database
    .prepare(
      `select a.id as assignment_id,
              a.participant_id as assignment_participant_id,
              a.course_id as assignment_course_id,
              a.state as assignment_state,
              c.id as course_id, c.name as course_name,
              c.description as course_description,
              c.timezone as course_timezone, c.state as course_state
         from participants p
         join course_assignments a on a.participant_id = p.id
         join courses c on c.id = a.course_id
        where p.id = ? and p.state = 'active'
          and a.state = 'active' and c.state = 'active'
          and c.id = ?`,
    )
    .bind(participantId, courseId);
}

/** @returns {object} Guarded Active-Group query statement. */
function groupStatement(database, participantId, courseId) {
  return database
    .prepare(
      `select g.id, g.name, g.details, g.state
         from participants p
         join course_assignments a on a.participant_id = p.id
         join courses c on c.id = a.course_id
         join groups g on g.course_id = c.id
        where p.id = ? and p.state = 'active'
          and a.state = 'active' and c.state = 'active'
          and c.id = ? and g.state = 'active'
        order by g.name collate nocase, g.id`,
    )
    .bind(participantId, courseId);
}

/** @returns {object} Guarded Module query statement. */
function moduleStatement(database, participantId, courseId) {
  return database
    .prepare(
      `select m.id, m.title, m.description, m.instructions,
              m.starts_at, m.ends_at, m.state
         from participants p
         join course_assignments a on a.participant_id = p.id
         join courses c on c.id = a.course_id
         join modules m on m.course_id = c.id
        where p.id = ? and p.state = 'active'
          and a.state = 'active' and c.state = 'active'
          and c.id = ?
        order by m.starts_at, m.id`,
    )
    .bind(participantId, courseId);
}

/** @returns {object} Membership and Course plain data. */
function mapMembership(row) {
  return {
    assignment: {
      id: row.assignment_id,
      participantId: row.assignment_participant_id,
      courseId: row.assignment_course_id,
      state: row.assignment_state,
    },
    course: {
      id: row.course_id,
      name: row.course_name,
      description: row.course_description,
      timezone: row.course_timezone,
      state: row.course_state,
    },
  };
}

/** @returns {object} Participant-relevant Group plain data. */
function mapGroup(row) {
  return {
    id: row.id,
    name: row.name,
    details: row.details,
    state: row.state,
  };
}

/** @returns {object} Participant-relevant Module plain data. */
function mapModule(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    state: row.state,
  };
}
