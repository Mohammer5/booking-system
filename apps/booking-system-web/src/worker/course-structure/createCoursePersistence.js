/**
 * Create the narrow D1 capabilities owned by Course structure.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Course persistence capabilities.
 */
export function createCoursePersistence(database) {
  return {
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
          `select id, name, description, timezone, state
             from courses
            order by name collate nocase, id`,
        )
        .all();

      return results.map(mapCourse);
    },

    async findCourseById(courseId) {
      const row = await database
        .prepare(
          `select id, name, description, timezone, state
             from courses
            where id = ?`,
        )
        .bind(courseId)
        .first();

      return row === null ? null : mapCourse(row);
    },
  };
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
  };
}
