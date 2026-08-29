import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAdminInvitePersistence } from "./createAdminInvitePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("Admin Invite persistence", () => {
  it("creates several Active Invites and lists deterministic non-secret metadata", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertAdmin("admin-a");
    await expect(persistence.createActiveAdminInvite(inviteInput("b", 2)))
      .resolves.toBe("created");
    await expect(persistence.createActiveAdminInvite(inviteInput("a", 2)))
      .resolves.toBe("created");
    await expect(persistence.createActiveAdminInvite(inviteInput("c", 3)))
      .resolves.toBe("created");

    await expect(persistence.listAdminInvites("admin-a")).resolves.toEqual([
      invite("c", 3),
      invite("a", 2),
      invite("b", 2),
    ]);
    const storage = await env.DB.prepare(
      "select * from admin_invites order by id",
    ).all();

    expect(JSON.stringify(storage.results)).not.toContain("private-token");
    expect(storage.results.every((row) => row.token_digest.length === 64))
      .toBe(true);
  });

  it("freshly refuses a Disabled or missing actor for every operation", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertAdmin("admin-a", "disabled");
    await insertAdmin("admin-active");
    await persistence.createActiveAdminInvite({
      ...inviteInput("existing", 1),
      createdByAdminUserId: "admin-active",
    });

    await expect(persistence.createActiveAdminInvite(inviteInput("new", 2)))
      .resolves.toBe("admin-not-active");
    await expect(persistence.listAdminInvites("admin-a"))
      .resolves.toBe("admin-not-active");
    await expect(persistence.revokeActiveAdminInvite({
      adminUserId: "admin-a",
      inviteId: "invite-existing",
    })).resolves.toBe("admin-not-active");
    await expect(persistence.listAdminInvites("missing"))
      .resolves.toBe("admin-not-active");
    await expect(readInvite("invite-existing")).resolves.toMatchObject({
      state: "active",
    });
  });

  it("allows any Active Admin to Revoke once and returns terminal refusals", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertAdmin("admin-creator");
    await insertAdmin("admin-other");
    await persistence.createActiveAdminInvite({
      ...inviteInput("a", 1),
      createdByAdminUserId: "admin-creator",
    });

    await expect(persistence.revokeActiveAdminInvite({
      adminUserId: "admin-other",
      inviteId: "invite-a",
    })).resolves.toBe("revoked");
    await expect(persistence.revokeActiveAdminInvite({
      adminUserId: "admin-creator",
      inviteId: "invite-a",
    })).resolves.toBe("admin-invite-not-active");
    await expect(persistence.revokeActiveAdminInvite({
      adminUserId: "admin-creator",
      inviteId: "missing",
    })).resolves.toBe("admin-invite-not-found");
  });

  it("gives concurrent Revoke and future Claim exactly one terminal winner", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertAdmin("admin-a");
    await persistence.createActiveAdminInvite(inviteInput("race", 1));
    const [revokeOutcome, claimResult] = await Promise.all([
      persistence.revokeActiveAdminInvite({
        adminUserId: "admin-a",
        inviteId: "invite-race",
      }),
      env.DB.prepare(
        `update admin_invites set state = 'claimed'
          where id = 'invite-race' and state = 'active'`,
      ).run(),
    ]);
    const stored = await readInvite("invite-race");

    expect(["claimed", "revoked"]).toContain(stored.state);
    expect(Number(revokeOutcome === "revoked") + claimResult.meta.changes)
      .toBe(1);
    await expect(env.DB.prepare(
      "update admin_invites set state = 'active' where id = 'invite-race'",
    ).run()).rejects.toThrow();
  });

  it("retains a created Invite when its creator is deleted", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertAdmin("admin-creator");
    await persistence.createActiveAdminInvite({
      ...inviteInput("retained", 1),
      createdByAdminUserId: "admin-creator",
    });
    await env.DB.prepare(
      "delete from admin_users where id = 'admin-creator'",
    ).run();

    await expect(readInvite("invite-retained")).resolves.toMatchObject({
      id: "invite-retained",
      state: "active",
    });
  });
});

/** @returns {Promise<object>} Insert one Admin User. */
function insertAdmin(id, state = "active") {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, 'admin')`,
  ).bind(id, `principal-${id}`, id, state).run();
}

/** @returns {object} One persistence creation input. */
function inviteInput(id, createdAt) {
  return {
    id: `invite-${id}`,
    tokenDigest: digestFor(id),
    createdByAdminUserId: "admin-a",
    createdAt,
    state: "active",
  };
}

/** @returns {object} One expected non-secret Invite. */
function invite(id, createdAt) {
  return { id: `invite-${id}`, createdAt, state: "active" };
}

/** @returns {Promise<object | null>} Read one raw stored Invite. */
function readInvite(id) {
  return env.DB.prepare(
    `select id, created_by_admin_user_id, created_at, state
       from admin_invites where id = ?`,
  ).bind(id).first();
}

/** @returns {string} Stable test-only valid hexadecimal digest. */
function digestFor(value) {
  const digit = Array.from(value).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  ).toString(16).at(-1);

  return digit.repeat(64);
}
