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

describe("Module deletion HTTP contract", () => {
  it("stays authenticated and fixture-free in both Worker compositions", async () => {
    const request = () => jsonRequest(
      "DELETE",
      modulePath("course-1", "module-1"),
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

  it.each(["scheduled", "cancelled"])(
    "deletes an unreferenced %s Module without trusting a body",
    async (state) => {
      await seedDirectStructure();
      await insertModule({ state });
      await insertModule({ id: "module-other" });
      const response = await createDirectHandler()(jsonRequest(
        "DELETE",
        modulePath("course-1", "module-1"),
        {
          id: "module-other",
          courseId: "attacker-course",
          state: state === "scheduled" ? "cancelled" : "scheduled",
          selections: [{ id: "fake" }],
        },
      ));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        outcome: "deleted",
        module: moduleResponse(state),
      });
      await expect(moduleRow("module-1")).resolves.toBeNull();
      await expect(moduleRow("module-other")).resolves.toMatchObject({
        id: "module-other",
      });
      await expect(courseHistory()).resolves.toBe(1);
    },
  );

  it("blocks a retained historical Selection without private data", async () => {
    await seedDirectStructure();
    await insertModule({ state: "cancelled" });
    await insertParticipantGraph(true);
    const response = await createDirectHandler()(jsonRequest(
      "DELETE",
      modulePath("course-1", "module-1"),
    ));

    expect(response.status).toBe(409);
    const body = await response.json();

    expect(body).toEqual({
      outcome: "module-deletion-blocked",
    });
    expect(JSON.stringify(body)).not.toContain("private@example.com");
    await expect(moduleRow("module-1")).resolves.not.toBeNull();
    await expect(selectionRow()).resolves.toEqual({ id: "selection-1" });
  });

  it("deletes after Selection removal and retains a locked empty Course", async () => {
    await seedDirectStructure();
    await insertModule();
    await insertParticipantGraph(true);
    await env.DB.prepare("delete from module_selections").run();
    const handler = createDirectHandler();
    const deleted = await handler(jsonRequest(
      "DELETE",
      modulePath("course-1", "module-1"),
    ));
    const detail = await handler(jsonRequest("GET", "/api/admin/courses/course-1"));

    expect(deleted.status).toBe(200);
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      id: "course-1",
      isTimezoneEditable: false,
      modules: [],
    });
    await expect(courseHistory()).resolves.toBe(1);
  });

  it("returns not-found for a cross-Course Module identity", async () => {
    await seedDirectStructure();
    await insertOtherCourse();
    await insertModule();
    const response = await createDirectHandler()(jsonRequest(
      "DELETE",
      modulePath("course-other", "module-1"),
    ));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      outcome: "module-not-found",
    });
    await expect(moduleRow("module-1")).resolves.not.toBeNull();
  });
});

describe("Module deletion HTTP current-state acceptance", () => {
  it("rechecks a Selection inserted after the initial reference read", async () => {
    await seedDirectStructure();
    await insertModule();
    await insertParticipantGraph(false);
    const persisted = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: {
        ...persisted,
        async listSelectionContextsByModuleId(courseId, moduleId) {
          const contexts = await persisted.listSelectionContextsByModuleId(
            courseId,
            moduleId,
          );
          await insertSelection();
          return contexts;
        },
      },
    });
    const response = await handler(jsonRequest(
      "DELETE",
      modulePath("course-1", "module-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "module-deletion-blocked",
    });
    await expect(moduleRow("module-1")).resolves.not.toBeNull();
    await expect(selectionRow()).resolves.toEqual({ id: "selection-1" });
  });

  it("re-resolves stale actor and Course state without deleting", async () => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const staleAdmin = createDirectHandler({
      modulePersistence: deletionWithStateChange(
        persisted,
        "update admin_users set state = 'disabled' where id = 'admin-1'",
      ),
    });
    const disabled = await staleAdmin(jsonRequest(
      "DELETE",
      modulePath("course-1", "module-1"),
    ));

    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({ outcome: "disabled-admin" });
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-1'",
    ).run();
    const staleCourse = createDirectHandler({
      modulePersistence: deletionWithStateChange(
        persisted,
        "update courses set state = 'archived' where id = 'course-1'",
      ),
    });
    const archived = await staleCourse(jsonRequest(
      "DELETE",
      modulePath("course-1", "module-1"),
    ));

    expect(archived.status).toBe(409);
    await expect(archived.json()).resolves.toEqual({
      outcome: "course-not-active",
    });
    await expect(moduleRow("module-1")).resolves.not.toBeNull();
  });

  it("sanitizes an unexpected deletion failure", async () => {
    await seedDirectStructure();
    await insertModule();
    const persisted = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: {
        ...persisted,
        async deleteUnreferencedModule() {
          throw new Error("secret D1 deletion details");
        },
      },
    });
    const response = await handler(jsonRequest(
      "DELETE",
      modulePath("course-1", "module-1"),
    ));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ outcome: "technical-error" });
    await expect(moduleRow("module-1")).resolves.not.toBeNull();
  });
});

/** @returns {object} Persistence wrapper that mutates current state first. */
function deletionWithStateChange(persisted, statement) {
  return {
    ...persisted,
    async deleteUnreferencedModule(input) {
      await env.DB.prepare(statement).run();
      return persisted.deleteUnreferencedModule(input);
    },
  };
}

/** @returns {object} Narrow deleted Module HTTP representation. */
function moduleResponse(state) {
  return {
    id: "module-1",
    courseId: "course-1",
    title: "Original",
    description: "Old",
    instructions: "Old instructions",
    startsAt: new Date(nowEpoch + 60_000).toISOString(),
    endsAt: new Date(nowEpoch + 120_000).toISOString(),
    state,
    isCancellationAvailable: state === "scheduled",
    isScheduleEditable: state === "scheduled",
  };
}

/** @returns {string} Stable nested Module resource path. */
function modulePath(courseId, moduleId) {
  return `/api/admin/courses/${courseId}/modules/${moduleId}`;
}

/** @returns {Request} Build one same-origin JSON request. */
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

/** @returns {Promise<void>} Seed direct current Admin and Course state. */
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
       values ('course-1', 'Course', null, 'Europe/Berlin', 'active', 0)`,
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

/** @returns {Promise<void>} Insert Participant graph and optional Selection. */
async function insertParticipantGraph(selected) {
  await env.DB.batch([
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-1', 'course-1', 'Group', 'group', 'Retained', 'active')`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-1', 'participant-principal', 'Private Person',
               'private@example.com', 'private@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       values ('assignment-1', 'participant-1', 'course-1', 'active')`,
    ),
  ]);

  if (selected) await insertSelection();
}

/** @returns {Promise<void>} Insert one retained Selection. */
function insertSelection() {
  return env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values ('selection-1', 'participant-1', 'course-1',
             'module-1', 'group-1')`,
  ).run();
}

/** @returns {Promise<object | null>} Read one raw Module row. */
function moduleRow(moduleId) {
  return env.DB.prepare("select * from modules where id = ?").bind(moduleId).first();
}

/** @returns {Promise<object | null>} Read retained Selection state. */
function selectionRow() {
  return env.DB.prepare(
    "select id from module_selections where id = 'selection-1'",
  ).first();
}

/** @returns {Promise<number>} Read permanent Course Module history. */
async function courseHistory() {
  const row = await env.DB
    .prepare("select has_ever_had_module from courses where id = 'course-1'")
    .first();

  return row.has_ever_had_module;
}
