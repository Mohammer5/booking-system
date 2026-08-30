/** @returns {object} Guarded focused Course detail persistence. */
export function createCourseDetailPersistence(database) {
  return {
    findCourseDetailForAdmin: (adminUserId, courseId, nowEpoch) =>
      findCourseDetailForAdmin(
        database,
        { adminUserId, courseId, nowEpoch },
      ),
  };
}

/** @returns {Promise<object>} Focused Course detail or current refusal. */
async function findCourseDetailForAdmin(database, context) {
  const [actorResult, courseResult] = await database.batch([
    database
      .prepare("select id from admin_users where id = ? and state = 'active'")
      .bind(context.adminUserId),
    detailStatement(database, context),
  ]);

  if (actorResult.results.length === 0) {
    return { outcome: "admin-not-active" };
  }

  const row = courseResult.results[0];

  return row === undefined
    ? { outcome: "course-not-found" }
    : { outcome: "found", detail: mapCourseDetail(row) };
}

/** @returns {object} Course fields, retained counts, and archival capability. */
function detailStatement(database, context) {
  return database
    .prepare(
      `select c.id, c.name, c.description, c.timezone, c.state,
              c.has_ever_had_module,
              (select count(*) from course_assignments a
                where a.course_id = c.id) as participant_count,
              (select count(*) from groups g
                where g.course_id = c.id) as group_count,
              (select count(*) from modules m
                where m.course_id = c.id) as module_count,
              case when c.state = 'active' and not exists (
                select 1 from modules m
                 where m.course_id = c.id
                   and m.state = 'scheduled' and m.ends_at > ?
              ) then 1 else 0 end as is_archival_available
         from courses c where c.id = ?`,
    )
    .bind(context.nowEpoch, context.courseId);
}

/** @returns {object} Focused detail data without child arrays. */
function mapCourseDetail(row) {
  return {
    course: {
      id: row.id,
      name: row.name,
      description: row.description,
      timezone: row.timezone,
      state: row.state,
      hasEverHadModule: row.has_ever_had_module === 1,
    },
    counts: {
      participants: Number(row.participant_count),
      groups: Number(row.group_count),
      modules: Number(row.module_count),
    },
    isArchivalAvailable: row.is_archival_available === 1,
  };
}
