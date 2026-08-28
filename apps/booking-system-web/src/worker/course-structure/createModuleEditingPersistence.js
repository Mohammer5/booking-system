/**
 * Create guarded D1 capabilities for Module text and schedule editing.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Narrow Module editing persistence capabilities.
 */
export function createModuleEditingPersistence(database) {
  return {
    updateModuleDetailsForActiveAdmin: (input) =>
      updateModuleDetails(database, input),
    rescheduleModuleForActiveAdmin: (input) =>
      rescheduleModule(database, input),
  };
}

/** @returns {Promise<string>} Updated or exact current-state refusal. */
async function updateModuleDetails(database, input) {
  try {
    const result = await database
      .prepare(
        `update modules
            set title = ?, description = ?, instructions = ?
          where id = ? and course_id = ?
            and state in ('scheduled', 'cancelled')
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
        input.module.title,
        input.module.description,
        input.module.instructions,
        input.module.id,
        input.module.courseId,
        input.adminUserId,
      )
      .run();

    return result.meta.changes === 1
      ? "updated"
      : classifyModuleDetailRefusal(database, input);
  } catch (error) {
    const refusal = await classifyModuleDetailRefusal(database, input);

    if (refusal !== "module-not-updated") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Rescheduled or exact current-state refusal. */
async function rescheduleModule(database, input) {
  try {
    const result = await guardedScheduleUpdate(database, input);

    return result.meta.changes === 1
      ? "rescheduled"
      : classifyModuleScheduleRefusal(database, input);
  } catch (error) {
    const refusal = await classifyModuleScheduleRefusal(database, input);

    if (refusal !== "module-not-rescheduled") return refusal;
    throw error;
  }
}

/** @returns {Promise<object>} One atomic guarded schedule update result. */
function guardedScheduleUpdate(database, input) {
  const newStartsAt = Date.parse(input.module.startsAt);
  const newEndsAt = Date.parse(input.module.endsAt);

  return database
    .prepare(
      `update modules
          set starts_at = ?, ends_at = ?
        where id = ? and course_id = ? and state = 'scheduled'
          and starts_at = ? and ends_at = ? and starts_at > ?
          and ? > ? and ? > ?
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
          and exists (
            select 1 from courses
             where id = modules.course_id
               and state = 'active' and timezone = ?
          )`,
    )
    .bind(
      newStartsAt,
      newEndsAt,
      input.module.id,
      input.module.courseId,
      Date.parse(input.expectedStartsAt),
      Date.parse(input.expectedEndsAt),
      input.acceptedNowEpoch,
      newStartsAt,
      input.acceptedNowEpoch,
      newEndsAt,
      newStartsAt,
      input.adminUserId,
      input.courseTimezone,
    )
    .run();
}

/** @returns {Promise<string>} Exact detail-edit refusal. */
async function classifyModuleDetailRefusal(database, input) {
  const state = await readModuleEditingState(database, input);

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.module_id === null) return "module-not-found";
  return new Set(["scheduled", "cancelled"]).has(state.module_state)
    ? "module-not-updated"
    : "module-not-editable";
}

/** @returns {Promise<string>} Exact schedule-edit refusal. */
async function classifyModuleScheduleRefusal(database, input) {
  const state = await readModuleEditingState(database, input);

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.course_timezone !== input.courseTimezone) {
    return "course-timezone-changed";
  }
  if (state.module_id === null) return "module-not-found";
  if (
    state.module_state !== "scheduled" ||
    state.starts_at <= input.acceptedNowEpoch
  ) {
    return "module-schedule-locked";
  }
  if (
    state.starts_at !== Date.parse(input.expectedStartsAt) ||
    state.ends_at !== Date.parse(input.expectedEndsAt)
  ) {
    return "module-schedule-changed";
  }

  const newStartsAt = Date.parse(input.module.startsAt);
  const newEndsAt = Date.parse(input.module.endsAt);

  return newStartsAt <= input.acceptedNowEpoch || newEndsAt <= newStartsAt
    ? "module-schedule-invalid"
    : "module-not-rescheduled";
}

/** @returns {Promise<object>} Current actor, Course, and Module editing state. */
function readModuleEditingState(database, input) {
  return database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         (select timezone from courses where id = ?) as course_timezone,
         m.id as module_id, m.state as module_state,
         m.starts_at, m.ends_at
       from (select 1) seed
       left join modules m on m.id = ? and m.course_id = ?`,
    )
    .bind(
      input.adminUserId,
      input.module.courseId,
      input.module.courseId,
      input.module.id,
      input.module.courseId,
    )
    .first();
}
