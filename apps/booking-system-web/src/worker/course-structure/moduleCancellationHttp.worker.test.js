import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdminPersistence } from "../admin-bootstrap/index.js";
import {
  createParticipantCourseHttpHandler,
  createParticipantCoursePersistence,
  createParticipantPersistence,
} from "../course-access/index.js";
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

describe("Module cancellation HTTP contract", () => {
  it("stays authenticated and fixture-free in both Worker compositions", async () => {
    const request = () => new Request(
      `http://localhost${cancellationPath("course-1", "module-1")}`,
      { method: "POST" },
    );
    const responses = await Promise.all([
      nonProductionWorker.fetch(request(), env),
      productionWorker.fetch(request(), env),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401]);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({ outcome: "unauthenticated" });
    }
  });

  it.each([
    ["upcoming", nowEpoch + 60_000, nowEpoch + 120_000],
    ["exact start", nowEpoch, nowEpoch + 60_000],
    ["in progress", nowEpoch - 60_000, nowEpoch + 60_000],
  ])("cancels an eligible %s Module without trusting a body", async (
    _label,
    startsAt,
    endsAt,
  ) => {
    await seedDirectStructure();
    await insertModule({ startsAt, endsAt });
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      cancellationPath("course-1", "module-1"),
      {
        state: "scheduled",
        now: "1900-01-01T00:00:00.000Z",
        startsAt: "1900-01-01T00:00:00.000Z",
        endsAt: "2999-01-01T00:00:00.000Z",
        selections: [],
      },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      outcome: "cancelled",
      module: {
        id: "module-1",
        courseId: "course-1",
        title: "Original",
        description: "Old",
        instructions: "Old instructions",
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        state: "cancelled",
        isCancellationAvailable: false,
        isScheduleEditable: false,
      },
    });
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: startsAt,
      ends_at: endsAt,
      state: "cancelled",
    });
  });

  it.each([
    ["exact end", nowEpoch],
    ["ended", nowEpoch - 1],
  ])("returns the exact deadline refusal at %s", async (_label, endsAt) => {
    await seedDirectStructure();
    await insertModule({ startsAt: nowEpoch - 60_000, endsAt });
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      cancellationPath("course-1", "module-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "module-cancellation-deadline-reached",
    });
    await expect(moduleRow()).resolves.toMatchObject({ state: "scheduled" });
  });

  it("keeps repeated cancellation terminal and both instants unchanged", async () => {
    await seedDirectStructure();
    await insertModule({ state: "cancelled" });
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      cancellationPath("course-1", "module-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ outcome: "module-not-scheduled" });
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: nowEpoch + 60_000,
      ends_at: nowEpoch + 120_000,
      state: "cancelled",
    });
  });

  it("returns not-found for a cross-Course Module identity", async () => {
    await seedDirectStructure();
    await insertOtherCourse();
    await insertModule();
    const response = await createDirectHandler()(jsonRequest(
      "POST",
      cancellationPath("course-other", "module-1"),
    ));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ outcome: "module-not-found" });
    await expect(moduleRow()).resolves.toMatchObject({ state: "scheduled" });
  });

  it("derives cancellation availability across temporal and terminal states", async () => {
    await seedDirectStructure();
    await insertModule({ id: "upcoming", startsAt: nowEpoch + 1, endsAt: nowEpoch + 2 });
    await insertModule({ id: "in-progress", startsAt: nowEpoch - 1, endsAt: nowEpoch + 1 });
    await insertModule({ id: "exact-end", startsAt: nowEpoch - 1, endsAt: nowEpoch });
    await insertModule({ id: "ended", startsAt: nowEpoch - 2, endsAt: nowEpoch - 1 });
    await insertModule({
      id: "cancelled",
      startsAt: nowEpoch + 1,
      endsAt: nowEpoch + 2,
      state: "cancelled",
    });
    const response = await createDirectHandler()(jsonRequest(
      "GET",
      "/api/admin/courses/course-1/modules",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.fromEntries(body.modules.map((module) => [
      module.id,
      module.isCancellationAvailable,
    ]))).toEqual({
      upcoming: true,
      "in-progress": true,
      "exact-end": false,
      ended: false,
      cancelled: false,
    });
  });

  it("retains a Selection and immediately presents it as historical", async () => {
    await seedDirectStructure();
    await insertModule();
    await insertSelectionGraph();
    const cancellation = await createDirectHandler()(jsonRequest(
      "POST",
      cancellationPath("course-1", "module-1"),
    ));
    const participantDetail = await createParticipantHandler()(jsonRequest(
      "GET",
      "/api/participant/courses/course-1",
    ));
    const body = await participantDetail.json();

    expect(cancellation.status).toBe(200);
    expect(participantDetail.status).toBe(200);
    expect(body.modules[0]).toMatchObject({
      id: "module-1",
      state: "cancelled",
      selectionAvailability: "closed",
      selection: {
        id: "selection-1",
        meaning: "historical",
        phase: "historical",
        group: { id: "group-1", name: "Group" },
      },
    });
    await expect(selectionRow()).resolves.toMatchObject({ id: "selection-1" });
  });
});

describe("Module cancellation HTTP current-state acceptance", () => {
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
  ])("re-resolves a stale %s without state change", async (
    _label,
    statement,
    outcome,
    status,
  ) => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: mutationWithStateChange(
        persisted,
        statement,
        "cancelScheduledModule",
      ),
    });
    const response = await handler(jsonRequest(
      "POST",
      cancellationPath("course-1", "module-1"),
    ));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ outcome });
    await expect(moduleRow()).resolves.toMatchObject({ state: "scheduled" });
  });

  it("loses to a concurrent cancellation without exposing private state", async () => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: mutationWithStateChange(
        persisted,
        "update modules set state = 'cancelled' where id = 'module-1'",
        "cancelScheduledModule",
      ),
    });
    const response = await handler(jsonRequest(
      "POST",
      cancellationPath("course-1", "module-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ outcome: "module-not-scheduled" });
  });

  it("sanitizes an unexpected cancellation failure", async () => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: {
        ...persisted,
        async cancelScheduledModule() {
          throw new Error("private cancellation storage detail");
        },
      },
    });
    const response = await handler(jsonRequest(
      "POST",
      cancellationPath("course-1", "module-1"),
    ));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ outcome: "technical-error" });
    await expect(moduleRow()).resolves.toMatchObject({ state: "scheduled" });
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

/** @returns {string} Stable nested cancellation action path. */
function cancellationPath(courseId, moduleId) {
  return `/api/admin/courses/${courseId}/modules/${moduleId}/cancellation`;
}

/** @returns {Request} Build one same-origin JSON or body-free request. */
function jsonRequest(method, path, body) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** @returns {(request: Request) => Promise<Response>} Direct Admin handler. */
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

/** @returns {(request: Request) => Promise<Response>} Direct Participant handler. */
function createParticipantHandler() {
  return createParticipantCourseHttpHandler({
    authenticate: vi.fn(async () => ({
      outcome: "authenticated",
      externalPrincipalId: "principal-participant-1",
    })),
    now: () => new Date(nowEpoch).toISOString(),
    participantPersistence: createParticipantPersistence(env.DB),
    persistence: createParticipantCoursePersistence(env.DB),
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

/** @returns {Promise<void>} Insert one raw Module. */
async function insertModule(options = {}) {
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'course-1', 'Original', 'Old', 'Old instructions', ?, ?, ?)`,
  ).bind(
    options.id ?? "module-1",
    options.startsAt ?? nowEpoch + 60_000,
    options.endsAt ?? nowEpoch + 120_000,
    options.state ?? "scheduled",
  ).run();
}

/** @returns {Promise<void>} Insert another Active Course. */
function insertOtherCourse() {
  return env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state)
     values ('course-other', 'Other', null, 'Europe/Berlin', 'active')`,
  ).run();
}

/** @returns {Promise<void>} Insert Participant, Assignment, Group, and Selection. */
async function insertSelectionGraph() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-1', 'course-1', 'Group', 'group', 'Retained', 'active')`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-1', 'principal-participant-1', 'Participant',
               'participant@example.com', 'participant@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       values ('assignment-1', 'participant-1', 'course-1', 'active')`,
    ),
    env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-1', 'participant-1', 'course-1',
               'module-1', 'group-1')`,
    ),
  ]);
}

/** @returns {Promise<object | null>} Raw Module state. */
function moduleRow() {
  return env.DB.prepare("select * from modules where id = 'module-1'").first();
}

/** @returns {Promise<object | null>} Retained Selection state. */
function selectionRow() {
  return env.DB.prepare(
    "select id from module_selections where id = 'selection-1'",
  ).first();
}
