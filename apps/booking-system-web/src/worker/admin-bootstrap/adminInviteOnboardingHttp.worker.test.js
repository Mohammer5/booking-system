import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { hashAdminInviteToken } from "./adminInviteSecrets.js";
import { createAdminInviteContinuation } from "./createAdminInviteContinuation.js";
import { createAdminInviteOnboardingHttpHandler } from "./createAdminInviteOnboardingHttpHandler.js";

const rawToken = "a".repeat(64);

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
});

describe("Admin Invite public recognition and continuation", () => {
  it("recognizes one Active token narrowly in both Worker compositions", async () => {
    await insertInvite("invite-a", rawToken, "active");
    const nonProduction = await recognize(nonProductionWorker, rawToken);
    const production = await recognize(productionWorker, rawToken);

    await expectAvailableRecognition(nonProduction);
    await expectAvailableRecognition(production);
  });

  it("moves raw authority into one signed cookie and rechecks on refresh", async () => {
    await insertInvite("invite-a", rawToken, "active");
    const recognition = await recognize(nonProductionWorker, rawToken);
    const recognitionText = await recognition.clone().text();
    const continuationCookie = cookiePair(recognition);
    const continuation = await request("/api/admin-invite/continuation", {
      cookie: continuationCookie,
    });
    const continuationText = await continuation.clone().text();

    expect(recognitionText).toBe('{"outcome":"available"}');
    expect(recognitionText).not.toContain(rawToken);
    expect(continuationCookie).toContain("booking_admin_invite_continuation=v1.");
    expect(continuationCookie).not.toContain(rawToken);
    await expectOutcome(continuation, 200, "available");
    expect(continuationText).not.toContain(rawToken);

    await env.DB.prepare(
      "update admin_invites set state = 'revoked' where id = 'invite-a'",
    ).run();
    const stale = await request("/api/admin-invite/continuation", {
      cookie: continuationCookie,
    });

    await expectOutcome(stale, 404, "invite-unavailable");
    expect(stale.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it.each([
    ["malformed", null],
    ["unknown", "b".repeat(64)],
    ["claimed", rawToken],
    ["revoked", rawToken],
  ])("collapses %s authority to one unavailable result", async (kind, token) => {
    if (new Set(["claimed", "revoked"]).has(kind)) {
      await insertInvite(`invite-${kind}`, rawToken, kind);
    }

    const response = await recognize(nonProductionWorker, token ?? "bad");
    const text = await response.clone().text();

    await expectOutcome(response, 404, "invite-unavailable");
    expect(text).not.toContain(kind);
    expect(text).not.toContain(rawToken);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("rejects approximate routes and methods without changing the Invite", async () => {
    await insertInvite("invite-a", rawToken, "active");
    const method = await request("/api/admin-invite/continuation", {
      method: "POST",
    });
    const path = await request("/api/admin-invite/recognition/extra", {
      method: "POST",
      body: { token: rawToken },
    });

    await expectOutcome(method, 404, "not-found");
    await expectOutcome(path, 404, "not-found");
    await expect(readInviteState("invite-a")).resolves.toBe("active");
  });

  it("keeps prospective-Admin fixture sessions absent from production", async () => {
    const response = await productionWorker.fetch(
      new Request(
        "http://localhost/api/_fixtures/session/admin-invite-a?principal=attacker",
        {
          method: "POST",
          headers: { "x-fixture-name": "admin-invite-a" },
        },
      ),
      env,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sanitizes technical failures without returning raw or stored authority", async () => {
    const handler = createAdminInviteOnboardingHttpHandler({
      authenticate: async () => ({ outcome: "unauthenticated" }),
      hashAdminInviteToken: async () => "private-digest",
      inviteContinuation: createAdminInviteContinuation("test-secret"),
      invitePersistence: {
        findRecognizedAdminInviteByDigest: async () => {
          throw new Error("private recognition detail");
        },
      },
    });
    const response = await handler(new Request(
      "http://localhost/api/admin-invite/recognition",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: rawToken }),
      },
    ));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe('{"outcome":"technical-error"}');
    expect(text).not.toContain(rawToken);
    expect(text).not.toContain("private-digest");
    expect(text).not.toContain("private recognition detail");
  });
});

/** @returns {Promise<Response>} Send raw recognition through one Worker. */
function recognize(worker, token) {
  return worker.fetch(new Request(
    "http://localhost/api/admin-invite/recognition",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    },
  ), env);
}

/** @returns {Promise<Response>} Send one non-production application request. */
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

/** @returns {Promise<object>} Insert one raw Admin Invite with token digest. */
async function insertInvite(id, token, state) {
  return env.DB.prepare(
    `insert into admin_invites
       (id, token_digest, created_by_admin_user_id, created_at, state)
     values (?, ?, null, 1, ?)`,
  ).bind(id, await hashAdminInviteToken(token), state).run();
}

/** @returns {Promise<string | undefined>} Read current Invite state. */
async function readInviteState(inviteId) {
  const row = await env.DB.prepare(
    "select state from admin_invites where id = ?",
  ).bind(inviteId).first();

  return row?.state;
}

/** @returns {string} Extract one cookie pair without attributes. */
function cookiePair(response) {
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<void>} Assert one available non-secret response. */
async function expectAvailableRecognition(response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  await expect(response.json()).resolves.toEqual({ outcome: "available" });
}

/** @returns {Promise<void>} Assert exact status and outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  await expect(response.json()).resolves.toEqual({ outcome });
}
