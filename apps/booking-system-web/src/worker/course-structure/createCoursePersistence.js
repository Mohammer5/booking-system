import { createCourseArchivalPersistence } from "./createCourseArchivalPersistence.js";
import { createCourseDetailPersistence } from "./createCourseDetailPersistence.js";
import {
  literalLikePattern,
  pageBindings,
  readAdminCollection,
} from "../admin-collections/index.js";

/**
 * Create the narrow D1 capabilities owned by Course structure.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Course persistence capabilities.
 */
export function createCoursePersistence(database) {
  return {
    ...createCourseArchivalPersistence(database),
    ...createCourseDetailPersistence(database),
    async createCourseForActiveAdmin({ adminUserId, course }) {
      const result = await database
        .prepare(
          `insert into courses (id, name, description, timezone, state)
           select ?, ?, ?, ?, ?
            where exists (
              select 1
                from admin_users
               where id = ? and state = 'active'
            )`,
        )
        .bind(
          course.id,
          course.name,
          course.description,
          course.timezone,
          course.state,
          adminUserId,
        )
        .run();

      return result.meta.changes === 1 ? "created" : "admin-not-active";
    },

    async listCourses() {
      const { results } = await database
        .prepare(
          `select id, name, description, timezone, state,
                  has_ever_had_module
             from courses
            order by name collate nocase, id`,
        )
        .all();

      return results.map(mapCourse);
    },

    listCoursePage: (adminUserId, query) =>
      listCoursePage(database, adminUserId, query),

    async findCourseById(courseId) {
      const row = await database
        .prepare(
          `select id, name, description, timezone, state,
                  has_ever_had_module
             from courses
            where id = ?`,
        )
        .bind(courseId)
        .first();

      return row === null ? null : mapCourse(row);
    },

    updateActiveCourseForActiveAdmin: (input) =>
      updateActiveCourseForActiveAdmin(database, input),
  };
}

/** @returns {Promise<object>} One guarded, filtered Course page. */
function listCoursePage(database, adminUserId, query) {
  const clauses = [];
  const bindings = [];

  if (query.q !== undefined) {
    const pattern = literalLikePattern(query.q);

    clauses.push(`(
      lower(c.name) like lower(?) escape '\\'
      or lower(coalesce(c.description, '')) like lower(?) escape '\\'
      or lower(c.timezone) like lower(?) escape '\\'
    )`);
    bindings.push(pattern, pattern, pattern);
  }

  if (query.filters.state !== undefined) {
    clauses.push("c.state = ?");
    bindings.push(query.filters.state);
  }

  const where = clauses.length === 0 ? "" : `where ${clauses.join(" and ")}`;
  const orderBy = courseOrderBy(query);
  const countStatement = database
    .prepare(`select count(*) as total_items from courses c ${where}`)
    .bind(...bindings);
  const pageStatement = database
    .prepare(
      `select c.id, c.name, c.description, c.timezone, c.state,
              c.has_ever_had_module
         from courses c ${where}
        order by ${orderBy}
        limit ? offset ?`,
    )
    .bind(...bindings, ...pageBindings(query));

  return readAdminCollection(database, {
    adminUserId,
    countStatement,
    pageStatement,
    query,
    mapItem: mapCourse,
  });
}

/** @returns {string} Static Course ordering with a stable identity tie-break. */
function courseOrderBy(query) {
  const field = {
    name: "c.name collate nocase",
    state: "c.state",
    timezone: "c.timezone collate nocase",
  }[query.sortField];
  const direction = { asc: "asc", desc: "desc" }[query.sortDirection];

  return `${field} ${direction}, c.id asc`;
}

/**
 * Update complete Course fields while actor, lifecycle, timezone, and history permit it.
 *
 * @param {object} database The application D1 binding.
 * @param {object} input Current actor, Course data, and resolved timezone.
 * @returns {Promise<string>} Updated or exact authoritative refusal.
 */
async function updateActiveCourseForActiveAdmin(database, input) {
  const result = await database
    .prepare(
      `update courses
          set name = ?, description = ?, timezone = ?
        where id = ? and state = 'active' and timezone = ?
          and (timezone = ? or has_ever_had_module = 0)
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )`,
    )
    .bind(
      input.course.name,
      input.course.description,
      input.course.timezone,
      input.course.id,
      input.expectedTimezone,
      input.course.timezone,
      input.adminUserId,
    )
    .run();

  return result.meta.changes === 1
    ? "updated"
    : resolveCourseUpdateRefusal(database, input);
}

/**
 * Classify a guarded Course edit loss from current persisted state.
 *
 * @param {object} database The application D1 binding.
 * @param {object} input Attempted Course update.
 * @returns {Promise<string>} Exact current-state outcome.
 */
async function resolveCourseUpdateRefusal(database, input) {
  const [adminUser, course] = await Promise.all([
    database
      .prepare("select state from admin_users where id = ?")
      .bind(input.adminUserId)
      .first(),
    database
      .prepare(
        `select state, timezone, has_ever_had_module
           from courses where id = ?`,
      )
      .bind(input.course.id)
      .first(),
  ]);

  if (adminUser?.state !== "active") {
    return "admin-not-active";
  }

  if (course?.state !== "active") {
    return "course-not-active";
  }

  if (course.timezone !== input.expectedTimezone) {
    return "course-timezone-changed";
  }

  if (
    course.has_ever_had_module === 1 &&
    input.course.timezone !== course.timezone
  ) {
    return "course-timezone-locked";
  }

  return "course-not-updated";
}

/**
 * Translate one technical persistence row to booking-domain plain data.
 *
 * @param {object} row A D1 Course row.
 * @returns {object} The booking-domain Course representation.
 */
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
