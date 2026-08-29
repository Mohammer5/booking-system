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

describe("Admin User promotion HTTP authorization", () => {
  it("promotes an eligible target through a narrow no-store action route", async () => {
    await insertAdmin("actor", "fixture-first-admin", "Actor", "active", "super-admin");
    await insertAdmin("target", "fixture-admin-invite-a", "Target", "active", "admin");
    const cookie = await establishFixture("first-admin");
    const eligible = await request(
      "GET",
      "/api/admin/users/admin-target",
      cookie,
    );
    const response = await request(
      "POST",
      "/api/admin/users/admin-target/promotion",
      cookie,
      { authority: "admin" },
    );
    const body = await response.json();

    expect(eligible.status).toBe(200);
    await expect(eligible.json()).resolves.toMatchObject({
      id: "admin-target",
      authority: "admin",
      isPromotionAvailable: true,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      id: "admin-target",
      name: "Target",
      state: "active",
      authority: "super-admin",
      isNameEditable: true,
      isPromotionAvailable: false,
      isDisableAvailable: true,
      isReenableAvailable: false,
      isDeleteAvailable: true,
      lifecycleRestriction: null,
    });
    expect(JSON.stringify(body)).not.toContain("fixture-");
    await expect(storedAdmin("admin-target")).resolves.toMatchObject({
      name: "Target",
      state: "active",
      authority: "super-admin",
      external_principal_id: "fixture-admin-invite-a",
    });
  });

  it.each([
    ["admin-invite-a", "admin", "active", "target", "admin", "active"],
    ["first-admin", "super-admin", "disabled", "target", "admin", "active"],
    ["first-admin", "super-admin", "active", "target", "admin", "disabled"],
    ["first-admin", "super-admin", "active", "target", "super-admin", "active"],
  ])("refuses %s actor and %s %s target", async (
    fixtureName,
    actorAuthority,
    actorState,
    targetSuffix,
    targetAuthority,
    targetState,
  ) => {
    const actorPrincipal = fixtureName === "first-admin"
      ? "fixture-first-admin"
      : "fixture-admin-invite-a";

    await insertAdmin("actor", actorPrincipal, "Actor", actorState, actorAuthority);
    await insertAdmin(
      targetSuffix,
      "fixture-admin-invite-b",
      "Target",
      targetState,
      targetAuthority,
    );
    const cookie = await establishFixture(fixtureName);
    const response = await request(
      "POST",
      `/api/admin/users/admin-${targetSuffix}/promotion`,
      cookie,
    );

    if (actorState === "disabled") {
      await expectOutcome(response, 403, "disabled-admin");
    } else {
      await expectOutcome(response, 409, "admin-user-not-promotable");
    }
    await expect(storedAdmin(`admin-${targetSuffix}`)).resolves.toMatchObject({
      authority: targetAuthority,
      state: targetState,
    });
  });

  it("refuses self, missing, unsupported, and unauthenticated routes", async () => {
    await insertAdmin("actor", "fixture-first-admin", "Actor", "active", "super-admin");
    const cookie = await establishFixture("first-admin");

    await expectOutcome(await request(
      "POST",
      "/api/admin/users/admin-actor/promotion",
      cookie,
    ), 409, "admin-user-not-promotable");
    await expectOutcome(await request(
      "POST",
      "/api/admin/users/missing/promotion",
      cookie,
    ), 404, "admin-user-not-found");
    await expectOutcome(await request(
      "PUT",
      "/api/admin/users/admin-actor/promotion",
      cookie,
    ), 404, "not-found");
    await expectOutcome(await request(
      "POST",
      "/api/admin/users/admin-actor/promotion/nested",
      cookie,
    ), 404, "not-found");
    await expectOutcome(await request(
      "POST",
      "/api/admin/users/admin-actor/promotion",
    ), 401, "unauthenticated");
  });

  it("is structurally composed in production without fixture access", async () => {
    const response = await productionWorker.fetch(new Request(
      "http://localhost/api/admin/users/admin-target/promotion",
      { method: "POST" },
    ), env);

    await expectOutcome(response, 401, "unauthenticated");
  });
});

describe("fresh promoted authority", () => {
  it("gives an established ordinary session Super mutation authority immediately", async () => {
    await insertAdmin("actor", "fixture-first-admin", "Actor", "active", "super-admin");
    await insertAdmin("target", "fixture-admin-invite-a", "Target", "active", "admin");
    await insertAdmin("peer", "fixture-admin-invite-b", "Peer Super", "active", "super-admin");
    const targetCookie = await establishFixture("admin-invite-a");
    const actorCookie = await establishFixture("first-admin");
    const before = await request(
      "PUT",
      "/api/admin/users/admin-peer",
      targetCookie,
      { name: "Before" },
    );

    await expectOutcome(before, 409, "admin-user-not-editable");
    expect((await request(
      "POST",
      "/api/admin/users/admin-target/promotion",
      actorCookie,
    )).status).toBe(200);
    const current = await request("GET", "/api/admin/me", targetCookie);
    const after = await request(
      "PUT",
      "/api/admin/users/admin-peer",
      targetCookie,
      { name: "After Promotion" },
    );

    expect(current.status).toBe(200);
    await expect(current.json()).resolves.toMatchObject({
      id: "admin-target",
      authority: "super-admin",
    });
    expect(after.status).toBe(200);
    await expect(storedAdmin("admin-peer")).resolves.toMatchObject({
      name: "After Promotion",
      authority: "super-admin",
    });
  });

  it("returns coherent stale and sanitized technical outcomes", async () => {
    const stale = createDirectHandler({
      promoteAuthorizedAdminUser: async () => "admin-user-not-promotable",
    });
    const staleResponse = await stale(promotionRequest());
    const technical = createDirectHandler({
      promoteAuthorizedAdminUser: async () => {
        throw new Error("private authority detail");
      },
    });
    const technicalResponse = await technical(promotionRequest());

    await expectOutcome(staleResponse, 409, "admin-user-not-promotable");
    await expectOutcome(technicalResponse, 500, "technical-error");
    expect(await technicalResponse.text()).not.toContain("private authority detail");
  });
});

/** @returns {Function} Direct eligible promotion handler. */
function createDirectHandler(overrides) {
  const actor = admin("actor", "principal-actor", "Actor", "active", "super-admin");
  const target = admin("target", "principal-target", "Target", "active", "admin");

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

/** @returns {Request} One direct promotion request. */
function promotionRequest() {
  return new Request(
    "http://localhost/api/admin/users/admin-target/promotion",
    { method: "POST" },
  );
}

/** @returns {Promise<void>} Insert one exact current Admin User. */
async function insertAdmin(suffix, principal, name, state, authority) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, ?)`,
  ).bind(`admin-${suffix}`, principal, name, state, authority).run();
}

/** @returns {object} One Admin User domain row. */
function admin(suffix, principal, name, state, authority) {
  return {
    id: `admin-${suffix}`,
    externalPrincipalId: principal,
    name,
    state,
    authority,
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

/** @returns {Promise<Response>} Submit one composed Admin request. */
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

/** @returns {Promise<void>} Assert one exact HTTP outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.clone().json()).resolves.toEqual({ outcome });
}
