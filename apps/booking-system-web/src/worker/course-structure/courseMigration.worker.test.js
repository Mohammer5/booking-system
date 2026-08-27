import { applyD1Migrations, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Course schema upgrade", () => {
  it("preserves first-Admin data while applying the Course migration", async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 1));
    await env.DB.batch([
      env.DB.prepare(
        `insert into admin_users
           (id, external_principal_id, name, state, authority)
         values ('admin-existing', 'principal-existing', 'Existing Admin',
                 'active', 'super-admin')`,
      ),
      env.DB.prepare(
        `insert into admin_bootstrap_history
           (singleton, first_admin_user_id, completed_at)
         values (1, 'admin-existing', 1)`,
      ),
    ]);

    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const existingAdmin = await env.DB.prepare(
      "select name from admin_users where id = 'admin-existing'",
    ).first();
    const columns = await env.DB.prepare(
      'pragma table_info("courses")',
    ).all();

    expect(existingAdmin).toEqual({ name: "Existing Admin" });
    expect(columns.results.map(({ name }) => name)).toEqual([
      "id",
      "name",
      "description",
      "timezone",
      "state",
    ]);
  });
});
