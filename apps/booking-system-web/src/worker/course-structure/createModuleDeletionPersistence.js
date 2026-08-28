/**
 * Create guarded permanent Module deletion capabilities.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Narrow Module deletion persistence capabilities.
 */
export function createModuleDeletionPersistence(database) {
  return {
    deleteUnreferencedModule: (input) =>
      deleteUnreferencedModule(database, input),
    listSelectionContextsByModuleId: (courseId, moduleId) =>
      listSelectionContextsByModuleId(database, courseId, moduleId),
  };
}

/** @returns {Promise<Array<object>>} Minimal current retained references. */
async function listSelectionContextsByModuleId(database, courseId, moduleId) {
  const { results } = await database
    .prepare(
      `select id
         from module_selections
        where course_id = ? and module_id = ?
        order by id`,
    )
    .bind(courseId, moduleId)
    .all();

  return results.map((row) => ({ selectionId: row.id }));
}

/** @returns {Promise<string>} Deleted or exact authoritative refusal. */
async function deleteUnreferencedModule(database, input) {
  try {
    const result = await database
      .prepare(
        `delete from modules
          where id = ? and course_id = ?
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )
            and exists (
              select 1 from courses
               where id = modules.course_id and state = 'active'
            )
            and not exists (
              select 1 from module_selections s
               where s.course_id = modules.course_id
                 and s.module_id = modules.id
            )`,
      )
      .bind(input.moduleId, input.courseId, input.adminUserId)
      .run();

    return result.meta.changes === 1
      ? "deleted"
      : classifyModuleDeletionRefusal(database, input);
  } catch (error) {
    const refusal = await classifyModuleDeletionRefusal(database, input);

    if (refusal !== "module-not-deleted") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Exact current Module deletion refusal. */
async function classifyModuleDeletionRefusal(database, input) {
  const state = await database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         exists(select 1 from modules
                 where id = ? and course_id = ?) as module_exists,
         exists(select 1 from module_selections
                 where course_id = ? and module_id = ?) as has_selection`,
    )
    .bind(
      input.adminUserId,
      input.courseId,
      input.moduleId,
      input.courseId,
      input.courseId,
      input.moduleId,
    )
    .first();

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.module_exists !== 1) return "module-not-found";
  return state.has_selection === 1
    ? "module-deletion-blocked"
    : "module-not-deleted";
}
