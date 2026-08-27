import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("public Admin entry", () => {
  it("returns only permanent-history registration or login mode", async () => {
    const initialResponse = await nonProductionWorker.fetch(
      new Request("http://localhost/api/admin/entry"),
      env,
    );

    expect(initialResponse.status).toBe(200);
    await expect(initialResponse.json()).resolves.toEqual({
      mode: "register-admin",
    });

    const cookie = await establishFixture("first-admin");
    await bootstrap(cookie, { name: "Jane Doe" });
    await env.DB.prepare("delete from admin_users").run();
    const consumedResponse = await nonProductionWorker.fetch(
      new Request("http://localhost/api/admin/entry"),
      env,
    );

    await expect(consumedResponse.json()).resolves.toEqual({ mode: "login" });
  });
});

describe("Admin bootstrap HTTP contract", () => {
  it("refuses unauthenticated and invalid requests with exact outcomes", async () => {
    const unauthenticatedResponse = await bootstrap(null, {
      name: "Jane Doe",
    });
    const cookie = await establishFixture("first-admin");
    const invalidResponse = await bootstrap(cookie, { name: "  " });

    expect(unauthenticatedResponse.status).toBe(401);
    await expect(unauthenticatedResponse.json()).resolves.toEqual({
      outcome: "unauthenticated",
    });
    expect(invalidResponse.status).toBe(422);
    await expect(invalidResponse.json()).resolves.toEqual({
      outcome: "invalid-name",
    });
  });

  it("creates from authenticated context and ignores trust-sensitive fields", async () => {
    const cookie = await establishFixture("first-admin");
    const response = await bootstrap(cookie, {
      name: "Jane Doe",
      externalPrincipalId: "browser-principal",
      id: "browser-admin",
      state: "disabled",
      authority: "admin",
      role: "owner",
      permissions: ["everything"],
    });
    const storedAdmin = await env.DB.prepare(
      `select id, external_principal_id, name, state, authority
         from admin_users`,
    ).first();

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: storedAdmin.id,
      name: "Jane Doe",
      state: "active",
      authority: "super-admin",
    });
    expect(storedAdmin.id).not.toBe("browser-admin");
    expect(storedAdmin.external_principal_id).toBe("fixture-first-admin");
    expect(storedAdmin.state).toBe("active");
    expect(storedAdmin.authority).toBe("super-admin");
  });

  it("refuses later fixed principals after the permanent claim", async () => {
    const firstCookie = await establishFixture("first-admin");
    const laterCookie = await establishFixture("later-admin");

    await bootstrap(firstCookie, { name: "First Admin" });
    const laterResponse = await bootstrap(laterCookie, {
      name: "Later Admin",
    });

    expect(laterResponse.status).toBe(409);
    await expect(laterResponse.json()).resolves.toEqual({
      outcome: "bootstrap-unavailable",
    });
  });
});

describe("fresh current Admin context", () => {
  it("distinguishes unauthenticated, missing, active, and disabled state", async () => {
    const unauthenticated = await nonProductionWorker.fetch(
      new Request("http://localhost/api/admin/me"),
      env,
    );
    const missingCookie = await establishFixture("later-admin");
    const missing = await currentAdmin(missingCookie);
    const adminCookie = await establishFixture("first-admin");
    await bootstrap(adminCookie, { name: "Jane Doe" });
    const active = await currentAdmin(adminCookie);

    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toEqual({
      outcome: "unauthenticated",
    });
    expect(missing.status).toBe(403);
    await expect(missing.json()).resolves.toEqual({
      outcome: "no-admin-user",
    });
    expect(active.status).toBe(200);
    await expect(active.json()).resolves.toMatchObject({
      name: "Jane Doe",
      state: "active",
      authority: "super-admin",
    });

    await env.DB.prepare(
      "update admin_users set authority = 'admin' where external_principal_id = ?",
    )
      .bind("fixture-first-admin")
      .run();
    await expect((await currentAdmin(adminCookie)).json()).resolves.toMatchObject(
      { authority: "admin" },
    );

    await env.DB.prepare(
      "update admin_users set state = 'disabled' where external_principal_id = ?",
    )
      .bind("fixture-first-admin")
      .run();
    const disabled = await currentAdmin(adminCookie);

    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({
      outcome: "disabled-admin",
    });
  });
});

describe("production composition", () => {
  it("cannot establish a fixture session through any request-controlled signal", async () => {
    const entryResponse = await productionWorker.fetch(
      new Request("http://localhost/api/admin/entry"),
      env,
    );
    const request = new Request(
      "http://localhost/api/_fixtures/session/first-admin?principalId=attacker",
      {
        method: "POST",
        headers: {
          cookie: "fixture=first-admin",
          "x-fixture-name": "first-admin",
        },
      },
    );
    const response = await productionWorker.fetch(request, env);
    const sessionCount = await env.DB.prepare(
      'select count(*) as count from "session"',
    ).first();

    expect(entryResponse.status).toBe(200);
    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(sessionCount.count).toBe(0);
  });
});

/**
 * Establish one fixed non-production Better Auth session.
 *
 * @param {"first-admin" | "later-admin"} fixtureName A fixed fixture name.
 * @returns {Promise<string>} The normal signed session cookie header.
 */
async function establishFixture(fixtureName) {
  const response = await nonProductionWorker.fetch(
    new Request(`http://localhost/api/_fixtures/session/${fixtureName}`, {
      method: "POST",
    }),
    env,
  );

  expect(response.status).toBe(204);
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");

  return response.headers.get("set-cookie").split(";", 1)[0];
}

/**
 * Submit a bootstrap request through the non-production Worker composition.
 *
 * @param {string | null} cookie The optional normal session cookie.
 * @param {object} body The browser-controlled JSON body.
 * @returns {Promise<Response>} The Worker response.
 */
async function bootstrap(cookie, body) {
  const headers = { "content-type": "application/json" };

  if (cookie !== null) {
    headers.cookie = cookie;
  }

  return nonProductionWorker.fetch(
    new Request("http://localhost/api/admin/bootstrap", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    env,
  );
}

/**
 * Read current Admin context with one normal session cookie.
 *
 * @param {string} cookie The normal session cookie.
 * @returns {Promise<Response>} The Worker response.
 */
function currentAdmin(cookie) {
  return nonProductionWorker.fetch(
    new Request("http://localhost/api/admin/me", {
      headers: { cookie },
    }),
    env,
  );
}
