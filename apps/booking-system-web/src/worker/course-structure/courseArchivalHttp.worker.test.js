import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdminPersistence } from "../admin-bootstrap/index.js";
import { createCourseHttpHandler } from "./createCourseHttpHandler.js";
import { createCoursePersistence } from "./createCoursePersistence.js";
import { createGroupPersistence } from "./createGroupPersistence.js";
import { createModulePersistence } from "./createModulePersistence.js";

const nowEpoch = 2_000_000_000_000;

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
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Course archival HTTP contract", () => {
  it("stays authenticated and fixture-free in both Worker compositions", async () => {
    const request = () => new Request(
      `http://localhost${archivalPath("course-1")}`,
      { method: "POST" },
    );
    const responses = await Promise.all([
      nonProductionWorker.fetch(request(), env),
      productionWorker.fetch(request(), env),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401]);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({
        outcome: "unauthenticated",
      });
    }
  });

  it.each([
    ["zero Modules", null, null],
    ["exact-end Scheduled Module", "scheduled", nowEpoch],
    ["ended Scheduled Module", "scheduled", nowEpoch - 1],
    ["future Cancelled Module", "cancelled", nowEpoch + 120_000],
  ])("archives with %s without trusting a body", async (
    _label,
    moduleState,
    endsAt,
  ) => {
    await seedDirectStructure();
    if (moduleState !== null) {
      await insertModule({
        state: moduleState,
        startsAt: Math.min(nowEpoch - 60_000, endsAt - 1),
        endsAt,
      });
    }
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      archivalPath("course-1"),
      {
        now: "1900-01-01T00:00:00.000Z",
        state: "active",
        modules: [{ state: "cancelled" }],
        deleteStructures: true,
      },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      outcome: "archived",
      course: {
        id: "course-1",
        name: "Course",
        description: "Retained description",
        timezone: "Europe/Berlin",
        state: "archived",
        isTimezoneEditable: false,
      },
    });
    await expect(courseRow()).resolves.toMatchObject({
      name: "Course",
      description: "Retained description",
      timezone: "Europe/Berlin",
      state: "archived",
    });
  });

  it.each([
    ["upcoming", nowEpoch + 60_000, nowEpoch + 120_000],
    ["in progress", nowEpoch - 60_000, nowEpoch + 1],
  ])("returns an exact blocker for one %s Scheduled Module", async (
    _label,
    startsAt,
    endsAt,
  ) => {
    await seedDirectStructure();
    await insertModule({ startsAt, endsAt });
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      archivalPath("course-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "course-archival-blocked",
    });
    await expect(courseRow()).resolves.toMatchObject({ state: "active" });
  });

  it.each([
    ["upcoming Scheduled", "scheduled", nowEpoch + 1, false],
    ["in-progress Scheduled", "scheduled", nowEpoch + 1, false],
    ["exact-end Scheduled", "scheduled", nowEpoch, true],
    ["ended Scheduled", "scheduled", nowEpoch - 1, true],
    ["future Cancelled", "cancelled", nowEpoch + 1, true],
  ])("derives detail availability for %s", async (
    _label,
    state,
    endsAt,
    isArchivalAvailable,
  ) => {
    await seedDirectStructure();
    await insertModule({
      state,
      startsAt: Math.min(nowEpoch - 60_000, endsAt - 1),
      endsAt,
    });
    const response = await createDirectHandler()(jsonRequest(
      "GET",
      "/api/admin/courses/course-1",
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "course-1",
      state: "active",
      isArchivalAvailable,
    });
  });

  it("keeps repeated archival terminal", async () => {
    await seedDirectStructure("archived");
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      archivalPath("course-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "course-not-active",
    });
    await expect(courseRow()).resolves.toMatchObject({ state: "archived" });
  });

  it("returns not-found for an unknown Course identity", async () => {
    await seedDirectStructure();
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      archivalPath("missing"),
    ));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      outcome: "course-not-found",
    });
  });
});

describe("Course archival HTTP current-state acceptance", () => {
  it("loses to a future Module inserted after the initial read", async () => {
    await seedDirectStructure();
    const persisted = createCoursePersistence(env.DB);
    const handler = createDirectHandler({
      coursePersistence: {
        ...persisted,
        async archiveActiveCourse(input) {
          await insertModule();
          return persisted.archiveActiveCourse(input);
        },
      },
    });
    const response = await handler(jsonRequest(
      "POST",
      archivalPath("course-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "course-archival-blocked",
    });
    await expect(courseRow()).resolves.toMatchObject({ state: "active" });
  });

  it.each([
    [
      "Disabled Admin",
      "update admin_users set state = 'disabled' where id = 'admin-1'",
      "disabled-admin",
      403,
    ],
    [
      "Archived Course",
      "update courses set state = 'archived' where id = 'course-1'",
      "course-not-active",
      409,
    ],
  ])("re-resolves a stale %s without another effect", async (
    _label,
    statement,
    outcome,
    status,
  ) => {
    await seedDirectStructure();
    const persisted = createCoursePersistence(env.DB);
    const handler = createDirectHandler({
      coursePersistence: {
        ...persisted,
        async archiveActiveCourse(input) {
          await env.DB.prepare(statement).run();
          return persisted.archiveActiveCourse(input);
        },
      },
    });
    const response = await handler(jsonRequest(
      "POST",
      archivalPath("course-1"),
    ));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ outcome });
  });

  it("sanitizes an unexpected archival failure", async () => {
    await seedDirectStructure();
    const persisted = createCoursePersistence(env.DB);
    const handler = createDirectHandler({
      coursePersistence: {
        ...persisted,
        async archiveActiveCourse() {
          throw new Error("private Course archival storage detail");
        },
      },
    });
    const response = await handler(jsonRequest(
      "POST",
      archivalPath("course-1"),
    ));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      outcome: "technical-error",
    });
    await expect(courseRow()).resolves.toMatchObject({ state: "active" });
  });
});

/** @returns {string} Stable Course archival action path. */
function archivalPath(courseId) {
  return `/api/admin/courses/${courseId}/archival`;
}

/** @returns {Request} Build one same-origin request with optional JSON. */
function jsonRequest(method, path, body) {
  const headers = body === undefined ? {} : { "content-type": "application/json" };

  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** @returns {(request: Request) => Promise<Response>} Direct Course handler. */
function createDirectHandler(override = {}) {
  return createCourseHttpHandler({
    authenticate: vi.fn(async () => ({
      outcome: "authenticated",
      externalPrincipalId: "principal-admin-1",
    })),
    createCourseId: () => "course-new",
    createGroupId: () => "group-new",
    createModuleId: () => "module-new",
    now: () => new Date(nowEpoch).toISOString(),
    adminPersistence: createAdminPersistence(env.DB),
    coursePersistence: createCoursePersistence(env.DB),
    groupPersistence: createGroupPersistence(env.DB),
    modulePersistence: createModulePersistence(env.DB),
    ...override,
  });
}

/** @returns {Promise<void>} Seed one current Admin and Course. */
async function seedDirectStructure(courseState = "active") {
  await env.DB.batch([
    env.DB.prepare(
      `insert into admin_users
         (id, external_principal_id, name, state, authority)
       values ('admin-1', 'principal-admin-1', 'Admin', 'active', 'admin')`,
    ),
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-1', 'Course', 'Retained description',
               'Europe/Berlin', ?, 0)`,
    ).bind(courseState),
  ]);
}

/** @returns {Promise<void>} Insert one raw Module. */
async function insertModule(options = {}) {
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'course-1', 'Module', 'Description', 'Instructions', ?, ?, ?)`,
  ).bind(
    options.id ?? "module-1",
    options.startsAt ?? nowEpoch + 60_000,
    options.endsAt ?? nowEpoch + 120_000,
    options.state ?? "scheduled",
  ).run();
}

/** @returns {Promise<object | null>} Raw Course state. */
function courseRow() {
  return env.DB.prepare("select * from courses where id = 'course-1'").first();
}
