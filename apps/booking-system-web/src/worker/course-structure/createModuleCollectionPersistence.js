import {
  literalLikePattern,
  pageBindings,
  readAdminCollection,
} from "../admin-collections/index.js";

/** @returns {object} Guarded Course Module collection persistence. */
export function createModuleCollectionPersistence(database) {
  return {
    findModuleForAdmin: (adminUserId, courseId, moduleId) =>
      findModuleForAdmin(database, { adminUserId, courseId, moduleId }),
    listModulePage: (adminUserId, courseId, query) =>
      listModulePage(database, { adminUserId, courseId, query }),
  };
}

/** @returns {Promise<object>} One atomic guarded parent and Module item read. */
async function findModuleForAdmin(database, context) {
  const [adminResult, courseResult, moduleResult] = await database.batch([
    database.prepare(
      "select id from admin_users where id = ? and state = 'active'",
    ).bind(context.adminUserId),
    courseStatement(database, context.courseId),
    database.prepare(
      `select id, course_id, title, description, instructions,
              starts_at, ends_at, state
         from modules where course_id = ? and id = ?`,
    ).bind(context.courseId, context.moduleId),
  ]);

  if (adminResult.results.length === 0) return { outcome: "admin-not-active" };
  if (courseResult.results.length === 0) return { outcome: "parent-not-found" };
  if (moduleResult.results.length === 0) return { outcome: "item-not-found" };

  return {
    outcome: "found",
    context: mapCourse(courseResult.results[0]),
    item: mapModule(moduleResult.results[0]),
  };
}

/** @returns {Promise<object>} One parent-scoped, filtered Module page. */
function listModulePage(database, context) {
  const { adminUserId, courseId, query } = context;
  const clauses = ["m.course_id = ?"];
  const bindings = [courseId];

  if (query.q !== undefined) {
    const pattern = literalLikePattern(query.q);

    clauses.push(`(
      lower(m.title) like lower(?) escape '\\'
      or lower(coalesce(m.description, '')) like lower(?) escape '\\'
      or lower(coalesce(m.instructions, '')) like lower(?) escape '\\'
    )`);
    bindings.push(pattern, pattern, pattern);
  }

  if (query.filters.state !== undefined) {
    clauses.push("m.state = ?");
    bindings.push(query.filters.state);
  }

  const where = `where ${clauses.join(" and ")}`;

  return readAdminCollection(database, {
    adminUserId,
    contextStatement: courseStatement(database, courseId),
    countStatement: database
      .prepare(`select count(*) as total_items from modules m ${where}`)
      .bind(...bindings),
    pageStatement: database
      .prepare(
        `select m.id, m.course_id, m.title, m.description, m.instructions,
                m.starts_at, m.ends_at, m.state
           from modules m ${where}
          order by ${moduleOrderBy(query)}
          limit ? offset ?`,
      )
      .bind(...bindings, ...pageBindings(query)),
    query,
    mapContext: mapCourse,
    mapItem: mapModule,
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

/** @returns {string} Static Module ordering and identity tie-break. */
function moduleOrderBy(query) {
  const field = {
    startsAt: "m.starts_at",
    title: "m.title collate nocase",
    state: "m.state",
  }[query.sortField];
  const direction = { asc: "asc", desc: "desc" }[query.sortDirection];

  return `${field} ${direction}, m.id asc`;
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

/** @returns {object} One definite-instant Module. */
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
