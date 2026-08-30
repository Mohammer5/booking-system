import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAdminCollectionFixture } from "./createAdminCollectionFixture.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from admin_invites"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("non-production Admin collection fixture", () => {
  it("seeds twelve deterministic rows per top-level resource", async () => {
    const handleFixture = createAdminCollectionFixture(env.DB);
    const response = await handleFixture(new Request(
      "http://localhost/api/_fixtures/admin-collections",
      { method: "POST" },
    ));

    expect(response.status).toBe(204);
    await expect(collectionCounts()).resolves.toEqual({
      courses: 12,
      participants: 12,
      admin_users: 12,
      admin_invites: 12,
    });
  });

  it("ignores every approximate path and unsupported method", async () => {
    const handleFixture = createAdminCollectionFixture(env.DB);

    await expect(handleFixture(new Request(
      "http://localhost/api/_fixtures/admin-collections/extra",
      { method: "POST" },
    ))).resolves.toBeNull();
    await expect(handleFixture(new Request(
      "http://localhost/api/_fixtures/admin-collections",
    ))).resolves.toBeNull();
  });
});

/** @returns {Promise<object>} Fixed fixture row counts. */
async function collectionCounts() {
  const row = await env.DB.prepare(
    `select
       (select count(*) from courses) as courses,
       (select count(*) from participants) as participants,
       (select count(*) from admin_users) as admin_users,
       (select count(*) from admin_invites) as admin_invites`,
  ).first();

  return row;
}
