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

describe("Group deletion HTTP contract", () => {
  it("keeps deletion authenticated and production fixture-free", async () => {
    const request = () => jsonRequest(
      "DELETE",
      "/api/admin/courses/course-1/groups/group-1",
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

  it.each(["active", "archived"])(
    "permanently deletes an unreferenced %s Group without trusting a body",
    async (state) => {
      const cookie = await establishActiveAdmin();
      const course = await createCourse(cookie, `Delete ${state}`);
      const target = await createGroup(cookie, course.id, "Target", "Details");
      const other = await createGroup(cookie, course.id, "Other", null);

      if (state === "archived") {
        const archival = await groupRequest(
          "POST",
          `${groupPath(course.id, target.id)}/archival`,
          undefined,
          cookie,
        );
        expect(archival.status).toBe(200);
      }

      const response = await groupRequest(
        "DELETE",
        groupPath(course.id, target.id),
        { id: other.id, courseId: "attacker-course", selections: [] },
        cookie,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        outcome: "deleted",
        group: {
          id: target.id,
          courseId: course.id,
          name: "Target",
          details: "Details",
          state,
        },
      });
      await expect(groupRow(target.id)).resolves.toBeNull();
      await expect(groupRow(other.id)).resolves.toMatchObject({
        id: other.id,
        course_id: course.id,
      });
    },
  );

  it("blocks every retained Selection without exposing Participant data", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Referenced Group");
    const target = await createGroup(cookie, course.id, "Referenced", null);
    await insertSelectionGraph(course.id, target.id);

    const response = await groupRequest(
      "DELETE",
      groupPath(course.id, target.id),
      undefined,
      cookie,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "group-deletion-blocked",
    });
    await expect(groupRow(target.id)).resolves.not.toBeNull();
    await expect(selectionIds()).resolves.toEqual(["selection-1"]);
  });

  it("returns not-found for a cross-Course Group identity", async () => {
    const cookie = await establishActiveAdmin();
    const owner = await createCourse(cookie, "Owner");
    const other = await createCourse(cookie, "Other");
    const target = await createGroup(cookie, owner.id, "Target", null);

    const response = await groupRequest(
      "DELETE",
      groupPath(other.id, target.id),
      undefined,
      cookie,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      outcome: "group-not-found",
    });
    await expect(groupRow(target.id)).resolves.not.toBeNull();
  });
});

describe("Group deletion HTTP current-state acceptance", () => {
  it("rechecks a Selection inserted after the initial reference read", async () => {
    await seedDirectStructure();
    await insertSelectionGraph("course-1", "group-1", false);
    const persisted = createGroupPersistence(env.DB);
    const handler = createDirectHandler({
      groupPersistence: {
        ...persisted,
        async deleteUnreferencedGroup(input) {
          await insertSelection("course-1", "group-1");
          return persisted.deleteUnreferencedGroup(input);
        },
      },
    });

    const response = await handler(jsonRequest(
      "DELETE",
      groupPath("course-1", "group-1"),
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "group-deletion-blocked",
    });
    await expect(groupRow("group-1")).resolves.not.toBeNull();
    await expect(selectionIds()).resolves.toEqual(["selection-1"]);
  });

  it("re-resolves stale actor and Course state without deleting", async () => {
    await seedDirectStructure();
    const persisted = createGroupPersistence(env.DB);
    const staleAdmin = createDirectHandler({
      groupPersistence: deletionWithStateChange(
        persisted,
        "update admin_users set state = 'disabled' where id = 'admin-1'",
      ),
    });
    const disabled = await staleAdmin(jsonRequest(
      "DELETE",
      groupPath("course-1", "group-1"),
    ));

    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({
      outcome: "disabled-admin",
    });
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-1'",
    ).run();
    const staleCourse = createDirectHandler({
      groupPersistence: deletionWithStateChange(
        persisted,
        "update courses set state = 'archived' where id = 'course-1'",
      ),
    });
    const archived = await staleCourse(jsonRequest(
      "DELETE",
      groupPath("course-1", "group-1"),
    ));

    expect(archived.status).toBe(409);
    await expect(archived.json()).resolves.toEqual({
      outcome: "course-not-active",
    });
    await expect(groupRow("group-1")).resolves.not.toBeNull();
  });

  it("sanitizes an unexpected deletion failure", async () => {
    await seedDirectStructure();
    const persisted = createGroupPersistence(env.DB);
    const handler = createDirectHandler({
      groupPersistence: {
        ...persisted,
        async deleteUnreferencedGroup() {
          throw new Error("secret D1 deletion details");
        },
      },
    });

    const response = await handler(jsonRequest(
      "DELETE",
      groupPath("course-1", "group-1"),
    ));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      outcome: "technical-error",
    });
    await expect(groupRow("group-1")).resolves.not.toBeNull();
  });
});

/** @returns {object} Persistence wrapper that mutates current state first. */
function deletionWithStateChange(persisted, statement) {
  return {
    ...persisted,
    async deleteUnreferencedGroup(input) {
      await env.DB.prepare(statement).run();
      return persisted.deleteUnreferencedGroup(input);
    },
  };
}

/** @returns {string} Stable nested Group resource path. */
function groupPath(courseId, groupId) {
  return `/api/admin/courses/${courseId}/groups/${groupId}`;
}

/** @returns {Promise<string>} Establish and bootstrap an Active Admin session. */
async function establishActiveAdmin() {
  const cookie = await establishFixture("first-admin");
  const response = await groupRequest(
    "POST",
    "/api/admin/bootstrap",
    { name: "Deletion Admin" },
    cookie,
  );

  expect(response.status).toBe(201);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixture-backed normal session. */
async function establishFixture(fixture) {
  const response = await nonProductionWorker.fetch(
    new Request(`http://localhost/api/_fixtures/session/${fixture}`, {
      method: "POST",
    }),
    env,
  );

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<object>} Create one Course through normal HTTP. */
async function createCourse(cookie, name) {
  const response = await groupRequest(
    "POST",
    "/api/admin/courses",
    { name },
    cookie,
  );

  expect(response.status).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one Group through normal HTTP. */
async function createGroup(cookie, courseId, name, details) {
  const response = await groupRequest(
    "POST",
    `/api/admin/courses/${courseId}/groups`,
    { name, details },
    cookie,
  );

  expect(response.status).toBe(201);
  return response.json();
}

/** @returns {Promise<Response>} Send a non-production Worker request. */
function groupRequest(method, path, body, cookie) {
  return nonProductionWorker.fetch(jsonRequest(method, path, body, cookie), env);
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

/** @returns {Promise<void>} Seed direct current Admin, Course, and Group state. */
async function seedDirectStructure() {
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
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-1', 'course-1', 'Group', 'group', null, 'active')`,
    ),
  ]);
}

/** @returns {Promise<void>} Insert a Participant graph, optionally selected. */
async function insertSelectionGraph(courseId, groupId, selected = true) {
  const startsAt = Date.parse(env.BOOKING_TEST_NOW) - 120_000;
  const endsAt = startsAt + 60_000;

  await env.DB.batch([
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-1', 'participant-principal', 'Private Person',
               'private@example.com', 'private@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       values ('assignment-1', 'participant-1', ?, 'active')`,
    ).bind(courseId),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-1', ?, 'Past Module', null, null, ?, ?, 'cancelled')`,
    ).bind(courseId, startsAt, endsAt),
  ]);

  if (selected) await insertSelection(courseId, groupId);
}

/** @returns {Promise<void>} Insert one retained Selection. */
async function insertSelection(courseId, groupId) {
  await env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values ('selection-1', 'participant-1', ?, 'module-1', ?)`,
  ).bind(courseId, groupId).run();
}

/** @returns {Promise<object | null>} Read one raw Group row. */
function groupRow(groupId) {
  return env.DB.prepare("select * from groups where id = ?").bind(groupId).first();
}

/** @returns {Promise<Array<string>>} Read retained Selection identities. */
async function selectionIds() {
  const { results } = await env.DB.prepare(
    "select id from module_selections order by id",
  ).all();

  return results.map(({ id }) => id);
}
