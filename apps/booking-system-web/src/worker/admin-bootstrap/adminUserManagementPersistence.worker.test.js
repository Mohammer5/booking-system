import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAdminPersistence } from "./createAdminPersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_admin_name_failure"),
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("current Admin User persistence", () => {
  it("finds by stable domain identity and lists every row deterministically", async () => {
    await insertAdmin("actor", "Zulu", "active", "super-admin");
    await insertAdmin("b", "alpha", "disabled", "admin");
    await insertAdmin("a", "Alpha", "active", "admin");
    const persistence = createAdminPersistence(env.DB);

    await expect(persistence.findAdminUserById("admin-b")).resolves.toEqual({
      id: "admin-b",
      externalPrincipalId: "principal-b",
      name: "alpha",
      state: "disabled",
      authority: "admin",
    });
    await expect(persistence.listCurrentAdminUsers("admin-actor"))
      .resolves.toMatchObject([
        { id: "admin-a", name: "Alpha" },
        { id: "admin-b", name: "alpha" },
        { id: "admin-actor", name: "Zulu" },
      ]);
  });

  it("refuses the list when its actor is no longer Active", async () => {
    await insertAdmin("actor", "Actor", "disabled", "super-admin");
    const persistence = createAdminPersistence(env.DB);

    await expect(persistence.listCurrentAdminUsers("admin-actor"))
      .resolves.toBe("admin-not-active");
  });
});

describe("guarded Admin User name persistence", () => {
  it.each([
    ["admin", "actor", "active", "admin", "updated"],
    ["admin", "peer", "active", "admin", "updated"],
    ["admin", "peer", "disabled", "admin", "updated"],
    ["admin", "peer", "active", "super-admin", "admin-user-not-editable"],
    ["super-admin", "peer", "active", "admin", "updated"],
    ["super-admin", "peer", "disabled", "super-admin", "updated"],
  ])("applies %s actor policy to %s %s %s target", async (
    actorAuthority,
    targetSuffix,
    targetState,
    targetAuthority,
    outcome,
  ) => {
    await insertAdmin("actor", "Actor", "active", actorAuthority);

    if (targetSuffix !== "actor") {
      await insertAdmin(targetSuffix, "Target", targetState, targetAuthority);
    }

    const persistence = createAdminPersistence(env.DB);

    await expect(persistence.updateAuthorizedAdminUserName({
      adminUserId: "admin-actor",
      targetAdminUserId: `admin-${targetSuffix}`,
      name: "Updated",
    })).resolves.toBe(outcome);
    await expect(adminName(`admin-${targetSuffix}`)).resolves.toBe(
      outcome === "updated" ? "Updated" : "Target",
    );
  });

  it("revalidates stale actor, target promotion, and target deletion", async () => {
    await insertAdmin("actor", "Actor", "active", "admin");
    await insertAdmin("target", "Target", "active", "admin");
    const persistence = createAdminPersistence(env.DB);

    await env.DB.prepare(
      "update admin_users set state = 'disabled' where id = 'admin-actor'",
    ).run();
    await expect(updateName(persistence)).resolves.toBe("admin-not-active");
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-actor'",
    ).run();
    await env.DB.prepare(
      "update admin_users set authority = 'super-admin' where id = 'admin-target'",
    ).run();
    await expect(updateName(persistence)).resolves.toBe("admin-user-not-editable");
    await env.DB.prepare("delete from admin_users where id = 'admin-target'").run();
    await expect(updateName(persistence)).resolves.toBe("admin-user-not-found");
  });

  it("changes only the target name without merging duplicate names or Participant data", async () => {
    await insertAdmin("actor", "Shared Name", "active", "super-admin");
    await insertAdmin("target", "Target", "disabled", "admin");
    await env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-a', 'principal-target', 'Participant Name',
               'participant@example.com', 'participant@example.com', 'active')`,
    ).run();
    const before = await env.DB.prepare(
      "select * from admin_users where id = 'admin-target'",
    ).first();
    const persistence = createAdminPersistence(env.DB);

    await expect(updateName(persistence, "Shared Name")).resolves.toBe("updated");
    const after = await env.DB.prepare(
      "select * from admin_users where id = 'admin-target'",
    ).first();
    const participant = await env.DB.prepare(
      "select * from participants where id = 'participant-a'",
    ).first();

    expect(after).toEqual({ ...before, name: "Shared Name" });
    expect(participant.name).toBe("Participant Name");
    expect(participant.external_principal_id).toBe("principal-target");
  });

  it("leaves the row unchanged when the one atomic statement fails", async () => {
    await insertAdmin("actor", "Actor", "active", "super-admin");
    await insertAdmin("target", "Target", "active", "admin");
    await env.DB.prepare(
      `create trigger test_admin_name_failure
       before update of name on admin_users
       begin
         select raise(abort, 'forced name failure');
       end`,
    ).run();
    const persistence = createAdminPersistence(env.DB);

    await expect(updateName(persistence)).rejects.toThrow();
    await expect(adminName("admin-target")).resolves.toBe("Target");
  });
});

/** @returns {Promise<string>} Submit one standard target name update. */
function updateName(persistence, name = "Updated") {
  return persistence.updateAuthorizedAdminUserName({
    adminUserId: "admin-actor",
    targetAdminUserId: "admin-target",
    name,
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

/** @returns {Promise<string | undefined>} Read one current Admin name. */
async function adminName(adminUserId) {
  const row = await env.DB.prepare(
    "select name from admin_users where id = ?",
  ).bind(adminUserId).first();

  return row?.name;
}
