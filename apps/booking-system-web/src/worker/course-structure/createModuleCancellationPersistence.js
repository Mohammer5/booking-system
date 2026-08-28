/**
 * Create the guarded terminal Module cancellation capability.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Narrow Module cancellation persistence.
 */
export function createModuleCancellationPersistence(database) {
  return {
    cancelScheduledModule: (input) => cancelScheduledModule(database, input),
  };
}

/** @returns {Promise<string>} Cancelled or exact current-state refusal. */
async function cancelScheduledModule(database, input) {
  try {
    const result = await database
      .prepare(
        `update modules
            set state = 'cancelled'
          where id = ? and course_id = ? and state = 'scheduled'
            and ends_at > ?
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )
            and exists (
              select 1 from courses
               where id = modules.course_id and state = 'active'
            )`,
      )
      .bind(
        input.moduleId,
        input.courseId,
        input.nowEpoch,
        input.adminUserId,
      )
      .run();

    return result.meta.changes === 1
      ? "cancelled"
      : classifyCancellationRefusal(database, input);
  } catch (error) {
    const refusal = await classifyCancellationRefusal(database, input);

    if (refusal !== "module-not-cancelled") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Exact terminal cancellation refusal. */
async function classifyCancellationRefusal(database, input) {
  const state = await readCancellationState(database, input);

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.module_id === null) return "module-not-found";
  if (state.module_state !== "scheduled") return "module-not-scheduled";
  return state.ends_at <= input.nowEpoch
    ? "module-cancellation-deadline-reached"
    : "module-not-cancelled";
}

/** @returns {Promise<object>} Current actor, Course, and Module state. */
function readCancellationState(database, input) {
  return database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         m.id as module_id, m.state as module_state, m.ends_at
       from (select 1) seed
       left join modules m on m.id = ? and m.course_id = ?`,
    )
    .bind(
      input.adminUserId,
      input.courseId,
      input.moduleId,
      input.courseId,
    )
    .first();
}
