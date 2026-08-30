import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  adminCollectionConfigurations,
  parseAdminCollectionQuery,
} from "../admin-collections/index.js";
import { createCoursePersistence } from "./createCoursePersistence.js";

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
});

describe("Course persistence", () => {
  it("preserves stable minimal Course data without implicit related rows", async () => {
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

    const relatedCounts = await env.DB.prepare(
      `select
         (select count(*) from groups) as group_count,
         (select count(*) from modules) as module_count`,
    ).first();

    expect(relatedCounts).toEqual({ group_count: 0, module_count: 0 });
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

  it("filters, searches literals, sorts, counts, and pages in D1", async () => {
    await insertAdmin("admin-1", "active");
    const persistence = createCoursePersistence(env.DB);

    for (let index = 0; index < 12; index += 1) {
      const course = courseCandidate(
        `course-${String(index).padStart(2, "0")}`,
        index < 2 ? "Same" : `Course ${index}`,
        index === 11 ? "Literal %_\\ marker" : null,
      );

      await persistence.createCourseForActiveAdmin({
        adminUserId: "admin-1",
        course,
      });
    }
    await env.DB.prepare(
      "update courses set state = 'archived' where id = 'course-11'",
    ).run();

    const secondPage = await persistence.listCoursePage(
      "admin-1",
      collectionQuery("courses", "page=2&pageSize=10&sort=name.asc"),
    );
    const literal = await persistence.listCoursePage(
      "admin-1",
      collectionQuery("courses", "q=%25_%5C&state=archived"),
    );

    expect(secondPage).toMatchObject({
      outcome: "listed",
      pagination: { page: 2, pageSize: 10, totalItems: 12, totalPages: 2 },
    });
    expect(secondPage.items).toHaveLength(2);
    expect(literal.items.map(({ id }) => id)).toEqual(["course-11"]);
    expect(literal.pagination.totalItems).toBe(1);

    for (const field of ["name", "state", "timezone"]) {
      for (const direction of ["asc", "desc"]) {
        await expect(persistence.listCoursePage(
          "admin-1",
          collectionQuery("courses", `sort=${field}.${direction}`),
        )).resolves.toMatchObject({ outcome: "listed" });
      }
    }

    await expect(persistence.listCoursePage(
      "admin-1",
      collectionQuery("courses", "page=99&pageSize=10"),
    )).resolves.toMatchObject({ items: [], pagination: { totalItems: 12 } });
    await env.DB.prepare("update admin_users set state = 'disabled'").run();
    await expect(persistence.listCoursePage(
      "admin-1",
      collectionQuery("courses"),
    )).resolves.toEqual({ outcome: "admin-not-active" });
  });

  it("returns lifecycle-inclusive counts and server-derived archival state", async () => {
    await insertAdmin("admin-1", "active");
    const persistence = createCoursePersistence(env.DB);

    await persistence.createCourseForActiveAdmin({
      adminUserId: "admin-1",
      course: courseCandidate("course-1", "Counted"),
    });
    await insertCountedRelationships();

    const blocked = await persistence.findCourseDetailForAdmin(
      "admin-1",
      "course-1",
      1_000,
    );

    expect(blocked).toMatchObject({
      outcome: "found",
      detail: {
        counts: { participants: 2, groups: 2, modules: 2 },
        isArchivalAvailable: false,
      },
    });
    await env.DB.prepare(
      "update modules set state = 'cancelled' where id = 'module-scheduled'",
    ).run();
    await expect(persistence.findCourseDetailForAdmin(
      "admin-1",
      "course-1",
      1_000,
    )).resolves.toMatchObject({ detail: { isArchivalAvailable: true } });
  });
});

/** @returns {object} One normalized resource query. */
function collectionQuery(resource, search = "") {
  return parseAdminCollectionQuery(
    new URLSearchParams(search),
    adminCollectionConfigurations[resource],
  ).query;
}

/** Insert retained rows across all Course-owned lifecycle states. */
async function insertCountedRelationships() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-a', 'principal-a', 'A', 'a@example.com',
               'a@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-b', 'principal-b', 'B', 'b@example.com',
               'b@example.com', 'disabled')`,
    ),
    env.DB.prepare(
      `insert into groups (id, course_id, name, normalized_name, details, state)
       values ('group-active', 'course-1', 'Active', 'active', null, 'active')`,
    ),
    env.DB.prepare(
      `insert into groups (id, course_id, name, normalized_name, details, state)
       values ('group-archived', 'course-1', 'Archived', 'archived', null,
               'archived')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-scheduled', 'course-1', 'Scheduled', null, null,
               1000, 2000, 'scheduled')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-cancelled', 'course-1', 'Cancelled', null, null,
               1000, 2000, 'cancelled')`,
    ),
  ]);
  await env.DB.batch([
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-active', 'participant-a', 'course-1', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-revoked', 'participant-b', 'course-1', 'revoked')`,
    ),
  ]);
}

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
    hasEverHadModule: false,
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
