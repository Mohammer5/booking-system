import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_join_failure"),
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from course_invites"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
    env.DB.prepare('delete from "session"'),
    env.DB.prepare('delete from "account"'),
    env.DB.prepare('delete from "verification"'),
    env.DB.prepare('delete from "user"'),
  ]);
});

describe("Course Invite continuation HTTP boundary", () => {
  it("replaces raw authority with a signed HttpOnly continuation", async () => {
    const { token } = await createSharedInvite();
    const recognition = await recognize(token);
    const body = await recognition.json();
    const setCookie = recognition.headers.get("set-cookie");
    const continuationCookie = cookiePair(setCookie);

    expect(recognition.status).toBe(200);
    expect(body).toEqual({ outcome: "available", courseName: "Course A" });
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(token);

    const continuation = await request("/api/course-invites/continuation", {
      cookie: continuationCookie,
    });

    expect(continuation.status).toBe(200);
    await expect(continuation.json()).resolves.toEqual(body);
    expect(continuation.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects absent, forged, and malformed authority without leaking detail", async () => {
    const absent = await request("/api/course-invites/continuation");
    const forged = await request("/api/course-invites/continuation", {
      cookie: "booking_course_invite_continuation=v1." +
        `${"a".repeat(64)}.${"b".repeat(43)}`,
    });
    const malformed = await recognize("private-malformed-token");

    await expectOutcome(absent, 404, "invite-unavailable");
    await expectOutcome(forged, 404, "invite-unavailable");
    const malformedText = await malformed.clone().text();

    await expectOutcome(malformed, 404, "invite-unavailable");
    expect(malformed.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(malformedText).not.toContain("private-malformed-token");
  });

  it("composes continuation in production but excludes fixture sessions", async () => {
    const { token } = await createSharedInvite();
    const recognition = await productionWorker.fetch(
      jsonRequest("/api/course-invites/recognition", { token }),
      env,
    );
    const continuationCookie = cookiePair(
      recognition.headers.get("set-cookie"),
    );
    const join = await productionWorker.fetch(
      new Request("http://localhost/api/course-invites/join", {
        method: "POST",
        headers: { cookie: continuationCookie },
      }),
      env,
    );

    expect(recognition.status).toBe(200);
    await expectOutcome(join, 401, "unauthenticated");
  });
});

describe("Course Invite Join HTTP contract", () => {
  it("requires an Active Participant and creates no membership beforehand", async () => {
    const { token } = await createSharedInvite();
    const continuationCookie = await recognizeCookie(token);
    const unauthenticated = await join(continuationCookie);
    const participantCookie = await establishFixture("participant-a");
    const missing = await join(continuationCookie, participantCookie);

    await expectOutcome(unauthenticated, 401, "unauthenticated");
    await expectOutcome(missing, 403, "no-participant");
    await expect(countAssignments()).resolves.toBe(0);

    await onboard(participantCookie, "Alice", "alice@example.com");
    await env.DB.prepare(
      "update participants set state = 'disabled' where external_principal_id = ?",
    ).bind("fixture-participant-a").run();
    const disabled = await join(continuationCookie, participantCookie);

    await expectOutcome(disabled, 403, "disabled-participant");
    await expect(countAssignments()).resolves.toBe(0);
  });

  it("joins two Participants once each and repeats as an idempotent success", async () => {
    const { token } = await createSharedInvite();
    const continuationCookie = await recognizeCookie(token);
    const participantA = await activeParticipant("participant-a", "Alice");
    const first = await join(
      continuationCookie,
      participantA,
      { courseId: "attacker-course", privateData: "must-not-trust" },
    );
    const firstBody = await first.json();
    const repeat = await join(continuationCookie, participantA);
    const participantB = await activeParticipant("participant-b", "Bob");
    const second = await join(continuationCookie, participantB);

    expect(first.status).toBe(201);
    expect(firstBody).toMatchObject({
      outcome: "joined",
      assignment: { state: "active" },
      course: { id: "course-a", name: "Course A" },
    });
    expect(JSON.stringify(firstBody)).not.toContain("must-not-trust");
    expect(repeat.status).toBe(200);
    await expect(repeat.json()).resolves.toEqual({
      ...firstBody,
      outcome: "already-joined",
    });
    expect(second.status).toBe(201);
    await expect(countAssignments()).resolves.toBe(2);
  });

  it("never reactivates Revoked membership through a shared Invite", async () => {
    const { token } = await createSharedInvite();
    const continuationCookie = await recognizeCookie(token);
    const participantCookie = await activeParticipant("participant-a", "Alice");
    const accepted = await join(continuationCookie, participantCookie);
    const assignmentId = (await accepted.json()).assignment.id;

    await env.DB.prepare(
      "update course_assignments set state = 'revoked' where id = ?",
    ).bind(assignmentId).run();
    const refused = await join(continuationCookie, participantCookie);

    expect(refused.status).toBe(409);
    await expect(refused.json()).resolves.toEqual({
      outcome: "assignment-revoked",
      courseName: "Course A",
    });
    await expect(env.DB.prepare(
      "select state from course_assignments where id = ?",
    ).bind(assignmentId).first()).resolves.toEqual({ state: "revoked" });
  });

  it.each([
    ["disabled Invite", "update course_invites set is_enabled = 0"],
    ["replaced Invite", null],
    ["Archived Course", "update courses set state = 'archived'"],
  ])("refuses a stale continuation for %s", async (_label, statement) => {
    const invite = await createSharedInvite();
    const { token } = invite;
    const continuationCookie = await recognizeCookie(token);
    const participantCookie = await activeParticipant("participant-a", "Alice");

    if (statement === null) {
      const replacement = await request(
        `/api/admin/courses/course-a/invites/${invite.id}/replacement`,
        { cookie: invite.adminCookie, method: "POST" },
      );

      expect(replacement.status).toBe(200);
    } else {
      await env.DB.prepare(statement).run();
    }
    const continuation = await request("/api/course-invites/continuation", {
      cookie: continuationCookie,
    });
    const refused = await join(continuationCookie, participantCookie);

    expect(continuation.status).toBe(200);
    await expect(continuation.json()).resolves.toEqual({
      outcome: "unavailable",
      courseName: "Course A",
    });
    expect(refused.status).toBe(409);
    await expect(refused.json()).resolves.toEqual({
      outcome: "invite-unavailable",
      courseName: "Course A",
    });
    await expect(countAssignments()).resolves.toBe(0);
  });

  it("sanitizes atomic persistence failures", async () => {
    const { token } = await createSharedInvite();
    const continuationCookie = await recognizeCookie(token);
    const participantCookie = await activeParticipant("participant-a", "Alice");

    await env.DB.prepare(
      `create trigger test_join_failure before insert on course_assignments
       begin select raise(abort, 'private join persistence detail'); end`,
    ).run();
    const response = await join(continuationCookie, participantCookie);
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe('{"outcome":"technical-error"}');
    expect(text).not.toContain("private join persistence detail");
    await expect(countAssignments()).resolves.toBe(0);
  });
});

/** @returns {Promise<object>} Create one current Invite through normal Admin APIs. */
async function createSharedInvite() {
  const adminCookie = await establishFixture("first-admin");

  await request("/api/admin/bootstrap", {
    cookie: adminCookie,
    method: "POST",
    body: { name: "Invite Admin" },
  });
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values ('course-a', 'Course A', 'Private description',
             'Europe/Berlin', 'active', 0)`,
  ).run();
  const response = await request(
    "/api/admin/courses/course-a/invites/current",
    { cookie: adminCookie, method: "POST" },
  );
  const body = await response.json();

  expect(response.status).toBe(201);
  return {
    adminCookie,
    id: body.invite.id,
    token: new URL(body.invite.url).hash.slice(1),
  };
}

/** @returns {Promise<string>} Create and onboard one fixed Participant. */
async function activeParticipant(fixture, name) {
  const cookie = await establishFixture(fixture);

  await onboard(cookie, name, `${name.toLowerCase()}@example.com`);
  return cookie;
}

/** @returns {Promise<void>} Create explicit Participant profile only. */
async function onboard(cookie, name, email) {
  const response = await request("/api/participant/onboarding", {
    cookie,
    method: "POST",
    body: { name, email },
  });

  expect(response.status).toBe(201);
}

/** @returns {Promise<string>} Establish a named fixed normal session. */
async function establishFixture(name) {
  const response = await request(`/api/_fixtures/session/${name}`, {
    method: "POST",
  });

  expect(response.status).toBe(204);
  return cookiePair(response.headers.get("set-cookie"));
}

/** @returns {Promise<Response>} Recognize one raw fragment token. */
function recognize(token) {
  return request("/api/course-invites/recognition", {
    method: "POST",
    body: { token },
  });
}

/** @returns {Promise<string>} Recognize and return only signed continuation. */
async function recognizeCookie(token) {
  const response = await recognize(token);

  expect(response.status).toBe(200);
  return cookiePair(response.headers.get("set-cookie"));
}

/** @returns {Promise<Response>} Submit one body-free Join with combined cookies. */
function join(continuationCookie, participantCookie, body) {
  const cookies = [continuationCookie, participantCookie].filter(Boolean);

  return request("/api/course-invites/join", {
    cookie: cookies.join("; "),
    method: "POST",
    body,
  });
}

/** @returns {Promise<Response>} Send one non-production Worker request. */
function request(path, options = {}) {
  const headers = options.cookie === undefined ? {} : { cookie: options.cookie };
  const hasBody = options.body !== undefined;

  if (hasBody) headers["content-type"] = "application/json";
  return nonProductionWorker.fetch(new Request(`http://localhost${path}`, {
    method: options.method ?? "GET",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  }), env);
}

/** @returns {Request} Create one JSON production request. */
function jsonRequest(path, body) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** @returns {string} Convert Set-Cookie to a request Cookie pair. */
function cookiePair(setCookie) {
  return setCookie.split(";", 1)[0];
}

/** @returns {Promise<number>} Count normal Course Assignments. */
async function countAssignments() {
  const row = await env.DB.prepare(
    "select count(*) as count from course_assignments",
  ).first();

  return row.count;
}

/** @returns {Promise<void>} Assert one exact status and outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}
