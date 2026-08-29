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

describe("Admin User lifecycle HTTP", () => {
  it("Disables, Re-enables, and deletes another ordinary Admin", async () => {
    await insertAdmin("super", "fixture-first-admin", "super-admin");
    await insertAdmin("actor", "fixture-admin-invite-a", "admin");
    await insertAdmin("target", "fixture-admin-invite-b", "admin");
    const actorCookie = await establishFixture("admin-invite-a");
    const targetCookie = await establishFixture("admin-invite-b");

    const disabled = await request(
      "POST",
      "/api/admin/users/admin-target/disablement",
      actorCookie,
    );

    expect(disabled.status).toBe(200);
    expect(disabled.headers.get("cache-control")).toBe("no-store");
    await expect(disabled.json()).resolves.toMatchObject({
      id: "admin-target",
      state: "disabled",
      authority: "admin",
      isDisableAvailable: false,
      isReenableAvailable: true,
      isDeleteAvailable: true,
    });
    await expectOutcome(
      await request("GET", "/api/admin/me", targetCookie),
      403,
      "disabled-admin",
    );

    const reenabled = await request(
      "POST",
      "/api/admin/users/admin-target/reenablement",
      actorCookie,
    );

    expect(reenabled.status).toBe(200);
    await expect(reenabled.json()).resolves.toMatchObject({
      id: "admin-target",
      state: "active",
      authority: "admin",
    });
    const restored = await request("GET", "/api/admin/me", targetCookie);

    expect(restored.status).toBe(200);
    await expect(restored.json()).resolves.toMatchObject({
      id: "admin-target",
      authority: "admin",
    });

    const deleted = await request(
      "DELETE",
      "/api/admin/users/admin-target",
      actorCookie,
    );

    expect(deleted.status).toBe(200);
    await expect(deleted.json()).resolves.toEqual({
      adminUserId: "admin-target",
    });
    await expectOutcome(
      await request("GET", "/api/admin/me", targetCookie),
      403,
      "no-admin-user",
    );
    await expect(storedAdmin("admin-target")).resolves.toBeNull();
  });

  it("applies ordinary, Super, self, and stale target rules", async () => {
    await insertAdmin("super", "fixture-first-admin", "super-admin");
    await insertAdmin("ordinary", "fixture-admin-invite-a", "admin");
    await insertAdmin("target", "fixture-admin-invite-b", "super-admin");
    const superCookie = await establishFixture("first-admin");
    const ordinaryCookie = await establishFixture("admin-invite-a");

    await expectOutcome(await request(
      "POST",
      "/api/admin/users/admin-target/disablement",
      ordinaryCookie,
    ), 409, "admin-user-not-manageable");
    await expectOutcome(await request(
      "DELETE",
      "/api/admin/users/admin-super",
      superCookie,
    ), 409, "admin-user-self-protected");

    expect((await request(
      "POST",
      "/api/admin/users/admin-target/disablement",
      superCookie,
    )).status).toBe(200);
    await expectOutcome(await request(
      "POST",
      "/api/admin/users/admin-target/disablement",
      superCookie,
    ), 409, "admin-user-not-active");
    expect((await request(
      "DELETE",
      "/api/admin/users/admin-target",
      superCookie,
    )).status).toBe(200);
  });

  it("atomically refuses one concurrent cross-Super Disable request", async () => {
    await insertAdmin("actor", "fixture-first-admin", "super-admin");
    await insertAdmin("target", "fixture-admin-invite-a", "super-admin");
    const actorCookie = await establishFixture("first-admin");
    const targetCookie = await establishFixture("admin-invite-a");
    const responses = await Promise.all([
      request(
        "POST",
        "/api/admin/users/admin-target/disablement",
        actorCookie,
      ),
      request(
        "POST",
        "/api/admin/users/admin-actor/disablement",
        targetCookie,
      ),
    ]);
    const statuses = responses.map(({ status }) => status).sort();
    const refusal = responses.find(({ status }) => status === 403);

    expect(statuses).toEqual([200, 403]);
    expect(new Set(["admin-not-active", "disabled-admin"]))
      .toContain((await refusal.json()).outcome);
    await expect(env.DB.prepare(
      `select count(*) as count from admin_users
        where state = 'active' and authority = 'super-admin'`,
    ).first("count")).resolves.toBe(1);
  });

  it("matches only the exact command methods and paths", async () => {
    await insertAdmin("actor", "fixture-first-admin", "super-admin");
    await insertAdmin("target", "fixture-admin-invite-a", "admin");
    const cookie = await establishFixture("first-admin");

    await expectOutcome(await request(
      "PUT",
      "/api/admin/users/admin-target/disablement",
      cookie,
    ), 404, "not-found");
    await expectOutcome(await request(
      "POST",
      "/api/admin/users/admin-target/deletion",
      cookie,
    ), 404, "not-found");
    await expectOutcome(await request(
      "DELETE",
      "/api/admin/users/admin-target/nested",
      cookie,
    ), 404, "not-found");
    await expectOutcome(await request(
      "DELETE",
      "/api/admin/users/admin-target",
    ), 401, "unauthenticated");
  });

  it("keeps stale and technical details safe through direct composition", async () => {
    const stale = directHandler({
      disableAuthorizedAdminUser: async () =>
        "admin-user-last-active-super",
    });
    const technical = directHandler({
      deleteAuthorizedAdminUser: async () => {
        throw new Error("private deletion detail");
      },
    });

    await expectOutcome(await stale(commandRequest("disablement")), 409,
      "admin-user-last-active-super");
    const response = await technical(commandRequest(null, "DELETE"));

    await expectOutcome(response, 500, "technical-error");
    expect(await response.text()).not.toContain("private deletion detail");
  });

  it("is composed in production without fixture authority", async () => {
    const response = await productionWorker.fetch(new Request(
      "http://localhost/api/admin/users/admin-target",
      { method: "DELETE" },
    ), env);

    await expectOutcome(response, 401, "unauthenticated");
  });
});

/** @returns {Function} Direct eligible lifecycle handler. */
function directHandler(overrides) {
  const actor = admin("actor", "principal-actor", "super-admin");
  const target = admin("target", "principal-target", "admin");

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

/** @returns {Request} One exact direct lifecycle request. */
function commandRequest(command, method = "POST") {
  const suffix = command === null ? "" : `/${command}`;

  return new Request(
    `http://localhost/api/admin/users/admin-target${suffix}`,
    { method },
  );
}

/** @returns {Promise<void>} Insert one exact Active Admin. */
function insertAdmin(suffix, principal, authority) {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, 'active', ?)`,
  ).bind(`admin-${suffix}`, principal, suffix, authority).run();
}

/** @returns {object} One direct Admin domain row. */
function admin(suffix, principal, authority) {
  return {
    id: `admin-${suffix}`,
    externalPrincipalId: principal,
    name: suffix,
    state: "active",
    authority,
  };
}

/** @returns {Promise<object | null>} Read one current Admin row. */
function storedAdmin(adminUserId) {
  return env.DB.prepare("select * from admin_users where id = ?")
    .bind(adminUserId).first();
}

/** @returns {Promise<string>} Establish one fixed authentication session. */
async function establishFixture(name) {
  const response = await nonProductionWorker.fetch(new Request(
    `http://localhost/api/_fixtures/session/${name}`,
    { method: "POST" },
  ), env);

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<Response>} Send one composed Admin request. */
function request(method, pathname, cookie) {
  const headers = cookie === undefined ? {} : { cookie };

  return nonProductionWorker.fetch(new Request(`http://localhost${pathname}`, {
    method,
    headers,
  }), env);
}

/** @returns {Promise<void>} Assert one exact HTTP outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.clone().json()).resolves.toEqual({ outcome });
}
