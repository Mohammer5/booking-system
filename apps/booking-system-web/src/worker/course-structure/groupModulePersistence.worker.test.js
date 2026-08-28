import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createGroupPersistence } from "./createGroupPersistence.js";
import { createModulePersistence } from "./createModulePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
  await insertAdmin("admin-1", "active");
  await insertCourse("course-1", "active");
  await insertCourse("course-2", "active");
});

describe("Group persistence", () => {
  it("preserves stable Course-owned Group data and deterministic order", async () => {
    const persistence = createGroupPersistence(env.DB);

    await persistence.createGroupForActiveAdmin({
      adminUserId: "admin-1",
      group: groupCandidate("group-b", "course-1", "Beta", "beta"),
    });
    await persistence.createGroupForActiveAdmin({
      adminUserId: "admin-1",
      group: groupCandidate("group-a", "course-1", "alpha", "alpha", "Room"),
    });

    await expect(persistence.listGroupsByCourseId("course-1")).resolves.toEqual([
      groupCandidate("group-a", "course-1", "alpha", "alpha", "Room"),
      groupCandidate("group-b", "course-1", "Beta", "beta"),
    ]);
    await expect(persistence.listGroupsByCourseId("course-2")).resolves.toEqual(
      [],
    );
  });

  it("allows the same normalized Active name in different Courses", async () => {
    const persistence = createGroupPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.createGroupForActiveAdmin({
        adminUserId: "admin-1",
        group: groupCandidate("group-1", "course-1", "Group", "group"),
      }),
      persistence.createGroupForActiveAdmin({
        adminUserId: "admin-1",
        group: groupCandidate("group-2", "course-2", " GROUP ", "group"),
      }),
    ]);

    expect(outcomes).toEqual(["created", "created"]);
  });

  it("accepts one concurrent normalized Active name per Course", async () => {
    const persistence = createGroupPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.createGroupForActiveAdmin({
        adminUserId: "admin-1",
        group: groupCandidate("group-1", "course-1", "Group", "group"),
      }),
      persistence.createGroupForActiveAdmin({
        adminUserId: "admin-1",
        group: groupCandidate("group-2", "course-1", " GROUP ", "group"),
      }),
    ]);

    expect(outcomes.sort()).toEqual(["created", "group-name-conflict"]);
    await expect(countRows("groups")).resolves.toBe(1);
  });

  it.each([
    ["disabled", "active", "admin-not-active"],
    ["active", "archived", "course-not-active"],
  ])(
    "refuses Admin %s and Course %s without a Group row",
    async (adminState, courseState, outcome) => {
      await env.DB.prepare("update admin_users set state = ? where id = 'admin-1'")
        .bind(adminState)
        .run();
      await env.DB.prepare("update courses set state = ? where id = 'course-1'")
        .bind(courseState)
        .run();
      const persistence = createGroupPersistence(env.DB);

      await expect(
        persistence.createGroupForActiveAdmin({
          adminUserId: "admin-1",
          group: groupCandidate("group-1", "course-1", "Group", "group"),
        }),
      ).resolves.toBe(outcome);
      await expect(countRows("groups")).resolves.toBe(0);
    },
  );

  it("enforces stable identity and permanent Course ownership", async () => {
    const persistence = createGroupPersistence(env.DB);
    const group = groupCandidate("group-1", "course-1", "Group", "group");

    await persistence.createGroupForActiveAdmin({
      adminUserId: "admin-1",
      group,
    });
    await expect(
      env.DB.prepare("update groups set course_id = 'course-2' where id = 'group-1'").run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare(
        `insert into groups
           (id, course_id, name, normalized_name, details, state)
         values ('group-1', 'course-2', 'Other', 'other', null, 'active')`,
      ).run(),
    ).rejects.toThrow();
  });
});

describe("Module persistence", () => {
  it("stores definite instants, orders Modules, and permanently freezes timezone", async () => {
    const persistence = createModulePersistence(env.DB);

    await persistence.createModuleForActiveAdmin({
      adminUserId: "admin-1",
      courseTimezone: "Europe/Berlin",
      module: moduleCandidate(
        "module-b",
        "course-1",
        "2027-01-15T12:00:00.000Z",
        "2027-01-15T13:00:00.000Z",
      ),
    });
    await persistence.createModuleForActiveAdmin({
      adminUserId: "admin-1",
      courseTimezone: "Europe/Berlin",
      module: moduleCandidate(
        "module-a",
        "course-1",
        "2027-01-15T10:00:00.000Z",
        "2027-01-15T11:00:00.000Z",
      ),
    });

    await expect(persistence.listModulesByCourseId("course-1")).resolves.toEqual([
      moduleCandidate(
        "module-a",
        "course-1",
        "2027-01-15T10:00:00.000Z",
        "2027-01-15T11:00:00.000Z",
      ),
      moduleCandidate(
        "module-b",
        "course-1",
        "2027-01-15T12:00:00.000Z",
        "2027-01-15T13:00:00.000Z",
      ),
    ]);
    await expect(courseModuleHistory("course-1")).resolves.toBe(1);
    await expect(
      env.DB.prepare(
        "update courses set has_ever_had_module = 0 where id = 'course-1'",
      ).run(),
    ).rejects.toThrow();
  });

  it.each([
    ["disabled", "active", "admin-not-active"],
    ["active", "archived", "course-not-active"],
  ])(
    "refuses Admin %s and Course %s without Module or history",
    async (adminState, courseState, outcome) => {
      await env.DB.prepare("update admin_users set state = ? where id = 'admin-1'")
        .bind(adminState)
        .run();
      await env.DB.prepare("update courses set state = ? where id = 'course-1'")
        .bind(courseState)
        .run();
      const persistence = createModulePersistence(env.DB);

      await expect(
        persistence.createModuleForActiveAdmin({
          adminUserId: "admin-1",
          courseTimezone: "Europe/Berlin",
          module: moduleCandidate(
            "module-1",
            "course-1",
            "2027-01-15T10:00:00.000Z",
            "2027-01-15T11:00:00.000Z",
          ),
        }),
      ).resolves.toBe(outcome);
      await expect(countRows("modules")).resolves.toBe(0);
      await expect(courseModuleHistory("course-1")).resolves.toBe(0);
    },
  );

  it("rolls history back when the Module interval constraint fails", async () => {
    const persistence = createModulePersistence(env.DB);

    await expect(
      persistence.createModuleForActiveAdmin({
        adminUserId: "admin-1",
        courseTimezone: "Europe/Berlin",
        module: moduleCandidate(
          "module-invalid",
          "course-1",
          "2027-01-15T11:00:00.000Z",
          "2027-01-15T11:00:00.000Z",
        ),
      }),
    ).rejects.toThrow();
    await expect(countRows("modules")).resolves.toBe(0);
    await expect(courseModuleHistory("course-1")).resolves.toBe(0);
  });

  it("enforces stable identity and permanent Course ownership", async () => {
    const persistence = createModulePersistence(env.DB);
    const module = moduleCandidate(
      "module-1",
      "course-1",
      "2027-01-15T10:00:00.000Z",
      "2027-01-15T11:00:00.000Z",
    );

    await persistence.createModuleForActiveAdmin({
      adminUserId: "admin-1",
      courseTimezone: "Europe/Berlin",
      module,
    });
    await expect(
      env.DB.prepare(
        "update modules set course_id = 'course-2' where id = 'module-1'",
      ).run(),
    ).rejects.toThrow();
    await expect(
      persistence.createModuleForActiveAdmin({
        adminUserId: "admin-1",
        courseTimezone: "Europe/Berlin",
        module: { ...module, courseId: "course-2" },
      }),
    ).rejects.toThrow();
  });
});

/**
 * Insert deterministic authoritative Admin state.
 *
 * @param {string} id Admin identity.
 * @param {"active" | "disabled"} state Admin state.
 * @returns {Promise<void>} Completion after insertion.
 */
async function insertAdmin(id, state) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, 'admin')`,
  )
    .bind(id, `principal-${id}`, `Admin ${id}`, state)
    .run();
}

/**
 * Insert deterministic Course state.
 *
 * @param {string} id Course identity.
 * @param {"active" | "archived"} state Course state.
 * @returns {Promise<void>} Completion after insertion.
 */
async function insertCourse(id, state) {
  await env.DB.prepare(
    `insert into courses (id, name, description, timezone, state)
     values (?, ?, null, 'Europe/Berlin', ?)`,
  )
    .bind(id, `Course ${id}`, state)
    .run();
}

/**
 * Create deterministic Group persistence input.
 *
 * @returns {object} Valid Group row representation.
 */
function groupCandidate(id, courseId, name, normalizedName, details = null) {
  return { id, courseId, name, normalizedName, details, state: "active" };
}

/**
 * Create deterministic Module persistence input.
 *
 * @returns {object} Valid Module row representation.
 */
function moduleCandidate(id, courseId, startsAt, endsAt) {
  return {
    id,
    courseId,
    title: `Module ${id}`,
    description: null,
    instructions: null,
    startsAt,
    endsAt,
    state: "scheduled",
  };
}

/**
 * Read permanent Course scheduling history.
 *
 * @param {string} courseId Course identity.
 * @returns {Promise<number>} Stored one-way history value.
 */
async function courseModuleHistory(courseId) {
  const row = await env.DB.prepare(
    "select has_ever_had_module from courses where id = ?",
  )
    .bind(courseId)
    .first();

  return row.has_ever_had_module;
}

/**
 * Count rows in one test-owned structure table.
 *
 * @param {"groups" | "modules"} tableName Table to count.
 * @returns {Promise<number>} Current row count.
 */
async function countRows(tableName) {
  if (!new Set(["groups", "modules"]).has(tableName)) {
    throw new Error("Unexpected test table.");
  }

  const row = await env.DB.prepare(
    `select count(*) as count from ${tableName}`,
  ).first();

  return row.count;
}
