import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAdminPersistence } from "./createAdminPersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("clean migration sequence", () => {
  it("constructs the complete Better Auth and booking schema", async () => {
    const { results } = await env.DB.prepare(
      `select name from sqlite_master
        where type = 'table'
          and name in (
            'user', 'session', 'account', 'verification',
            'admin_users', 'admin_bootstrap_history', 'courses', 'participants'
          )
        order by name`,
    ).all();

    expect(results.map(({ name }) => name)).toEqual([
      "account",
      "admin_bootstrap_history",
      "admin_users",
      "courses",
      "participants",
      "session",
      "user",
      "verification",
    ]);
  });
});

describe("atomic first-Admin persistence", () => {
  it("accepts the first claim and refuses a second without another Admin", async () => {
    const persistence = createAdminPersistence(env.DB);

    await expect(persistence.claimFirstAdmin(candidate("one"))).resolves.toBe(
      "created",
    );
    await expect(persistence.claimFirstAdmin(candidate("two"))).resolves.toBe(
      "bootstrap-unavailable",
    );

    await expect(countRows("admin_users")).resolves.toBe(1);
    await expect(countRows("admin_bootstrap_history")).resolves.toBe(1);
  });

  it("makes a stale observer lose after another caller completes bootstrap", async () => {
    const persistence = createAdminPersistence(env.DB);

    await expect(
      persistence.hasAdminUserEverBeenCreated(),
    ).resolves.toBe(false);
    await expect(persistence.claimFirstAdmin(candidate("winner"))).resolves.toBe(
      "created",
    );
    await expect(persistence.claimFirstAdmin(candidate("stale"))).resolves.toBe(
      "bootstrap-unavailable",
    );
  });

  it("allows exactly one concurrent claim to succeed", async () => {
    const persistence = createAdminPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.claimFirstAdmin(candidate("concurrent-a")),
      persistence.claimFirstAdmin(candidate("concurrent-b")),
    ]);

    expect(outcomes.sort()).toEqual(["bootstrap-unavailable", "created"]);
    await expect(countRows("admin_users")).resolves.toBe(1);
  });

  it("keeps permanent bootstrap history after every Admin row is deleted", async () => {
    const persistence = createAdminPersistence(env.DB);

    await persistence.claimFirstAdmin(candidate("deleted"));
    await env.DB.prepare("delete from admin_users").run();

    await expect(
      persistence.hasAdminUserEverBeenCreated(),
    ).resolves.toBe(true);
    await expect(countRows("admin_users")).resolves.toBe(0);
    await expect(
      persistence.claimFirstAdmin(candidate("later")),
    ).resolves.toBe("bootstrap-unavailable");
  });

  it("rolls back Admin creation and bootstrap consumption on a failed batch", async () => {
    const persistence = createAdminPersistence(env.DB);
    const invalidCandidate = { ...candidate("invalid"), name: "   " };

    await expect(
      persistence.claimFirstAdmin(invalidCandidate),
    ).rejects.toThrow();
    await expect(countRows("admin_users")).resolves.toBe(0);
    await expect(countRows("admin_bootstrap_history")).resolves.toBe(0);
  });
});

describe("current Admin resolution", () => {
  it("finds current state and distinguishes disabled from missing data", async () => {
    const persistence = createAdminPersistence(env.DB);

    await persistence.claimFirstAdmin(candidate("current"));
    await expect(
      persistence.findAdminUserByExternalPrincipalId("principal-current"),
    ).resolves.toMatchObject({
      id: "admin-current",
      state: "active",
      authority: "super-admin",
    });
    await env.DB.prepare(
      "update admin_users set state = 'disabled' where id = ?",
    )
      .bind("admin-current")
      .run();
    await expect(
      persistence.findAdminUserByExternalPrincipalId("principal-current"),
    ).resolves.toMatchObject({ state: "disabled" });
    await expect(
      persistence.findAdminUserByExternalPrincipalId("principal-missing"),
    ).resolves.toBeNull();
  });
});

/**
 * Create deterministic valid Admin persistence input.
 *
 * @param {string} suffix A unique test suffix.
 * @returns {object} A valid first-Admin candidate.
 */
function candidate(suffix) {
  return {
    id: `admin-${suffix}`,
    externalPrincipalId: `principal-${suffix}`,
    name: `Admin ${suffix}`,
    state: "active",
    authority: "super-admin",
  };
}

/**
 * Count rows in one fixed test-owned table.
 *
 * @param {"admin_users" | "admin_bootstrap_history"} tableName The table to count.
 * @returns {Promise<number>} The current row count.
 */
async function countRows(tableName) {
  const query =
    tableName === "admin_users"
      ? "select count(*) as count from admin_users"
      : "select count(*) as count from admin_bootstrap_history";
  const row = await env.DB.prepare(query).first();

  return row.count;
}
