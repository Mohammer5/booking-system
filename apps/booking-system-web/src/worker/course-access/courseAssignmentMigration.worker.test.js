import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 4));
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-existing', 'Existing Course', null,
               'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-existing', 'principal-existing',
               'Existing Participant', 'existing@example.com',
               'existing@example.com', 'active')`,
    ),
  ]);
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("Course Assignment schema upgrade", () => {
  it("preserves existing application data and adds only constrained membership", async () => {
    const participant = await env.DB
      .prepare("select name from participants where id = 'participant-existing'")
      .first();
    const course = await env.DB
      .prepare("select name from courses where id = 'course-existing'")
      .first();
    const assignmentColumns = await env.DB
      .prepare('pragma table_info("course_assignments")')
      .all();
    const membershipTables = await env.DB
      .prepare(
        `select name from sqlite_master
          where type = 'table'
            and name in ('course_assignments', 'module_selections')
          order by name`,
      )
      .all();

    expect(participant).toEqual({ name: "Existing Participant" });
    expect(course).toEqual({ name: "Existing Course" });
    expect(assignmentColumns.results.map(({ name }) => name)).toEqual([
      "id",
      "participant_id",
      "course_id",
      "state",
    ]);
    expect(membershipTables.results).toEqual([{ name: "course_assignments" }]);
  });

  it("enforces lifecycle state, one pair, foreign keys, and permanent ownership", async () => {
    await insertCourseAndParticipants();
    await insertAssignment({ id: "assignment-a", state: "active" });

    await expect(
      insertAssignment({ id: "assignment-duplicate", state: "active" }),
    ).rejects.toThrow();
    await expect(
      insertAssignment({ id: "assignment-state", state: "pending", participantId: "participant-b" }),
    ).rejects.toThrow();
    await expect(
      insertAssignment({ id: "assignment-participant", participantId: "missing" }),
    ).rejects.toThrow();
    await expect(
      insertAssignment({ id: "assignment-course", courseId: "missing" }),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare(
        "update course_assignments set participant_id = 'participant-b' where id = 'assignment-a'",
      ).run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare(
        "update course_assignments set course_id = 'course-b' where id = 'assignment-a'",
      ).run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare("delete from participants where id = 'participant-a'").run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare("delete from courses where id = 'course-a'").run(),
    ).rejects.toThrow();
  });
});

/** @returns {Promise<void>} Insert deterministic Courses and Participants. */
async function insertCourseAndParticipants() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-a', 'Course A', null, 'Europe/Berlin', 'active', 0),
              ('course-b', 'Course B', null, 'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-a', 'principal-a', 'Participant A',
               'a@example.com', 'a@example.com', 'active'),
              ('participant-b', 'principal-b', 'Participant B',
               'b@example.com', 'b@example.com', 'disabled')`,
    ),
  ]);
}

/**
 * Insert one Assignment directly for schema evidence.
 *
 * @param {object} input Assignment values.
 * @returns {Promise<object>} D1 mutation result.
 */
function insertAssignment({
  id,
  participantId = "participant-a",
  courseId = "course-a",
  state = "active",
}) {
  return env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, ?, ?, ?)`,
  )
    .bind(id, participantId, courseId, state)
    .run();
}
