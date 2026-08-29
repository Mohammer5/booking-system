import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAdminPersistence } from "./createAdminPersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_admin_lifecycle_failure"),
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from course_invites"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("guarded Admin User lifecycle persistence", () => {
  it("lets ordinary Admins manage only another ordinary Admin", async () => {
    await insertAdmin("super", "active", "super-admin");
    await insertAdmin("actor", "active", "admin");
    await insertAdmin("target", "active", "admin");
    await insertAdmin("protected", "active", "super-admin");
    const persistence = createAdminPersistence(env.DB);

    await expect(disable(persistence)).resolves.toBe("disabled");
    await expect(reenable(persistence)).resolves.toBe("re-enabled");
    await expect(persistence.disableAuthorizedAdminUser({
      adminUserId: "admin-actor",
      targetAdminUserId: "admin-protected",
    })).resolves.toBe("admin-user-not-manageable");
    await expect(remove(persistence)).resolves.toBe("deleted");
    await expect(storedAdmin("admin-target")).resolves.toBeNull();
  });

  it("lets a Super Admin Disable, Re-enable, and delete another Super", async () => {
    await insertAdmin("actor", "active", "super-admin");
    await insertAdmin("target", "active", "super-admin");
    const persistence = createAdminPersistence(env.DB);
    const before = await storedAdmin("admin-target");

    await expect(disable(persistence)).resolves.toBe("disabled");
    await expect(storedAdmin("admin-target")).resolves.toEqual({
      ...before,
      state: "disabled",
    });
    await expect(reenable(persistence)).resolves.toBe("re-enabled");
    await expect(storedAdmin("admin-target")).resolves.toEqual(before);
    await expect(remove(persistence)).resolves.toBe("deleted");
  });

  it("refuses self, Disabled actors, stale target states, and missing targets", async () => {
    await insertAdmin("super", "active", "super-admin");
    await insertAdmin("actor", "active", "admin");
    await insertAdmin("target", "disabled", "admin");
    const persistence = createAdminPersistence(env.DB);

    await expect(persistence.disableAuthorizedAdminUser({
      adminUserId: "admin-actor",
      targetAdminUserId: "admin-actor",
    })).resolves.toBe("admin-user-self-protected");
    await expect(disable(persistence)).resolves.toBe("admin-user-not-active");
    await expect(reenable(persistence)).resolves.toBe("re-enabled");
    await expect(reenable(persistence)).resolves.toBe("admin-user-not-disabled");
    await env.DB.prepare(
      "update admin_users set state = 'disabled' where id = 'admin-actor'",
    ).run();
    await expect(remove(persistence)).resolves.toBe("admin-not-active");
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-actor'",
    ).run();
    await env.DB.prepare(
      "delete from admin_users where id = 'admin-target'",
    ).run();
    await expect(remove(persistence)).resolves.toBe("admin-user-not-found");
  });

  it("requires an Active Super to remain after every Disable or delete", async () => {
    await insertAdmin("actor", "active", "admin");
    await insertAdmin("target", "active", "admin");
    const persistence = createAdminPersistence(env.DB);

    await expect(disable(persistence))
      .resolves.toBe("admin-user-last-active-super");
    await expect(remove(persistence))
      .resolves.toBe("admin-user-last-active-super");
    await expect(storedAdmin("admin-target")).resolves.toMatchObject({
      state: "active",
    });
  });

  it("accepts only one pair of concurrent cross-Super Disable attempts", async () => {
    await insertAdmin("actor", "active", "super-admin");
    await insertAdmin("target", "active", "super-admin");
    const persistence = createAdminPersistence(env.DB);

    const outcomes = await Promise.all([
      disable(persistence),
      persistence.disableAuthorizedAdminUser({
        adminUserId: "admin-target",
        targetAdminUserId: "admin-actor",
      }),
    ]);

    expect(outcomes).toContain("disabled");
    expect(outcomes).toContain("admin-not-active");
    await expect(env.DB.prepare(
      `select count(*) as count from admin_users
        where state = 'active' and authority = 'super-admin'`,
    ).first("count")).resolves.toBe(1);
  });

  it("deletes only current Admin identity and preserves every named concept", async () => {
    await insertAdmin("actor", "active", "super-admin");
    await insertAdmin("target", "active", "admin", "shared-principal");
    await insertNamedDomainRows();
    const before = await namedDomainRows();
    const persistence = createAdminPersistence(env.DB);

    await expect(remove(persistence)).resolves.toBe("deleted");
    await expect(storedAdmin("admin-target")).resolves.toBeNull();
    await expect(namedDomainRows()).resolves.toEqual(before);
  });

  it.each(["update", "delete"])(
    "leaves the target unchanged after forced %s failure",
    async (action) => {
      await insertAdmin("actor", "active", "super-admin");
      await insertAdmin("target", "active", "admin");
      await env.DB.prepare(
        `create trigger test_admin_lifecycle_failure
         before ${action} on admin_users
         when old.id = 'admin-target'
         begin
           select raise(abort, 'forced lifecycle failure');
         end`,
      ).run();
      const persistence = createAdminPersistence(env.DB);
      const before = await storedAdmin("admin-target");

      await expect(action === "update"
        ? disable(persistence)
        : remove(persistence)).rejects.toThrow();
      await expect(storedAdmin("admin-target")).resolves.toEqual(before);
    },
  );
});

/** @returns {Promise<string>} Disable the standard target. */
function disable(persistence) {
  return persistence.disableAuthorizedAdminUser(command());
}

/** @returns {Promise<string>} Re-enable the standard target. */
function reenable(persistence) {
  return persistence.reenableAuthorizedAdminUser(command());
}

/** @returns {Promise<string>} Delete the standard target. */
function remove(persistence) {
  return persistence.deleteAuthorizedAdminUser(command());
}

/** @returns {object} Standard actor and target identity input. */
function command() {
  return {
    adminUserId: "admin-actor",
    targetAdminUserId: "admin-target",
  };
}

/** @returns {Promise<void>} Insert one exact current Admin. */
async function insertAdmin(
  suffix,
  state,
  authority,
  principal = `principal-${suffix}`,
) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, ?)`,
  ).bind(`admin-${suffix}`, principal, suffix, state, authority).run();
}

/** @returns {Promise<object | null>} Read one current Admin row. */
function storedAdmin(adminUserId) {
  return env.DB.prepare("select * from admin_users where id = ?")
    .bind(adminUserId).first();
}

/** @returns {Promise<void>} Insert one connected representative booking graph. */
async function insertNamedDomainRows() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses (id, name, description, timezone, state)
       values ('course-1', 'Course', 'Retained', 'Europe/Berlin', 'active')`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-1', 'shared-principal', 'Participant',
               'shared@example.com', 'shared@example.com', 'active')`,
    ),
  ]);
  await env.DB.batch([
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-1', 'course-1', 'Group', 'group', 'Retained', 'active')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-1', 'course-1', 'Module', 'Retained', 'Retained',
               100, 200, 'scheduled')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-1', 'participant-1', 'course-1', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_invites
         (id, course_id, token_digest, recoverable_token,
          is_enabled, is_current, replaces_invite_id, replacement_invite_id)
       values ('course-invite-1', 'course-1', ?, ?, 1, 1, null, null)`,
    ).bind("a".repeat(64), "b".repeat(64)),
    env.DB.prepare(
      `insert into admin_invites
         (id, token_digest, created_by_admin_user_id, created_at, state)
       values ('admin-invite-1', ?, 'admin-target', 1, 'claimed')`,
    ).bind("c".repeat(64)),
    env.DB.prepare(
      `insert into admin_bootstrap_history
         (singleton, first_admin_user_id, completed_at)
       values (1, 'admin-target', 1)`,
    ),
  ]);
  await env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values ('selection-1', 'participant-1', 'course-1', 'module-1', 'group-1')`,
  ).run();
}

/** @returns {Promise<object>} Snapshot every named non-Admin concept. */
async function namedDomainRows() {
  const names = [
    "courses",
    "groups",
    "modules",
    "participants",
    "course_assignments",
    "module_selections",
    "course_invites",
    "admin_invites",
    "admin_bootstrap_history",
  ];
  const entries = await Promise.all(names.map(async (name) => [
    name,
    (await env.DB.prepare(`select * from ${name} order by rowid`).all()).results,
  ]));

  return Object.fromEntries(entries);
}
