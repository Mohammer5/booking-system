/**
 * Create guarded terminal Course archival capabilities.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Narrow Course archival persistence.
 */
export function createCourseArchivalPersistence(database) {
  return {
    archiveActiveCourse: (input) => archiveActiveCourse(database, input),
  };
}

/** @returns {Promise<string>} Archived or exact current-state refusal. */
async function archiveActiveCourse(database, input) {
  try {
    const result = await database
      .prepare(
        `update courses
            set state = 'archived'
          where id = ? and state = 'active'
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )
            and not exists (
              select 1 from modules
               where course_id = courses.id
                 and state = 'scheduled' and ends_at > ?
            )`,
      )
      .bind(input.courseId, input.adminUserId, input.nowEpoch)
      .run();

    return result.meta.changes === 1
      ? "archived"
      : classifyCourseArchivalRefusal(database, input);
  } catch (error) {
    const refusal = await classifyCourseArchivalRefusal(database, input);

    if (refusal !== "course-not-archived") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Exact current Course archival refusal. */
async function classifyCourseArchivalRefusal(database, input) {
  const state = await database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         c.id as course_id, c.state as course_state,
         exists(select 1 from modules
                 where course_id = ? and state = 'scheduled'
                   and ends_at > ?) as has_unresolved_module
       from (select 1) seed
       left join courses c on c.id = ?`,
    )
    .bind(
      input.adminUserId,
      input.courseId,
      input.nowEpoch,
      input.courseId,
    )
    .first();

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.course_id === null) return "course-not-found";
  if (state.course_state !== "active") return "course-not-active";
  return state.has_unresolved_module === 1
    ? "course-archival-blocked"
    : "course-not-archived";
}
