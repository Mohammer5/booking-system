import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCoursePersistence } from "./createCoursePersistence.js";
import { createModulePersistence } from "./createModulePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
  await insertAdmin("admin-1", "active");
  await insertCourse("course-1", "Course One");
  await insertCourse("course-2", "Course Two");
});

describe("Course edit persistence", () => {
  it("updates complete fields and preserves identity, ownership, and duplicate names", async () => {
    await env.DB.batch([
      env.DB.prepare(
        `insert into groups
           (id, course_id, name, normalized_name, details, state)
         values ('group-1', 'course-1', 'Group', 'group', null, 'active')`,
      ),
      env.DB.prepare(
        `insert into participants
           (id, external_principal_id, name, email, normalized_email, state)
         values ('participant-1', 'participant-principal', 'Participant',
                 'participant@example.com', 'participant@example.com', 'active')`,
      ),
      env.DB.prepare(
        `insert into course_assignments (id, participant_id, course_id, state)
         values ('assignment-1', 'participant-1', 'course-1', 'active')`,
      ),
    ]);
    const persistence = createCoursePersistence(env.DB);

    await expect(
      persistence.updateActiveCourseForActiveAdmin({
        adminUserId: "admin-1",
        expectedTimezone: "Europe/Berlin",
        course: courseUpdate({
          name: "Course Two",
          description: "Updated",
          timezone: "America/New_York",
        }),
      }),
    ).resolves.toBe("updated");
    await expect(persistence.findCourseById("course-1")).resolves.toEqual({
      ...courseUpdate({
        name: "Course Two",
        description: "Updated",
        timezone: "America/New_York",
      }),
      hasEverHadModule: false,
    });
    await expect(countRows("groups", "course_id", "course-1")).resolves.toBe(1);
    await expect(
      countRows("course_assignments", "course_id", "course-1"),
    ).resolves.toBe(1);
  });

  it("keeps failed creation editable and permanently locks after Module deletion", async () => {
    const coursePersistence = createCoursePersistence(env.DB);
    const modulePersistence = createModulePersistence(env.DB);

    await expect(
      modulePersistence.createModuleForActiveAdmin({
        adminUserId: "admin-1",
        courseTimezone: "Europe/Berlin",
        module: moduleCandidate("invalid", "2027-01-01T11:00:00.000Z", "2027-01-01T11:00:00.000Z"),
      }),
    ).rejects.toThrow();
    await expect(
      updateTimezone(coursePersistence, "America/New_York", "Europe/Berlin"),
    ).resolves.toBe("updated");

    await expect(
      modulePersistence.createModuleForActiveAdmin({
        adminUserId: "admin-1",
        courseTimezone: "America/New_York",
        module: moduleCandidate("module-1"),
      }),
    ).resolves.toBe("created");
    await env.DB.prepare("delete from modules where id = 'module-1'").run();

    await expect(
      updateTimezone(coursePersistence, "Europe/London", "America/New_York"),
    ).resolves.toBe("course-timezone-locked");
    await expect(
      coursePersistence.updateActiveCourseForActiveAdmin({
        adminUserId: "admin-1",
        expectedTimezone: "America/New_York",
        course: courseUpdate({
          name: "Descriptive edit remains valid",
          timezone: "America/New_York",
        }),
      }),
    ).resolves.toBe("updated");
    await expect(courseRow("course-1")).resolves.toMatchObject({
      name: "Descriptive edit remains valid",
      timezone: "America/New_York",
      has_ever_had_module: 1,
    });
  });

  it.each([
    ["disabled", "active", "admin-not-active"],
    ["active", "archived", "course-not-active"],
  ])("refuses Admin %s and Course %s without a partial edit", async (
    adminState,
    courseState,
    outcome,
  ) => {
    await env.DB.prepare("update admin_users set state = ? where id = 'admin-1'")
      .bind(adminState)
      .run();
    await env.DB.prepare("update courses set state = ? where id = 'course-1'")
      .bind(courseState)
      .run();
    const persistence = createCoursePersistence(env.DB);

    await expect(
      persistence.updateActiveCourseForActiveAdmin({
        adminUserId: "admin-1",
        expectedTimezone: "Europe/Berlin",
        course: courseUpdate({
          name: "Refused",
          description: "Refused",
          timezone: "America/New_York",
        }),
      }),
    ).resolves.toBe(outcome);
    await expect(courseRow("course-1")).resolves.toMatchObject({
      name: "Course One",
      description: null,
      timezone: "Europe/Berlin",
    });
  });

  it("allows exactly one winner between timezone edit and stale Module creation", async () => {
    const coursePersistence = createCoursePersistence(env.DB);
    const modulePersistence = createModulePersistence(env.DB);
    const outcomes = await Promise.all([
      updateTimezone(coursePersistence, "America/New_York", "Europe/Berlin"),
      modulePersistence.createModuleForActiveAdmin({
        adminUserId: "admin-1",
        courseTimezone: "Europe/Berlin",
        module: moduleCandidate("module-race"),
      }),
    ]);

    expect([
      ["updated", "course-timezone-changed"],
      ["course-timezone-locked", "created"],
    ]).toContainEqual(outcomes);
    const row = await courseRow("course-1");
    const moduleCount = await countRows("modules", "course_id", "course-1");

    if (outcomes[0] === "updated") {
      expect(row).toMatchObject({
        timezone: "America/New_York",
        has_ever_had_module: 0,
      });
      expect(moduleCount).toBe(0);
    } else {
      expect(row).toMatchObject({
        timezone: "Europe/Berlin",
        has_ever_had_module: 1,
      });
      expect(moduleCount).toBe(1);
    }
  });

  it("rolls every field back when the single Course update fails", async () => {
    await env.DB.prepare(
      `create trigger refuse_course_edit
       before update of name on courses
       when new.name = 'Explode'
       begin
         select raise(abort, 'forced Course edit failure');
       end`,
    ).run();
    const persistence = createCoursePersistence(env.DB);

    await expect(
      persistence.updateActiveCourseForActiveAdmin({
        adminUserId: "admin-1",
        expectedTimezone: "Europe/Berlin",
        course: courseUpdate({
          name: "Explode",
          description: "Must roll back",
          timezone: "America/New_York",
        }),
      }),
    ).rejects.toThrow("forced Course edit failure");
    await expect(courseRow("course-1")).resolves.toMatchObject({
      name: "Course One",
      description: null,
      timezone: "Europe/Berlin",
      has_ever_had_module: 0,
    });
  });
});

/** @returns {Promise<void>} Insert one deterministic Admin. */
async function insertAdmin(id, state) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, 'admin')`,
  )
    .bind(id, `principal-${id}`, `Admin ${id}`, state)
    .run();
}

/** @returns {Promise<void>} Insert one deterministic Active Course. */
async function insertCourse(id, name) {
  await env.DB.prepare(
    `insert into courses (id, name, description, timezone, state)
     values (?, ?, null, 'Europe/Berlin', 'active')`,
  )
    .bind(id, name)
    .run();
}

/** @returns {object} Complete Course persistence update. */
function courseUpdate(override = {}) {
  return {
    id: "course-1",
    name: "Updated Course",
    description: null,
    timezone: "Europe/Berlin",
    state: "active",
    ...override,
  };
}

/** @returns {object} Deterministic Scheduled Module input. */
function moduleCandidate(
  id,
  startsAt = "2027-01-01T10:00:00.000Z",
  endsAt = "2027-01-01T11:00:00.000Z",
) {
  return {
    id,
    courseId: "course-1",
    title: `Module ${id}`,
    description: null,
    instructions: null,
    startsAt,
    endsAt,
    state: "scheduled",
  };
}

/** @returns {Promise<string>} Attempt one timezone update. */
function updateTimezone(persistence, timezone, expectedTimezone) {
  return persistence.updateActiveCourseForActiveAdmin({
    adminUserId: "admin-1",
    expectedTimezone,
    course: courseUpdate({ timezone }),
  });
}

/** @returns {Promise<object>} Read raw Course acceptance state. */
function courseRow(courseId) {
  return env.DB.prepare(
    `select name, description, timezone, state, has_ever_had_module
       from courses where id = ?`,
  )
    .bind(courseId)
    .first();
}

/** @returns {Promise<number>} Count rows for one fixed ownership value. */
async function countRows(tableName, columnName, value) {
  const allowed = new Set([
    "course_assignments:course_id",
    "groups:course_id",
    "modules:course_id",
  ]);

  if (!allowed.has(`${tableName}:${columnName}`)) {
    throw new Error("Unexpected test count target.");
  }

  const row = await env.DB.prepare(
    `select count(*) as count from ${tableName} where ${columnName} = ?`,
  )
    .bind(value)
    .first();

  return row.count;
}
