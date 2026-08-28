import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createCourseAccessHttpHandler } from "./createCourseAccessHttpHandler.js";

const currentEpoch = Date.parse("2026-08-28T10:00:00.000Z");

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

describe("Participant lifecycle HTTP", () => {
  it("Disables globally and Re-enables fresh access without restoring choices", async () => {
    const cookie = await establishFixture("first-admin");
    await bootstrapAdmin(cookie);
    await insertParticipant("active", "fixture-first-admin");
    await insertAccessGraph();

    const disabled = await lifecycleRequest(
      cookie,
      "participant-a",
      "disablement",
      { state: "active", now: "attacker", assignments: ["attacker"] },
    );

    expect(disabled.status).toBe(200);
    await expect(disabled.json()).resolves.toEqual({
      outcome: "disabled",
      participant: {
        id: "participant-a",
        name: "Participant A",
        email: "participant-a@example.com",
        state: "disabled",
      },
      removedSelectionCount: 1,
    });
    await expectOutcome(await get("/api/participant/me", cookie), 403,
      "disabled-participant");
    await expectOutcome(await get("/api/participant/courses", cookie), 403,
      "disabled-participant");
    await expectOutcome(
      await put("/api/participant/me", cookie, {
        name: "Refused",
        email: "refused@example.com",
      }),
      403,
      "disabled-participant",
    );
    await expectOutcome(
      await put(
        "/api/participant/courses/course-a/modules/module-future/selection",
        cookie,
        { groupId: "group-a" },
      ),
      403,
      "disabled-participant",
    );
    await expect(get("/api/admin/me", cookie).then((value) => value.json()))
      .resolves.toMatchObject({ state: "active" });
    await expect(assignmentRows()).resolves.toEqual([
      { id: "assignment-a", state: "active" },
      { id: "assignment-b", state: "revoked" },
    ]);

    const reenabled = await lifecycleRequest(
      cookie,
      "participant-a",
      "reenablement",
    );

    expect(reenabled.status).toBe(200);
    await expect(reenabled.json()).resolves.toMatchObject({
      outcome: "re-enabled",
      participant: { id: "participant-a", state: "active" },
    });
    expect((await get("/api/participant/me", cookie)).status).toBe(200);
    const courses = await get("/api/participant/courses", cookie);
    expect(courses.status).toBe(200);
    await expect(courses.json()).resolves.toMatchObject({
      courses: [{ id: "course-a" }],
    });
    const detail = await get("/api/participant/courses/course-a", cookie);
    await expect(detail.json()).resolves.toMatchObject({
      modules: [{ id: "module-future", selection: null }],
    });
  });

  it("uses exact missing, target-state, Admin-state, and self-route refusals", async () => {
    const cookie = await activeAdminCookie();
    await insertParticipant("active");

    await expectOutcome(
      await lifecycleRequest(cookie, "missing", "disablement"),
      404,
      "participant-not-found",
    );
    await expectOutcome(
      await lifecycleRequest(cookie, "participant-a", "reenablement"),
      409,
      "participant-not-disabled",
    );
    expect(
      (await lifecycleRequest(cookie, "participant-a", "disablement")).status,
    ).toBe(200);
    await expectOutcome(
      await lifecycleRequest(cookie, "participant-a", "disablement"),
      409,
      "participant-not-active",
    );
    await env.DB.prepare(
      `update admin_users set state = 'disabled'
        where external_principal_id = 'fixture-first-admin'`,
    ).run();
    await expectOutcome(
      await lifecycleRequest(cookie, "participant-a", "reenablement"),
      403,
      "disabled-admin",
    );
    await expectOutcome(
      await post("/api/participant/me/disablement", cookie),
      404,
      "not-found",
    );
  });

  it("keeps both Admin lifecycle actions production-authenticated", async () => {
    for (const action of ["disablement", "reenablement"]) {
      const response = await productionWorker.fetch(
        new Request(
          `http://localhost/api/admin/participants/participant-a/${action}`,
          { method: "POST" },
        ),
        env,
      );

      await expectOutcome(response, 401, "unauthenticated");
    }
  });

  it("sanitizes unexpected Participant lifecycle failures", async () => {
    const participant = {
      id: "participant-a",
      name: "Participant A",
      email: "participant-a@example.com",
      state: "active",
    };
    const handler = createCourseAccessHttpHandler({
      authenticate: async () => ({
        outcome: "authenticated",
        externalPrincipalId: "admin-principal",
      }),
      createCourseAssignmentId: () => "unused",
      now: () => env.BOOKING_TEST_NOW,
      adminPersistence: {
        findAdminUserByExternalPrincipalId: async () => ({
          id: "admin-a",
          state: "active",
        }),
      },
      assignmentPersistence: {},
      coursePersistence: {},
      participantPersistence: {
        findParticipantById: async () => participant,
        disableActiveParticipant: async () => {
          throw new Error("private lifecycle failure");
        },
      },
    });
    const response = await handler(
      new Request(
        "http://localhost/api/admin/participants/participant-a/disablement",
        { method: "POST" },
      ),
    );

    await expectOutcome(response, 500, "technical-error");
  });
});

/** @returns {Promise<string>} Establish and bootstrap an Active Admin. */
async function activeAdminCookie() {
  const cookie = await establishFixture("first-admin");

  await bootstrapAdmin(cookie);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixed normal application session. */
async function establishFixture(name) {
  const response = await nonProductionWorker.fetch(
    new Request(`http://localhost/api/_fixtures/session/${name}`, {
      method: "POST",
    }),
    env,
  );

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<void>} Bootstrap the fixed first Admin. */
async function bootstrapAdmin(cookie) {
  const response = await post("/api/admin/bootstrap", cookie, {
    name: "Lifecycle Admin",
  });

  expect(response.status).toBe(201);
}

/** @returns {Promise<void>} Insert one Participant. */
async function insertParticipant(
  state,
  principal = "participant-principal-a",
) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values ('participant-a', ?, 'Participant A',
             'participant-a@example.com', 'participant-a@example.com', ?)`,
  )
    .bind(principal, state)
    .run();
}

/** @returns {Promise<void>} Insert assigned and revoked Courses with one future choice. */
async function insertAccessGraph() {
  await env.DB.batch([
    courseStatement("a"),
    courseStatement("b"),
    groupStatement(),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-future', 'course-a', 'Future Module', null, null,
               ?, ?, 'scheduled')`,
    ).bind(currentEpoch + 60_000, currentEpoch + 120_000),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-a', 'participant-a', 'course-a', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-b', 'participant-a', 'course-b', 'revoked')`,
    ),
    env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-future', 'participant-a', 'course-a',
               'module-future', 'group-a')`,
    ),
  ]);
}

/** @returns {object} Course insert statement. */
function courseStatement(suffix) {
  return env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, null, 'Europe/Berlin', 'active', ?)`,
  ).bind(`course-${suffix}`, `Course ${suffix}`, suffix === "a" ? 1 : 0);
}

/** @returns {object} Group insert statement. */
function groupStatement() {
  return env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values ('group-a', 'course-a', 'Group A', 'group a', null, 'active')`,
  );
}

/** @returns {Promise<Array<object>>} Stable Assignment state. */
async function assignmentRows() {
  const { results } = await env.DB.prepare(
    "select id, state from course_assignments order by id",
  ).all();

  return results;
}

/** @returns {Promise<Response>} Bodyless lifecycle action request. */
function lifecycleRequest(cookie, participantId, action, body) {
  return request(
    `/api/admin/participants/${participantId}/${action}`,
    "POST",
    cookie,
    body,
  );
}

/** @returns {Promise<Response>} Optional-body POST. */
function post(path, cookie, body) {
  return request(path, "POST", cookie, body);
}

/** @returns {Promise<Response>} Optional-cookie GET. */
function get(path, cookie) {
  return request(path, "GET", cookie);
}

/** @returns {Promise<Response>} JSON PUT. */
function put(path, cookie, body) {
  return request(path, "PUT", cookie, body);
}

/** @returns {Promise<Response>} One non-production Worker request. */
function request(path, method, cookie, body) {
  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(cookie === null ? {} : { cookie }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

/** @returns {Promise<void>} Assert one exact language-neutral outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
