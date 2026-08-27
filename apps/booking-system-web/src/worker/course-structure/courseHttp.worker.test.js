import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdminPersistence } from "../admin-bootstrap/index.js";
import { createCourseHttpHandler } from "./createCourseHttpHandler.js";
import { createCoursePersistence } from "./createCoursePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Course HTTP authorization", () => {
  it("refuses every operation without an authenticated principal", async () => {
    const responses = await Promise.all([
      courseRequest("GET", "/api/admin/courses"),
      courseRequest("POST", "/api/admin/courses", { name: "Course" }),
      courseRequest("GET", "/api/admin/courses/course-1"),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401, 401]);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({
        outcome: "unauthenticated",
      });
    }
  });

  it("refuses missing and Disabled current Admin contexts exactly", async () => {
    const missingCookie = await establishFixture("later-admin");
    const missingResponses = await Promise.all([
      courseRequest("GET", "/api/admin/courses", undefined, missingCookie),
      courseRequest(
        "POST",
        "/api/admin/courses",
        { name: "Course" },
        missingCookie,
      ),
      courseRequest(
        "GET",
        "/api/admin/courses/course-1",
        undefined,
        missingCookie,
      ),
    ]);

    for (const response of missingResponses) {
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        outcome: "no-admin-user",
      });
    }

    const activeCookie = await establishActiveAdmin();
    await env.DB.prepare("update admin_users set state = 'disabled'").run();
    const disabled = await courseRequest(
      "GET",
      "/api/admin/courses",
      undefined,
      activeCookie,
    );

    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({
      outcome: "disabled-admin",
    });
  });

  it("keeps the production Course route unauthenticated and fixture-free", async () => {
    const response = await productionWorker.fetch(
      new Request("http://localhost/api/admin/courses"),
      env,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      outcome: "unauthenticated",
    });
  });
});

describe("Course HTTP creation and reads", () => {
  it("creates a narrow Active Course and exposes stable index/detail reads", async () => {
    const cookie = await establishActiveAdmin();
    const created = await courseRequest(
      "POST",
      "/api/admin/courses",
      {
        name: "Course",
        externalPrincipalId: "browser-principal",
        id: "browser-course",
        state: "archived",
        authority: "super-admin",
      },
      cookie,
    );
    const body = await created.json();

    expect(created.status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
      name: "Course",
      description: null,
      timezone: "Europe/Berlin",
      state: "active",
    });
    expect(body.id).not.toBe("browser-course");

    const detail = await courseRequest(
      "GET",
      `/api/admin/courses/${body.id}`,
      undefined,
      cookie,
    );
    const index = await courseRequest(
      "GET",
      "/api/admin/courses",
      undefined,
      cookie,
    );

    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual({
      ...body,
      groups: [],
      modules: [],
    });
    await expect(index.json()).resolves.toEqual({ courses: [body] });
    await expect(countRows("courses")).resolves.toBe(1);
    await expect(countRows("admin_users")).resolves.toBe(1);
    await expect(countRows("admin_bootstrap_history")).resolves.toBe(1);
  });

  it.each([
    [{ name: "  " }, "invalid-name"],
    [{ name: "Course", description: 12 }, "invalid-description"],
    [{ name: "Course", timezone: "+01:00" }, "invalid-timezone"],
    [{ name: "Course", timezone: "Unknown/Timezone" }, "invalid-timezone"],
  ])("returns 422 for %j", async (input, outcome) => {
    const cookie = await establishActiveAdmin();
    const response = await courseRequest(
      "POST",
      "/api/admin/courses",
      input,
      cookie,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ outcome });
    await expect(countRows("courses")).resolves.toBe(0);
  });

  it("treats malformed JSON as invalid fields and returns an exact 404", async () => {
    const cookie = await establishActiveAdmin();
    const malformed = await nonProductionWorker.fetch(
      new Request("http://localhost/api/admin/courses", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
        },
        body: "{",
      }),
      env,
    );
    const missing = await courseRequest(
      "GET",
      "/api/admin/courses/missing",
      undefined,
      cookie,
    );

    expect(malformed.status).toBe(422);
    await expect(malformed.json()).resolves.toEqual({
      outcome: "invalid-name",
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({
      outcome: "course-not-found",
    });
  });

  it("creates concurrent duplicate-name submissions independently", async () => {
    const cookie = await establishActiveAdmin();
    const responses = await Promise.all([
      courseRequest("POST", "/api/admin/courses", { name: "Same" }, cookie),
      courseRequest("POST", "/api/admin/courses", { name: "Same" }, cookie),
    ]);
    const courses = await Promise.all(
      responses.map((response) => response.json()),
    );

    expect(responses.map(({ status }) => status)).toEqual([201, 201]);
    expect(new Set(courses.map(({ id }) => id)).size).toBe(2);
    await expect(countRows("courses")).resolves.toBe(2);
  });

  it("re-resolves a stale disabled actor and creates no Course", async () => {
    const adminPersistence = createAdminPersistence(env.DB);
    await adminPersistence.claimFirstAdmin({
      id: "admin-stale",
      externalPrincipalId: "principal-stale",
      name: "Stale Admin",
      state: "active",
      authority: "super-admin",
    });
    const persistedCourses = createCoursePersistence(env.DB);
    const coursePersistence = {
      ...persistedCourses,
      async createCourseForActiveAdmin(input) {
        await env.DB.prepare(
          "update admin_users set state = 'disabled' where id = ?",
        )
          .bind(input.adminUserId)
          .run();

        return persistedCourses.createCourseForActiveAdmin(input);
      },
    };
    const handleCourseRequest = createCourseHttpHandler({
      authenticate: vi.fn(async () => ({
        outcome: "authenticated",
        externalPrincipalId: "principal-stale",
      })),
      createCourseId: () => "course-stale",
      adminPersistence,
      coursePersistence,
    });
    const response = await handleCourseRequest(
      new Request("http://localhost/api/admin/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Stale Course" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      outcome: "disabled-admin",
    });
    await expect(countRows("courses")).resolves.toBe(0);
  });
});

/**
 * Establish one fixed non-production Better Auth session.
 *
 * @param {"first-admin" | "later-admin"} fixtureName Fixed fixture name.
 * @returns {Promise<string>} The normal session cookie header.
 */
async function establishFixture(fixtureName) {
  const response = await nonProductionWorker.fetch(
    new Request(`http://localhost/api/_fixtures/session/${fixtureName}`, {
      method: "POST",
    }),
    env,
  );

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/**
 * Establish and bootstrap the deterministic first Active Admin.
 *
 * @returns {Promise<string>} The normal Active Admin session cookie.
 */
async function establishActiveAdmin() {
  const cookie = await establishFixture("first-admin");
  const response = await nonProductionWorker.fetch(
    new Request("http://localhost/api/admin/bootstrap", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Active Admin" }),
    }),
    env,
  );

  expect(response.status).toBe(201);
  return cookie;
}

/**
 * Send one Course request through the non-production Worker composition.
 *
 * @param {string} method HTTP method.
 * @param {string} path Same-origin Course path.
 * @param {object | undefined} body Optional JSON body.
 * @param {string | undefined} cookie Optional normal session cookie.
 * @returns {Promise<Response>} The Worker response.
 */
function courseRequest(method, path, body, cookie) {
  const headers = {};

  if (cookie !== undefined) {
    headers.cookie = cookie;
  }

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

/**
 * Count rows in one fixed test-owned table.
 *
 * @param {"courses" | "admin_users" | "admin_bootstrap_history"} tableName Table to count.
 * @returns {Promise<number>} Current row count.
 */
async function countRows(tableName) {
  const allowedTables = new Set([
    "courses",
    "admin_users",
    "admin_bootstrap_history",
  ]);

  if (!allowedTables.has(tableName)) {
    throw new Error("Unexpected test table.");
  }

  const row = await env.DB.prepare(
    `select count(*) as count from ${tableName}`,
  ).first();

  return row.count;
}
