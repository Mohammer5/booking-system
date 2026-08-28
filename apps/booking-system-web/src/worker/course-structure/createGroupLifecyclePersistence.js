/**
 * Create guarded Group field and lifecycle mutation capabilities.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Group update, archival, and reactivation capabilities.
 */
export function createGroupLifecyclePersistence(database) {
  return {
    updateGroupForActiveAdmin: (input) =>
      updateGroupForActiveAdmin(database, input),
    archiveActiveGroup: (input) => archiveActiveGroup(database, input),
    reactivateArchivedGroup: (input) =>
      reactivateArchivedGroup(database, input),
  };
}

/** @returns {Promise<string>} Updated or exact authoritative refusal. */
async function updateGroupForActiveAdmin(database, input) {
  try {
    const result = await database
      .prepare(
        `update groups
            set name = ?, normalized_name = ?, details = ?
          where id = ? and course_id = ? and state = ?
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )
            and exists (
              select 1 from courses
               where id = groups.course_id and state = 'active'
            )
            and (
              state = 'archived' or not exists (
                select 1 from groups other
                 where other.course_id = groups.course_id
                   and other.id <> groups.id
                   and other.normalized_name = ?
                   and other.state = 'active'
              )
            )`,
      )
      .bind(
        input.group.name,
        input.group.normalizedName,
        input.group.details,
        input.group.id,
        input.group.courseId,
        input.expectedState,
        input.adminUserId,
        input.group.normalizedName,
      )
      .run();

    return result.meta.changes === 1
      ? "updated"
      : resolveGroupUpdateRefusal(database, input);
  } catch (error) {
    const refusal = await resolveGroupUpdateRefusal(database, input);

    if (refusal === "group-name-conflict") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Archived or exact authoritative refusal. */
async function archiveActiveGroup(database, input) {
  const result = await database
    .prepare(
      `update groups
          set state = 'archived'
        where id = ? and course_id = ? and state = 'active'
          and exists (
            select 1 from admin_users
             where id = ? and state = 'active'
          )
          and exists (
            select 1 from courses
             where id = groups.course_id and state = 'active'
          )
          and not exists (
            select 1
              from module_selections s
              join modules m
                on m.id = s.module_id and m.course_id = s.course_id
             where s.group_id = groups.id
               and s.course_id = groups.course_id
               and m.state = 'scheduled' and m.starts_at > ?
          )`,
    )
    .bind(input.groupId, input.courseId, input.adminUserId, input.nowEpoch)
    .run();

  return result.meta.changes === 1
    ? "archived"
    : resolveGroupLifecycleRefusal(database, input, "archive");
}

/** @returns {Promise<string>} Reactivated or exact authoritative refusal. */
async function reactivateArchivedGroup(database, input) {
  try {
    const result = await database
      .prepare(
        `update groups
            set state = 'active'
          where id = ? and course_id = ? and state = 'archived'
            and exists (
              select 1 from admin_users
               where id = ? and state = 'active'
            )
            and exists (
              select 1 from courses
               where id = groups.course_id and state = 'active'
            )
            and not exists (
              select 1 from groups other
               where other.course_id = groups.course_id
                 and other.id <> groups.id
                 and other.normalized_name = groups.normalized_name
                 and other.state = 'active'
            )`,
      )
      .bind(input.groupId, input.courseId, input.adminUserId)
      .run();

    return result.meta.changes === 1
      ? "reactivated"
      : resolveGroupLifecycleRefusal(database, input, "reactivate");
  } catch (error) {
    const refusal = await resolveGroupLifecycleRefusal(
      database,
      input,
      "reactivate",
    );

    if (refusal === "group-name-conflict") return refusal;
    throw error;
  }
}

/** @returns {Promise<string>} Exact complete-edit refusal from current state. */
async function resolveGroupUpdateRefusal(database, input) {
  const state = await readGroupMutationState(database, input, {
    desiredNormalizedName: input.group.normalizedName,
  });

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.group_state === null) return "group-not-found";
  if (state.group_state !== input.expectedState) return "group-state-changed";
  if (
    state.group_state === "active" &&
    state.has_name_conflict === 1
  ) {
    return "group-name-conflict";
  }

  return "group-not-updated";
}

/** @returns {Promise<string>} Exact archive/reactivate refusal from current state. */
async function resolveGroupLifecycleRefusal(database, input, action) {
  const state = await readGroupMutationState(database, input, {
    nowEpoch: input.nowEpoch ?? 0,
  });

  if (state.is_admin_active !== 1) return "admin-not-active";
  if (state.is_course_active !== 1) return "course-not-active";
  if (state.group_state === null) return "group-not-found";

  if (action === "archive") {
    if (state.group_state !== "active") return "group-not-active";
    return state.has_upcoming_selection === 1
      ? "group-archival-blocked"
      : "group-not-archived";
  }

  if (state.group_state !== "archived") return "group-not-archived";
  return state.has_name_conflict === 1
    ? "group-name-conflict"
    : "group-not-reactivated";
}

/** @returns {Promise<object>} Current Group mutation classification state. */
function readGroupMutationState(database, input, options) {
  const groupId = input.groupId ?? input.group.id;
  const courseId = input.courseId ?? input.group.courseId;

  return database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         (select state from groups
           where id = ? and course_id = ?) as group_state,
         exists(
           select 1 from groups other
            where other.course_id = ? and other.id <> ?
              and other.normalized_name = coalesce(
                ?, (select normalized_name from groups
                     where id = ? and course_id = ?)
              )
              and other.state = 'active'
         ) as has_name_conflict,
         exists(
           select 1
             from module_selections s
             join modules m
               on m.id = s.module_id and m.course_id = s.course_id
            where s.group_id = ? and s.course_id = ?
              and m.state = 'scheduled' and m.starts_at > ?
         ) as has_upcoming_selection`,
    )
    .bind(
      input.adminUserId,
      courseId,
      groupId,
      courseId,
      courseId,
      groupId,
      options.desiredNormalizedName ?? null,
      groupId,
      courseId,
      groupId,
      courseId,
      options.nowEpoch ?? 0,
    )
    .first();
}
