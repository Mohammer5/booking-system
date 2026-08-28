import { applyD1Migrations, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Participant schema upgrade", () => {
  it("preserves existing application data and adds constrained Participants", async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 3));
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
      env.DB.prepare(
        `insert into courses
           (id, name, description, timezone, state, has_ever_had_module)
         values ('course-existing', 'Existing Course', null,
                 'Europe/Berlin', 'active', 0)`,
      ),
    ]);

    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const admin = await env.DB.prepare(
      "select name from admin_users where id = 'admin-existing'",
    ).first();
    const course = await env.DB.prepare(
      "select name from courses where id = 'course-existing'",
    ).first();
    const participantColumns = await env.DB.prepare(
      'pragma table_info("participants")',
    ).all();

    expect(admin).toEqual({ name: "Existing Admin" });
    expect(course).toEqual({ name: "Existing Course" });
    expect(participantColumns.results.map(({ name }) => name)).toEqual([
      "id",
      "external_principal_id",
      "name",
      "email",
      "normalized_email",
      "state",
    ]);
  });
});
