import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdminPersistence } from "../admin-bootstrap/index.js";
import { createCourseHttpHandler } from "./createCourseHttpHandler.js";
import { createCoursePersistence } from "./createCoursePersistence.js";
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
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Group and Module HTTP authorization", () => {
  it("refuses nested mutations without an authenticated principal", async () => {
    const responses = await Promise.all([
      structureRequest("POST", "/api/admin/courses/course-1/groups", {
        name: "Group",
      }),
      structureRequest("POST", "/api/admin/courses/course-1/modules", {
        title: "Module",
      }),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401]);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({
        outcome: "unauthenticated",
      });
    }
  });

  it("keeps production nested routes fixture-free and unauthenticated", async () => {
    const response = await productionWorker.fetch(
      new Request("http://localhost/api/admin/courses/course-1/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Group" }),
      }),
      env,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      outcome: "unauthenticated",
    });
  });
});

describe("Group and Module HTTP creation", () => {
  it("creates narrow structures and exposes them on stable Course detail", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Structured Course");
    const initialDetail = await structureRequest(
      "GET",
      `/api/admin/courses/${course.id}`,
      undefined,
      cookie,
    );

    await expect(initialDetail.json()).resolves.toMatchObject({
      id: course.id,
      groups: [],
      modules: [],
    });

    const groupResponse = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/groups`,
      {
        id: "browser-group",
        courseId: "other-course",
        name: "Gruppe Alpha",
        details: "Raum A",
        state: "archived",
      },
      cookie,
    );
    const group = await groupResponse.json();

    expect(groupResponse.status).toBe(201);
    expect(group).toEqual({
      id: expect.any(String),
      courseId: course.id,
      name: "Gruppe Alpha",
      details: "Raum A",
      state: "active",
    });
    expect(group.id).not.toBe("browser-group");

    const moduleResponse = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/modules`,
      {
        id: "browser-module",
        courseId: "other-course",
        title: "Modul Eins",
        description: "Beschreibung",
        instructions: "Hinweise",
        startsAtLocal: "2027-01-15T10:30",
        endsAtLocal: "2027-01-15T11:30",
        startsAt: "1900-01-01T00:00:00.000Z",
        state: "cancelled",
      },
      cookie,
    );
    const module = await moduleResponse.json();

    expect(moduleResponse.status).toBe(201);
    expect(module).toEqual({
      id: expect.any(String),
      courseId: course.id,
      title: "Modul Eins",
      description: "Beschreibung",
      instructions: "Hinweise",
      startsAt: "2027-01-15T09:30:00.000Z",
      endsAt: "2027-01-15T10:30:00.000Z",
      state: "scheduled",
    });
    expect(module.id).not.toBe("browser-module");

    const detail = await structureRequest(
      "GET",
      `/api/admin/courses/${course.id}`,
      undefined,
      cookie,
    );

    await expect(detail.json()).resolves.toMatchObject({
      groups: [group],
      modules: [module],
    });
    await expect(courseModuleHistory(course.id)).resolves.toBe(1);
    await expect(hasTable("module_selections")).resolves.toBe(false);
  });

  it("enforces Group validation and normalized uniqueness without a second row", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Group Course");
    const invalid = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/groups`,
      { name: "  " },
      cookie,
    );

    expect(invalid.status).toBe(422);
    await expect(invalid.json()).resolves.toEqual({ outcome: "invalid-name" });

    const first = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/groups`,
      { name: " Group Alpha " },
      cookie,
    );
    const duplicate = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/groups`,
      { name: "GROUP ALPHA" },
      cookie,
    );

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toEqual({
      outcome: "group-name-conflict",
    });
    await expect(countRows("groups")).resolves.toBe(1);
  });

  it("rejects gaps and nonfuture starts without Module or timezone freeze", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Time Course");
    const gap = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/modules`,
      {
        title: "Gap",
        startsAtLocal: "2027-03-28T02:30",
        endsAtLocal: "2027-03-28T04:00",
      },
      cookie,
    );
    const exactNow = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/modules`,
      {
        title: "Now",
        startsAtLocal: "2026-08-28T12:00",
        endsAtLocal: "2026-08-28T13:00",
      },
      cookie,
    );

    expect(gap.status).toBe(422);
    await expect(gap.json()).resolves.toEqual({
      outcome: "nonexistent-starts-at",
    });
    expect(exactNow.status).toBe(422);
    await expect(exactNow.json()).resolves.toEqual({
      outcome: "start-not-in-future",
    });
    await expect(countRows("modules")).resolves.toBe(0);
    await expect(courseModuleHistory(course.id)).resolves.toBe(0);
  });

  it("requires and accepts an explicit Berlin overlap occurrence", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Overlap Course");
    const input = {
      title: "Overlap",
      startsAtLocal: "2027-10-31T02:30",
      endsAtLocal: "2027-10-31T03:30",
    };
    const ambiguous = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/modules`,
      input,
      cookie,
    );
    const ambiguity = await ambiguous.json();

    expect(ambiguous.status).toBe(422);
    expect(ambiguity).toMatchObject({
      outcome: "schedule-disambiguation-required",
      schedule: {
        startsAt: {
          outcome: "disambiguation-required",
          candidates: [
            {
              occurrence: "earlier",
              instant: "2027-10-31T00:30:00.000Z",
              offsetMinutes: 120,
            },
            {
              occurrence: "later",
              instant: "2027-10-31T01:30:00.000Z",
              offsetMinutes: 60,
            },
          ],
        },
      },
    });
    await expect(countRows("modules")).resolves.toBe(0);
    await expect(courseModuleHistory(course.id)).resolves.toBe(0);

    const selected = await structureRequest(
      "POST",
      `/api/admin/courses/${course.id}/modules`,
      { ...input, startsAtOccurrence: "later" },
      cookie,
    );

    expect(selected.status).toBe(201);
    await expect(selected.json()).resolves.toMatchObject({
      startsAt: "2027-10-31T01:30:00.000Z",
      endsAt: "2027-10-31T02:30:00.000Z",
    });
    await expect(courseModuleHistory(course.id)).resolves.toBe(1);
  });
});

describe("Group and Module authoritative write acceptance", () => {
  it("re-resolves a stale Disabled actor and creates no Group", async () => {
    await seedDirectAdminAndCourse();
    const groupPersistence = createGroupPersistence(env.DB);
    const handler = createDirectHandler({
      groupPersistence: {
        ...groupPersistence,
        async createGroupForActiveAdmin(input) {
          await env.DB.prepare(
            "update admin_users set state = 'disabled' where id = 'admin-1'",
          ).run();
          return groupPersistence.createGroupForActiveAdmin(input);
        },
      },
    });
    const response = await handler(
      jsonRequest("/api/admin/courses/course-1/groups", { name: "Stale" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      outcome: "disabled-admin",
    });
    await expect(countRows("groups")).resolves.toBe(0);
  });

  it("re-resolves a stale Archived Course and creates no Module or history", async () => {
    await seedDirectAdminAndCourse();
    const modulePersistence = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: {
        ...modulePersistence,
        async createModuleForActiveAdmin(input) {
          await env.DB.prepare(
            "update courses set state = 'archived' where id = 'course-1'",
          ).run();
          return modulePersistence.createModuleForActiveAdmin(input);
        },
      },
    });
    const response = await handler(
      jsonRequest("/api/admin/courses/course-1/modules", {
        title: "Stale",
        startsAtLocal: "2027-01-15T10:30",
        endsAtLocal: "2027-01-15T11:30",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "course-not-active",
    });
    await expect(countRows("modules")).resolves.toBe(0);
    await expect(courseModuleHistory("course-1")).resolves.toBe(0);
  });
});

/**
 * Create a direct deterministic handler with selected persistence overrides.
 *
 * @param {object} override Persistence overrides.
 * @returns {(request: Request) => Promise<Response>} Course HTTP handler.
 */
function createDirectHandler(override) {
  return createCourseHttpHandler({
    authenticate: vi.fn(async () => ({
      outcome: "authenticated",
      externalPrincipalId: "principal-admin-1",
    })),
    createCourseId: () => "course-new",
    createGroupId: () => "group-new",
    createModuleId: () => "module-new",
    now: () => env.BOOKING_TEST_NOW,
    adminPersistence: createAdminPersistence(env.DB),
    coursePersistence: createCoursePersistence(env.DB),
    groupPersistence: createGroupPersistence(env.DB),
    modulePersistence: createModulePersistence(env.DB),
    ...override,
  });
}

/**
 * Establish and bootstrap the deterministic first Active Admin.
 *
 * @returns {Promise<string>} Normal session cookie.
 */
async function establishActiveAdmin() {
  const fixture = await nonProductionWorker.fetch(
    new Request("http://localhost/api/_fixtures/session/first-admin", {
      method: "POST",
    }),
    env,
  );
  const cookie = fixture.headers.get("set-cookie").split(";", 1)[0];
  const bootstrap = await structureRequest(
    "POST",
    "/api/admin/bootstrap",
    { name: "Structure Admin" },
    cookie,
  );

  expect(fixture.status).toBe(204);
  expect(bootstrap.status).toBe(201);
  return cookie;
}

/**
 * Create one Active Course through the normal Worker API.
 *
 * @param {string} cookie Normal session cookie.
 * @param {string} name Course name.
 * @returns {Promise<object>} Created Course response.
 */
async function createCourse(cookie, name) {
  const response = await structureRequest(
    "POST",
    "/api/admin/courses",
    { name },
    cookie,
  );

  expect(response.status).toBe(201);
  return response.json();
}

/**
 * Send one request through explicit non-production composition.
 *
 * @returns {Promise<Response>} Worker response.
 */
function structureRequest(method, path, body, cookie) {
  const headers = {};

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (cookie !== undefined) {
    headers.cookie = cookie;
  }

  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

/**
 * Seed authoritative state for a direct-handler stale-write test.
 *
 * @returns {Promise<void>} Completion after insertion.
 */
async function seedDirectAdminAndCourse() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into admin_users
         (id, external_principal_id, name, state, authority)
       values ('admin-1', 'principal-admin-1', 'Admin', 'active', 'admin')`,
    ),
    env.DB.prepare(
      `insert into courses (id, name, description, timezone, state)
       values ('course-1', 'Course', null, 'Europe/Berlin', 'active')`,
    ),
  ]);
}

/**
 * Build one JSON POST request for a direct handler.
 *
 * @param {string} path Same-origin path.
 * @param {object} body JSON body.
 * @returns {Request} JSON request.
 */
function jsonRequest(path, body) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Read permanent Course Module history.
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
 * Check whether one table exists.
 *
 * @param {string} tableName Table name.
 * @returns {Promise<boolean>} Whether the table exists.
 */
async function hasTable(tableName) {
  const row = await env.DB.prepare(
    "select 1 as present from sqlite_master where type = 'table' and name = ?",
  )
    .bind(tableName)
    .first();

  return row !== null;
}

/**
 * Count rows in one fixed structure table.
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
