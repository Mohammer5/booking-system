import { applyD1Migrations, env, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

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
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Participant Module Selection HTTP contract", () => {
  it("chooses, reselects, changes, refreshes, and removes one own Selection", async () => {
    const cookie = await establishEligibleParticipant();
    const path = selectionPath("module-a");

    const created = await request(path, cookie, "PUT", { groupId: "group-a" });
    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({
      outcome: "created",
      selection: { moduleId: "module-a", groupId: "group-a" },
    });

    const repeated = await request(path, cookie, "PUT", { groupId: "group-a" });
    expect(repeated.status).toBe(200);
    await expect(repeated.json()).resolves.toMatchObject({
      outcome: "already-selected",
      selection: { groupId: "group-a" },
    });

    const changed = await request(path, cookie, "PUT", { groupId: "group-b" });
    expect(changed.status).toBe(200);
    await expect(changed.json()).resolves.toMatchObject({
      outcome: "changed",
      selection: { groupId: "group-b" },
    });
    await expect(countRows("module_selections")).resolves.toBe(1);

    const detail = await SELF.fetch("https://example.test/api/participant/courses/course-a", {
      headers: { cookie },
    });
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      modules: [
        {
          id: "module-a",
          selection: {
            meaning: "live",
            phase: "upcoming",
            group: { id: "group-b", name: "Group B", state: "active" },
          },
        },
      ],
    });

    const removed = await request(path, cookie, "DELETE");
    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toEqual({ outcome: "removed" });
    const repeatedRemoval = await request(path, cookie, "DELETE");
    await expect(repeatedRemoval.json()).resolves.toEqual({
      outcome: "already-absent",
    });
  });

  it("refuses exact-deadline and stale Assignment changes without partial state", async () => {
    const cookie = await establishEligibleParticipant();
    const futurePath = selectionPath("module-a");

    await request(futurePath, cookie, "PUT", { groupId: "group-a" });
    await insertModule(
      "module-deadline",
      Date.parse("2026-08-28T10:00:00.000Z"),
    );
    const deadlineResponse = await request(
      selectionPath("module-deadline"),
      cookie,
      "PUT",
      { groupId: "group-a" },
    );

    expect(deadlineResponse.status).toBe(409);
    await expect(deadlineResponse.json()).resolves.toEqual({
      outcome: "selection-deadline-reached",
    });
    await env.DB.prepare(
      "update course_assignments set state = 'revoked' where id = 'assignment-a'",
    ).run();
    const staleResponse = await request(futurePath, cookie, "PUT", {
      groupId: "group-b",
    });

    expect(staleResponse.status).toBe(404);
    await expect(staleResponse.json()).resolves.toEqual({
      outcome: "course-unavailable",
    });
    const row = await env.DB.prepare(
      "select group_id from module_selections where id is not null",
    ).first();
    expect(row).toEqual({ group_id: "group-a" });
  });

  it("refuses missing authentication, invalid Group input, and cross-Course Groups narrowly", async () => {
    const unauthenticated = await request(
      selectionPath("module-a"),
      "",
      "PUT",
      { groupId: "group-a" },
    );
    expect(unauthenticated.status).toBe(401);

    const cookie = await establishEligibleParticipant();
    const invalid = await request(selectionPath("module-a"), cookie, "PUT", {});
    expect(invalid.status).toBe(422);
    await expect(invalid.json()).resolves.toEqual({ outcome: "invalid-group-id" });
    await insertCrossCourseGroup();
    const crossCourse = await request(selectionPath("module-a"), cookie, "PUT", {
      groupId: "group-cross",
    });

    expect(crossCourse.status).toBe(409);
    await expect(crossCourse.json()).resolves.toEqual({
      outcome: "group-not-selectable",
    });
    await expect(countRows("module_selections")).resolves.toBe(0);
  });
});

/** @returns {Promise<string>} Establish normal session plus eligible booking state. */
async function establishEligibleParticipant() {
  const sessionResponse = await SELF.fetch(
    "https://example.test/api/_fixtures/session/participant-a",
    { method: "POST" },
  );
  const cookie = sessionResponse.headers.get("set-cookie");

  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-a', 'Course A', null, 'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-a', 'fixture-participant-a', 'Participant A',
               'participant-a@example.com', 'participant-a@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-a', 'participant-a', 'course-a', 'active')`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-a', 'course-a', 'Group A', 'group a', 'Room A', 'active'),
              ('group-b', 'course-a', 'Group B', 'group b', 'Room B', 'active')`,
    ),
  ]);
  await insertModule("module-a", Date.parse("2026-09-01T10:00:00.000Z"));

  return cookie;
}

/** @returns {Promise<object>} Insert one future or boundary Module. */
function insertModule(id, startsAt) {
  return env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'course-a', ?, null, null, ?, ?, 'scheduled')`,
  )
    .bind(id, id, startsAt, startsAt + 3_600_000)
    .run();
}

/** @returns {Promise<void>} Insert a Group that must remain invisible here. */
async function insertCrossCourseGroup() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-cross', 'Private Course', null,
               'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-cross', 'course-cross', 'Private Group',
               'private group', null, 'active')`,
    ),
  ]);
}

/** @returns {string} Stable Module Selection resource path. */
function selectionPath(moduleId) {
  return `/api/participant/courses/course-a/modules/${moduleId}/selection`;
}

/** @returns {Promise<Response>} Perform one authenticated JSON mutation. */
function request(path, cookie, method, body) {
  return SELF.fetch(`https://example.test${path}`, {
    method,
    headers: {
      ...(cookie.length === 0 ? {} : { cookie }),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** @returns {Promise<number>} Count rows in one fixed test-owned table. */
async function countRows(tableName) {
  const row = await env.DB
    .prepare(`select count(*) as count from "${tableName}"`)
    .first();

  return row.count;
}
