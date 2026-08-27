import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCoursePersistence } from "./createCoursePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("Course persistence", () => {
  it("preserves stable minimal Course data without related records", async () => {
    await insertAdmin("admin-1", "active");
    const persistence = createCoursePersistence(env.DB);
    const course = courseCandidate("course-1", "Course", null);

    await expect(
      persistence.createCourseForActiveAdmin({
        adminUserId: "admin-1",
        course,
      }),
    ).resolves.toBe("created");
    await expect(persistence.findCourseById("course-1")).resolves.toEqual(
      course,
    );
    await expect(persistence.findCourseById("missing")).resolves.toBeNull();

    const absentTables = await env.DB.prepare(
      `select name from sqlite_master
        where type = 'table'
          and name in (
            'groups', 'modules', 'course_assignments', 'course_invites'
          )`,
    ).all();

    expect(absentTables.results).toEqual([]);
  });

  it("enforces required name and lifecycle state constraints", async () => {
    await expect(
      env.DB.prepare(
        `insert into courses (id, name, description, timezone, state)
         values ('blank', '  ', null, 'Europe/Berlin', 'active')`,
      ).run(),
    ).rejects.toThrow();
    await expect(
      env.DB.prepare(
        `insert into courses (id, name, description, timezone, state)
         values ('state', 'Course', null, 'Europe/Berlin', 'draft')`,
      ).run(),
    ).rejects.toThrow();
  });

  it("refuses a write when the authoritative Admin is no longer Active", async () => {
    await insertAdmin("admin-disabled", "disabled");
    const persistence = createCoursePersistence(env.DB);

    await expect(
      persistence.createCourseForActiveAdmin({
        adminUserId: "admin-disabled",
        course: courseCandidate("course-refused", "Refused"),
      }),
    ).resolves.toBe("admin-not-active");
    await expect(countCourses()).resolves.toBe(0);
  });

  it("accepts concurrent duplicate names as independent Courses", async () => {
    await insertAdmin("admin-1", "active");
    const persistence = createCoursePersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.createCourseForActiveAdmin({
        adminUserId: "admin-1",
        course: courseCandidate("course-b", "Same"),
      }),
      persistence.createCourseForActiveAdmin({
        adminUserId: "admin-1",
        course: courseCandidate("course-a", "Same"),
      }),
    ]);

    expect(outcomes).toEqual(["created", "created"]);
    await expect(persistence.listCourses()).resolves.toEqual([
      courseCandidate("course-a", "Same"),
      courseCandidate("course-b", "Same"),
    ]);
  });

  it("orders the index by case-insensitive name and then identity", async () => {
    await insertAdmin("admin-1", "active");
    const persistence = createCoursePersistence(env.DB);

    for (const course of [
      courseCandidate("course-z", "beta"),
      courseCandidate("course-b", "Alpha"),
      courseCandidate("course-a", "alpha"),
    ]) {
      await persistence.createCourseForActiveAdmin({
        adminUserId: "admin-1",
        course,
      });
    }

    await expect(persistence.listCourses()).resolves.toMatchObject([
      { id: "course-a" },
      { id: "course-b" },
      { id: "course-z" },
    ]);
  });
});

/**
 * Insert deterministic authoritative Admin state.
 *
 * @param {string} id Admin identity.
 * @param {"active" | "disabled"} state Admin access state.
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
 * Create deterministic minimal Course persistence input.
 *
 * @param {string} id Course identity.
 * @param {string} name Course name.
 * @param {string | null} [description] Optional description.
 * @returns {object} A valid Course row representation.
 */
function courseCandidate(id, name, description = null) {
  return {
    id,
    name,
    description,
    timezone: "Europe/Berlin",
    state: "active",
  };
}

/**
 * Count all current Course rows.
 *
 * @returns {Promise<number>} Current Course count.
 */
async function countCourses() {
  const row = await env.DB.prepare(
    "select count(*) as count from courses",
  ).first();

  return row.count;
}
