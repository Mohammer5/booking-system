import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdminUserHttpHandler } from "./createAdminUserHttpHandler.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Admin User HTTP authorization", () => {
  it("refuses unauthenticated, missing, and Disabled actors", async () => {
    const unauthenticated = await request("GET", "/api/admin/users");
    const missingCookie = await establishFixture("later-admin");
    const missing = await request("GET", "/api/admin/users", missingCookie);
    await insertAdmin(
      "disabled",
      "fixture-admin-invite-a",
      "Disabled Actor",
      "disabled",
      "admin",
    );
    const disabledCookie = await establishFixture("admin-invite-a");
    const disabled = await request("GET", "/api/admin/users", disabledCookie);

    await expectOutcome(unauthenticated, 401, "unauthenticated");
    await expectOutcome(missing, 403, "no-admin-user");
    await expectOutcome(disabled, 403, "disabled-admin");
  });

  it("is structurally composed in production without fixture access", async () => {
    const response = await productionWorker.fetch(
      new Request("http://localhost/api/admin/users"),
      env,
    );

    await expectOutcome(response, 401, "unauthenticated");
  });
});

describe("Admin User list and detail HTTP", () => {
  it("returns ordered narrow current rows with actor-specific edit affordances", async () => {
    await insertDirectory();
    const cookie = await establishFixture("admin-invite-a");
    const response = await request("GET", "/api/admin/users", cookie);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      adminUsers: [
        adminResponse("actor", "Ordinary Actor", "active", "admin", true),
        adminResponse("peer", "Ordinary Peer", "disabled", "admin", true),
        adminResponse("super", "Super Target", "active", "super-admin", false),
      ],
      pagination: { page: 1, pageSize: 25, totalItems: 3, totalPages: 1 },
    });
    expect(JSON.stringify(body)).not.toContain("fixture-");
    expect(JSON.stringify(body)).not.toContain("email");
  });

  it("validates collection parameters before reading Admin User data", async () => {
    await insertDirectory();
    const cookie = await establishFixture("admin-invite-a");
    const response = await request(
      "GET",
      "/api/admin/users?authority=owner",
      cookie,
    );

    await expectOutcome(response, 400, "invalid-list-query");
  });

  it("returns one narrow detail or a private missing outcome on exact routes", async () => {
    await insertDirectory();
    const cookie = await establishFixture("first-admin");
    const detail = await request("GET", "/api/admin/users/admin-super", cookie);
    const missing = await request("GET", "/api/admin/users/missing", cookie);
    const nested = await request(
      "GET",
      "/api/admin/users/admin-super/nested",
      cookie,
    );
    const unsupported = await request("POST", "/api/admin/users", cookie);

    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(
      adminResponse(
        "super",
        "Super Target",
        "active",
        "super-admin",
        true,
        selfLifecycle,
      ),
    );
    await expectOutcome(missing, 404, "admin-user-not-found");
    await expectOutcome(nested, 404, "not-found");
    await expectOutcome(unsupported, 404, "not-found");
  });
});

describe("Admin User name edit HTTP", () => {
  it("allows ordinary self and ordinary-target edits but refuses a Super target", async () => {
    await insertDirectory();
    const cookie = await establishFixture("admin-invite-a");
    const self = await request("PUT", "/api/admin/users/admin-actor", cookie, {
      name: "Ordinary Self Updated",
      authority: "super-admin",
      state: "disabled",
      externalPrincipalId: "attacker",
    });
    const peer = await request("PUT", "/api/admin/users/admin-peer", cookie, {
      name: "Disabled Peer Updated",
    });
    const superTarget = await request(
      "PUT",
      "/api/admin/users/admin-super",
      cookie,
      { name: "Forbidden" },
    );

    expect(self.status).toBe(200);
    await expect(self.json()).resolves.toEqual(
      adminResponse("actor", "Ordinary Self Updated", "active", "admin", true),
    );
    expect(peer.status).toBe(200);
    await expect(peer.json()).resolves.toEqual(
      adminResponse("peer", "Disabled Peer Updated", "disabled", "admin", true),
    );
    await expectOutcome(superTarget, 409, "admin-user-not-editable");
    await expect(storedAdmin("admin-super")).resolves.toMatchObject({
      name: "Super Target",
      state: "active",
      authority: "super-admin",
      external_principal_id: "fixture-first-admin",
    });
  });

  it("allows a Super Admin to edit ordinary and Super targets", async () => {
    await insertDirectory();
    const cookie = await establishFixture("first-admin");
    const ordinary = await request(
      "PUT",
      "/api/admin/users/admin-peer",
      cookie,
      { name: "Ordinary By Super" },
    );
    const superTarget = await request(
      "PUT",
      "/api/admin/users/admin-super",
      cookie,
      { name: "Super Self Updated" },
    );

    expect(ordinary.status).toBe(200);
    expect(superTarget.status).toBe(200);
    await expect(storedAdmin("admin-peer")).resolves.toMatchObject({
      name: "Ordinary By Super",
      state: "disabled",
      authority: "admin",
    });
    await expect(storedAdmin("admin-super")).resolves.toMatchObject({
      name: "Super Self Updated",
      authority: "super-admin",
    });
  });

  it("returns invalid, missing, stale-authority, and technical outcomes safely", async () => {
    await insertDirectory();
    const cookie = await establishFixture("admin-invite-a");
    const invalid = await request("PUT", "/api/admin/users/admin-peer", cookie, {
      name: "  ",
    });
    const missing = await request("PUT", "/api/admin/users/missing", cookie, {
      name: "Valid",
    });
    const staleHandler = createDirectHandler({
      updateAuthorizedAdminUserName: async () => "admin-user-not-editable",
    });
    const stale = await staleHandler(jsonRequest("/api/admin/users/admin-peer", {
      name: "Stale",
    }));
    const technicalHandler = createDirectHandler({
      listCurrentAdminUsers: async () => {
        throw new Error("private persistence detail");
      },
    });
    const technical = await technicalHandler(
      new Request("http://localhost/api/admin/users"),
    );

    await expectOutcome(invalid, 422, "invalid-name");
    await expectOutcome(missing, 404, "admin-user-not-found");
    await expectOutcome(stale, 409, "admin-user-not-editable");
    await expectOutcome(technical, 500, "technical-error");
    expect(await technical.text()).not.toContain("private persistence detail");
    await expect(storedAdmin("admin-peer")).resolves.toMatchObject({
      name: "Ordinary Peer",
    });
  });
});

/** @returns {Function} Direct handler with one overridable persistence seam. */
function createDirectHandler(overrides) {
  const actor = {
    id: "admin-actor",
    externalPrincipalId: "fixture-admin-invite-a",
    name: "Ordinary Actor",
    state: "active",
    authority: "admin",
  };
  const target = { ...actor, id: "admin-peer", name: "Ordinary Peer" };

  return createAdminUserHttpHandler({
    authenticate: async () => ({
      outcome: "authenticated",
      externalPrincipalId: actor.externalPrincipalId,
    }),
    adminPersistence: {
      deleteAuthorizedAdminUser: async () => "deleted",
      disableAuthorizedAdminUser: async () => "disabled",
      findAdminUserByExternalPrincipalId: async () => actor,
      findAdminUserById: async () => target,
      listCurrentAdminUsers: async () => [actor, target],
      promoteAuthorizedAdminUser: async () => "promoted",
      reenableAuthorizedAdminUser: async () => "re-enabled",
      updateAuthorizedAdminUserName: async () => "updated",
      ...overrides,
    },
  });
}

/** @returns {Promise<void>} Insert the standard ordinary/Super directory. */
async function insertDirectory() {
  await insertAdmin("super", "fixture-first-admin", "Super Target", "active", "super-admin");
  await insertAdmin("actor", "fixture-admin-invite-a", "Ordinary Actor", "active", "admin");
  await insertAdmin("peer", "fixture-admin-invite-b", "Ordinary Peer", "disabled", "admin");
}

/** @returns {Promise<void>} Insert one exact Admin User. */
async function insertAdmin(suffix, principal, name, state, authority) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, ?)`,
  ).bind(`admin-${suffix}`, principal, name, state, authority).run();
}

/** @returns {object} One exact narrow HTTP representation. */
function adminResponse(
  suffix,
  name,
  state,
  authority,
  isNameEditable,
  lifecycle = ordinaryActorLifecycle(suffix, state, authority),
) {
  return {
    id: `admin-${suffix}`,
    name,
    state,
    authority,
    isNameEditable,
    isPromotionAvailable: false,
    ...lifecycle,
  };
}

const selfLifecycle = {
  isDisableAvailable: false,
  isReenableAvailable: false,
  isDeleteAvailable: false,
  lifecycleRestriction: "self-protected",
};

/** @returns {object} Lifecycle response for the standard ordinary actor. */
function ordinaryActorLifecycle(suffix, state, authority) {
  if (suffix === "actor") return selfLifecycle;
  const isProtected = authority === "super-admin";

  return {
    isDisableAvailable: !isProtected && state === "active",
    isReenableAvailable: !isProtected && state === "disabled",
    isDeleteAvailable: !isProtected,
    lifecycleRestriction: isProtected ? "super-admin-protected" : null,
  };
}

/** @returns {Promise<object>} Read one raw Admin row. */
function storedAdmin(adminUserId) {
  return env.DB.prepare("select * from admin_users where id = ?")
    .bind(adminUserId).first();
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

/** @returns {Promise<Response>} Submit one composed Admin User request. */
function request(method, pathname, cookie, body) {
  const headers = {};

  if (cookie !== undefined) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";

  return nonProductionWorker.fetch(new Request(`http://localhost${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env);
}

/** @returns {Request} One direct JSON PUT request. */
function jsonRequest(pathname, body) {
  return new Request(`http://localhost${pathname}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert one exact HTTP outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.clone().json()).resolves.toEqual({ outcome });
}
