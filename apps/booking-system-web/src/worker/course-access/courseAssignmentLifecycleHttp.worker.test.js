import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";

const currentEpoch = Date.parse("2026-08-28T10:00:00.000Z");

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_http_revocation_failure"),
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

describe("Course Assignment lifecycle HTTP", () => {
  it("removes access and only the target Course future Selection, then reactivates", async () => {
    const adminCookie = await activeAdminCookie();
    const participantCookie = await establishFixture("participant-a");
    await seedParticipantAndCourses();

    const before = await get("/api/participant/courses", participantCookie);

    expect(before.status).toBe(200);
    await expect(before.json()).resolves.toMatchObject({
      courses: [{ id: "course-a" }, { id: "course-b" }],
    });

    const revoked = await revoke(adminCookie, "course-a", "assignment-a");

    expect(revoked.status).toBe(200);
    await expect(revoked.json()).resolves.toEqual({
      outcome: "revoked",
      assignment: { id: "assignment-a", state: "revoked" },
      removedSelectionCount: 1,
    });
    await expect(
      get("/api/participant/courses/course-a", participantCookie),
    ).resolves.toMatchObject({ status: 404 });
    const afterRevocation = await get(
      "/api/participant/courses",
      participantCookie,
    );

    await expect(afterRevocation.json()).resolves.toEqual({
      courses: [
        {
          id: "course-b",
          name: "Course B",
          description: null,
          timezone: "Europe/Berlin",
          state: "active",
        },
      ],
    });

    const reactivated = await assign(adminCookie, "course-a", "participant-a");

    expect(reactivated.status).toBe(200);
    await expect(reactivated.json()).resolves.toMatchObject({
      outcome: "reactivated",
      assignment: { id: "assignment-a", state: "active" },
    });
    const restoredDetail = await get(
      "/api/participant/courses/course-a",
      participantCookie,
    );
    const restoredBody = await restoredDetail.json();

    expect(restoredDetail.status).toBe(200);
    expect(restoredBody.modules[0].selection).toBeNull();
    await expect(countRows("course_assignments")).resolves.toBe(2);
    await expect(countRows("module_selections")).resolves.toBe(0);
  });

  it("revokes in an Archived Course, repeats, and hides mismatched identities", async () => {
    const cookie = await activeAdminCookie();
    await insertParticipant();
    await insertCourse("course-a", "archived");
    await insertCourse("course-b", "active");
    await insertAssignment("assignment-a", "course-a", "active");
    await insertAssignment("assignment-b", "course-b", "active");

    const revoked = await revoke(cookie, "course-a", "assignment-a");
    const repeated = await revoke(cookie, "course-a", "assignment-a");
    const missing = await revoke(cookie, "course-a", "missing");
    const mismatched = await revoke(cookie, "course-a", "assignment-b");
    const archivedReactivation = await assign(
      cookie,
      "course-a",
      "participant-a",
    );

    await expect(revoked.json()).resolves.toMatchObject({ outcome: "revoked" });
    await expect(repeated.json()).resolves.toEqual({
      outcome: "already-revoked",
      assignment: { id: "assignment-a", state: "revoked" },
      removedSelectionCount: 0,
    });
    await expectHttpOutcome(missing, 404, "assignment-not-found");
    await expectHttpOutcome(mismatched, 404, "assignment-not-found");
    await expectHttpOutcome(archivedReactivation, 409, "course-not-active");
    await expect(readAssignmentState("assignment-a")).resolves.toBe("revoked");
    await expect(readAssignmentState("assignment-b")).resolves.toBe("active");
  });

  it("freshly authorizes revocation and routes production without fixtures", async () => {
    await expectHttpOutcome(
      await revoke(null, "course-a", "assignment-a"),
      401,
      "unauthenticated",
    );
    const missingCookie = await establishFixture("first-admin");

    await expectHttpOutcome(
      await revoke(missingCookie, "course-a", "assignment-a"),
      403,
      "no-admin-user",
    );
    const production = await productionWorker.fetch(
      new Request(
        "http://localhost/api/admin/courses/course-a/assignments/assignment-a/revocation",
        { method: "POST" },
      ),
      env,
    );

    await expectHttpOutcome(production, 401, "unauthenticated");
  });

  it("sanitizes a failed atomic batch and leaves access state unchanged", async () => {
    const cookie = await activeAdminCookie();
    await seedParticipantAndCourses();
    await env.DB.prepare(
      `create trigger test_http_revocation_failure
       before update of state on course_assignments
       when old.id = 'assignment-a' and new.state = 'revoked'
       begin
         select raise(abort, 'private technical detail');
       end`,
    ).run();

    const response = await revoke(cookie, "course-a", "assignment-a");

    await expectHttpOutcome(response, 500, "technical-error");
    await expect(readAssignmentState("assignment-a")).resolves.toBe("active");
    await expect(countRows("module_selections")).resolves.toBe(1);
  });
});

/** @returns {Promise<void>} Seed two independent Active Course memberships. */
async function seedParticipantAndCourses() {
  await insertParticipant();
  await insertCourse("course-a", "active");
  await insertCourse("course-b", "active");
  await insertAssignment("assignment-a", "course-a", "active");
  await insertAssignment("assignment-b", "course-b", "active");
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values ('group-a', 'course-a', 'Group A', 'group a', null, 'active')`,
  ).run();
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values ('module-future', 'course-a', 'Future Module', null, null,
             ?, ?, 'scheduled')`,
  )
    .bind(currentEpoch + 60_000, currentEpoch + 120_000)
    .run();
  await env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values ('selection-future', 'participant-a', 'course-a',
             'module-future', 'group-a')`,
  ).run();
}

/** @returns {Promise<string>} Establish an Active first Admin. */
async function activeAdminCookie() {
  const cookie = await establishFixture("first-admin");
  const response = await jsonRequest(
    "/api/admin/bootstrap",
    cookie,
    { name: "Lifecycle Admin" },
  );

  expect(response.status).toBe(201);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixed normal session. */
async function establishFixture(fixtureName) {
  const response = await nonProductionWorker.fetch(
    new Request(`http://localhost/api/_fixtures/session/${fixtureName}`, {
      method: "POST",
    }),
    env,
  );

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<void>} Insert the fixture-backed Participant. */
async function insertParticipant() {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values ('participant-a', 'fixture-participant-a', 'Participant A',
             'participant-a@example.com', 'participant-a@example.com', 'active')`,
  ).run();
}

/** @returns {Promise<void>} Insert one Course. */
async function insertCourse(courseId, state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, null, 'Europe/Berlin', ?, 0)`,
  )
    .bind(courseId, courseId === "course-a" ? "Course A" : "Course B", state)
    .run();
}

/** @returns {Promise<void>} Insert one retained Assignment. */
async function insertAssignment(assignmentId, courseId, state) {
  await env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, 'participant-a', ?, ?)`,
  )
    .bind(assignmentId, courseId, state)
    .run();
}

/** @returns {Promise<Response>} Revoke one stable Assignment resource. */
function revoke(cookie, courseId, assignmentId) {
  return nonProductionWorker.fetch(
    new Request(
      `http://localhost/api/admin/courses/${courseId}/assignments/${assignmentId}/revocation`,
      {
        method: "POST",
        headers: cookie === null ? {} : { cookie },
      },
    ),
    env,
  );
}

/** @returns {Promise<Response>} Create/repeat/reactivate membership. */
function assign(cookie, courseId, participantId) {
  return jsonRequest(
    `/api/admin/courses/${courseId}/assignments`,
    cookie,
    { participantId },
  );
}

/** @returns {Promise<Response>} Send one authenticated JSON POST. */
function jsonRequest(path, cookie, body) {
  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
    }),
    env,
  );
}

/** @returns {Promise<Response>} Send one authenticated GET. */
function get(path, cookie) {
  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, { headers: { cookie } }),
    env,
  );
}

/** @returns {Promise<string | undefined>} Read one current Assignment state. */
async function readAssignmentState(assignmentId) {
  const row = await env.DB.prepare(
    "select state from course_assignments where id = ?",
  )
    .bind(assignmentId)
    .first();

  return row?.state;
}

/** @returns {Promise<number>} Count one fixed test-owned table. */
async function countRows(tableName) {
  const row = await env.DB.prepare(
    `select count(*) as count from "${tableName}"`,
  ).first();

  return row.count;
}

/** @returns {Promise<void>} Assert one exact HTTP refusal. */
async function expectHttpOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
