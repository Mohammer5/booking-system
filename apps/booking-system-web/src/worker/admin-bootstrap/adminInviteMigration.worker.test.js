import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 7));
  await insertAdmin("admin-existing");
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("Admin Invite schema upgrade", () => {
  it("preserves existing Admin data and stores no recoverable token", async () => {
    const admin = await env.DB.prepare(
      "select name from admin_users where id = 'admin-existing'",
    ).first();
    const columns = await env.DB.prepare(
      'pragma table_info("admin_invites")',
    ).all();

    expect(admin).toEqual({ name: "admin-existing" });
    expect(columns.results.map(({ name }) => name)).toEqual([
      "id",
      "token_digest",
      "created_by_admin_user_id",
      "created_at",
      "state",
    ]);
    expect(columns.results.map(({ name }) => name)).not.toContain("token");
  });

  it("enforces digest shape, unique authority, and permanent creation data", async () => {
    await insertInvite({ id: "invite-a", digest: hex("a") });

    await expect(insertInvite({ id: "invite-b", digest: hex("a") }))
      .rejects.toThrow();
    await expect(insertInvite({ id: "invite-bad-short", digest: "a" }))
      .rejects.toThrow();
    await expect(insertInvite({ id: "invite-bad-uppercase", digest: hex("A") }))
      .rejects.toThrow();
    await expect(env.DB.prepare(
      "update admin_invites set token_digest = ? where id = 'invite-a'",
    ).bind(hex("b")).run()).rejects.toThrow();
    await expect(env.DB.prepare(
      "update admin_invites set created_at = 2 where id = 'invite-a'",
    ).run()).rejects.toThrow();
  });

  it("allows only one Active-to-terminal transition and no reactivation", async () => {
    await insertInvite({ id: "invite-terminal", digest: hex("c") });

    await expect(env.DB.prepare(
      "update admin_invites set state = 'claimed' where id = 'invite-terminal'",
    ).run()).resolves.toMatchObject({ success: true });
    await expect(env.DB.prepare(
      "update admin_invites set state = 'revoked' where id = 'invite-terminal'",
    ).run()).rejects.toThrow();
    await expect(env.DB.prepare(
      "update admin_invites set state = 'active' where id = 'invite-terminal'",
    ).run()).rejects.toThrow();
  });

  it("retains the Invite and clears only creator reference on Admin deletion", async () => {
    await insertAdmin("admin-removable");
    await insertInvite({
      id: "invite-retained",
      digest: hex("d"),
      adminUserId: "admin-removable",
    });

    await env.DB.prepare(
      "delete from admin_users where id = 'admin-removable'",
    ).run();
    await expect(env.DB.prepare(
      `select id, created_by_admin_user_id, state
         from admin_invites where id = 'invite-retained'`,
    ).first()).resolves.toEqual({
      id: "invite-retained",
      created_by_admin_user_id: null,
      state: "active",
    });
  });
});

/** @returns {Promise<object>} Insert one raw Active Admin User. */
function insertAdmin(id) {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, 'active', 'admin')`,
  ).bind(id, `principal-${id}`, id).run();
}

/** @returns {Promise<object>} Insert one raw Active Admin Invite. */
function insertInvite({
  id,
  digest,
  adminUserId = "admin-existing",
}) {
  return env.DB.prepare(
    `insert into admin_invites
       (id, token_digest, created_by_admin_user_id, created_at, state)
     values (?, ?, ?, 1, 'active')`,
  ).bind(id, digest, adminUserId).run();
}

/** @returns {string} One valid fixed 256-bit hexadecimal value. */
function hex(character) {
  return character.repeat(64);
}
