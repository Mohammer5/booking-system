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

describe("Group management HTTP authorization and fields", () => {
  it("keeps every Group management resource authenticated and production fixture-free", async () => {
    const paths = [
      ["PUT", "/api/admin/courses/course-1/groups/group-1"],
      ["POST", "/api/admin/courses/course-1/groups/group-1/archival"],
      ["POST", "/api/admin/courses/course-1/groups/group-1/reactivation"],
    ];
    const responses = await Promise.all([
      ...paths.map(([method, path]) => groupRequest(method, path, validFields())),
      ...paths.map(([method, path]) =>
        productionWorker.fetch(jsonRequest(method, path, validFields()), env),
      ),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([
      401, 401, 401, 401, 401, 401,
    ]);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({
        outcome: "unauthenticated",
      });
    }
  });

  it("edits a narrow Active or Archived Group while ignoring trust fields", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Edit Groups");
    const active = await createGroup(cookie, course.id, "Active", "Old");
    const activeEdit = await groupRequest(
      "PUT",
      groupPath(course.id, active.id),
      {
        ...validFields({ name: " Active renamed ", details: "Updated" }),
        id: "browser-group",
        courseId: "other-course",
        normalizedName: "attacker",
        state: "archived",
        selections: [{ id: "attacker" }],
      },
      cookie,
    );

    expect(activeEdit.status).toBe(200);
    await expect(activeEdit.json()).resolves.toEqual({
      id: active.id,
      courseId: course.id,
      name: " Active renamed ",
      details: "Updated",
      state: "active",
    });

    const archived = await groupRequest(
      "POST",
      `${groupPath(course.id, active.id)}/archival`,
      undefined,
      cookie,
    );
    expect(archived.status).toBe(200);
    await createGroup(cookie, course.id, "Shared", null);
    const archivedEdit = await groupRequest(
      "PUT",
      groupPath(course.id, active.id),
      validFields({ name: " SHARED ", details: null }),
      cookie,
    );

    expect(archivedEdit.status).toBe(200);
    await expect(archivedEdit.json()).resolves.toMatchObject({
      id: active.id,
      name: " SHARED ",
      details: null,
      state: "archived",
    });
  });

  it("returns exact field, normalized-name, malformed, and identifier outcomes", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Validation Groups");
    const first = await createGroup(cookie, course.id, "First", null);
    const second = await createGroup(cookie, course.id, "Second", null);
    const invalidName = await groupRequest(
      "PUT",
      groupPath(course.id, first.id),
      validFields({ name: "  " }),
      cookie,
    );
    const missingDetails = await groupRequest(
      "PUT",
      groupPath(course.id, first.id),
      { name: "Still First" },
      cookie,
    );
    const conflict = await groupRequest(
      "PUT",
      groupPath(course.id, first.id),
      validFields({ name: " SECOND " }),
      cookie,
    );
    const malformed = await nonProductionWorker.fetch(
      new Request(`http://localhost${groupPath(course.id, first.id)}`, {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: "{",
      }),
      env,
    );
    const wrongCourse = await createCourse(cookie, "Other Course");
    const mismatched = await groupRequest(
      "PUT",
      groupPath(wrongCourse.id, first.id),
      validFields(),
      cookie,
    );

    expect([
      invalidName.status,
      missingDetails.status,
      conflict.status,
      malformed.status,
      mismatched.status,
    ]).toEqual([422, 422, 409, 422, 404]);
    await expect(conflict.json()).resolves.toEqual({
      outcome: "group-name-conflict",
    });
    await expect(mismatched.json()).resolves.toEqual({
      outcome: "group-not-found",
    });
    await expect(groupRow(first.id)).resolves.toMatchObject({ name: "First" });
    await expect(groupRow(second.id)).resolves.toMatchObject({ name: "Second" });
  });
});

describe("Group lifecycle HTTP and retained Participant meaning", () => {
  it("blocks only future intent, then preserves in-progress and Cancelled Selections and details", async () => {
    const adminCookie = await establishActiveAdmin();
    const course = await createCourse(adminCookie, "Retained Group Course");
    const selected = await createGroup(
      adminCookie,
      course.id,
      "Selected Group",
      "Retained details",
    );
    const available = await createGroup(
      adminCookie,
      course.id,
      "Available Group",
      null,
    );
    const participantCookie = await establishParticipant();
    const participant = await participantRequest("GET", "/api/participant/me", undefined, participantCookie)
      .then((response) => response.json());
    await groupRequest(
      "POST",
      `/api/admin/courses/${course.id}/assignments`,
      { participantId: participant.id },
      adminCookie,
    );
    const instant = Date.parse(env.BOOKING_TEST_NOW);

    await insertModuleSelectionSet({
      courseId: course.id,
      groupId: selected.id,
      participantId: participant.id,
      modules: [
        ["future", instant + 60_000, instant + 120_000, "scheduled"],
        ["progress", instant - 60_000, instant + 60_000, "scheduled"],
        ["cancelled", instant + 60_000, instant + 120_000, "cancelled"],
      ],
    });
    const path = `${groupPath(course.id, selected.id)}/archival`;
    const blocked = await groupRequest("POST", path, undefined, adminCookie);

    expect(blocked.status).toBe(409);
    await expect(blocked.json()).resolves.toEqual({
      outcome: "group-archival-blocked",
    });
    await env.DB.prepare(
      "delete from module_selections where module_id = 'module-future'",
    ).run();
    const archived = await groupRequest("POST", path, undefined, adminCookie);

    expect(archived.status).toBe(200);
    await expect(archived.json()).resolves.toMatchObject({
      outcome: "archived",
      group: { id: selected.id, details: "Retained details", state: "archived" },
    });

    const unavailableSelection = await participantRequest(
      "PUT",
      `/api/participant/courses/${course.id}/modules/module-future/selection`,
      { groupId: selected.id },
      participantCookie,
    );

    expect(unavailableSelection.status).toBe(409);
    await expect(unavailableSelection.json()).resolves.toEqual({
      outcome: "group-not-selectable",
    });

    const participantDetail = await participantRequest(
      "GET",
      `/api/participant/courses/${course.id}`,
      undefined,
      participantCookie,
    );
    const detail = await participantDetail.json();

    expect(participantDetail.status).toBe(200);
    expect(detail.groups).toEqual([
      expect.objectContaining({ id: available.id, state: "active" }),
    ]);
    expect(detail.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "module-progress",
        selection: expect.objectContaining({
          meaning: "live",
          group: {
            id: selected.id,
            name: "Selected Group",
            details: "Retained details",
            state: "archived",
          },
        }),
      }),
      expect.objectContaining({
        id: "module-cancelled",
        selection: expect.objectContaining({
          meaning: "historical",
          group: expect.objectContaining({ id: selected.id, state: "archived" }),
        }),
      }),
    ]));
    await expect(selectionIds()).resolves.toEqual([
      "selection-cancelled",
      "selection-progress",
    ]);
  });

  it("refuses reactivation conflict, then renames and reactivates the retained Group", async () => {
    const cookie = await establishActiveAdmin();
    const course = await createCourse(cookie, "Reactivate Groups");
    const target = await createGroup(cookie, course.id, "Shared", "Details");
    await groupRequest(
      "POST",
      `${groupPath(course.id, target.id)}/archival`,
      undefined,
      cookie,
    );
    await createGroup(cookie, course.id, " SHARED ", null);
    const conflict = await groupRequest(
      "POST",
      `${groupPath(course.id, target.id)}/reactivation`,
      undefined,
      cookie,
    );

    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual({
      outcome: "group-name-conflict",
    });
    const renamed = await groupRequest(
      "PUT",
      groupPath(course.id, target.id),
      validFields({ name: "Restored", details: "Details remain" }),
      cookie,
    );
    const reactivated = await groupRequest(
      "POST",
      `${groupPath(course.id, target.id)}/reactivation`,
      undefined,
      cookie,
    );

    expect(renamed.status).toBe(200);
    expect(reactivated.status).toBe(200);
    await expect(reactivated.json()).resolves.toEqual({
      outcome: "reactivated",
      group: {
        id: target.id,
        courseId: course.id,
        name: "Restored",
        details: "Details remain",
        state: "active",
      },
    });
  });
});

describe("Group management HTTP current-state acceptance", () => {
  it("rechecks a name or retained-reference race with no partial mutation", async () => {
    await seedDirectStructure();
    const persistence = createGroupPersistence(env.DB);
    const nameRace = createDirectHandler({
      groupPersistence: {
        ...persistence,
        async updateGroupForActiveAdmin(input) {
          await insertGroupDirect("group-rival", "course-1", "Raced", "raced", null, "active");
          return persistence.updateGroupForActiveAdmin(input);
        },
      },
    });
    const nameResponse = await nameRace(
      jsonRequest(
        "PUT",
        "/api/admin/courses/course-1/groups/group-1",
        validFields({ name: "RACED" }),
      ),
    );

    expect(nameResponse.status).toBe(409);
    await expect(nameResponse.json()).resolves.toEqual({
      outcome: "group-name-conflict",
    });
    await insertParticipantStructureForRace();
    const referenceRace = createDirectHandler({
      groupPersistence: {
        ...persistence,
        async archiveActiveGroup(input) {
          await env.DB.prepare(
            `insert into module_selections
               (id, participant_id, course_id, module_id, group_id)
             values ('selection-race', 'participant-1', 'course-1',
                     'module-future', 'group-1')`,
          ).run();
          return persistence.archiveActiveGroup(input);
        },
      },
    });
    const archiveResponse = await referenceRace(
      jsonRequest(
        "POST",
        "/api/admin/courses/course-1/groups/group-1/archival",
      ),
    );

    expect(archiveResponse.status).toBe(409);
    await expect(archiveResponse.json()).resolves.toEqual({
      outcome: "group-archival-blocked",
    });
    await expect(groupRow("group-1")).resolves.toMatchObject({
      name: "Original",
      details: "Old",
      state: "active",
    });
  });

  it("re-resolves Disabled Admin and Archived Course and sanitizes technical failure", async () => {
    await seedDirectStructure();
    const persisted = createGroupPersistence(env.DB);
    const staleAdmin = createDirectHandler({
      groupPersistence: {
        ...persisted,
        async updateGroupForActiveAdmin(input) {
          await env.DB.prepare(
            "update admin_users set state = 'disabled' where id = 'admin-1'",
          ).run();
          return persisted.updateGroupForActiveAdmin(input);
        },
      },
    });
    const disabled = await staleAdmin(
      jsonRequest(
        "PUT",
        "/api/admin/courses/course-1/groups/group-1",
        validFields(),
      ),
    );

    expect(disabled.status).toBe(403);
    await expect(disabled.json()).resolves.toEqual({ outcome: "disabled-admin" });
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-1'",
    ).run();
    const staleCourse = createDirectHandler({
      groupPersistence: {
        ...persisted,
        async reactivateArchivedGroup(input) {
          await env.DB.prepare(
            "update courses set state = 'archived' where id = 'course-1'",
          ).run();
          return persisted.reactivateArchivedGroup(input);
        },
      },
    });
    await env.DB.prepare(
      "update groups set state = 'archived' where id = 'group-1'",
    ).run();
    const archivedCourse = await staleCourse(
      jsonRequest(
        "POST",
        "/api/admin/courses/course-1/groups/group-1/reactivation",
      ),
    );

    expect(archivedCourse.status).toBe(409);
    await expect(archivedCourse.json()).resolves.toEqual({
      outcome: "course-not-active",
    });
    await env.DB.prepare(
      "update courses set state = 'active' where id = 'course-1'",
    ).run();
    const technical = createDirectHandler({
      groupPersistence: {
        ...persisted,
        async updateGroupForActiveAdmin() {
          throw new Error("secret D1 details");
        },
      },
    });
    const failure = await technical(
      jsonRequest(
        "PUT",
        "/api/admin/courses/course-1/groups/group-1",
        validFields(),
      ),
    );

    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ outcome: "technical-error" });
  });
});

/** @returns {string} Stable nested Group resource path. */
function groupPath(courseId, groupId) {
  return `/api/admin/courses/${courseId}/groups/${groupId}`;
}

/** @returns {object} Complete valid Group fields. */
function validFields(override = {}) {
  return { name: "Updated Group", details: null, ...override };
}

/** @returns {Promise<string>} Establish and bootstrap an Active Admin session. */
async function establishActiveAdmin() {
  const cookie = await establishFixture("first-admin");
  const bootstrap = await groupRequest(
    "POST",
    "/api/admin/bootstrap",
    { name: "Group Admin" },
    cookie,
  );

  expect(bootstrap.status).toBe(201);
  return cookie;
}

/** @returns {Promise<string>} Establish and register the fixed Participant. */
async function establishParticipant() {
  const cookie = await establishFixture("selection-participant");
  const onboarding = await participantRequest(
    "POST",
    "/api/participant/onboarding",
    { name: "Group Participant", email: "group-participant@example.com" },
    cookie,
  );

  expect(onboarding.status).toBe(201);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixture-backed normal session. */
async function establishFixture(fixture) {
  const response = await nonProductionWorker.fetch(
    new Request(`http://localhost/api/_fixtures/session/${fixture}`, {
      method: "POST",
    }),
    env,
  );

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<object>} Create one Course through normal HTTP. */
async function createCourse(cookie, name) {
  const response = await groupRequest(
    "POST",
    "/api/admin/courses",
    { name },
    cookie,
  );

  expect(response.status).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one Group through normal HTTP. */
async function createGroup(cookie, courseId, name, details) {
  const response = await groupRequest(
    "POST",
    `/api/admin/courses/${courseId}/groups`,
    { name, details },
    cookie,
  );

  expect(response.status).toBe(201);
  return response.json();
}

/** @returns {Promise<Response>} Send a non-production Worker request. */
function groupRequest(method, path, body, cookie) {
  return nonProductionWorker.fetch(jsonRequest(method, path, body, cookie), env);
}

/** @returns {Promise<Response>} Send a Participant Worker request. */
function participantRequest(method, path, body, cookie) {
  return nonProductionWorker.fetch(jsonRequest(method, path, body, cookie), env);
}

/** @returns {Request} Build one same-origin JSON request. */
function jsonRequest(method, path, body, cookie) {
  const headers = {};

  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie !== undefined) headers.cookie = cookie;

  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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

/** @returns {Promise<void>} Seed direct current Admin, Course, and Group state. */
async function seedDirectStructure() {
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
  await insertGroupDirect(
    "group-1",
    "course-1",
    "Original",
    "original",
    "Old",
    "active",
  );
}

/** @returns {Promise<void>} Seed a future eligible Selection race context. */
async function insertParticipantStructureForRace() {
  const now = Date.parse(env.BOOKING_TEST_NOW);

  await env.DB.batch([
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-1', 'participant-1', 'Participant',
               'participant@example.com', 'participant@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-1', 'participant-1', 'course-1', 'active')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-future', 'course-1', 'Future', null, null,
               ?, ?, 'scheduled')`,
    )
      .bind(now + 60_000, now + 120_000),
  ]);
}

/** @returns {Promise<void>} Insert Modules and retained Selections. */
async function insertModuleSelectionSet(input) {
  for (const [suffix, startsAt, endsAt, state] of input.modules) {
    await env.DB.batch([
      env.DB.prepare(
        `insert into modules
           (id, course_id, title, description, instructions,
            starts_at, ends_at, state)
         values (?, ?, ?, null, null, ?, ?, ?)`,
      )
        .bind(`module-${suffix}`, input.courseId, `Module ${suffix}`, startsAt, endsAt, state),
      env.DB.prepare(
        `insert into module_selections
           (id, participant_id, course_id, module_id, group_id)
         values (?, ?, ?, ?, ?)`,
      )
        .bind(
          `selection-${suffix}`,
          input.participantId,
          input.courseId,
          `module-${suffix}`,
          input.groupId,
        ),
    ]);
  }
}

/** @returns {Promise<void>} Insert one raw Group. */
function insertGroupDirect(id, courseId, name, normalizedName, details, state) {
  return env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, courseId, name, normalizedName, details, state)
    .run();
}

/** @returns {Promise<object>} Read one raw Group row. */
function groupRow(groupId) {
  return env.DB.prepare("select * from groups where id = ?").bind(groupId).first();
}

/** @returns {Promise<Array<string>>} Read ordered Selection identities. */
async function selectionIds() {
  const { results } = await env.DB.prepare(
    "select id from module_selections order by id",
  ).all();

  return results.map(({ id }) => id);
}
