/**
 * Create the guarded Admin Course-participation read capability.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Administrative participation persistence.
 */
export function createAdministrativeParticipationPersistence(database) {
  return {
    findCourseParticipation: (adminUserId, courseId) =>
      findCourseParticipation(database, adminUserId, courseId),
  };
}

/**
 * Read one normalized Course participation model under a current Admin guard.
 *
 * @param {object} database The application D1 binding.
 * @param {string} adminUserId Current Admin identity.
 * @param {string} courseId Requested Course identity.
 * @returns {Promise<object | null>} Complete Course participation or no data.
 */
async function findCourseParticipation(database, adminUserId, courseId) {
  const [courseResult, groupResult, moduleResult, assignmentResult, selectionResult] =
    await database.batch([
      courseStatement(database, adminUserId, courseId),
      groupStatement(database, adminUserId, courseId),
      moduleStatement(database, adminUserId, courseId),
      assignmentStatement(database, adminUserId, courseId),
      selectionStatement(database, adminUserId, courseId),
    ]);
  const courseRow = courseResult.results[0];

  if (courseRow === undefined) {
    return null;
  }

  const selectionsByParticipant = groupSelectionsByParticipant(
    selectionResult.results,
  );

  return {
    course: mapCourse(courseRow),
    groups: groupResult.results.map(mapGroup),
    modules: moduleResult.results.map(mapModule),
    participations: assignmentResult.results.map((row) => ({
      ...mapParticipation(row),
      selections: selectionsByParticipant.get(row.participant_id) ?? [],
    })),
  };
}

/** @returns {object} Current-Admin-guarded Course statement. */
function courseStatement(database, adminUserId, courseId) {
  return database
    .prepare(
      `select c.id, c.name, c.description, c.timezone, c.state
         from courses c
        where c.id = ?
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )`,
    )
    .bind(courseId, adminUserId);
}

/** @returns {object} Current-Admin-guarded Course Group statement. */
function groupStatement(database, adminUserId, courseId) {
  return database
    .prepare(
      `select g.id, g.course_id, g.name, g.details, g.state
         from groups g
        where g.course_id = ?
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
        order by g.name collate nocase, g.id`,
    )
    .bind(courseId, adminUserId);
}

/** @returns {object} Current-Admin-guarded Course Module statement. */
function moduleStatement(database, adminUserId, courseId) {
  return database
    .prepare(
      `select m.id, m.course_id, m.title, m.description, m.instructions,
              m.starts_at, m.ends_at, m.state
         from modules m
        where m.course_id = ?
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
        order by m.starts_at, m.id`,
    )
    .bind(courseId, adminUserId);
}

/** @returns {object} Current-Admin-guarded Assignment/Participant statement. */
function assignmentStatement(database, adminUserId, courseId) {
  return database
    .prepare(
      `select a.id as assignment_id, a.participant_id, a.course_id,
              a.state as assignment_state, p.name as participant_name,
              p.email as participant_email, p.state as participant_state
         from course_assignments a
         join participants p on p.id = a.participant_id
        where a.course_id = ?
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
        order by p.name collate nocase, p.id`,
    )
    .bind(courseId, adminUserId);
}

/** @returns {object} Current-Admin-guarded retained Selection statement. */
function selectionStatement(database, adminUserId, courseId) {
  return database
    .prepare(
      `select s.id, s.participant_id, s.course_id, s.module_id, s.group_id,
              g.name as group_name, g.details as group_details,
              g.state as group_state
         from module_selections s
         join course_assignments a
           on a.participant_id = s.participant_id
          and a.course_id = s.course_id
         join modules m
           on m.id = s.module_id and m.course_id = s.course_id
         join groups g
           on g.id = s.group_id and g.course_id = s.course_id
        where s.course_id = ? and a.course_id = ?
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
        order by s.participant_id, m.starts_at, s.id`,
    )
    .bind(courseId, courseId, adminUserId);
}

/** @returns {Map<string, Array<object>>} Retained Selections by Participant. */
function groupSelectionsByParticipant(rows) {
  const selections = new Map();

  for (const row of rows) {
    const participantSelections = selections.get(row.participant_id) ?? [];

    participantSelections.push(mapSelection(row));
    selections.set(row.participant_id, participantSelections);
  }

  return selections;
}

/** @returns {object} Course plain data. */
function mapCourse(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    state: row.state,
  };
}

/** @returns {object} Group plain data. */
function mapGroup(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    details: row.details,
    state: row.state,
  };
}

/** @returns {object} Module plain data. */
function mapModule(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    state: row.state,
  };
}

/** @returns {object} Assignment and Participant plain data. */
function mapParticipation(row) {
  return {
    assignment: {
      id: row.assignment_id,
      participantId: row.participant_id,
      courseId: row.course_id,
      state: row.assignment_state,
    },
    participant: {
      id: row.participant_id,
      name: row.participant_name,
      email: row.participant_email,
      state: row.participant_state,
    },
  };
}

/** @returns {object} Retained Selection with selected Group data. */
function mapSelection(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    courseId: row.course_id,
    moduleId: row.module_id,
    groupId: row.group_id,
    group: {
      id: row.group_id,
      name: row.group_name,
      details: row.group_details,
      state: row.group_state,
    },
  };
}
