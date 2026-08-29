import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import { hashAdminInviteToken } from "./adminInviteSecrets.js";

const rawToken = "c".repeat(64);

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_admin_invite_claim_failure"),
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
  await insertInvite("invite-a", rawToken);
});

describe("Admin Invite authenticated claim HTTP", () => {
  it("authenticates separately and creates one ordinary Active Admin", async () => {
    const continuation = await recognizeCookie(rawToken);
    const unauthenticated = await claim(continuation, { name: "Neue Admina" });

    await expectOutcome(unauthenticated, 401, "unauthenticated");
    await expect(readInviteState()).resolves.toBe("active");

    const session = await establishFixture("participant-a");
    const response = await claim(joinCookies(session, continuation), {
      name: "  Neue Admina  ",
      authority: "super-admin",
      state: "disabled",
      participant: { id: "invented" },
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(body).toEqual({
      outcome: "created",
      adminUser: {
        id: expect.any(String),
        name: "  Neue Admina  ",
        state: "active",
        authority: "admin",
      },
    });
    await expect(readInviteState()).resolves.toBe("claimed");
    await expect(readAdmin("fixture-participant-a")).resolves.toEqual({
      id: body.adminUser.id,
      name: "  Neue Admina  ",
      state: "active",
      authority: "admin",
    });
    await expect(countRows("participants")).resolves.toBe(0);

    const repeated = await claim(joinCookies(session, continuation), {
      name: "Noch einmal",
    });

    await expectOutcome(repeated, 409, "invite-unavailable");
    await expect(countRows("admin_users")).resolves.toBe(1);
  });

  it("keeps the Invite Active across invalid-name attempts and refresh", async () => {
    const continuation = await recognizeCookie(rawToken);
    const session = await establishFixture("participant-a");
    const cookie = joinCookies(session, continuation);

    await expectOutcome(
      await claim(cookie, { name: " " }),
      422,
      "invalid-name",
    );
    await expect(readInviteState()).resolves.toBe("active");
    await expectOutcome(
      await request("/api/admin-invite/continuation", { cookie }),
      200,
      "available",
    );
    expect((await claim(cookie, { name: "Gültiger Name" })).status).toBe(201);
  });

  it.each(["active", "disabled"])(
    "refuses a current %s Admin without changing or consuming the Invite",
    async (state) => {
      await insertAdmin(
        "admin-existing",
        "fixture-participant-a",
        state,
        "super-admin",
      );
      const continuation = await recognizeCookie(rawToken);
      const session = await establishFixture("participant-a");
      const response = await claim(joinCookies(session, continuation), {
        name: "Nicht verwendet",
      });

      await expectOutcome(response, 409, "admin-user-already-exists");
      await expect(readInviteState()).resolves.toBe("active");
      await expect(readAdmin("fixture-participant-a")).resolves.toMatchObject({
        id: "admin-existing",
        state,
        authority: "super-admin",
      });
    },
  );

  it("creates a new ordinary identity for a legitimately deleted principal", async () => {
    await insertAdmin(
      "admin-deleted",
      "fixture-participant-a",
      "disabled",
      "super-admin",
    );
    await env.DB.prepare(
      "delete from admin_users where id = 'admin-deleted'",
    ).run();
    const continuation = await recognizeCookie(rawToken);
    const session = await establishFixture("participant-a");
    const response = await claim(joinCookies(session, continuation), {
      name: "Neue Rückkehrerin",
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.adminUser).toMatchObject({
      name: "Neue Rückkehrerin",
      state: "active",
      authority: "admin",
    });
    expect(body.adminUser.id).not.toBe("admin-deleted");
  });

  it("sanitizes insertion failure and rolls the Invite transition back", async () => {
    const continuation = await recognizeCookie(rawToken);
    const session = await establishFixture("participant-a");

    await env.DB.prepare(
      `create trigger test_admin_invite_claim_failure
       before insert on admin_users
       begin select raise(abort, 'private Admin claim detail'); end`,
    ).run();
    const response = await claim(joinCookies(session, continuation), {
      name: "Neue Admina",
    });
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe('{"outcome":"technical-error"}');
    expect(text).not.toContain("private Admin claim detail");
    expect(text).not.toContain(rawToken);
    await expect(readInviteState()).resolves.toBe("active");
    await expect(countRows("admin_users")).resolves.toBe(0);
  });
});

/** @returns {Promise<string>} Establish one normal fixed authentication session. */
async function establishFixture(name) {
  const response = await request(`/api/_fixtures/session/${name}`, {
    method: "POST",
  });

  expect(response.status).toBe(204);
  return cookiePair(response);
}

/** @returns {Promise<string>} Recognize and return signed continuation pair. */
async function recognizeCookie(token) {
  const response = await request("/api/admin-invite/recognition", {
    method: "POST",
    body: { token },
  });

  expect(response.status).toBe(200);
  return cookiePair(response);
}

/** @returns {Promise<Response>} Submit one final claim. */
function claim(cookie, body) {
  return request("/api/admin-invite/claim", { method: "POST", cookie, body });
}

/** @returns {Promise<Response>} Send one non-production request. */
function request(path, options = {}) {
  const headers = options.cookie === undefined ? {} : { cookie: options.cookie };
  const hasBody = options.body !== undefined;

  if (hasBody) headers["content-type"] = "application/json";
  return nonProductionWorker.fetch(new Request(`http://localhost${path}`, {
    method: options.method ?? "GET",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  }), env);
}

/** @returns {Promise<object>} Insert one Active Invite. */
async function insertInvite(id, token) {
  return env.DB.prepare(
    `insert into admin_invites
       (id, token_digest, created_by_admin_user_id, created_at, state)
     values (?, ?, null, 1, 'active')`,
  ).bind(id, await hashAdminInviteToken(token)).run();
}

/** @returns {Promise<object>} Insert one current Admin. */
function insertAdmin(id, principal, state, authority) {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, ?)`,
  ).bind(id, principal, id, state, authority).run();
}

/** @returns {Promise<string>} Read the one test Invite state. */
async function readInviteState() {
  const row = await env.DB.prepare(
    "select state from admin_invites where id = 'invite-a'",
  ).first();

  return row.state;
}

/** @returns {Promise<object | null>} Read one Admin by external principal. */
function readAdmin(principal) {
  return env.DB.prepare(
    `select id, name, state, authority from admin_users
      where external_principal_id = ?`,
  ).bind(principal).first();
}

/** @returns {Promise<number>} Count one bounded table. */
async function countRows(tableName) {
  const query = tableName === "participants"
    ? "select count(*) as count from participants"
    : "select count(*) as count from admin_users";
  const row = await env.DB.prepare(query).first();

  return row.count;
}

/** @returns {string} Combine two cookie pairs. */
function joinCookies(...cookies) {
  return cookies.join("; ");
}

/** @returns {string} Extract one response cookie pair. */
function cookiePair(response) {
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<void>} Assert exact status and outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
