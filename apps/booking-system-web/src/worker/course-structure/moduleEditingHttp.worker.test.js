import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdminPersistence } from "../admin-bootstrap/index.js";
import { createCourseHttpHandler } from "./createCourseHttpHandler.js";
import { createCoursePersistence } from "./createCoursePersistence.js";
import { createGroupPersistence } from "./createGroupPersistence.js";
import { createModulePersistence } from "./createModulePersistence.js";

const nowEpoch = Date.parse("2026-08-28T10:00:00.000Z");

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

describe("Module editing HTTP contract", () => {
  it("keeps descriptive and schedule resources authenticated and fixture-free", async () => {
    const paths = [
      modulePath("course-1", "module-1"),
      `${modulePath("course-1", "module-1")}/schedule`,
    ];
    const responses = await Promise.all([
      ...paths.map((path) => nonProductionWorker.fetch(
        jsonRequest("PUT", path, {}),
        env,
      )),
      ...paths.map((path) => productionWorker.fetch(
        jsonRequest("PUT", path, {}),
        env,
      )),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401, 401, 401]);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({
        outcome: "unauthenticated",
      });
    }
  });

  it.each([
    ["upcoming Scheduled", nowEpoch + 60_000, nowEpoch + 120_000, "scheduled"],
    ["in-progress Scheduled", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
    ["ended Scheduled", nowEpoch - 120_000, nowEpoch - 60_000, "scheduled"],
    ["Cancelled", nowEpoch + 60_000, nowEpoch + 120_000, "cancelled"],
  ])("edits complete text for a %s Module without trusting identity", async (
    _label,
    startsAt,
    endsAt,
    state,
  ) => {
    await seedDirectStructure();
    await insertModule({ startsAt, endsAt, state });
    const handler = createDirectHandler();
    const response = await handler(jsonRequest(
      "PUT",
      modulePath("course-1", "module-1"),
      {
        title: "Updated",
        description: null,
        instructions: "New instructions",
        id: "browser-module",
        courseId: "course-other",
        startsAt: "1900-01-01T00:00:00.000Z",
        state: state === "scheduled" ? "cancelled" : "scheduled",
        selections: [{ participantId: "private" }],
      },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "module-1",
      courseId: "course-1",
      title: "Updated",
      description: null,
      instructions: "New instructions",
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      state,
      isScheduleEditable: state === "scheduled" && startsAt > nowEpoch,
    });
  });

  it("reschedules through Course-local input and ignores definite trust fields", async () => {
    await seedDirectStructure();
    await insertModule({
      startsAt: Date.parse("2027-01-15T10:00:00.000Z"),
      endsAt: Date.parse("2027-01-15T11:00:00.000Z"),
    });
    const response = await createDirectHandler()(jsonRequest(
      "PUT",
      `${modulePath("course-1", "module-1")}/schedule`,
      {
        startsAtLocal: "2027-01-15T12:00",
        endsAtLocal: "2027-01-15T13:00",
        startsAt: "1900-01-01T00:00:00.000Z",
        endsAt: "1900-01-01T00:01:00.000Z",
        state: "cancelled",
      },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "module-1",
      title: "Original",
      startsAt: "2027-01-15T11:00:00.000Z",
      endsAt: "2027-01-15T12:00:00.000Z",
      state: "scheduled",
      isScheduleEditable: true,
    });
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: Date.parse("2027-01-15T11:00:00.000Z"),
      ends_at: Date.parse("2027-01-15T12:00:00.000Z"),
    });
  });

  it("returns exact field, DST gap, overlap, and interval outcomes", async () => {
    await seedDirectStructure();
    await insertModule({
      startsAt: Date.parse("2027-01-15T10:00:00.000Z"),
      endsAt: Date.parse("2027-01-15T11:00:00.000Z"),
    });
    const handler = createDirectHandler();
    const invalidTitle = await handler(jsonRequest(
      "PUT",
      modulePath("course-1", "module-1"),
      { title: " ", description: null, instructions: null },
    ));
    const gap = await handler(scheduleRequest({
      startsAtLocal: "2027-03-28T02:30",
      endsAtLocal: "2027-03-28T04:00",
    }));
    const invalidInterval = await handler(scheduleRequest({
      startsAtLocal: "2027-01-15T12:00",
      endsAtLocal: "2027-01-15T12:00",
    }));
    const overlap = await handler(scheduleRequest({
      startsAtLocal: "2027-10-31T02:30",
      endsAtLocal: "2027-10-31T03:30",
    }));

    expect([
      invalidTitle.status,
      gap.status,
      invalidInterval.status,
      overlap.status,
    ]).toEqual([422, 422, 422, 422]);
    await expect(invalidTitle.json()).resolves.toEqual({
      outcome: "invalid-title",
    });
    await expect(gap.json()).resolves.toEqual({
      outcome: "nonexistent-starts-at",
    });
    await expect(invalidInterval.json()).resolves.toEqual({
      outcome: "end-not-after-start",
    });
    await expect(overlap.json()).resolves.toMatchObject({
      outcome: "schedule-disambiguation-required",
      schedule: {
        startsAt: {
          outcome: "disambiguation-required",
          candidates: [
            { occurrence: "earlier", instant: "2027-10-31T00:30:00.000Z" },
            { occurrence: "later", instant: "2027-10-31T01:30:00.000Z" },
          ],
        },
      },
    });
    await expect(moduleRow()).resolves.toMatchObject({
      title: "Original",
      starts_at: Date.parse("2027-01-15T10:00:00.000Z"),
      ends_at: Date.parse("2027-01-15T11:00:00.000Z"),
    });
  });

  it.each([
    ["exact-start Scheduled", "scheduled", nowEpoch],
    ["Cancelled", "cancelled", nowEpoch + 60_000],
  ])("returns one locked schedule outcome for %s", async (
    _label,
    state,
    startsAt,
  ) => {
    await seedDirectStructure();
    await insertModule({ state, startsAt, endsAt: startsAt + 60_000 });
    const response = await createDirectHandler()(scheduleRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "module-schedule-locked",
    });
  });

  it("returns not-found for a cross-Course Module identity", async () => {
    await seedDirectStructure();
    await insertOtherCourse();
    await insertModule();
    const response = await createDirectHandler()(jsonRequest(
      "PUT",
      modulePath("course-other", "module-1"),
      validDetails(),
    ));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      outcome: "module-not-found",
    });
    await expect(moduleRow()).resolves.toMatchObject({ title: "Original" });
  });

  it("derives schedule editability for upcoming, exact, ended, and Cancelled rows", async () => {
    await seedDirectStructure();
    await insertModule({ id: "upcoming", startsAt: nowEpoch + 1, endsAt: nowEpoch + 2 });
    await insertModule({ id: "exact", startsAt: nowEpoch, endsAt: nowEpoch + 1 });
    await insertModule({ id: "ended", startsAt: nowEpoch - 2, endsAt: nowEpoch - 1 });
    await insertModule({
      id: "cancelled",
      startsAt: nowEpoch + 1,
      endsAt: nowEpoch + 2,
      state: "cancelled",
    });
    const response = await createDirectHandler()(jsonRequest(
      "GET",
      "/api/admin/courses/course-1",
    ));
    const body = await response.json();
    const editability = Object.fromEntries(
      body.modules.map((module) => [module.id, module.isScheduleEditable]),
    );

    expect(response.status).toBe(200);
    expect(editability).toEqual({
      upcoming: true,
      exact: false,
      ended: false,
      cancelled: false,
    });
  });
});

describe("Module editing HTTP current-state acceptance", () => {
  it("re-resolves stale Admin and Course state without partial text", async () => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const disabledHandler = createDirectHandler({
      modulePersistence: mutationWithStateChange(
        persisted,
        "update admin_users set state = 'disabled' where id = 'admin-1'",
        "updateModuleDetailsForActiveAdmin",
      ),
    });
    const disabled = await disabledHandler(jsonRequest(
      "PUT",
      modulePath("course-1", "module-1"),
      validDetails(),
    ));

    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({ outcome: "disabled-admin" });
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-1'",
    ).run();
    const archivedHandler = createDirectHandler({
      modulePersistence: mutationWithStateChange(
        persisted,
        "update courses set state = 'archived' where id = 'course-1'",
        "updateModuleDetailsForActiveAdmin",
      ),
    });
    const archived = await archivedHandler(jsonRequest(
      "PUT",
      modulePath("course-1", "module-1"),
      validDetails(),
    ));

    expect(archived.status).toBe(409);
    await expect(archived.json()).resolves.toEqual({
      outcome: "course-not-active",
    });
    await expect(moduleRow()).resolves.toMatchObject({ title: "Original" });
  });

  it("loses a reschedule to concurrent cancellation without leaking data", async () => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: mutationWithStateChange(
        persisted,
        "update modules set state = 'cancelled' where id = 'module-1'",
        "rescheduleModuleForActiveAdmin",
      ),
    });
    const response = await handler(scheduleRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "module-schedule-locked",
    });
    await expect(moduleRow()).resolves.toMatchObject({
      state: "cancelled",
      starts_at: nowEpoch + 60_000,
    });
  });

  it("sanitizes an unexpected Module edit failure", async () => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: {
        ...persisted,
        async updateModuleDetailsForActiveAdmin() {
          throw new Error("secret Module persistence details");
        },
      },
    });
    const response = await handler(jsonRequest(
      "PUT",
      modulePath("course-1", "module-1"),
      validDetails(),
    ));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ outcome: "technical-error" });
    await expect(moduleRow()).resolves.toMatchObject({ title: "Original" });
  });
});

/** @returns {object} Persistence wrapper that mutates current state first. */
function mutationWithStateChange(persisted, statement, method) {
  return {
    ...persisted,
    async [method](input) {
      await env.DB.prepare(statement).run();
      return persisted[method](input);
    },
  };
}

/** @returns {string} Stable nested Module resource path. */
function modulePath(courseId, moduleId) {
  return `/api/admin/courses/${courseId}/modules/${moduleId}`;
}

/** @returns {object} Complete valid Module descriptive fields. */
function validDetails() {
  return { title: "Updated", description: null, instructions: "New" };
}

/** @returns {Request} Build one deterministic schedule request. */
function scheduleRequest(override = {}) {
  return jsonRequest(
    "PUT",
    `${modulePath("course-1", "module-1")}/schedule`,
    {
      startsAtLocal: "2027-01-15T12:00",
      endsAtLocal: "2027-01-15T13:00",
      ...override,
    },
  );
}

/** @returns {Request} Build one same-origin JSON request. */
function jsonRequest(method, path, body, cookie) {
  const headers = {};

  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie !== undefined) headers.cookie = cookie;

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
    now: () => "2026-08-28T10:00:00.000Z",
    adminPersistence: createAdminPersistence(env.DB),
    coursePersistence: createCoursePersistence(env.DB),
    groupPersistence: createGroupPersistence(env.DB),
    modulePersistence: createModulePersistence(env.DB),
    ...override,
  });
}

/** @returns {Promise<void>} Seed current direct Admin and Course state. */
async function seedDirectStructure() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into admin_users
         (id, external_principal_id, name, state, authority)
       values ('admin-1', 'principal-admin-1', 'Admin', 'active', 'admin')`,
    ),
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-1', 'Course', null, 'Europe/Berlin', 'active', 1)`,
    ),
  ]);
}

/** @returns {Promise<void>} Insert another Active Course. */
async function insertOtherCourse() {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state)
     values ('course-other', 'Other', null, 'Europe/Berlin', 'active')`,
  ).run();
}

/** @returns {Promise<void>} Insert one raw Module. */
async function insertModule(options = {}) {
  const id = options.id ?? "module-1";
  const startsAt = options.startsAt ?? nowEpoch + 60_000;
  const endsAt = options.endsAt ?? nowEpoch + 120_000;

  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'course-1', 'Original', 'Old', 'Old instructions', ?, ?, ?)`,
  ).bind(id, startsAt, endsAt, options.state ?? "scheduled").run();
}

/** @returns {Promise<object | null>} Read one raw Module row. */
function moduleRow() {
  return env.DB.prepare("select * from modules where id = 'module-1'").first();
}
