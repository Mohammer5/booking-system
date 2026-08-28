import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
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

describe("Admin Course-access authorization", () => {
  it("returns exact unauthenticated, missing-Admin, and Disabled-Admin refusals", async () => {
    const unauthenticated = await get("/api/admin/participants", null);
    const cookie = await establishFixture("first-admin");
    const missingAdmin = await get("/api/admin/participants", cookie);

    await bootstrapAdmin(cookie);
    await env.DB.prepare(
      "update admin_users set state = 'disabled' where external_principal_id = ?",
    )
      .bind("fixture-first-admin")
      .run();
    const disabledAdmin = await get(
      "/api/admin/courses/private/assignments",
      cookie,
    );

    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toEqual({
      outcome: "unauthenticated",
    });
    expect(missingAdmin.status).toBe(403);
    await expect(missingAdmin.json()).resolves.toEqual({
      outcome: "no-admin-user",
    });
    expect(disabledAdmin.status).toBe(403);
    await expect(disabledAdmin.json()).resolves.toEqual({
      outcome: "disabled-admin",
    });
  });

  it("routes the operations through production composition without fixtures", async () => {
    for (const path of [
      "/api/admin/participants",
      "/api/admin/courses/course-a/assignments",
    ]) {
      const response = await productionWorker.fetch(
        new Request(`http://localhost${path}`),
        env,
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        outcome: "unauthenticated",
      });
    }
  });
});

describe("Participant directory and Course membership reads", () => {
  it("lists every Participant independently from ordered Course membership", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse("course-a", "active");
    await insertParticipants([
      participant("zero", "Zero Membership", "active"),
      participant("disabled", "Disabled Membership", "disabled"),
      participant("assigned", "Assigned Membership", "active"),
    ]);
    await insertAssignment("assignment-a", "participant-assigned", "active");

    const directory = await get("/api/admin/participants", cookie);
    const membership = await get(
      "/api/admin/courses/course-a/assignments",
      cookie,
    );

    expect(directory.status).toBe(200);
    await expect(directory.json()).resolves.toEqual({
      participants: [
        {
          id: "participant-assigned",
          name: "Assigned Membership",
          email: "assigned@example.com",
          state: "active",
        },
        {
          id: "participant-disabled",
          name: "Disabled Membership",
          email: "disabled@example.com",
          state: "disabled",
        },
        {
          id: "participant-zero",
          name: "Zero Membership",
          email: "zero@example.com",
          state: "active",
        },
      ],
    });
    expect(membership.status).toBe(200);
    await expect(membership.json()).resolves.toEqual({
      assignments: [
        {
          id: "assignment-a",
          state: "active",
          participant: {
            id: "participant-assigned",
            name: "Assigned Membership",
            email: "assigned@example.com",
            state: "active",
          },
        },
      ],
    });

    await env.DB.prepare("update courses set state = 'archived' where id = ?")
      .bind("course-a")
      .run();
    const archivedMembership = await get(
      "/api/admin/courses/course-a/assignments",
      cookie,
    );
    const missingCourse = await get(
      "/api/admin/courses/missing/assignments",
      cookie,
    );

    expect(archivedMembership.status).toBe(200);
    expect(missingCourse.status).toBe(404);
    await expect(missingCourse.json()).resolves.toEqual({
      outcome: "course-not-found",
    });
  });
});

describe("direct Assignment HTTP contract", () => {
  it("creates narrow membership, accepts Disabled targets, and repeats idempotently", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse("course-a", "active");
    await insertParticipants([
      participant("active", "Active Participant", "active"),
      participant("disabled", "Disabled Participant", "disabled"),
    ]);

    const created = await postAssignment(cookie, "course-a", {
      participantId: "participant-active",
      id: "browser-id",
      state: "revoked",
      origin: "manual",
      selections: ["module-private"],
    });
    const createdBody = await created.json();
    const repeated = await postAssignment(cookie, "course-a", {
      participantId: "participant-active",
    });
    const disabled = await postAssignment(cookie, "course-a", {
      participantId: "participant-disabled",
    });

    expect(created.status).toBe(201);
    expect(createdBody.assignment.id).not.toBe("browser-id");
    expect(createdBody).toEqual({
      outcome: "created",
      assignment: {
        id: createdBody.assignment.id,
        state: "active",
        participant: {
          id: "participant-active",
          name: "Active Participant",
          email: "active@example.com",
          state: "active",
        },
      },
    });
    expect(repeated.status).toBe(200);
    await expect(repeated.json()).resolves.toEqual({
      ...createdBody,
      outcome: "already-active",
    });
    expect(disabled.status).toBe(201);
    await expect(disabled.json()).resolves.toMatchObject({
      outcome: "created",
      assignment: {
        state: "active",
        participant: { id: "participant-disabled", state: "disabled" },
      },
    });
    await expect(countRows("course_assignments")).resolves.toBe(2);
    await expect(countRows("participants")).resolves.toBe(2);
    await expect(membershipTables()).resolves.toEqual([
      { name: "course_assignments" },
      { name: "module_selections" },
    ]);
  });

  it("preserves one Assignment under concurrent repeat submissions", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse("course-a", "active");
    await insertParticipants([
      participant("race", "Race Participant", "active"),
    ]);

    const responses = await Promise.all([
      postAssignment(cookie, "course-a", { participantId: "participant-race" }),
      postAssignment(cookie, "course-a", { participantId: "participant-race" }),
    ]);
    const bodies = await Promise.all(responses.map((response) => response.json()));

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect(bodies.map(({ outcome }) => outcome).sort()).toEqual([
      "already-active",
      "created",
    ]);
    expect(bodies[0].assignment).toEqual(bodies[1].assignment);
    await expect(countRows("course_assignments")).resolves.toBe(1);
  });

  it("rejects invalid/unknown/Archived input and reactivates a retained row", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse("course-a", "active");
    await insertParticipants([
      participant("active", "Active Participant", "active"),
    ]);

    const invalid = await postAssignment(cookie, "course-a", {});
    const missingParticipant = await postAssignment(cookie, "course-a", {
      participantId: "missing",
    });
    const missingCourse = await postAssignment(cookie, "missing", {
      participantId: "participant-active",
    });

    await env.DB.prepare("update courses set state = 'archived' where id = ?")
      .bind("course-a")
      .run();
    const archived = await postAssignment(cookie, "course-a", {
      participantId: "participant-active",
    });

    await env.DB.prepare("update courses set state = 'active' where id = ?")
      .bind("course-a")
      .run();
    await insertAssignment(
      "assignment-retained",
      "participant-active",
      "revoked",
    );
    const retained = await postAssignment(cookie, "course-a", {
      participantId: "participant-active",
    });

    await expectHttpOutcome(invalid, 422, "invalid-participant-id");
    await expectHttpOutcome(missingParticipant, 404, "participant-not-found");
    await expectHttpOutcome(missingCourse, 404, "course-not-found");
    await expectHttpOutcome(archived, 409, "course-not-active");
    expect(retained.status).toBe(200);
    await expect(retained.json()).resolves.toMatchObject({
      outcome: "reactivated",
      assignment: { id: "assignment-retained", state: "active" },
    });
    await expect(countRows("course_assignments")).resolves.toBe(1);
  });
});

/** @returns {Promise<string>} Establish one Active Admin session and identity. */
async function activeAdminCookie() {
  const cookie = await establishFixture("first-admin");

  await bootstrapAdmin(cookie);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixed normal application session. */
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

/** @returns {Promise<void>} Bootstrap the deterministic first Admin. */
async function bootstrapAdmin(cookie) {
  const response = await jsonRequest("/api/admin/bootstrap", cookie, {
    name: "Assignment Admin",
  });

  expect(response.status).toBe(201);
}

/** @returns {Promise<Response>} Submit direct Assignment input. */
function postAssignment(cookie, courseId, body) {
  return jsonRequest(
    `/api/admin/courses/${courseId}/assignments`,
    cookie,
    body,
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

/** @returns {Promise<Response>} Send one optional-cookie GET. */
function get(path, cookie) {
  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, {
      headers: cookie === null ? {} : { cookie },
    }),
    env,
  );
}

/** @returns {object} Deterministic fully registered Participant data. */
function participant(suffix, name, state) {
  return {
    id: `participant-${suffix}`,
    externalPrincipalId: `principal-${suffix}`,
    name,
    email: `${suffix}@example.com`,
    state,
  };
}

/** @returns {Promise<void>} Insert deterministic current Course state. */
async function insertCourse(id, state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, 'Assignment Course', null, 'Europe/Berlin', ?, 0)`,
  )
    .bind(id, state)
    .run();
}

/** @returns {Promise<void>} Insert fully registered Participants. */
async function insertParticipants(participants) {
  for (const value of participants) {
    await env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        value.id,
        value.externalPrincipalId,
        value.name,
        value.email,
        value.email.toLowerCase(),
        value.state,
      )
      .run();
  }
}

/** @returns {Promise<void>} Insert one retained Assignment. */
async function insertAssignment(id, participantId, state) {
  await env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, ?, 'course-a', ?)`,
  )
    .bind(id, participantId, state)
    .run();
}

/** @returns {Promise<number>} Count rows in one fixed test-owned table. */
async function countRows(tableName) {
  const row = await env.DB.prepare(
    `select count(*) as count from "${tableName}"`,
  ).first();

  return row.count;
}

/** @returns {Promise<Array<object>>} Inspect membership schema ownership. */
async function membershipTables() {
  const { results } = await env.DB.prepare(
    `select name from sqlite_master
      where type = 'table'
        and name in ('course_assignments', 'module_selections')
      order by name`,
  ).all();

  return results;
}

/** @returns {Promise<void>} Assert one exact HTTP refusal. */
async function expectHttpOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
