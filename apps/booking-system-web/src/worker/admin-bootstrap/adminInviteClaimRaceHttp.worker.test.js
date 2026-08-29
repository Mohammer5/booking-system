import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import { hashAdminInviteToken } from "./adminInviteSecrets.js";

const rawToken = "d".repeat(64);

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
  await env.DB.prepare(
    `insert into admin_invites
       (id, token_digest, created_by_admin_user_id, created_at, state)
     values ('invite-race', ?, null, 1, 'active')`,
  ).bind(await hashAdminInviteToken(rawToken)).run();
});

describe("Admin Invite final acceptance races", () => {
  it("allows only one of two authenticated principals to finish", async () => {
    const continuation = await recognizeCookie();
    const [sessionA, sessionB] = await Promise.all([
      establishFixture("participant-a"),
      establishFixture("participant-b"),
    ]);
    const [responseA, responseB] = await Promise.all([
      claim(joinCookies(sessionA, continuation), "Admina A"),
      claim(joinCookies(sessionB, continuation), "Admin B"),
    ]);
    const responses = [responseA, responseB];
    const statuses = responses.map(({ status }) => status).sort();
    const bodies = await Promise.all(responses.map((response) => response.json()));

    expect(statuses).toEqual([201, 409]);
    expect(bodies.filter(({ outcome }) => outcome === "created")).toHaveLength(1);
    expect(bodies.filter(({ outcome }) => outcome === "invite-unavailable"))
      .toHaveLength(1);
    await expect(readInviteState()).resolves.toBe("claimed");
    await expect(countInvitedAdmins()).resolves.toBe(1);
  });

  it("serializes authenticated claim against Active-Admin Revoke", async () => {
    const continuation = await recognizeCookie();
    const [claimSession, adminSession] = await Promise.all([
      establishFixture("participant-a"),
      establishFixture("first-admin"),
    ]);

    await insertActiveAdmin();
    const [claimResponse, revokeResponse] = await Promise.all([
      claim(joinCookies(claimSession, continuation), "Neue Admina"),
      request("/api/admin/invites/invite-race/revocation", {
        method: "POST",
        cookie: adminSession,
      }),
    ]);
    const state = await readInviteState();
    const claimWon = claimResponse.status === 201;
    const revokeWon = revokeResponse.status === 200;

    expect(["claimed", "revoked"]).toContain(state);
    expect(Number(claimWon) + Number(revokeWon)).toBe(1);
    expect(claimResponse.status).toBe(claimWon ? 201 : 409);
    expect(revokeResponse.status).toBe(revokeWon ? 200 : 409);
    await expect(countInvitedAdmins()).resolves.toBe(claimWon ? 1 : 0);
  });
});

/** @returns {Promise<string>} Recognize the one raw token. */
async function recognizeCookie() {
  const response = await request("/api/admin-invite/recognition", {
    method: "POST",
    body: { token: rawToken },
  });

  expect(response.status).toBe(200);
  return cookiePair(response);
}

/** @returns {Promise<string>} Establish one fixed normal session. */
async function establishFixture(name) {
  const response = await request(`/api/_fixtures/session/${name}`, {
    method: "POST",
  });

  expect(response.status).toBe(204);
  return cookiePair(response);
}

/** @returns {Promise<Response>} Submit one final claim. */
function claim(cookie, name) {
  return request("/api/admin-invite/claim", {
    method: "POST",
    cookie,
    body: { name },
  });
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

/** @returns {Promise<object>} Insert the authorized Revoke actor. */
function insertActiveAdmin() {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-first', 'fixture-first-admin', 'First', 'active',
             'super-admin')`,
  ).run();
}

/** @returns {Promise<string>} Read terminal or current Invite state. */
async function readInviteState() {
  const row = await env.DB.prepare(
    "select state from admin_invites where id = 'invite-race'",
  ).first();

  return row.state;
}

/** @returns {Promise<number>} Count prospective-principal Admin rows. */
async function countInvitedAdmins() {
  const row = await env.DB.prepare(
    `select count(*) as count from admin_users
      where external_principal_id in ('fixture-participant-a',
                                      'fixture-participant-b')`,
  ).first();

  return row.count;
}

/** @returns {string} Join cookie pairs for one request. */
function joinCookies(...cookies) {
  return cookies.join("; ");
}

/** @returns {string} Extract one Set-Cookie pair. */
function cookiePair(response) {
  return response.headers.get("set-cookie").split(";", 1)[0];
}
