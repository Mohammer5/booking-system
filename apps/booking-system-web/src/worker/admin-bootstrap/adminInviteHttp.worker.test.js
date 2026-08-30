import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_admin_invite_creation_failure"),
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Admin Invite HTTP authorization and routing", () => {
  it("requires a freshly resolved Active Admin in both Worker compositions", async () => {
    const unauthenticated = await request("/api/admin/invites");
    const missingCookie = await establishFixture("later-admin");
    const missing = await request("/api/admin/invites", {
      cookie: missingCookie,
    });
    const production = await productionWorker.fetch(
      new Request("http://localhost/api/admin/invites"),
      env,
    );

    await expectOutcome(unauthenticated, 401, "unauthenticated");
    await expectOutcome(missing, 403, "no-admin-user");
    await expectOutcome(production, 401, "unauthenticated");
  });

  it("rejects unsupported and approximate routes without state change", async () => {
    const cookie = await activeAdminCookie();
    const unsupported = await request("/api/admin/invites", {
      cookie,
      method: "DELETE",
    });
    const approximate = await request(
      "/api/admin/invites/invite-a/revocation/extra",
      { cookie, method: "POST" },
    );

    await expectOutcome(unsupported, 404, "not-found");
    await expectOutcome(approximate, 404, "not-found");
    await expect(countInvites()).resolves.toBe(0);
  });
});

describe("Admin Invite HTTP lifecycle and privacy", () => {
  it("creates independent one-time URLs and later lists only non-secret state", async () => {
    const cookie = await activeAdminCookie();
    const first = await createInvite(cookie, {
      id: "browser-id",
      token: "browser-token",
      state: "claimed",
      createdAt: 1,
    });
    const second = await createInvite(cookie);
    const firstBody = await first.json();
    const secondBody = await second.json();
    const firstToken = tokenFrom(firstBody.invite.url);
    const secondToken = tokenFrom(secondBody.invite.url);
    const list = await request("/api/admin/invites", { cookie });
    const listBody = await list.json();

    expect(first.status).toBe(201);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(firstBody).toMatchObject({
      outcome: "created",
      invite: { state: "active" },
    });
    expect(Object.keys(firstBody.invite).sort())
      .toEqual(["createdAt", "id", "state", "url"]);
    expect(firstBody.invite.id).not.toBe("browser-id");
    expect(firstToken).toMatch(/^[0-9a-f]{64}$/);
    expect(secondToken).toMatch(/^[0-9a-f]{64}$/);
    expect(secondToken).not.toBe(firstToken);
    expect(list.status).toBe(200);
    expect(list.headers.get("cache-control")).toBe("no-store");
    expect(listBody.invites).toHaveLength(2);
    expect(listBody.pagination).toEqual({
      page: 1,
      pageSize: 25,
      totalItems: 2,
      totalPages: 1,
    });
    expect(listBody.invites.every((invite) =>
      Object.keys(invite).sort().join(",") === "createdAt,id,state",
    )).toBe(true);
    const serializedList = JSON.stringify(listBody);

    expect(serializedList).not.toContain(firstToken);
    expect(serializedList).not.toContain(secondToken);
    expect(serializedList).not.toContain("url");
    expect(serializedList).not.toContain("digest");
    await expect(secretStorage()).resolves.toSatisfy((rows) =>
      rows.length === 2 && rows.every((row) =>
        row.token_digest.length === 64 && !("token" in row)
      ),
    );
  });

  it("rejects search and malformed pagination on the non-searchable list", async () => {
    const cookie = await activeAdminCookie();

    for (const query of ["q=secret", "page=0", "sort=createdAt.sideways"]) {
      await expectOutcome(
        await request(`/api/admin/invites?${query}`, { cookie }),
        400,
        "invalid-list-query",
      );
    }
  });

  it("lets another Active Admin Revoke once and never returns the URL", async () => {
    const creatorCookie = await activeAdminCookie();
    const created = await createInvite(creatorCookie);
    const createdBody = await created.json();
    const token = tokenFrom(createdBody.invite.url);
    const otherCookie = await establishFixture("later-admin");

    await insertAdmin("admin-other", "fixture-later-admin");
    const revoked = await revoke(otherCookie, createdBody.invite.id);
    const revokedBody = await revoked.json();
    const repeated = await revoke(creatorCookie, createdBody.invite.id);

    expect(revoked.status).toBe(200);
    expect(revokedBody).toEqual({
      outcome: "revoked",
      invite: {
        id: createdBody.invite.id,
        createdAt: createdBody.invite.createdAt,
        state: "revoked",
      },
    });
    expect(JSON.stringify(revokedBody)).not.toContain(token);
    await expectOutcome(repeated, 409, "admin-invite-not-active");
  });

  it("refuses Claimed, missing, and stale-actor Revoke without mutation", async () => {
    const cookie = await activeAdminCookie();
    const created = await createInvite(cookie);
    const inviteId = (await created.json()).invite.id;

    await env.DB.prepare(
      "update admin_invites set state = 'claimed' where id = ?",
    ).bind(inviteId).run();
    await expectOutcome(
      await revoke(cookie, inviteId),
      409,
      "admin-invite-not-active",
    );
    await expectOutcome(
      await revoke(cookie, "missing"),
      409,
      "admin-invite-not-found",
    );
    await env.DB.prepare(
      "update admin_users set state = 'disabled' where external_principal_id = ?",
    ).bind("fixture-first-admin").run();
    await expectOutcome(
      await request("/api/admin/invites", { cookie }),
      403,
      "disabled-admin",
    );
    await expect(readState(inviteId)).resolves.toBe("claimed");
  });

  it("gives concurrent Revoke and Claim one terminal HTTP outcome", async () => {
    const cookie = await activeAdminCookie();
    const created = await createInvite(cookie);
    const inviteId = (await created.json()).invite.id;
    const [revokeResponse, claimResult] = await Promise.all([
      revoke(cookie, inviteId),
      env.DB.prepare(
        `update admin_invites set state = 'claimed'
          where id = ? and state = 'active'`,
      ).bind(inviteId).run(),
    ]);
    const state = await readState(inviteId);

    expect(["claimed", "revoked"]).toContain(state);
    expect(Number(revokeResponse.status === 200) + claimResult.meta.changes)
      .toBe(1);
    expect([200, 409]).toContain(revokeResponse.status);
  });

  it("sanitizes failures without returning generated authority or partial rows", async () => {
    const cookie = await activeAdminCookie();

    await env.DB.prepare(
      `create trigger test_admin_invite_creation_failure
       before insert on admin_invites
       begin select raise(abort, 'private Admin Invite persistence detail'); end`,
    ).run();
    const response = await createInvite(cookie);
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe('{"outcome":"technical-error"}');
    expect(text).not.toContain("private Admin Invite persistence detail");
    expect(text).not.toMatch(/[0-9a-f]{64}/);
    await expect(countInvites()).resolves.toBe(0);
  });
});

/** @returns {Promise<string>} Establish the first fixture as Active Admin. */
async function activeAdminCookie() {
  const cookie = await establishFixture("first-admin");
  const bootstrap = await request("/api/admin/bootstrap", {
    cookie,
    method: "POST",
    body: { name: "First Admin" },
  });

  expect(bootstrap.status).toBe(201);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixed normal session. */
async function establishFixture(name) {
  const response = await request(`/api/_fixtures/session/${name}`, {
    method: "POST",
  });

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<void>} Insert another Active Admin identity. */
async function insertAdmin(id, externalPrincipalId) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, 'Other Admin', 'active', 'admin')`,
  ).bind(id, externalPrincipalId).run();
}

/** @returns {Promise<Response>} Create one Admin Invite. */
function createInvite(cookie, body) {
  return request("/api/admin/invites", { cookie, method: "POST", body });
}

/** @returns {Promise<Response>} Revoke one Admin Invite. */
function revoke(cookie, inviteId) {
  return request(`/api/admin/invites/${inviteId}/revocation`, {
    cookie,
    method: "POST",
  });
}

/** @returns {Promise<Response>} Send one non-production Worker request. */
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

/** @returns {string} Extract raw authority only in the test client. */
function tokenFrom(url) {
  return new URL(url).hash.slice(1);
}

/** @returns {Promise<Array<object>>} Read only authority-bearing storage. */
async function secretStorage() {
  const { results } = await env.DB.prepare(
    "select token_digest from admin_invites order by id",
  ).all();

  return results;
}

/** @returns {Promise<number>} Count Admin Invites. */
async function countInvites() {
  const row = await env.DB.prepare(
    "select count(*) as count from admin_invites",
  ).first();

  return row.count;
}

/** @returns {Promise<string | undefined>} Read one Invite state. */
async function readState(inviteId) {
  const row = await env.DB.prepare(
    "select state from admin_invites where id = ?",
  ).bind(inviteId).first();

  return row?.state;
}

/** @returns {Promise<void>} Assert exact status and outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
