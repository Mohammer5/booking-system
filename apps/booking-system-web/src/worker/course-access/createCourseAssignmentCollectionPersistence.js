import {
  literalLikePattern,
  pageBindings,
  readAdminCollection,
} from "../admin-collections/index.js";

const participantOptionLimit = 10;

/** @returns {object} Guarded Course Assignment collection and picker reads. */
export function createCourseAssignmentCollectionPersistence(database) {
  return {
    listAssignmentPage: (adminUserId, courseId, query) =>
      listAssignmentPage(database, { adminUserId, courseId, query }),
    listParticipantOptions: (adminUserId, courseId, q) =>
      listParticipantOptions(database, { adminUserId, courseId, q }),
  };
}

/** @returns {Promise<object>} One parent-scoped Assignment page. */
function listAssignmentPage(database, context) {
  const { adminUserId, courseId, query } = context;
  const clauses = ["a.course_id = ?"];
  const bindings = [courseId];

  appendSearchClause(clauses, bindings, query.q);
  appendFilterClause({
    clauses,
    bindings,
    column: "p.state",
    value: query.filters.participantState,
  });
  appendFilterClause({
    clauses,
    bindings,
    column: "a.state",
    value: query.filters.assignmentState,
  });
  const where = `where ${clauses.join(" and ")}`;

  return readAdminCollection(database, {
    adminUserId,
    contextStatement: courseStatement(database, courseId),
    countStatement: database
      .prepare(
        `select count(*) as total_items
           from course_assignments a
           join participants p on p.id = a.participant_id ${where}`,
      )
      .bind(...bindings),
    pageStatement: database
      .prepare(
        `select a.id, a.participant_id, a.course_id, a.state,
                p.name as participant_name, p.email as participant_email,
                p.state as participant_state
           from course_assignments a
           join participants p on p.id = a.participant_id ${where}
          order by ${assignmentOrderBy(query)}
          limit ? offset ?`,
      )
      .bind(...bindings, ...pageBindings(query)),
    query,
    mapContext: mapCourse,
    mapItem: mapAssignmentWithParticipant,
  });
}

/** @returns {Promise<object>} Bounded Course-specific Participant options. */
async function listParticipantOptions(database, context) {
  const bindings = [context.courseId];
  let searchClause = "";

  if (context.q !== undefined) {
    const pattern = literalLikePattern(context.q);

    searchClause = `where (
      lower(p.name) like lower(?) escape '\\'
      or lower(p.email) like lower(?) escape '\\'
    )`;
    bindings.push(pattern, pattern);
  }

  const [actorResult, courseResult, optionResult] = await database.batch([
    database
      .prepare("select id from admin_users where id = ? and state = 'active'")
      .bind(context.adminUserId),
    courseStatement(database, context.courseId),
    database
      .prepare(
        `select p.id, p.name, p.email, p.state,
                a.state as assignment_state
           from participants p
           left join course_assignments a
             on a.participant_id = p.id and a.course_id = ?
           ${searchClause}
          order by p.name collate nocase, p.id
          limit ${participantOptionLimit}`,
      )
      .bind(...bindings),
  ]);

  if (actorResult.results.length === 0) {
    return { outcome: "admin-not-active" };
  }

  if (courseResult.results.length === 0) {
    return { outcome: "parent-not-found" };
  }

  return {
    outcome: "listed",
    course: mapCourse(courseResult.results[0]),
    participants: optionResult.results.map(mapParticipantOption),
  };
}

/** Add literal name/email search when applied. */
function appendSearchClause(clauses, bindings, q) {
  if (q === undefined) return;
  const pattern = literalLikePattern(q);

  clauses.push(`(
    lower(p.name) like lower(?) escape '\\'
    or lower(p.email) like lower(?) escape '\\'
  )`);
  bindings.push(pattern, pattern);
}

/** Add one normalized equality filter when applied. */
function appendFilterClause({ clauses, bindings, column, value }) {
  if (value === undefined) return;
  clauses.push(`${column} = ?`);
  bindings.push(value);
}

/** @returns {object} Minimum parent Course statement. */
function courseStatement(database, courseId) {
  return database
    .prepare(
      `select id, name, description, timezone, state, has_ever_had_module
         from courses where id = ?`,
    )
    .bind(courseId);
}

/** @returns {string} Static Assignment ordering and identity tie-break. */
function assignmentOrderBy(query) {
  const field = {
    name: "p.name collate nocase",
    email: "p.email collate nocase",
    participantState: "p.state",
    assignmentState: "a.state",
  }[query.sortField];
  const direction = { asc: "asc", desc: "desc" }[query.sortDirection];

  return `${field} ${direction}, a.id asc`;
}

/** @returns {object} Minimum parent Course data. */
function mapCourse(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    state: row.state,
    hasEverHadModule: row.has_ever_had_module === 1,
  };
}

/** @returns {object} One retained Assignment joined with Participant. */
function mapAssignmentWithParticipant(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    courseId: row.course_id,
    state: row.state,
    participant: {
      id: row.participant_id,
      name: row.participant_name,
      email: row.participant_email,
      state: row.participant_state,
    },
  };
}

/** @returns {object} One secret-free Participant picker option. */
function mapParticipantOption(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    state: row.state,
    assignmentState: row.assignment_state ?? null,
  };
}
