import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";
import { createParticipantCourseHttpHandler } from "./createParticipantCourseHttpHandler.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Participant Course route and context authorization", () => {
  it("matches only exact GET list and stable detail routes", async () => {
    const cookie = await establishFixture("participant-a");
    await insertParticipant("a", "fixture-participant-a", "active");

    for (const [method, path] of [
      ["POST", "/api/participant/courses"],
      ["DELETE", "/api/participant/courses/course-a"],
      ["GET", "/api/participant/courses/"],
      ["GET", "/api/participant/courses/course-a/modules"],
    ]) {
      const response = await request(path, cookie, { method });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ outcome: "not-found" });
    }
  });

  it("returns exact unauthenticated, missing, and Disabled context refusals without Course data", async () => {
    await insertCourse("private", "Private Course", "active");
    const unauthenticatedList = await get("/api/participant/courses", null);
    const unauthenticatedDetail = await get(
      "/api/participant/courses/course-private",
      null,
    );
    const cookie = await establishFixture("participant-a");
    const missing = await get("/api/participant/courses", cookie);

    await insertParticipant("a", "fixture-participant-a", "disabled");
    const disabled = await get(
      "/api/participant/courses/course-private",
      cookie,
    );

    await expectOutcome(unauthenticatedList, 401, "unauthenticated");
    await expectOutcome(unauthenticatedDetail, 401, "unauthenticated");
    await expectOutcome(missing, 403, "no-participant");
    await expectOutcome(disabled, 403, "disabled-participant");
  });

  it("uses normal authorization in both Worker compositions while production excludes fixtures", async () => {
    const productionList = await productionWorker.fetch(
      new Request("http://localhost/api/participant/courses"),
      env,
    );
    const fixtureAttempt = await productionWorker.fetch(
      new Request("http://localhost/api/_fixtures/session/participant-a", {
        method: "POST",
      }),
      env,
    );
    const cookie = await establishFixture("participant-a");

    await insertParticipant("a", "fixture-participant-a", "active");
    const nonProductionList = await get("/api/participant/courses", cookie);

    await expectOutcome(productionList, 401, "unauthenticated");
    expect(fixtureAttempt.status).toBe(404);
    expect(fixtureAttempt.headers.get("set-cookie")).toBeNull();
    expect(nonProductionList.status).toBe(200);
    await expect(nonProductionList.json()).resolves.toEqual({ courses: [] });
  });
});

describe("Participant Course list HTTP contract", () => {
  it("returns deterministic zero, one, and multiple current memberships only", async () => {
    const cookie = await activeParticipantCookie("a");
    const empty = await get("/api/participant/courses", cookie);

    await insertParticipant("other", "other-principal", "active");
    await insertCourse("z", "alpha", "active");
    await insertCourse("a", "Alpha", "active");
    await insertCourse("archived", "Archived", "archived");
    await insertCourse("revoked", "Revoked", "active");
    await insertCourse("other", "Other", "active");
    await insertAssignment("z", "a", "z", "active");
    const one = await get("/api/participant/courses", cookie);

    await insertAssignment("a", "a", "a", "active");
    await insertAssignment("archived", "a", "archived", "active");
    await insertAssignment("revoked", "a", "revoked", "revoked");
    await insertAssignment("other", "other", "other", "active");
    const multiple = await get("/api/participant/courses", cookie);

    await expect(empty.json()).resolves.toEqual({ courses: [] });
    await expect(one.json()).resolves.toMatchObject({
      courses: [{ id: "course-z" }],
    });
    await expect(multiple.json()).resolves.toEqual({
      courses: [
        courseResponse("a", "Alpha"),
        courseResponse("z", "alpha"),
      ],
    });
  });

  it("ignores query, header, and method inputs that try to choose another Participant", async () => {
    const cookie = await activeParticipantCookie("a");
    await insertParticipant("b", "fixture-participant-b", "active");
    await insertCourse("a", "Own Course", "active");
    await insertCourse("b", "Other Private Course", "active");
    await insertAssignment("a", "a", "a", "active");
    await insertAssignment("b", "b", "b", "active");

    const list = await request(
      "/api/participant/courses?participantId=participant-b&externalPrincipalId=fixture-participant-b",
      cookie,
      { headers: { "x-participant-id": "participant-b" } },
    );
    const detail = await get(
      "/api/participant/courses/course-b?participantId=participant-b",
      cookie,
    );
    const bodyAttempt = await request("/api/participant/courses", cookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ participantId: "participant-b" }),
    });

    await expect(list.json()).resolves.toEqual({
      courses: [courseResponse("a", "Own Course")],
    });
    await expectOutcome(detail, 404, "course-unavailable");
    await expectOutcome(bodyAttempt, 404, "not-found");
  });
});

describe("Participant Course detail HTTP contract", () => {
  it("returns only participant-relevant Course, Module, Active-Group, and null own-Selection data", async () => {
    const cookie = await activeParticipantCookie("a");
    await insertParticipant("peer", "peer-principal", "active", {
      name: "Private Peer",
      email: "private-peer@example.com",
    });
    await insertCourse("a", "Visible Course", "active");
    await insertAssignment("a", "a", "a", "active");
    await insertAssignment("peer", "peer", "a", "active");
    await insertGroup("active", "Visible Group", "active");
    await insertGroup("archived", "Hidden Group", "archived");
    await insertModule("scheduled", "Scheduled Module", "scheduled", 1_800_000_000_000);
    await insertModule("cancelled", "Cancelled Module", "cancelled", 1_700_000_000_000);

    const response = await get(
      "/api/participant/courses/course-a",
      cookie,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ...courseResponse("a", "Visible Course"),
      groups: [
        {
          id: "group-active",
          name: "Visible Group",
          details: "Details active",
          state: "active",
        },
      ],
      modules: [
        moduleResponse("cancelled", "Cancelled Module", "cancelled", 1_700_000_000_000),
        moduleResponse("scheduled", "Scheduled Module", "scheduled", 1_800_000_000_000),
      ],
    });
    const serialized = JSON.stringify(body);

    for (const forbidden of [
      "Private Peer",
      "private-peer@example.com",
      "participant-a",
      "assignment-a",
      "normalized_email",
      "externalPrincipalId",
      "authority",
      "roster",
      "participantCount",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("returns truthful empty Module and Active-Group collections", async () => {
    const cookie = await activeParticipantCookie("a");
    await insertCourse("a", "Empty Structure", "active");
    await insertAssignment("a", "a", "a", "active");

    const response = await get(
      "/api/participant/courses/course-a",
      cookie,
    );

    await expect(response.json()).resolves.toMatchObject({
      id: "course-a",
      groups: [],
      modules: [],
    });
  });

  it.each([
    ["unknown", "unknown", null, null, null],
    ["malformed", "%20", null, null, null],
    ["unassigned", "a", "active", null, "active"],
    ["cross-Participant", "a", "active", "other", "active"],
    ["Revoked", "a", "active", "a", "revoked"],
    ["Archived", "a", "archived", "a", "active"],
  ])("uses one privacy-safe outcome for %s detail", async (
    _case,
    requestedSuffix,
    courseState,
    assignedParticipant,
    assignmentState,
  ) => {
    const cookie = await activeParticipantCookie("a");

    if (courseState !== null) {
      await insertCourse("a", "Private Existing Course", courseState);
    }

    if (assignedParticipant === "other") {
      await insertParticipant("other", "other-principal", "active");
    }

    if (assignedParticipant !== null) {
      await insertAssignment("access", assignedParticipant, "a", assignmentState);
    }

    const response = await get(
      `/api/participant/courses/course-${requestedSuffix}`,
      cookie,
    );

    await expectOutcome(response, 404, "course-unavailable");
  });

  it("revalidates Participant, Assignment, and Course state on later requests", async () => {
    const cookie = await activeParticipantCookie("a");
    await insertCourse("a", "Current Course", "active");
    await insertAssignment("a", "a", "a", "active");
    const path = "/api/participant/courses/course-a";

    expect((await get(path, cookie)).status).toBe(200);
    await env.DB.prepare("update participants set state = 'disabled'").run();
    await expectOutcome(
      await get(path, cookie),
      403,
      "disabled-participant",
    );
    await env.DB.prepare("update participants set state = 'active'").run();
    await env.DB.prepare("update course_assignments set state = 'revoked'").run();
    await expectOutcome(await get(path, cookie), 404, "course-unavailable");
    await env.DB.prepare("update course_assignments set state = 'active'").run();
    await env.DB.prepare("update courses set state = 'archived'").run();
    await expectOutcome(await get(path, cookie), 404, "course-unavailable");
  });

  it("sanitizes unexpected read failures", async () => {
    const handler = createParticipantCourseHttpHandler({
      authenticate: async () => ({
        outcome: "authenticated",
        externalPrincipalId: "principal-a",
      }),
      participantPersistence: {
        findParticipantByExternalPrincipalId: async () => ({
          id: "participant-a",
          state: "active",
        }),
      },
      persistence: {
        listParticipantCourseMemberships: async () => {
          throw new Error("SQL private-token@example.com");
        },
        findParticipantCourseMembership: async () => null,
      },
    });
    const response = await handler(
      new Request("http://localhost/api/participant/courses"),
    );

    await expectOutcome(response, 500, "technical-error");
  });
});

/** @returns {Promise<string>} Establish one fixed normal application session. */
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

/** @returns {Promise<string>} Establish one current Active Participant session. */
async function activeParticipantCookie(suffix) {
  const cookie = await establishFixture(`participant-${suffix}`);

  await insertParticipant(
    suffix,
    `fixture-participant-${suffix}`,
    "active",
  );
  return cookie;
}

/** @returns {Promise<Response>} Send one optional-cookie GET. */
function get(path, cookie) {
  return request(path, cookie);
}

/** @returns {Promise<Response>} Send one request through non-production composition. */
function request(path, cookie, options = {}) {
  const headers = new Headers(options.headers);

  if (cookie !== null) {
    headers.set("cookie", cookie);
  }

  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, { ...options, headers }),
    env,
  );
}

/** @returns {Promise<void>} Insert one deterministic Participant. */
async function insertParticipant(
  suffix,
  externalPrincipalId,
  state,
  profile = {},
) {
  const name = profile.name ?? `Participant ${suffix}`;
  const email = profile.email ?? `${suffix}@example.com`;

  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `participant-${suffix}`,
      externalPrincipalId,
      name,
      email,
      email.toLowerCase(),
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert one deterministic Course. */
async function insertCourse(suffix, name, state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, ?, 'Europe/Berlin', ?, 0)`,
  )
    .bind(`course-${suffix}`, name, `Description for ${name}`, state)
    .run();
}

/** @returns {Promise<void>} Insert one deterministic Assignment. */
async function insertAssignment(suffix, participantSuffix, courseSuffix, state) {
  await env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, ?, ?, ?)`,
  )
    .bind(
      `assignment-${suffix}`,
      `participant-${participantSuffix}`,
      `course-${courseSuffix}`,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert one deterministic Group. */
async function insertGroup(suffix, name, state) {
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, 'course-a', ?, ?, ?, ?)`,
  )
    .bind(`group-${suffix}`, name, name.toLowerCase(), `Details ${suffix}`, state)
    .run();
}

/** @returns {Promise<void>} Insert one deterministic Module. */
async function insertModule(suffix, title, state, startsAt) {
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
      startsAt + 3_600_000,
      state,
    )
    .run();
}

/** @returns {object} Expected narrow Course response. */
function courseResponse(suffix, name) {
  return {
    id: `course-${suffix}`,
    name,
    description: `Description for ${name}`,
    timezone: "Europe/Berlin",
    state: "active",
  };
}

/** @returns {object} Expected narrow Module response. */
function moduleResponse(suffix, title, state, startsAt) {
  return {
    id: `module-${suffix}`,
    title,
    description: `Description ${suffix}`,
    instructions: `Instructions ${suffix}`,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(startsAt + 3_600_000).toISOString(),
    state,
    selectionAvailability:
      state === "scheduled" && startsAt > Date.parse(env.BOOKING_TEST_NOW)
        ? "open"
        : "closed",
    selection: null,
  };
}

/** @returns {Promise<void>} Assert one exact language-neutral outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
