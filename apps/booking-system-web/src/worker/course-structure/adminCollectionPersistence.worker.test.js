import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  adminCollectionConfigurations,
  parseAdminCollectionQuery,
} from "../admin-collections/index.js";
import { createGroupPersistence } from "./createGroupPersistence.js";
import { createModulePersistence } from "./createModulePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
  await insertAdmin();
  await insertCourse("course-a", "active");
  await insertCourse("course-other", "active");
});

describe("Course Group collection persistence", () => {
  it("searches literals, filters, sorts, counts, pages, and scopes to its Course", async () => {
    await insertGroupFixtures();
    const persistence = createGroupPersistence(env.DB);
    const page = await persistence.listGroupPage(
      "admin-a",
      "course-a",
      query("groups", "page=2&pageSize=10"),
    );
    const literal = await persistence.listGroupPage(
      "admin-a",
      "course-a",
      query("groups", "q=%25_%5C&state=archived"),
    );
    const ties = await persistence.listGroupPage(
      "admin-a",
      "course-a",
      query("groups", "q=Same"),
    );

    expect(page).toMatchObject({
      outcome: "listed",
      context: { id: "course-a" },
      pagination: { page: 2, pageSize: 10, totalItems: 12, totalPages: 2 },
    });
    expect(page.items).toHaveLength(2);
    expect(literal).toMatchObject({
      items: [{ id: "group-11", state: "archived" }],
      pagination: { totalItems: 1 },
    });
    expect(ties.items.map(({ id }) => id)).toEqual(["group-00", "group-01"]);

    for (const field of ["name", "state"]) {
      for (const direction of ["asc", "desc"]) {
        await expect(persistence.listGroupPage(
          "admin-a",
          "course-a",
          query("groups", `sort=${field}.${direction}`),
        )).resolves.toMatchObject({ outcome: "listed" });
      }
    }

    await expect(persistence.listGroupPage(
      "admin-a",
      "missing",
      query("groups"),
    )).resolves.toEqual({ outcome: "parent-not-found" });
  });

  it("guards one same-Course Group item with fresh Admin and parent state", async () => {
    await insertGroupFixtures();
    const persistence = createGroupPersistence(env.DB);

    await expect(persistence.findGroupForAdmin(
      "admin-a",
      "course-a",
      "group-00",
    )).resolves.toMatchObject({
      outcome: "found",
      context: { id: "course-a" },
      item: { id: "group-00", courseId: "course-a" },
    });
    await expect(persistence.findGroupForAdmin(
      "admin-a",
      "course-a",
      "group-other",
    )).resolves.toEqual({ outcome: "item-not-found" });
    await expect(persistence.findGroupForAdmin(
      "admin-a",
      "missing",
      "group-00",
    )).resolves.toEqual({ outcome: "parent-not-found" });

    await env.DB.prepare(
      "update admin_users set state = 'disabled' where id = 'admin-a'",
    ).run();
    await expect(persistence.findGroupForAdmin(
      "admin-a",
      "course-a",
      "group-00",
    )).resolves.toEqual({ outcome: "admin-not-active" });
  });
});

describe("Course Module collection persistence", () => {
  it("searches all text, filters, sorts, counts, pages, and returns Archived parents", async () => {
    await insertModuleFixtures();
    const persistence = createModulePersistence(env.DB);
    const page = await persistence.listModulePage(
      "admin-a",
      "course-a",
      query("modules", "page=2&pageSize=10"),
    );
    const literal = await persistence.listModulePage(
      "admin-a",
      "course-a",
      query("modules", "q=%25_%5C&state=cancelled"),
    );

    expect(page).toMatchObject({
      outcome: "listed",
      context: { id: "course-a" },
      pagination: { page: 2, pageSize: 10, totalItems: 12, totalPages: 2 },
    });
    expect(page.items).toHaveLength(2);
    expect(literal).toMatchObject({
      items: [{ id: "module-11", state: "cancelled" }],
      pagination: { totalItems: 1 },
    });
    expect(page.items.every(({ startsAt, endsAt }) =>
      startsAt.endsWith("Z") && endsAt.endsWith("Z"))).toBe(true);

    for (const field of ["startsAt", "title", "state"]) {
      for (const direction of ["asc", "desc"]) {
        await expect(persistence.listModulePage(
          "admin-a",
          "course-a",
          query("modules", `sort=${field}.${direction}`),
        )).resolves.toMatchObject({ outcome: "listed" });
      }
    }

    await env.DB.prepare(
      "update courses set state = 'archived' where id = 'course-a'",
    ).run();
    await expect(persistence.listModulePage(
      "admin-a",
      "course-a",
      query("modules", "page=99&pageSize=10"),
    )).resolves.toMatchObject({
      context: { state: "archived" },
      items: [],
      pagination: { totalItems: 12 },
    });
  });
});

/** @returns {object} One normalized collection query. */
function query(resource, search = "") {
  return parseAdminCollectionQuery(
    new URLSearchParams(search),
    adminCollectionConfigurations[resource],
  ).query;
}

/** Insert the current Active Admin fixture. */
function insertAdmin() {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-a', 'principal-admin-a', 'Admin', 'active', 'admin')`,
  ).run();
}

/** Insert one Course fixture. */
function insertCourse(id, state) {
  return env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, null, 'Europe/Berlin', ?, 0)`,
  ).bind(id, `Course ${id}`, state).run();
}

/** Insert enough Course-owned Groups to cross one page. */
async function insertGroupFixtures() {
  for (let index = 0; index < 12; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const name = index < 2 ? "Same" : `Group ${suffix}`;
    const details = index === 11 ? "Literal %_\\ details" : null;
    const state = new Set([1, 11]).has(index) ? "archived" : "active";

    await env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values (?, 'course-a', ?, ?, ?, ?)`,
    ).bind(`group-${suffix}`, name, `${name.toLowerCase()}-${suffix}`, details, state)
      .run();
  }
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values ('group-other', 'course-other', 'Other', 'other', null, 'active')`,
  ).run();
}

/** Insert enough Course-owned Modules to cross one page. */
async function insertModuleFixtures() {
  for (let index = 0; index < 12; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const startsAt = index < 2 ? 1_000 : 1_000 + index * 1_000;

    await env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values (?, 'course-a', ?, ?, ?, ?, ?, ?)`,
    ).bind(
      `module-${suffix}`,
      index < 2 ? "Same" : `Module ${suffix}`,
      index === 11 ? "Literal %_\\ description" : null,
      index === 10 ? "Instruction text" : null,
      startsAt,
      startsAt + 500,
      index === 11 ? "cancelled" : "scheduled",
    ).run();
  }
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values ('module-other', 'course-other', 'Other', null, null,
             1000, 1500, 'scheduled')`,
  ).run();
}
