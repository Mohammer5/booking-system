import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdminPersistence } from "../admin-bootstrap/index.js";
import { createCourseHttpHandler } from "./createCourseHttpHandler.js";
import { createCoursePersistence } from "./createCoursePersistence.js";
import { createGroupPersistence } from "./createGroupPersistence.js";
import { createModulePersistence } from "./createModulePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from participants"),
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

describe("Course edit HTTP", () => {
  it("keeps edit authenticated in non-production and production", async () => {
    const responses = await Promise.all([
      courseRequest("PUT", "/api/admin/courses/course-1", validFields()),
      productionWorker.fetch(
        jsonRequest("PUT", "/api/admin/courses/course-1", validFields()),
        env,
      ),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401]);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({
        outcome: "unauthenticated",
      });
    }
  });

  it("updates a narrow Course while ignoring identity, state, and history trust fields", async () => {
    const cookie = await establishActiveAdmin();
    const first = await createCourse(cookie, "First");
    await createCourse(cookie, "Duplicate allowed");
    const response = await courseRequest(
      "PUT",
      `/api/admin/courses/${first.id}`,
      {
        ...validFields({
          name: "Duplicate allowed",
          description: "Updated description",
          timezone: "America/New_York",
        }),
        id: "browser-course",
        state: "archived",
        hasEverHadModule: true,
        isTimezoneEditable: false,
        groups: [{ id: "browser-group" }],
      },
      cookie,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: first.id,
      name: "Duplicate allowed",
      description: "Updated description",
      timezone: "America/New_York",
      state: "active",
      isTimezoneEditable: true,
    });
    await expect(courseRow(first.id)).resolves.toMatchObject({
      id: first.id,
      name: "Duplicate allowed",
      description: "Updated description",
      timezone: "America/New_York",
      state: "active",
      has_ever_had_module: 0,
    });
  });

  it.each([
    [{ ...validFields(), name: "  " }, "invalid-name"],
    [{ ...validFields(), description: 12 }, "invalid-description"],
    [{ ...validFields(), timezone: "" }, "invalid-timezone"],
    [{ ...validFields(), timezone: "+01:00" }, "invalid-timezone"],
    [{ ...validFields(), timezone: "Unknown/Timezone" }, "invalid-timezone"],
  ])("returns 422 for invalid complete fields %j", async (body, outcome) => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Unchanged");
    const response = await courseRequest(
      "PUT",
      `/api/admin/courses/${course.id}`,
      body,
      cookie,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ outcome });
    await expect(courseRow(course.id)).resolves.toMatchObject({
      name: "Unchanged",
      description: null,
      timezone: "Europe/Berlin",
    });
  });

  it("treats malformed JSON as invalid fields and unknown Course as 404", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Malformed");
    const malformed = await nonProductionWorker.fetch(
      new Request(`http://localhost/api/admin/courses/${course.id}`, {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: "{",
      }),
      env,
    );
    const missing = await courseRequest(
      "PUT",
      "/api/admin/courses/missing",
      validFields(),
      cookie,
    );

    expect(malformed.status).toBe(422);
    await expect(malformed.json()).resolves.toEqual({ outcome: "invalid-name" });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({
      outcome: "course-not-found",
    });
  });

  it("keeps timezone permanently locked after the first Module is deleted", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Locked Course");
    const moduleResponse = await courseRequest(
      "POST",
      `/api/admin/courses/${course.id}/modules`,
      {
        title: "First Module",
        startsAtLocal: "2027-01-15T10:30",
        endsAtLocal: "2027-01-15T11:30",
      },
      cookie,
    );

    expect(moduleResponse.status).toBe(201);
    await env.DB.prepare("delete from modules where course_id = ?")
      .bind(course.id)
      .run();
    const refusal = await courseRequest(
      "PUT",
      `/api/admin/courses/${course.id}`,
      validFields({ name: "Must not change", timezone: "Europe/London" }),
      cookie,
    );

    expect(refusal.status).toBe(409);
    await expect(refusal.json()).resolves.toEqual({
      outcome: "course-timezone-locked",
    });
    await expect(courseRow(course.id)).resolves.toMatchObject({
      name: "Locked Course",
      timezone: "Europe/Berlin",
      has_ever_had_module: 1,
    });

    const descriptiveEdit = await courseRequest(
      "PUT",
      `/api/admin/courses/${course.id}`,
      validFields({ name: "Renamed after scheduling" }),
      cookie,
    );

    expect(descriptiveEdit.status).toBe(200);
    await expect(descriptiveEdit.json()).resolves.toMatchObject({
      name: "Renamed after scheduling",
      isTimezoneEditable: false,
    });
  });

  it("re-resolves stale Disabled Admin and Archived Course outcomes", async () => {
    await seedDirectAdminAndCourse();
    const persistedCourses = createCoursePersistence(env.DB);
    const staleAdminHandler = createDirectHandler({
      coursePersistence: {
        ...persistedCourses,
        async updateActiveCourseForActiveAdmin(input) {
          await env.DB.prepare(
            "update admin_users set state = 'disabled' where id = 'admin-1'",
          ).run();
          return persistedCourses.updateActiveCourseForActiveAdmin(input);
        },
      },
    });
    const disabled = await staleAdminHandler(
      jsonRequest("PUT", "/api/admin/courses/course-1", validFields()),
    );

    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({ outcome: "disabled-admin" });
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-1'",
    ).run();
    const staleCourseHandler = createDirectHandler({
      coursePersistence: {
        ...persistedCourses,
        async updateActiveCourseForActiveAdmin(input) {
          await env.DB.prepare(
            "update courses set state = 'archived' where id = 'course-1'",
          ).run();
          return persistedCourses.updateActiveCourseForActiveAdmin(input);
        },
      },
    });
    const archived = await staleCourseHandler(
      jsonRequest("PUT", "/api/admin/courses/course-1", validFields()),
    );

    expect(archived.status).toBe(409);
    await expect(archived.json()).resolves.toEqual({
      outcome: "course-not-active",
    });
    await expect(courseRow("course-1")).resolves.toMatchObject({
      name: "Course",
      description: null,
      timezone: "Europe/Berlin",
      state: "archived",
    });
  });

  it("refuses a Module resolved through a concurrently superseded timezone", async () => {
    await seedDirectAdminAndCourse();
    const modulePersistence = createModulePersistence(env.DB);
    const handler = createDirectHandler({
      modulePersistence: {
        ...modulePersistence,
        async createModuleForActiveAdmin(input) {
          await env.DB.prepare(
            "update courses set timezone = 'America/New_York' where id = 'course-1'",
          ).run();
          return modulePersistence.createModuleForActiveAdmin(input);
        },
      },
    });
    const response = await handler(
      jsonRequest("POST", "/api/admin/courses/course-1/modules", {
        title: "Stale timezone",
        startsAtLocal: "2027-01-15T10:30",
        endsAtLocal: "2027-01-15T11:30",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      outcome: "course-timezone-changed",
    });
    await expect(countModules()).resolves.toBe(0);
    await expect(courseRow("course-1")).resolves.toMatchObject({
      timezone: "America/New_York",
      has_ever_had_module: 0,
    });
  });

  it("sanitizes a technical edit failure without changing Course fields", async () => {
    await seedDirectAdminAndCourse();
    const persistedCourses = createCoursePersistence(env.DB);
    const handler = createDirectHandler({
      coursePersistence: {
        ...persistedCourses,
        async updateActiveCourseForActiveAdmin() {
          throw new Error("private D1 failure");
        },
      },
    });
    const response = await handler(
      jsonRequest("PUT", "/api/admin/courses/course-1", validFields()),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      outcome: "technical-error",
    });
    await expect(courseRow("course-1")).resolves.toMatchObject({
      name: "Course",
      description: null,
      timezone: "Europe/Berlin",
    });
  });
});

/** @returns {object} Complete valid Course edit fields. */
function validFields(override = {}) {
  return {
    name: "Updated Course",
    description: null,
    timezone: "Europe/Berlin",
    ...override,
  };
}

/** @returns {Promise<string>} Establish one Active Admin normal session. */
async function establishActiveAdmin() {
  const fixture = await nonProductionWorker.fetch(
    new Request("http://localhost/api/_fixtures/session/first-admin", {
      method: "POST",
    }),
    env,
  );
  const cookie = fixture.headers.get("set-cookie").split(";", 1)[0];
  const bootstrap = await courseRequest(
    "POST",
    "/api/admin/bootstrap",
    { name: "Course Edit Admin" },
    cookie,
  );

  expect(fixture.status).toBe(204);
  expect(bootstrap.status).toBe(201);
  return cookie;
}

/** @returns {Promise<object>} Create one Course through normal HTTP. */
async function createCourse(cookie, name) {
  const response = await courseRequest(
    "POST",
    "/api/admin/courses",
    { name },
    cookie,
  );

  expect(response.status).toBe(201);
  return response.json();
}

/** @returns {Promise<Response>} Send one normal non-production Course request. */
function courseRequest(method, path, body, cookie) {
  const headers = {};

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (cookie !== undefined) {
    headers.cookie = cookie;
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

/** @returns {Request} Build one JSON request for a direct handler. */
function jsonRequest(method, path, body) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Insert one direct Active Admin and Course. */
async function seedDirectAdminAndCourse() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into admin_users
         (id, external_principal_id, name, state, authority)
       values ('admin-1', 'principal-admin-1', 'Admin', 'active', 'admin')`,
    ),
    env.DB.prepare(
      `insert into courses (id, name, description, timezone, state)
       values ('course-1', 'Course', null, 'Europe/Berlin', 'active')`,
    ),
  ]);
}

/** @returns {(request: Request) => Promise<Response>} Direct Course handler. */
function createDirectHandler(override) {
  return createCourseHttpHandler({
    authenticate: vi.fn(async () => ({
      outcome: "authenticated",
      externalPrincipalId: "principal-admin-1",
    })),
    createCourseId: () => "course-new",
    createGroupId: () => "group-new",
    createModuleId: () => "module-new",
    now: () => env.BOOKING_TEST_NOW,
    adminPersistence: createAdminPersistence(env.DB),
    coursePersistence: createCoursePersistence(env.DB),
    groupPersistence: createGroupPersistence(env.DB),
    modulePersistence: createModulePersistence(env.DB),
    ...override,
  });
}

/** @returns {Promise<object>} Read raw Course fields and history. */
function courseRow(courseId) {
  return env.DB.prepare(
    `select id, name, description, timezone, state, has_ever_had_module
       from courses where id = ?`,
  )
    .bind(courseId)
    .first();
}

/** @returns {Promise<number>} Count current Modules. */
async function countModules() {
  const row = await env.DB.prepare("select count(*) as count from modules").first();

  return row.count;
}
