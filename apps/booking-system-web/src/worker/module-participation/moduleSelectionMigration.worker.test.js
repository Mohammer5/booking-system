import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 5));
  await insertExistingBookingData();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("Module Selection schema upgrade", () => {
  it("preserves existing booking rows and adds only current Selection data", async () => {
    const columns = await env.DB
      .prepare('pragma table_info("module_selections")')
      .all();

    expect(columns.results.map(({ name }) => name)).toEqual([
      "id",
      "participant_id",
      "course_id",
      "module_id",
      "group_id",
    ]);
    await expect(countRows("courses")).resolves.toBe(2);
    await expect(countRows("groups")).resolves.toBe(2);
    await expect(countRows("modules")).resolves.toBe(2);
    await expect(countRows("participants")).resolves.toBe(1);
    await expect(countRows("course_assignments")).resolves.toBe(1);
    await expect(countRows("module_selections")).resolves.toBe(0);
  });

  it("enforces one pair, same-Course references, ownership, and retention", async () => {
    await insertSelection("selection-a", "module-a", "group-a");

    await expect(
      insertSelection("selection-duplicate", "module-a", "group-a"),
    ).rejects.toThrow();
    await expect(
      insertSelection("selection-cross-group", "module-a", "group-b"),
    ).rejects.toThrow();
    await expect(
      insertSelection("selection-cross-module", "module-b", "group-a"),
    ).rejects.toThrow();
    await expect(
      insertSelection("selection-missing", "missing", "group-a"),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare(
        "update module_selections set participant_id = 'other' where id = 'selection-a'",
      ).run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare(
        "update module_selections set module_id = 'module-b' where id = 'selection-a'",
      ).run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare(
        "update module_selections set course_id = 'course-b' where id = 'selection-a'",
      ).run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare("delete from groups where id = 'group-a'").run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare("delete from modules where id = 'module-a'").run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare("delete from participants where id = 'participant-a'").run(),
    ).rejects.toThrow();
  });
});

/** @returns {Promise<void>} Insert state that predates the Selection migration. */
async function insertExistingBookingData() {
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
               'a@example.com', 'a@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-a', 'participant-a', 'course-a', 'active')`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-a', 'course-a', 'Group A', 'group a', null, 'active'),
              ('group-b', 'course-b', 'Group B', 'group b', null, 'active')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-a', 'course-a', 'Module A', null, null,
               1900000000000, 1900003600000, 'scheduled'),
              ('module-b', 'course-b', 'Module B', null, null,
               1900000000000, 1900003600000, 'scheduled')`,
    ),
  ]);
}

/** @returns {Promise<object>} Insert one raw Selection for constraint evidence. */
function insertSelection(id, moduleId, groupId) {
  return env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values (?, 'participant-a', 'course-a', ?, ?)`,
  )
    .bind(id, moduleId, groupId)
    .run();
}

/** @returns {Promise<number>} Count rows in one fixed test-owned table. */
async function countRows(tableName) {
  const row = await env.DB
    .prepare(`select count(*) as count from "${tableName}"`)
    .first();

  return row.count;
}
