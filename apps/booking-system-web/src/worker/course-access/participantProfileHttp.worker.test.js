import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createCourseAccessHttpHandler } from "./createCourseAccessHttpHandler.js";
import { createParticipantHttpHandler } from "./createParticipantHttpHandler.js";

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

describe("Participant self profile HTTP", () => {
  it("updates only the current Active Participant and not a same-principal Admin", async () => {
    const cookie = await establishFixture("first-admin");
    await bootstrapAdmin(cookie, "Independent Admin");
    await insertParticipant(
      "self",
      "fixture-first-admin",
      "Self Original",
      "self.original@example.com",
      "active",
    );
    const response = await put("/api/participant/me", cookie, {
      name: "Self Updated",
      email: " Self+Tag@Example.COM ",
      id: "attacker",
      state: "disabled",
      externalPrincipalId: "attacker",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "participant-self",
      name: "Self Updated",
      email: "Self+Tag@Example.COM",
      state: "active",
    });
    await expect(get("/api/admin/me", cookie).then((value) => value.json()))
      .resolves.toMatchObject({ name: "Independent Admin", state: "active" });
    await expect(rawParticipant("self")).resolves.toMatchObject({
      external_principal_id: "fixture-first-admin",
      normalized_email: "self+tag@example.com",
      state: "active",
    });
  });

  it("returns exact invalid, duplicate, unauthenticated, and Disabled refusals", async () => {
    const cookie = await establishFixture("participant-a");
    await insertParticipant(
      "a",
      "fixture-participant-a",
      "Participant A",
      "a@example.com",
      "active",
    );
    await insertParticipant(
      "b",
      "fixture-participant-b",
      "Participant B",
      "Taken+Tag@Example.COM",
      "active",
    );
    const before = await rawParticipant("a");

    await expectOutcome(
      await put("/api/participant/me", cookie, {
        name: " ",
        email: "a@example.com",
      }),
      422,
      "invalid-name",
    );
    await expectOutcome(
      await put("/api/participant/me", cookie, {
        name: "Participant A",
        email: "invalid",
      }),
      422,
      "invalid-email",
    );
    await expectOutcome(
      await put("/api/participant/me", cookie, {
        name: "Refused",
        email: "taken+tag@example.com",
      }),
      409,
      "email-already-exists",
    );
    await expect(rawParticipant("a")).resolves.toEqual(before);
    await expectOutcome(
      await put("/api/participant/me", null, {
        name: "Unknown",
        email: "unknown@example.com",
      }),
      401,
      "unauthenticated",
    );
    await env.DB.prepare(
      "update participants set state = 'disabled' where id = 'participant-a'",
    ).run();
    await expectOutcome(
      await put("/api/participant/me", cookie, {
        name: "Disabled",
        email: "disabled@example.com",
      }),
      403,
      "disabled-participant",
    );
  });
});

describe("Admin Participant profile HTTP", () => {
  it.each(["active", "disabled"])(
    "reads and updates one narrow %s Participant detail",
    async (state) => {
      const cookie = await activeAdminCookie();
      await insertParticipant(
        state,
        `target-${state}-principal`,
        `${state} Target`,
        `${state}@example.com`,
        state,
      );
      const path = `/api/admin/participants/participant-${state}`;
      const detail = await get(path, cookie);
      const update = await put(path, cookie, {
        name: `${state} Updated`,
        email: ` ${state}+Updated@Example.COM `,
        authority: "super-admin",
        assignments: ["private"],
      });

      expect(detail.status).toBe(200);
      await expect(detail.json()).resolves.toEqual({
        id: `participant-${state}`,
        name: `${state} Target`,
        email: `${state}@example.com`,
        state,
      });
      expect(update.status).toBe(200);
      await expect(update.json()).resolves.toEqual({
        id: `participant-${state}`,
        name: `${state} Updated`,
        email: `${state}+Updated@Example.COM`,
        state,
      });
    },
  );

  it("freshly refuses missing target and Disabled Admin state", async () => {
    const cookie = await activeAdminCookie();

    await expectOutcome(
      await get("/api/admin/participants/missing", cookie),
      404,
      "participant-not-found",
    );
    await env.DB.prepare(
      `update admin_users set state = 'disabled'
        where external_principal_id = 'fixture-first-admin'`,
    ).run();
    await expectOutcome(
      await put("/api/admin/participants/missing", cookie, {
        name: "Refused",
        email: "refused@example.com",
      }),
      403,
      "disabled-admin",
    );
  });

  it("keeps both profile resources production-authenticated", async () => {
    for (const [path, method] of [
      ["/api/participant/me", "PUT"],
      ["/api/admin/participants/participant-a", "GET"],
      ["/api/admin/participants/participant-a", "PUT"],
    ]) {
      const response = await productionWorker.fetch(
        new Request(`http://localhost${path}`, {
          method,
          headers:
            method === "PUT" ? { "content-type": "application/json" } : {},
          body:
            method === "PUT"
              ? JSON.stringify({ name: "A", email: "a@example.com" })
              : undefined,
        }),
        env,
      );

      await expectOutcome(response, 401, "unauthenticated");
    }
  });
});

describe("Participant profile technical failures", () => {
  it("sanitizes unexpected self and Admin persistence failures", async () => {
    const participant = {
      id: "participant-a",
      name: "Original",
      email: "original@example.com",
      state: "active",
    };
    const selfHandler = createParticipantHttpHandler({
      authenticate: async () => ({
        outcome: "authenticated",
        externalPrincipalId: "principal-a",
      }),
      createParticipantId: () => "unused",
      persistence: {
        findParticipantByExternalPrincipalId: async () => participant,
        registerParticipant: async () => "created",
        updateActiveParticipantProfile: async () => {
          throw new Error("private self failure");
        },
      },
    });
    const adminHandler = createCourseAccessHttpHandler({
      authenticate: async () => ({
        outcome: "authenticated",
        externalPrincipalId: "admin-principal",
      }),
      createCourseAssignmentId: () => "unused",
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
        updateParticipantProfileAsActiveAdmin: async () => {
          throw new Error("private admin failure");
        },
      },
    });

    for (const [handler, path] of [
      [selfHandler, "/api/participant/me"],
      [adminHandler, "/api/admin/participants/participant-a"],
    ]) {
      const response = await handler(
        new Request(`http://localhost${path}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Updated", email: "updated@example.com" }),
        }),
      );

      await expectOutcome(response, 500, "technical-error");
    }
  });
});

/** @returns {Promise<string>} Establish and bootstrap one Active Admin. */
async function activeAdminCookie() {
  const cookie = await establishFixture("first-admin");

  await bootstrapAdmin(cookie, "Profile Admin");
  return cookie;
}

/** @returns {Promise<string>} Establish one fixed normal session. */
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
async function bootstrapAdmin(cookie, name) {
  const response = await post("/api/admin/bootstrap", cookie, { name });

  expect(response.status).toBe(201);
}

/** @returns {Promise<void>} Insert one registered Participant. */
async function insertParticipant(suffix, principal, name, email, state) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `participant-${suffix}`,
      principal,
      name,
      email,
      email.toLowerCase(),
      state,
    )
    .run();
}

/** @returns {Promise<object | null>} Complete raw Participant state. */
function rawParticipant(suffix) {
  return env.DB.prepare(
    `select id, external_principal_id, name, email, normalized_email, state
       from participants where id = ?`,
  )
    .bind(`participant-${suffix}`)
    .first();
}

/** @returns {Promise<Response>} Optional-cookie GET. */
function get(path, cookie) {
  return request(path, "GET", cookie);
}

/** @returns {Promise<Response>} JSON POST. */
function post(path, cookie, body) {
  return request(path, "POST", cookie, body);
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

/** @returns {Promise<void>} Assert one exact HTTP outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
