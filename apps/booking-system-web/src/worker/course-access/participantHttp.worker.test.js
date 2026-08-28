import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Participant onboarding HTTP contract", () => {
  it("keeps authentication and incomplete input free of domain records", async () => {
    const unauthenticated = await onboard(null, {
      name: "Alice",
      email: "alice@example.com",
    });
    const cookie = await establishFixture("participant-a");
    const invalidName = await onboard(cookie, {
      name: " ",
      email: "alice@example.com",
    });
    const invalidEmail = await onboard(cookie, {
      name: "Alice",
      email: "alice",
    });

    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toEqual({
      outcome: "unauthenticated",
    });
    expect(invalidName.status).toBe(422);
    await expect(invalidName.json()).resolves.toEqual({
      outcome: "invalid-name",
    });
    expect(invalidEmail.status).toBe(422);
    await expect(invalidEmail.json()).resolves.toEqual({
      outcome: "invalid-email",
    });
    await expect(countRows("participants")).resolves.toBe(0);
  });

  it("creates only one narrow Active Participant from session identity and explicit profile", async () => {
    const cookie = await establishFixture("participant-a");
    const response = await onboard(cookie, {
      name: "Alice Participant",
      email: " Alice+Course@Example.COM ",
      id: "browser-participant",
      externalPrincipalId: "browser-principal",
      normalizedEmail: "attacker@example.com",
      state: "disabled",
      assignments: ["course-private"],
      role: "participant",
    });
    const stored = await env.DB.prepare(
      `select id, external_principal_id, name, email, normalized_email, state
         from participants`,
    ).first();

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: stored.id,
      name: "Alice Participant",
      email: "Alice+Course@Example.COM",
      state: "active",
    });
    expect(stored.id).not.toBe("browser-participant");
    expect(stored.external_principal_id).toBe("fixture-participant-a");
    expect(stored.normalized_email).toBe("alice+course@example.com");
    expect(stored.state).toBe("active");
    await expect(countRows("participants")).resolves.toBe(1);
    await expect(countRows("course_assignments")).resolves.toBe(0);
    await expect(moduleSelectionTables()).resolves.toEqual([]);
  });

  it("refuses repeated and duplicate-email onboarding without changing existing profiles", async () => {
    const aliceCookie = await establishFixture("participant-a");
    const bobCookie = await establishFixture("participant-b");

    await onboard(aliceCookie, {
      name: "Alice Original",
      email: "Alice@Example.com",
    });
    const repeat = await onboard(aliceCookie, {
      name: "Alice Changed",
      email: "changed@example.com",
    });
    const duplicateEmail = await onboard(bobCookie, {
      name: "Bob",
      email: "alice@example.com",
    });
    const stored = await env.DB.prepare(
      "select name, email from participants",
    ).first();

    expect(repeat.status).toBe(409);
    await expect(repeat.json()).resolves.toEqual({
      outcome: "participant-already-exists",
    });
    expect(duplicateEmail.status).toBe(409);
    await expect(duplicateEmail.json()).resolves.toEqual({
      outcome: "email-already-exists",
    });
    expect(stored).toEqual({ name: "Alice Original", email: "Alice@Example.com" });
    await expect(countRows("participants")).resolves.toBe(1);
  });
});

describe("fresh Participant context", () => {
  it("distinguishes unauthenticated, missing, Active, and Disabled state", async () => {
    const unauthenticated = await currentParticipant(null);
    const cookie = await establishFixture("participant-a");
    const missing = await currentParticipant(cookie);

    await onboard(cookie, { name: "Alice", email: "alice@example.com" });
    const active = await currentParticipant(cookie);
    await env.DB.prepare(
      "update participants set state = 'disabled' where external_principal_id = ?",
    )
      .bind("fixture-participant-a")
      .run();
    const disabled = await currentParticipant(cookie);

    expect(unauthenticated.status).toBe(401);
    expect(missing.status).toBe(403);
    await expect(missing.json()).resolves.toEqual({ outcome: "no-participant" });
    expect(active.status).toBe(200);
    await expect(active.json()).resolves.toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      state: "active",
    });
    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({
      outcome: "disabled-participant",
    });
  });

  it("resolves separate Admin and Participant identities for the same session principal", async () => {
    const cookie = await establishFixture("first-admin");
    const bootstrap = await adminBootstrap(cookie);
    const onboarding = await onboard(cookie, {
      name: "Jane Participant",
      email: "jane.participant@example.com",
    });
    const admin = await requestWithCookie("/api/admin/me", cookie);
    const participant = await currentParticipant(cookie);

    expect(bootstrap.status).toBe(201);
    expect(onboarding.status).toBe(201);
    expect(admin.status).toBe(200);
    expect(participant.status).toBe(200);
    const adminBody = await admin.json();
    const participantBody = await participant.json();

    expect(adminBody.id).not.toBe(participantBody.id);
    expect(adminBody.name).toBe("Jane Admin");
    expect(participantBody.name).toBe("Jane Participant");
    await expect(countRows("admin_users")).resolves.toBe(1);
    await expect(countRows("participants")).resolves.toBe(1);
  });
});

describe("Participant fixture production exclusion", () => {
  it("cannot establish any fixed Participant session in production", async () => {
    const response = await productionWorker.fetch(
      new Request(
        "http://localhost/api/_fixtures/session/participant-a?principalId=attacker",
        {
          method: "POST",
          headers: { "x-fixture-name": "participant-a" },
        },
      ),
      env,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(countRows("participants")).resolves.toBe(0);
    await expect(countRows("session")).resolves.toBe(0);
  });
});

/**
 * Establish one named fixed normal session.
 *
 * @param {string} fixtureName Fixed fixture path name.
 * @returns {Promise<string>} Signed session cookie.
 */
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

/**
 * Submit Participant onboarding.
 *
 * @param {string | null} cookie Optional session cookie.
 * @param {object} body Browser-controlled body.
 * @returns {Promise<Response>} Worker response.
 */
function onboard(cookie, body) {
  return jsonRequest("/api/participant/onboarding", cookie, body);
}

/**
 * Read current Participant context.
 *
 * @param {string | null} cookie Optional session cookie.
 * @returns {Promise<Response>} Worker response.
 */
function currentParticipant(cookie) {
  return requestWithCookie("/api/participant/me", cookie);
}

/**
 * Bootstrap the first Admin for dual-context evidence.
 *
 * @param {string} cookie Signed session cookie.
 * @returns {Promise<Response>} Worker response.
 */
function adminBootstrap(cookie) {
  return jsonRequest("/api/admin/bootstrap", cookie, { name: "Jane Admin" });
}

/**
 * Create an authenticated JSON request.
 *
 * @param {string} path Same-origin operation path.
 * @param {string | null} cookie Optional session cookie.
 * @param {object} body Request body.
 * @returns {Promise<Response>} Worker response.
 */
function jsonRequest(path, cookie, body) {
  const headers = { "content-type": "application/json" };

  if (cookie !== null) {
    headers.cookie = cookie;
  }

  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    env,
  );
}

/**
 * Create one optional-cookie GET request.
 *
 * @param {string} path Same-origin operation path.
 * @param {string | null} cookie Optional session cookie.
 * @returns {Promise<Response>} Worker response.
 */
function requestWithCookie(path, cookie) {
  const headers = cookie === null ? {} : { cookie };

  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, { headers }),
    env,
  );
}

/**
 * Count rows in one fixed test-owned table.
 *
 * @param {"participants" | "admin_users" | "session"} tableName Table name.
 * @returns {Promise<number>} Current row count.
 */
async function countRows(tableName) {
  const row = await env.DB.prepare(
    `select count(*) as count from "${tableName}"`,
  ).first();

  return row.count;
}

/**
 * Inspect whether the later Module Selection table exists.
 *
 * @returns {Promise<Array<object>>} Matching schema rows.
 */
async function moduleSelectionTables() {
  const result = await env.DB.prepare(
    `select name from sqlite_master
      where type = 'table'
        and name = 'module_selections'`,
  ).all();

  return result.results;
}
