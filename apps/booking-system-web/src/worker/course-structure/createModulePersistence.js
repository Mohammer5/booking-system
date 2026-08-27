/**
 * Create the narrow D1 capabilities owned by Scheduled Modules.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Module persistence capabilities.
 */
export function createModulePersistence(database) {
  return {
    async createModuleForActiveAdmin({ adminUserId, module }) {
      const result = await database
        .prepare(
          `insert into modules
             (id, course_id, title, description, instructions,
              starts_at, ends_at, state)
           select ?, ?, ?, ?, ?, ?, ?, ?
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
          module.id,
          module.courseId,
          module.title,
          module.description,
          module.instructions,
          Date.parse(module.startsAt),
          Date.parse(module.endsAt),
          module.state,
          adminUserId,
          module.courseId,
        )
        .run();

      return result.meta.changes > 0
        ? "created"
        : resolveModuleRefusal(database, adminUserId, module.courseId);
    },

    async listModulesByCourseId(courseId) {
      const { results } = await database
        .prepare(
          `select id, course_id, title, description, instructions,
                  starts_at, ends_at, state
             from modules
            where course_id = ?
            order by starts_at, id`,
        )
        .bind(courseId)
        .all();

      return results.map(mapModule);
    },
  };
}

/**
 * Classify a guarded Module insertion loss from authoritative current state.
 *
 * @param {object} database The application D1 binding.
 * @param {string} adminUserId Acting Admin identity.
 * @param {string} courseId Parent Course identity.
 * @returns {Promise<string>} Language-neutral persistence outcome.
 */
async function resolveModuleRefusal(database, adminUserId, courseId) {
  const state = await database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active`,
    )
    .bind(adminUserId, courseId)
    .first();

  return state.is_admin_active !== 1
    ? "admin-not-active"
    : state.is_course_active !== 1
      ? "course-not-active"
      : "module-not-created";
}

/**
 * Translate one technical persistence row to Module plain data.
 *
 * @param {object} row A D1 Module row.
 * @returns {object} The booking-domain Module representation.
 */
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
