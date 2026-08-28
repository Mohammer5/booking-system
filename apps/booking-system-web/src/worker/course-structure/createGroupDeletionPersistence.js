/**
 * Create guarded permanent Group deletion capability.
 *
 * @param {object} database Application D1 binding.
 * @returns {object} Narrow Group deletion persistence capability.
 */
export function createGroupDeletionPersistence(database) {
  return {
    deleteUnreferencedGroup: (input) =>
      deleteUnreferencedGroup(database, input),
  };
}

/** @returns {Promise<string>} Deleted or exact authoritative refusal. */
async function deleteUnreferencedGroup(database, input) {
  try {
    const result = await database
      .prepare(
        `delete from groups
          where id = ? and course_id = ?
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )
            and exists (
              select 1 from courses
               where id = groups.course_id and state = 'active'
            )
            and not exists (
              select 1 from module_selections s
               where s.course_id = groups.course_id
                 and s.group_id = groups.id
            )`,
      )
      .bind(input.groupId, input.courseId, input.adminUserId)
      .run();

    return result.meta.changes === 1
      ? "deleted"
      : classifyGroupDeletionRefusal(database, input);
  } catch (error) {
    const refusal = await classifyGroupDeletionRefusal(database, input);

    if (refusal !== "group-not-deleted") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Exact current Group deletion refusal. */
async function classifyGroupDeletionRefusal(database, input) {
  const state = await database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         exists(select 1 from groups
                 where id = ? and course_id = ?) as group_exists,
         exists(select 1 from module_selections
                 where course_id = ? and group_id = ?) as has_selection`,
    )
    .bind(
      input.adminUserId,
      input.courseId,
      input.groupId,
      input.courseId,
      input.courseId,
      input.groupId,
    )
    .first();

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.group_exists !== 1) return "group-not-found";
  return state.has_selection === 1
    ? "group-deletion-blocked"
    : "group-not-deleted";
}
