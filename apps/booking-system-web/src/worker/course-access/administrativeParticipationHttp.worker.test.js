import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createAdministrativeParticipationHttpHandler } from "./createAdministrativeParticipationHttpHandler.js";
import { createAdministrativeParticipationPersistence } from "./createAdministrativeParticipationPersistence.js";
import { createModuleSelectionPersistence } from "../module-participation/createModuleSelectionPersistence.js";

const nowEpoch = Date.parse("2026-08-28T10:00:00.000Z");

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

describe("administrative participation authorization and contract", () => {
  it("accepts only target-detail routes and retires the broad overview", async () => {
    const cookie = await activeAdminCookie();
    await seedCourse("active");

    for (const [method, path] of [
      ["POST", "/api/admin/courses/course-a/participation"],
      ["GET", "/api/admin/courses/course-a/participation"],
      ["GET", "/api/admin/courses/course-a/participation/"],
    ]) {
      await expectOutcome(await request(path, cookie, { method }), 404, "not-found");
    }

    await expectOutcome(
      await get(
        "/api/admin/courses/course-a/participation/participant-missing",
        cookie,
      ),
      404,
      "participation-unavailable",
    );

    const production = await productionWorker.fetch(
      new Request(
        "http://localhost/api/admin/courses/course-a/participation/participant-a",
      ),
      env,
    );

    await expectOutcome(production, 401, "unauthenticated");
  });

  it("returns no data to unauthenticated, missing, Disabled, or stale Admins", async () => {
    await seedCourse("active");
    await seedParticipant("target", "active");
    const path =
      "/api/admin/courses/course-a/participation/participant-target";
    const unauthenticated = await get(
      path,
      null,
    );
    const cookie = await establishFixture("first-admin");
    const missing = await get(
      path,
      cookie,
    );

    await bootstrapAdmin(cookie);
    await env.DB.prepare("update admin_users set state = 'disabled'").run();
    const disabled = await get(
      path,
      cookie,
    );

    await expectOutcome(unauthenticated, 401, "unauthenticated");
    await expectOutcome(missing, 403, "no-admin-user");
    await expectOutcome(disabled, 403, "disabled-admin");

    await env.DB.prepare("update admin_users set state = 'active'").run();
    const persistence = createAdministrativeParticipationPersistence(env.DB);
    const handler = createAdministrativeParticipationHttpHandler({
      authenticate: async () => ({
        outcome: "authenticated",
        externalPrincipalId: "fixture-first-admin",
      }),
      now: () => env.BOOKING_TEST_NOW,
      adminPersistence: {
        async findAdminUserByExternalPrincipalId() {
          await env.DB.prepare("update admin_users set state = 'disabled'").run();
          return {
            id: "admin-first",
            externalPrincipalId: "fixture-first-admin",
            state: "active",
            authority: "super-admin",
          };
        },
      },
      persistence,
    });
    const stale = await handler(
      new Request(`http://localhost${path}`),
    );

    await expectOutcome(stale, 404, "participation-unavailable");
  });

  it("uses the same safe outcome for missing Course and sanitizes failures", async () => {
    const cookie = await activeAdminCookie();
    const missing = await get(
      "/api/admin/courses/missing/participation/participant-target",
      cookie,
    );
    const handler = createAdministrativeParticipationHttpHandler({
      authenticate: async () => ({
        outcome: "authenticated",
        externalPrincipalId: "admin-principal",
      }),
      now: () => env.BOOKING_TEST_NOW,
      adminPersistence: {
        findAdminUserByExternalPrincipalId: async () => ({
          id: "admin-a",
          state: "active",
        }),
      },
      persistence: {
        findParticipantParticipation: async () => {
          throw new Error("private-person@example.com");
        },
      },
    });
    const failed = await handler(
      new Request(
        "http://localhost/api/admin/courses/private/participation/participant-target",
      ),
    );

    await expectOutcome(missing, 404, "participation-unavailable");
    await expectOutcome(failed, 500, "technical-error");
    expect(failed.headers.get("cache-control")).toBe("no-store");
  });
});

describe("administrative participation lifecycle presentation", () => {
  it("composes future, in-progress, ended, Cancelled, Disabled, and Revoked states", async () => {
    const cookie = await activeAdminCookie();
    await seedCompleteLifecycleCourse();
    const response = await get(
      "/api/admin/courses/course-a/participation/participant-active",
      cookie,
    );
    const body = await response.json();
    const disabled = await (await get(
      "/api/admin/courses/course-a/participation/participant-disabled",
      cookie,
    )).json();
    const revoked = await (await get(
      "/api/admin/courses/course-a/participation/participant-revoked",
      cookie,
    )).json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.course).toMatchObject({ id: "course-a", state: "active" });
    expect(body.groups).toEqual([
      groupResponse("active", "Active Group", "active"),
      groupResponse("archived", "Archived Group", "archived"),
    ]);
    expect(body.modules.map(({ id, state }) => ({ id, state }))).toEqual([
      { id: "module-ended", state: "scheduled" },
      { id: "module-current", state: "scheduled" },
      { id: "module-cancelled", state: "cancelled" },
      { id: "module-future", state: "scheduled" },
    ]);
    expect(body.participation).toMatchObject({
      participant: { email: "active@example.com", state: "active" },
      assignment: { state: "active" },
      selections: [
        { moduleId: "module-ended", meaning: "historical", phase: "historical" },
        {
          moduleId: "module-current",
          meaning: "live",
          phase: "in-progress",
          group: {
            id: "group-archived",
            name: "Archived Group",
            details: "Details archived",
            state: "archived",
          },
        },
        { moduleId: "module-cancelled", meaning: "historical", phase: "historical" },
        { moduleId: "module-future", meaning: "live", phase: "upcoming" },
      ],
    });
    expect(disabled.participation).toMatchObject({
      participant: { state: "disabled" },
      assignment: { state: "active" },
      selections: [{ meaning: "historical", phase: "historical" }],
    });
    expect(revoked.participation).toMatchObject({
      participant: { state: "active" },
      assignment: { state: "revoked" },
      selections: [{ meaning: "historical", phase: "historical" }],
    });
  });

  it("shows Course archival and exact endsAt as historical, then valid return to live", async () => {
    const cookie = await activeAdminCookie();
    await seedCompleteLifecycleCourse();
    const path =
      "/api/admin/courses/course-a/participation/participant-active";

    await env.DB.prepare("update courses set state = 'archived'").run();
    const archived = await (await get(path, cookie)).json();

    expect(archived.course.state).toBe("archived");
    expect(
      archived.participation.selections.every(
        ({ meaning }) => meaning === "historical",
      ),
    ).toBe(true);

    await env.DB.prepare("update courses set state = 'active'").run();
    await env.DB.prepare(
      "update participants set state = 'active' where id = 'participant-disabled'",
    ).run();
    await env.DB.prepare(
      "update course_assignments set state = 'active' where id = 'assignment-revoked'",
    ).run();
    const restoredActive = await (await get(path, cookie)).json();
    const restoredDisabled = await (await get(
      "/api/admin/courses/course-a/participation/participant-disabled",
      cookie,
    )).json();
    const restoredRevoked = await (await get(
      "/api/admin/courses/course-a/participation/participant-revoked",
      cookie,
    )).json();

    expect(
      restoredDisabled.participation.selections[0],
    ).toMatchObject({ meaning: "live", phase: "in-progress" });
    expect(
      restoredRevoked.participation.selections[0],
    ).toMatchObject({ meaning: "live", phase: "in-progress" });
    expect(
      restoredActive.participation.selections.find(
        ({ moduleId }) => moduleId === "module-ended",
      ),
    ).toMatchObject({ meaning: "historical", phase: "historical" });
  });

  it("does not widen the Participant response with peer or Admin data", async () => {
    const adminCookie = await activeAdminCookie();
    await seedCompleteLifecycleCourse();
    const participantCookie = await establishFixture("participant-a");
    await env.DB.prepare(
      `update participants set external_principal_id = 'fixture-participant-a'
        where id = 'participant-active'`,
    ).run();
    const adminBody = await (
      await get(
        "/api/admin/courses/course-a/participation/participant-active",
        adminCookie,
      )
    ).json();
    const participantResponse = await get(
      "/api/participant/courses/course-a",
      participantCookie,
    );
    const participantBody = await participantResponse.json();

    expect(adminBody).not.toHaveProperty("participations");
    expect(adminBody.participation.participant.id).toBe("participant-active");
    expect(participantResponse.status).toBe(200);
    expect(participantBody).not.toHaveProperty("participations");
    const serialized = JSON.stringify(participantBody);

    for (const forbidden of [
      "disabled@example.com",
      "revoked@example.com",
      "participant-disabled",
      "participant-revoked",
      "assignment-active",
      "admin-first",
      "authority",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe("Admin-assisted Module Selection HTTP", () => {
  it("reads an unassigned target and creates, reselects, replaces, removes, and reactivates", async () => {
    const cookie = await activeAdminCookie();

    await seedAssistedBookingGraph();
    const detailPath =
      "/api/admin/courses/course-a/participation/participant-target";
    const selectionPath = `${detailPath}/modules/module-future/selection`;
    const initial = await (await get(detailPath, cookie)).json();

    expect(initial.participation.assignment).toBeNull();
    expect(initial.participation.selections).toEqual([]);
    expect(initial.modules[0].selectionAvailability).toBe("open");

    const created = await request(selectionPath, cookie, setOptions("group-active"));
    const createdBody = await created.json();
    expect(created.status).toBe(201);
    expect(createdBody).toMatchObject({
      outcome: "created",
      assignmentOutcome: "created",
      assignment: { state: "active" },
      selection: { moduleId: "module-future", groupId: "group-active" },
    });

    const repeated = await request(selectionPath, cookie, setOptions("group-active"));
    const repeatedBody = await repeated.json();
    expect(repeated.status).toBe(200);
    expect(repeatedBody).toMatchObject({
      outcome: "already-selected",
      assignmentOutcome: "already-active",
    });
    const changed = await request(selectionPath, cookie, setOptions("group-second"));
    const changedBody = await changed.json();
    expect(changed.status).toBe(200);
    expect(changedBody).toMatchObject({
      outcome: "changed",
      assignmentOutcome: "already-active",
      selection: { groupId: "group-second" },
    });

    await expectOutcome(
      await request(selectionPath, cookie, { method: "DELETE" }),
      200,
      "removed",
    );
    await env.DB.prepare(
      "update course_assignments set state = 'revoked' where participant_id = 'participant-target'",
    ).run();
    const reactivated = await request(
      selectionPath,
      cookie,
      setOptions("group-active"),
    );
    const reactivatedBody = await reactivated.json();

    expect(reactivated.status).toBe(201);
    expect(reactivatedBody).toMatchObject({
      outcome: "created",
      assignmentOutcome: "reactivated",
      assignment: { id: createdBody.assignment.id, state: "active" },
    });
    const refreshed = await (await get(detailPath, cookie)).json();
    expect(refreshed.participation.selections).toHaveLength(1);
    expect(refreshed.participation.selections[0]).toMatchObject({
      moduleId: "module-future",
      meaning: "live",
      phase: "upcoming",
    });
  });

  it.each([
    ["Disabled Participant", "participant-not-active", "update participants set state = 'disabled'", "group-second"],
    ["Archived Course", "course-not-active", "update courses set state = 'archived'", "group-second"],
    ["Cancelled Module", "module-not-selectable", "update modules set state = 'cancelled'", "group-second"],
    ["exact deadline", "selection-deadline-reached", null, "group-second"],
    ["Archived Group", "group-not-selectable", "update groups set state = 'archived' where id = 'group-second'", "group-second"],
    ["cross-Course Group", "group-not-selectable", null, "group-other"],
  ])("refuses %s without changing membership or Selection", async (
    caseName,
    outcome,
    mutation,
    groupId,
  ) => {
    const cookie = await activeAdminCookie();

    await seedAssistedBookingGraph(
      caseName === "exact deadline" ? nowEpoch : nowEpoch + 3_600_000,
    );
    await seedAssignment("target", "revoked");
    await seedSelection("old", "target", "future", "active");
    if (groupId === "group-other") await seedCrossCourseGroup();
    if (mutation !== null) await env.DB.prepare(mutation).run();
    const path = "/api/admin/courses/course-a/participation/participant-target/modules/module-future/selection";

    await expectOutcome(
      await request(path, cookie, setOptions(groupId)),
      409,
      outcome,
    );
    await expect(
      env.DB.prepare(
        "select state from course_assignments where id = 'assignment-target'",
      ).first(),
    ).resolves.toMatchObject({ state: "revoked" });
    await expect(
      env.DB.prepare(
        "select group_id from module_selections where id = 'selection-old'",
      ).first(),
    ).resolves.toMatchObject({ group_id: "group-active" });
  });

  it("removal ignores Revoked membership but refuses lifecycle closure without changing it", async () => {
    const cookie = await activeAdminCookie();

    await seedAssistedBookingGraph();
    await seedAssignment("target", "revoked");
    await seedSelection("old", "target", "future", "active");
    const path = "/api/admin/courses/course-a/participation/participant-target/modules/module-future/selection";

    await expectOutcome(
      await request(path, cookie, { method: "DELETE" }),
      200,
      "removed",
    );
    await expect(
      env.DB.prepare(
        "select state from course_assignments where id = 'assignment-target'",
      ).first(),
    ).resolves.toMatchObject({ state: "revoked" });
    await seedSelection("again", "target", "future", "active");
    await env.DB.prepare("update modules set state = 'cancelled'").run();
    await expectOutcome(
      await request(path, cookie, { method: "DELETE" }),
      409,
      "module-not-selectable",
    );
    await expect(
      env.DB.prepare("select count(*) as count from module_selections").first(),
    ).resolves.toMatchObject({ count: 1 });
  });

  it("refuses a Disabled Admin before mutation and leaves no partial rows", async () => {
    const cookie = await activeAdminCookie();

    await seedAssistedBookingGraph();
    await env.DB.prepare("update admin_users set state = 'disabled'").run();
    const path = "/api/admin/courses/course-a/participation/participant-target/modules/module-future/selection";

    await expectOutcome(
      await request(path, cookie, setOptions("group-active")),
      403,
      "disabled-admin",
    );
    await expect(
      env.DB.prepare("select count(*) as count from course_assignments").first(),
    ).resolves.toMatchObject({ count: 0 });
  });

  it("loses a stale Admin race at persistence without leaving membership", async () => {
    await seedAdminIdentity();
    await seedAssistedBookingGraph();
    const persistence = createAdministrativeParticipationPersistence(env.DB);
    const handler = createAdministrativeParticipationHttpHandler({
      authenticate: async () => ({
        outcome: "authenticated",
        externalPrincipalId: "principal-admin",
      }),
      createCourseAssignmentId: () => "assignment-stale",
      createModuleSelectionId: () => "selection-stale",
      now: () => new Date(nowEpoch).toISOString(),
      adminPersistence: {
        findAdminUserByExternalPrincipalId: async () => ({
          id: "admin-a",
          state: "active",
        }),
      },
      persistence: {
        ...persistence,
        async findParticipantParticipation(...parameters) {
          const result = await persistence.findParticipantParticipation(...parameters);

          await env.DB.prepare("update admin_users set state = 'disabled'").run();
          return result;
        },
      },
      selectionPersistence: createModuleSelectionPersistence(env.DB),
    });
    const response = await handler(new Request(
      "http://localhost/api/admin/courses/course-a/participation/participant-target/modules/module-future/selection",
      setOptions("group-active"),
    ));

    await expectOutcome(response, 403, "admin-not-active");
    await expect(
      env.DB.prepare("select count(*) as count from course_assignments").first(),
    ).resolves.toMatchObject({ count: 0 });
    await expect(
      env.DB.prepare("select count(*) as count from module_selections").first(),
    ).resolves.toMatchObject({ count: 0 });
  });
});

/** @returns {Promise<string>} Establish and bootstrap one Active Admin. */
async function activeAdminCookie() {
  const cookie = await establishFixture("first-admin");

  await bootstrapAdmin(cookie);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixture session. */
async function establishFixture(name) {
  const response = await nonProductionWorker.fetch(
    new Request(`http://localhost/api/_fixtures/session/${name}`, {
      method: "POST",
    }),
    env,
  );

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<void>} Bootstrap the fixture Admin. */
async function bootstrapAdmin(cookie) {
  const response = await request("/api/admin/bootstrap", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Participation Admin" }),
  });

  expect(response.status).toBe(201);
}

/** @returns {Promise<Response>} Send one optional-cookie GET. */
function get(path, cookie) {
  return request(path, cookie);
}

/** @returns {Promise<Response>} Send one request through real composition. */
function request(path, cookie, options = {}) {
  const headers = new Headers(options.headers);

  if (cookie !== null) headers.set("cookie", cookie);

  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, { ...options, headers }),
    env,
  );
}

/** @returns {object} One explicit Group-choice request. */
function setOptions(groupId) {
  return {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ groupId }),
  };
}

/** @returns {Promise<void>} Seed an eligible assisted-booking target graph. */
async function seedAssistedBookingGraph(startsAt = nowEpoch + 3_600_000) {
  await seedCourse("active");
  await seedParticipant("target", "active");
  await seedGroup("active", "Active Group", "active");
  await seedGroup("second", "Second Group", "active");
  await seedModule(
    "future",
    "Future",
    startsAt,
    startsAt + 3_600_000,
    "scheduled",
  );
}

/** @returns {Promise<void>} Seed a target Group outside the requested Course. */
async function seedCrossCourseGroup() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-other', 'Other Course', null,
               'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-other', 'course-other', 'Other Group',
               'other group', null, 'active')`,
    ),
  ]);
}

/** @returns {Promise<void>} Seed one direct Active Admin identity. */
function seedAdminIdentity() {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-a', 'principal-admin', 'Admin', 'active', 'admin')`,
  ).run();
}

/** @returns {Promise<void>} Seed all named lifecycle combinations. */
async function seedCompleteLifecycleCourse() {
  await seedCourse("active");
  await seedGroup("active", "Active Group", "active");
  await seedGroup("archived", "Archived Group", "archived");
  await seedModule("ended", "Ended", nowEpoch - 3_600_000, nowEpoch, "scheduled");
  await seedModule("current", "Current", nowEpoch - 1_800_000, nowEpoch + 1_800_000, "scheduled");
  await seedModule("cancelled", "Cancelled", nowEpoch + 1_800_000, nowEpoch + 3_600_000, "cancelled");
  await seedModule("future", "Future", nowEpoch + 3_600_000, nowEpoch + 7_200_000, "scheduled");

  for (const [suffix, state, assignmentState] of [
    ["active", "active", "active"],
    ["disabled", "disabled", "active"],
    ["revoked", "active", "revoked"],
  ]) {
    await seedParticipant(suffix, state);
    await seedAssignment(suffix, assignmentState);
  }

  for (const module of ["ended", "current", "cancelled", "future"]) {
    await seedSelection(`active-${module}`, "active", module, module === "current" ? "archived" : "active");
  }

  await seedSelection("disabled", "disabled", "current", "active");
  await seedSelection("revoked", "revoked", "current", "active");
}

/** @returns {Promise<void>} Insert Course state. */
async function seedCourse(state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values ('course-a', 'Participation Course', 'Course details',
             'Europe/Berlin', ?, 0)`,
  )
    .bind(state)
    .run();
}

/** @returns {Promise<void>} Insert Participant state. */
async function seedParticipant(suffix, state) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `participant-${suffix}`,
      `principal-${suffix}`,
      `Participant ${suffix}`,
      `${suffix}@example.com`,
      `${suffix}@example.com`,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert Assignment state. */
async function seedAssignment(suffix, state) {
  await env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, ?, 'course-a', ?)`,
  )
    .bind(`assignment-${suffix}`, `participant-${suffix}`, state)
    .run();
}

/** @returns {Promise<void>} Insert Group state. */
async function seedGroup(suffix, name, state) {
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, 'course-a', ?, ?, ?, ?)`,
  )
    .bind(`group-${suffix}`, name, name.toLowerCase(), `Details ${suffix}`, state)
    .run();
}

/** @returns {Promise<void>} Insert one Module interval and state. */
async function seedModule(suffix, title, startsAt, endsAt, state) {
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'course-a', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `module-${suffix}`,
      title,
      `Description ${suffix}`,
      `Instructions ${suffix}`,
      startsAt,
      endsAt,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert one retained Selection. */
async function seedSelection(suffix, participant, module, group) {
  await env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values (?, ?, 'course-a', ?, ?)`,
  )
    .bind(
      `selection-${suffix}`,
      `participant-${participant}`,
      `module-${module}`,
      `group-${group}`,
    )
    .run();
}

/** @returns {object} Expected Group response. */
function groupResponse(suffix, name, state) {
  return {
    id: `group-${suffix}`,
    name,
    details: `Details ${suffix}`,
    state,
  };
}

/** @returns {Promise<void>} Assert one exact sanitized outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
