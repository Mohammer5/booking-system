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

describe("Admin Invite recognition persistence", () => {
  it("resolves only non-secret metadata by an exact stored digest", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertInvite("invite-active", "a", "active");
    await insertInvite("invite-claimed", "b", "claimed");

    await expect(persistence.findRecognizedAdminInviteByDigest(hex("a")))
      .resolves.toEqual({ id: "invite-active", createdAt: 1, state: "active" });
    await expect(persistence.findRecognizedAdminInviteByDigest(hex("b")))
      .resolves.toEqual({ id: "invite-claimed", createdAt: 1, state: "claimed" });
    await expect(persistence.findRecognizedAdminInviteByDigest(hex("f")))
      .resolves.toBeNull();
  });
});

describe("atomic Admin Invite claim persistence", () => {
  it("claims one Active Invite and creates one ordinary Active Admin", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertInvite("invite-a", "a", "active");
    await expect(persistence.claimActiveAdminInvite(claimInput(
      "invite-a",
      "admin-new",
      "principal-new",
    ))).resolves.toBe("claimed");

    await expect(readInviteState("invite-a")).resolves.toBe("claimed");
    await expect(readAdmin("principal-new")).resolves.toEqual({
      id: "admin-new",
      name: "Neue Admina",
      state: "active",
      authority: "admin",
    });
  });

  it.each(["active", "disabled"])(
    "refuses an existing %s Admin and leaves the Invite Active",
    async (state) => {
      const persistence = createAdminInvitePersistence(env.DB);

      await insertAdmin("admin-existing", "principal-existing", state);
      await insertInvite("invite-a", "a", "active");
      await expect(persistence.claimActiveAdminInvite(claimInput(
        "invite-a",
        "admin-new",
        "principal-existing",
      ))).resolves.toBe("admin-user-already-exists");
      await expect(readInviteState("invite-a")).resolves.toBe("active");
      await expect(countAdmins("principal-existing")).resolves.toBe(1);
    },
  );

  it("allows a deleted principal to receive a fresh ordinary identity", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertAdmin(
      "admin-deleted",
      "principal-returning",
      "disabled",
      "super-admin",
    );
    await env.DB.prepare(
      "delete from admin_users where id = 'admin-deleted'",
    ).run();
    await insertInvite("invite-return", "c", "active");

    await expect(persistence.claimActiveAdminInvite(claimInput(
      "invite-return",
      "admin-returned-new",
      "principal-returning",
    ))).resolves.toBe("claimed");
    await expect(readAdmin("principal-returning")).resolves.toMatchObject({
      id: "admin-returned-new",
      state: "active",
      authority: "admin",
    });
  });

  it("allows exactly one competing principal to claim one Invite", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertInvite("invite-race", "d", "active");
    const outcomes = await Promise.all([
      persistence.claimActiveAdminInvite(claimInput(
        "invite-race",
        "admin-a",
        "principal-a",
      )),
      persistence.claimActiveAdminInvite(claimInput(
        "invite-race",
        "admin-b",
        "principal-b",
      )),
    ]);

    expect(outcomes.sort()).toEqual(["claimed", "invite-unavailable"]);
    await expect(readInviteState("invite-race")).resolves.toBe("claimed");
    await expect(countAdmins()).resolves.toBe(1);
  });

  it("allows one principal to claim only one of two competing Invites", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertInvite("invite-a", "e", "active");
    await insertInvite("invite-b", "f", "active");
    const outcomes = await Promise.all([
      persistence.claimActiveAdminInvite(claimInput(
        "invite-a",
        "admin-a",
        "principal-same",
      )),
      persistence.claimActiveAdminInvite(claimInput(
        "invite-b",
        "admin-b",
        "principal-same",
      )),
    ]);
    const states = await Promise.all([
      readInviteState("invite-a"),
      readInviteState("invite-b"),
    ]);

    expect(outcomes.sort()).toEqual(["admin-user-already-exists", "claimed"]);
    expect(states.sort()).toEqual(["active", "claimed"]);
    await expect(countAdmins("principal-same")).resolves.toBe(1);
  });

  it("rolls back a won terminal transition when Admin insertion fails", async () => {
    const persistence = createAdminInvitePersistence(env.DB);

    await insertInvite("invite-rollback", "9", "active");
    const invalid = claimInput(
      "invite-rollback",
      "admin-invalid",
      "principal-invalid",
    );

    invalid.adminUser.name = " ";
    await expect(persistence.claimActiveAdminInvite(invalid)).rejects.toThrow();
    await expect(readInviteState("invite-rollback")).resolves.toBe("active");
    await expect(countAdmins("principal-invalid")).resolves.toBe(0);
  });

  it.each(["claimed", "revoked"])(
    "refuses terminal %s state without creating an Admin",
    async (state) => {
      const persistence = createAdminInvitePersistence(env.DB);

      await insertInvite(`invite-${state}`, state === "claimed" ? "7" : "8", state);
      await expect(persistence.claimActiveAdminInvite(claimInput(
        `invite-${state}`,
        `admin-${state}`,
        `principal-${state}`,
      ))).resolves.toBe("invite-unavailable");
      await expect(countAdmins(`principal-${state}`)).resolves.toBe(0);
    },
  );
});

/** @returns {Promise<object>} Insert one Admin Invite row. */
function insertInvite(id, digestCharacter, state) {
  return env.DB.prepare(
    `insert into admin_invites
       (id, token_digest, created_by_admin_user_id, created_at, state)
     values (?, ?, null, 1, ?)`,
  ).bind(id, hex(digestCharacter), state).run();
}

/** @returns {Promise<object>} Insert one current Admin User row. */
function insertAdmin(id, principal, state, authority = "admin") {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, ?)`,
  ).bind(id, principal, id, state, authority).run();
}

/** @returns {object} One valid persistence claim input. */
function claimInput(inviteId, adminUserId, externalPrincipalId) {
  return {
    inviteId,
    adminUser: {
      id: adminUserId,
      externalPrincipalId,
      name: "Neue Admina",
      state: "active",
      authority: "admin",
    },
  };
}

/** @returns {Promise<string | undefined>} Read one current Invite state. */
async function readInviteState(inviteId) {
  const row = await env.DB.prepare(
    "select state from admin_invites where id = ?",
  ).bind(inviteId).first();

  return row?.state;
}

/** @returns {Promise<object | null>} Read one current Admin by principal. */
function readAdmin(principal) {
  return env.DB.prepare(
    `select id, name, state, authority from admin_users
      where external_principal_id = ?`,
  ).bind(principal).first();
}

/** @returns {Promise<number>} Count all or one principal's current Admin rows. */
async function countAdmins(principal) {
  const statement = principal === undefined
    ? env.DB.prepare("select count(*) as count from admin_users")
    : env.DB.prepare(
        "select count(*) as count from admin_users where external_principal_id = ?",
      ).bind(principal);
  const row = await statement.first();

  return row.count;
}

/** @returns {string} One fixed valid lowercase 256-bit hexadecimal digest. */
function hex(character) {
  return character.repeat(64);
}
