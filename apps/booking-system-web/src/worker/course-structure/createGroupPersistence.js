import { createGroupLifecyclePersistence } from "./createGroupLifecyclePersistence.js";

/**
 * Create the narrow D1 capabilities owned by Course-wide Groups.
 *
 * @param {object} database The application D1 binding.
 * @returns {object} Group persistence capabilities.
 */
export function createGroupPersistence(database) {
  return {
    ...createGroupLifecyclePersistence(database),
    async createGroupForActiveAdmin({ adminUserId, group }) {
      try {
        const result = await insertGroup(database, adminUserId, group);

        return result.meta.changes === 1
          ? "created"
          : resolveGroupRefusal(database, adminUserId, group);
      } catch (error) {
        const refusal = await resolveGroupRefusal(
          database,
          adminUserId,
          group,
        );

        if (refusal === "group-name-conflict") {
          return refusal;
        }

        throw error;
      }
    },

    async listGroupsByCourseId(courseId) {
      const { results } = await database
        .prepare(
          `select id, course_id, name, normalized_name, details, state
             from groups
            where course_id = ?
            order by name collate nocase, id`,
        )
        .bind(courseId)
        .all();

      return results.map(mapGroup);
    },

    async findGroupById(courseId, groupId) {
      const row = await database
        .prepare(
          `select id, course_id, name, normalized_name, details, state
             from groups
            where course_id = ? and id = ?`,
        )
        .bind(courseId, groupId)
        .first();

      return row === null ? null : mapGroup(row);
    },

    async listSelectionContextsByGroupId(courseId, groupId) {
      const { results } = await database
        .prepare(
          `select m.state as module_state, m.starts_at
             from module_selections s
             join modules m
               on m.id = s.module_id and m.course_id = s.course_id
            where s.course_id = ? and s.group_id = ?
            order by m.starts_at, m.id, s.id`,
        )
        .bind(courseId, groupId)
        .all();

      return results.map(mapSelectionContext);
    },

  };
}

/**
 * Attempt one guarded Active Group insert.
 *
 * @param {object} database The application D1 binding.
 * @param {string} adminUserId Acting Admin identity.
 * @param {object} group Valid Group data.
 * @returns {Promise<object>} D1 mutation result.
 */
function insertGroup(database, adminUserId, group) {
  return database
    .prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       select ?, ?, ?, ?, ?, ?
        where exists (
          select 1 from admin_users
           where id = ? and state = 'active'
        )
          and exists (
            select 1 from courses
             where id = ? and state = 'active'
          )
          and not exists (
            select 1 from groups
             where course_id = ?
               and normalized_name = ?
               and state = 'active'
          )`,
    )
    .bind(
      group.id,
      group.courseId,
      group.name,
      group.normalizedName,
      group.details,
      group.state,
      adminUserId,
      group.courseId,
      group.courseId,
      group.normalizedName,
    )
    .run();
}

/**
 * Classify a zero-change or concurrent Group insert refusal from current state.
 *
 * @param {object} database The application D1 binding.
 * @param {string} adminUserId Acting Admin identity.
 * @param {object} group Candidate Group.
 * @returns {Promise<string>} Language-neutral persistence outcome.
 */
async function resolveGroupRefusal(database, adminUserId, group) {
  const state = await database
    .prepare(
      `select
         exists(select 1 from admin_users
                 where id = ? and state = 'active') as is_admin_active,
         exists(select 1 from courses
                 where id = ? and state = 'active') as is_course_active,
         exists(select 1 from groups
                 where course_id = ? and normalized_name = ?
                   and state = 'active') as has_name_conflict`,
    )
    .bind(
      adminUserId,
      group.courseId,
      group.courseId,
      group.normalizedName,
    )
    .first();

  if (state.is_admin_active !== 1) {
    return "admin-not-active";
  }

  if (state.is_course_active !== 1) {
    return "course-not-active";
  }

  return state.has_name_conflict === 1
    ? "group-name-conflict"
    : "group-not-created";
}

/**
 * Translate one technical persistence row to Group plain data.
 *
 * @param {object} row A D1 Group row.
 * @returns {object} The booking-domain Group representation.
 */
function mapGroup(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    normalizedName: row.normalized_name,
    details: row.details,
    state: row.state,
  };
}

/** @returns {object} Retained Selection Module context without Participant data. */
function mapSelectionContext(row) {
  return {
    moduleState: row.module_state,
    startsAt: new Date(row.starts_at).toISOString(),
  };
}
