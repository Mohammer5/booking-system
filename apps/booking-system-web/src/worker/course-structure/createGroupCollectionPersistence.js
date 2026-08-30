import {
  literalLikePattern,
  pageBindings,
  readAdminCollection,
} from "../admin-collections/index.js";

/** @returns {object} Guarded Course Group collection persistence. */
export function createGroupCollectionPersistence(database) {
  return {
    findGroupForAdmin: (adminUserId, courseId, groupId) =>
      findGroupForAdmin(database, { adminUserId, courseId, groupId }),
    listGroupPage: (adminUserId, courseId, query) =>
      listGroupPage(database, { adminUserId, courseId, query }),
  };
}

/** @returns {Promise<object>} One atomic guarded parent and Group item read. */
async function findGroupForAdmin(database, context) {
  const [adminResult, courseResult, groupResult] = await database.batch([
    database.prepare(
      "select id from admin_users where id = ? and state = 'active'",
    ).bind(context.adminUserId),
    courseStatement(database, context.courseId),
    database.prepare(
      `select id, course_id, name, normalized_name, details, state
         from groups where course_id = ? and id = ?`,
    ).bind(context.courseId, context.groupId),
  ]);

  if (adminResult.results.length === 0) return { outcome: "admin-not-active" };
  if (courseResult.results.length === 0) return { outcome: "parent-not-found" };
  if (groupResult.results.length === 0) return { outcome: "item-not-found" };

  return {
    outcome: "found",
    context: mapCourse(courseResult.results[0]),
    item: mapGroup(groupResult.results[0]),
  };
}

/** @returns {Promise<object>} One parent-scoped, filtered Group page. */
function listGroupPage(database, context) {
  const { adminUserId, courseId, query } = context;
  const clauses = ["g.course_id = ?"];
  const bindings = [courseId];

  if (query.q !== undefined) {
    const pattern = literalLikePattern(query.q);

    clauses.push(`(
      lower(g.name) like lower(?) escape '\\'
      or lower(coalesce(g.details, '')) like lower(?) escape '\\'
    )`);
    bindings.push(pattern, pattern);
  }

  if (query.filters.state !== undefined) {
    clauses.push("g.state = ?");
    bindings.push(query.filters.state);
  }

  const where = `where ${clauses.join(" and ")}`;

  return readAdminCollection(database, {
    adminUserId,
    contextStatement: courseStatement(database, courseId),
    countStatement: database
      .prepare(`select count(*) as total_items from groups g ${where}`)
      .bind(...bindings),
    pageStatement: database
      .prepare(
        `select g.id, g.course_id, g.name, g.normalized_name,
                g.details, g.state
           from groups g ${where}
          order by ${groupOrderBy(query)}
          limit ? offset ?`,
      )
      .bind(...bindings, ...pageBindings(query)),
    query,
    mapContext: mapCourse,
    mapItem: mapGroup,
  });
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

/** @returns {string} Static Group ordering and identity tie-break. */
function groupOrderBy(query) {
  const field = {
    name: "g.name collate nocase",
    state: "g.state",
  }[query.sortField];
  const direction = { asc: "asc", desc: "desc" }[query.sortDirection];

  return `${field} ${direction}, g.id asc`;
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

/** @returns {object} One Course Group. */
function mapGroup(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    normalizedName: row.normalized_name,
    details: row.details,
    state: row.state,
  };
}
