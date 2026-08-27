import { applyD1Migrations, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Course schema upgrade", () => {
  it("preserves Admin and Course data through the additive structure migrations", async () => {
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

    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 2));
    await env.DB.prepare(
      `insert into courses (id, name, description, timezone, state)
       values ('course-existing', 'Existing Course', null,
               'Europe/Berlin', 'active')`,
    ).run();

    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const existingAdmin = await env.DB.prepare(
      "select name from admin_users where id = 'admin-existing'",
    ).first();
    const course = await env.DB.prepare(
      `select name, has_ever_had_module
         from courses where id = 'course-existing'`,
    ).first();
    const courseColumns = await env.DB.prepare(
      'pragma table_info("courses")',
    ).all();
    const structureTables = await env.DB.prepare(
      `select name from sqlite_master
        where type = 'table' and name in ('groups', 'modules')
        order by name`,
    ).all();

    expect(existingAdmin).toEqual({ name: "Existing Admin" });
    expect(course).toEqual({
      name: "Existing Course",
      has_ever_had_module: 0,
    });
    expect(courseColumns.results.map(({ name }) => name)).toEqual([
      "id",
      "name",
      "description",
      "timezone",
      "state",
      "has_ever_had_module",
    ]);
    expect(structureTables.results).toEqual([
      { name: "groups" },
      { name: "modules" },
    ]);
  });
});
