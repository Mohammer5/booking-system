import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAdminPersistence } from "./createAdminPersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_admin_promotion_failure"),
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("guarded Admin User promotion persistence", () => {
  it("changes only authority and retains several Super Admins and references", async () => {
    await insertAdmin("actor", "Actor", "active", "super-admin");
    await insertAdmin("target", "Target", "active", "admin");
    await env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-target', 'principal-target', 'Participant Target',
               'target@example.com', 'target@example.com', 'active')`,
    ).run();
    await env.DB.prepare(
      `insert into admin_invites
         (id, token_digest, created_by_admin_user_id, created_at, state)
       values ('invite-target', ?, 'admin-target', 1, 'active')`,
    ).bind("a".repeat(64)).run();
    const before = await storedAdmin("admin-target");
    const persistence = createAdminPersistence(env.DB);

    await expect(promote(persistence)).resolves.toBe("promoted");
    await expect(storedAdmin("admin-target")).resolves.toEqual({
      ...before,
      authority: "super-admin",
    });
    await expect(env.DB.prepare(
      "select count(*) as count from admin_users where authority = 'super-admin'",
    ).first("count")).resolves.toBe(2);
    await expect(env.DB.prepare(
      "select name, state from participants where id = 'participant-target'",
    ).first()).resolves.toEqual({ name: "Participant Target", state: "active" });
    await expect(env.DB.prepare(
      "select created_by_admin_user_id, state from admin_invites where id = 'invite-target'",
    ).first()).resolves.toEqual({
      created_by_admin_user_id: "admin-target",
      state: "active",
    });
  });

  it.each([
    ["admin", "active", "admin", "active", "admin-user-not-promotable"],
    ["super-admin", "disabled", "admin", "active", "admin-not-active"],
    ["super-admin", "active", "admin", "disabled", "admin-user-not-promotable"],
    ["super-admin", "active", "super-admin", "active", "admin-user-not-promotable"],
  ])("refuses %s %s actor and %s %s target", async (
    actorAuthority,
    actorState,
    targetAuthority,
    targetState,
    outcome,
  ) => {
    await insertAdmin("actor", "Actor", actorState, actorAuthority);
    await insertAdmin("target", "Target", targetState, targetAuthority);
    const persistence = createAdminPersistence(env.DB);

    await expect(promote(persistence)).resolves.toBe(outcome);
    await expect(storedAdmin("admin-target")).resolves.toMatchObject({
      authority: targetAuthority,
      state: targetState,
    });
  });

  it("refuses self-promotion and a deleted target", async () => {
    await insertAdmin("actor", "Actor", "active", "super-admin");
    const persistence = createAdminPersistence(env.DB);

    await expect(persistence.promoteAuthorizedAdminUser({
      adminUserId: "admin-actor",
      targetAdminUserId: "admin-actor",
    })).resolves.toBe("admin-user-not-promotable");
    await expect(promote(persistence)).resolves.toBe("admin-user-not-found");
  });

  it("allows exactly one of two concurrent promotions", async () => {
    await insertAdmin("actor", "Actor", "active", "super-admin");
    await insertAdmin("target", "Target", "active", "admin");
    const persistence = createAdminPersistence(env.DB);

    await expect(Promise.all([
      promote(persistence),
      promote(persistence),
    ])).resolves.toEqual(expect.arrayContaining([
      "promoted",
      "admin-user-not-promotable",
    ]));
    await expect(env.DB.prepare(
      "select count(*) as count from admin_users",
    ).first("count")).resolves.toBe(2);
  });

  it("leaves the row unchanged when the atomic authority update fails", async () => {
    await insertAdmin("actor", "Actor", "active", "super-admin");
    await insertAdmin("target", "Target", "active", "admin");
    await env.DB.prepare(
      `create trigger test_admin_promotion_failure
       before update of authority on admin_users
       begin
         select raise(abort, 'forced promotion failure');
       end`,
    ).run();
    const before = await storedAdmin("admin-target");
    const persistence = createAdminPersistence(env.DB);

    await expect(promote(persistence)).rejects.toThrow();
    await expect(storedAdmin("admin-target")).resolves.toEqual(before);
  });
});

/** @returns {Promise<string>} Submit one standard guarded promotion. */
function promote(persistence) {
  return persistence.promoteAuthorizedAdminUser({
    adminUserId: "admin-actor",
    targetAdminUserId: "admin-target",
  });
}

/** @returns {Promise<void>} Insert one exact current Admin fixture. */
async function insertAdmin(suffix, name, state, authority) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, ?)`,
  ).bind(`admin-${suffix}`, `principal-${suffix}`, name, state, authority).run();
}

/** @returns {Promise<object | null>} Read one raw current Admin row. */
function storedAdmin(adminUserId) {
  return env.DB.prepare("select * from admin_users where id = ?")
    .bind(adminUserId).first();
}
