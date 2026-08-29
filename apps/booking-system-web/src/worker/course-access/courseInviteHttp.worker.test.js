import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import nonProductionWorker from "../../nonProductionWorker.js";
import productionWorker from "../../productionWorker.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_invite_creation_failure"),
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

describe("Course Invite HTTP authorization and routing", () => {
  it("freshly authorizes Admin routes while public recognition stays anonymous", async () => {
    await insertCourse();
    const unauthenticated = await request(
      "/api/admin/courses/course-a/invites/current",
    );
    const missingAdminCookie = await establishFixture("first-admin");
    const missingAdmin = await request(
      "/api/admin/courses/course-a/invites/current",
      { cookie: missingAdminCookie },
    );
    const publicResult = await recognize("f".repeat(64));
    const production = await productionWorker.fetch(
      new Request("http://localhost/api/admin/courses/course-a/invites/current"),
      env,
    );

    await expectOutcome(unauthenticated, 401, "unauthenticated");
    await expectOutcome(missingAdmin, 403, "no-admin-user");
    await expectOutcome(publicResult, 404, "invite-unavailable");
    await expectOutcome(production, 401, "unauthenticated");
  });

  it("rejects unsupported methods and non-Invite paths exactly", async () => {
    const unsupported = await request(
      "/api/course-invites/recognition",
      { method: "GET" },
    );
    const unrelated = await request(
      "/api/admin/courses/course-a/not-invites/current",
    );

    await expectOutcome(unsupported, 404, "not-found");
    await expectOutcome(unrelated, 404, "not-found");
  });
});

describe("Course Invite HTTP lifecycle", () => {
  it("creates, retrieves, disables, re-enables, and replaces one shared URL", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse();

    const absent = await adminRequest(cookie, "current");
    const created = await adminRequest(cookie, "current", "POST", {
      id: "browser-controlled",
      token: "browser-controlled",
      state: "disabled",
    });
    const createdBody = await created.json();
    const createdToken = tokenFrom(createdBody.invite.url);
    const retrieved = await adminRequest(cookie, "current");

    expect(await absent.json()).toEqual({ invite: null });
    expect(created.status).toBe(201);
    expect(createdBody.outcome).toBe("created");
    expect(createdBody.invite).toEqual({
      id: createdBody.invite.id,
      state: "enabled",
      url: `http://localhost/invite#${createdToken}`,
    });
    expect(createdBody.invite.id).not.toBe("browser-controlled");
    expect(createdToken).toMatch(/^[0-9a-f]{64}$/);
    await expect(retrieved.json()).resolves.toEqual({
      invite: createdBody.invite,
    });
    expect(retrieved.headers.get("cache-control")).toBe("no-store");

    const disabled = await lifecycle(
      cookie,
      createdBody.invite.id,
      "disablement",
    );
    await expect(disabled.json()).resolves.toEqual({
      outcome: "disabled",
      invite: { ...createdBody.invite, state: "disabled" },
    });
    await expectRecognition(createdToken, "unavailable");

    const reenabled = await lifecycle(
      cookie,
      createdBody.invite.id,
      "reenablement",
    );
    await expect(reenabled.json()).resolves.toMatchObject({
      outcome: "re-enabled",
      invite: { id: createdBody.invite.id, state: "enabled" },
    });
    await expectRecognition(createdToken, "available");

    const replaced = await lifecycle(
      cookie,
      createdBody.invite.id,
      "replacement",
    );
    const replacedBody = await replaced.json();
    const replacementToken = tokenFrom(replacedBody.invite.url);

    expect(replacedBody.outcome).toBe("replaced");
    expect(replacedBody.invite.state).toBe("enabled");
    expect(replacedBody.invite.id).not.toBe(createdBody.invite.id);
    expect(replacementToken).not.toBe(createdToken);
    await expectRecognition(createdToken, "unavailable");
    await expectRecognition(replacementToken, "available");
    await expect(inviteStorage()).resolves.toEqual([
      { id: createdBody.invite.id, recoverable_token: null, is_current: 0 },
      {
        id: replacedBody.invite.id,
        recoverable_token: replacementToken,
        is_current: 1,
      },
    ]);
  });

  it("refuses stale Invite state and Archived Course mutation", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse();
    const created = await createInvite(cookie);

    await expectOutcome(
      await lifecycle(cookie, "stale-invite", "disablement"),
      409,
      "course-invite-not-current",
    );
    await env.DB.prepare(
      "update courses set state = 'archived' where id = 'course-a'",
    ).run();

    await expectOutcome(
      await adminRequest(cookie, "current"),
      409,
      "course-not-active",
    );
    await expectOutcome(
      await lifecycle(cookie, created.id, "replacement"),
      409,
      "course-not-active",
    );
    await expectRecognition(tokenFrom(created.url), "unavailable");
    await expect(inviteStorage()).resolves.toHaveLength(1);
  });

  it("revalidates a Disabled Admin without changing the Invite", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse();
    const created = await createInvite(cookie);
    await env.DB.prepare("update admin_users set state = 'disabled'").run();

    await expectOutcome(
      await lifecycle(cookie, created.id, "disablement"),
      403,
      "disabled-admin",
    );
    await expect(inviteStorage()).resolves.toMatchObject([
      { id: created.id, is_current: 1 },
    ]);
  });
});

describe("Course Invite recognition privacy and diagnostics", () => {
  it("reveals only Course name and availability for recognized tokens", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse();
    const invite = await createInvite(cookie);
    const response = await recognize(tokenFrom(invite.url));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      outcome: "available",
      courseName: "Course A",
    });
  });

  it.each([undefined, null, "", "not-hex", "A".repeat(64), "f".repeat(63)])(
    "collapses malformed token %j into one unavailable result",
    async (token) => {
      const body = token === undefined ? {} : { token };
      const response = await publicJson(body);

      await expectOutcome(response, 404, "invite-unavailable");
      expect(response.headers.get("cache-control")).toBe("no-store");
    },
  );

  it("sanitizes persistence failures without echoing generated authority", async () => {
    const cookie = await activeAdminCookie();
    await insertCourse();
    await env.DB.prepare(
      `create trigger test_invite_creation_failure
       before insert on course_invites
       begin
         select raise(abort, 'private Invite persistence detail');
       end`,
    ).run();

    const response = await adminRequest(cookie, "current", "POST");
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe('{"outcome":"technical-error"}');
    expect(text).not.toContain("private Invite persistence detail");
    await expect(inviteStorage()).resolves.toEqual([]);
  });
});

/** @returns {Promise<string>} Establish one Active Admin session. */
async function activeAdminCookie() {
  const cookie = await establishFixture("first-admin");
  const response = await request("/api/admin/bootstrap", {
    cookie,
    method: "POST",
    body: { name: "Invite Admin" },
  });

  expect(response.status).toBe(201);
  return cookie;
}

/** @returns {Promise<string>} Establish one fixed normal application session. */
async function establishFixture(name) {
  const response = await request(`/api/_fixtures/session/${name}`, {
    method: "POST",
  });

  expect(response.status).toBe(204);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

/** @returns {Promise<void>} Insert one Active Course without private children. */
async function insertCourse() {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values ('course-a', 'Course A', 'Private description',
             'Europe/Berlin', 'active', 0)`,
  ).run();
}

/** @returns {Promise<object>} Create and return the narrow current Invite. */
async function createInvite(cookie) {
  const response = await adminRequest(cookie, "current", "POST");
  const body = await response.json();

  expect(response.status).toBe(201);
  return body.invite;
}

/** @returns {Promise<Response>} Request one Admin Invite route. */
function adminRequest(cookie, suffix, method = "GET", body) {
  return request(`/api/admin/courses/course-a/invites/${suffix}`, {
    cookie,
    method,
    body,
  });
}

/** @returns {Promise<Response>} Request one current Invite lifecycle action. */
function lifecycle(cookie, inviteId, action) {
  return adminRequest(cookie, `${inviteId}/${action}`, "POST");
}

/** @returns {Promise<Response>} Recognize one opaque token publicly. */
function recognize(token) {
  return publicJson({ token });
}

/** @returns {Promise<Response>} Submit one public recognition object. */
function publicJson(body) {
  return request("/api/course-invites/recognition", { method: "POST", body });
}

/** @returns {Promise<Response>} Send one Worker request. */
function request(path, options = {}) {
  const headers = options.cookie === undefined
    ? {}
    : { cookie: options.cookie };
  const hasBody = options.body !== undefined;

  if (hasBody) headers["content-type"] = "application/json";
  return nonProductionWorker.fetch(
    new Request(`http://localhost${path}`, {
      method: options.method ?? "GET",
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    }),
    env,
  );
}

/** @returns {string} Extract the secret only in the test client. */
function tokenFrom(url) {
  return new URL(url).hash.slice(1);
}

/** @returns {Promise<void>} Assert narrow recognized visibility. */
async function expectRecognition(token, outcome) {
  const response = await recognize(token);

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    outcome,
    courseName: "Course A",
  });
}

/** @returns {Promise<void>} Assert one exact HTTP outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
}

/** @returns {Promise<Array<object>>} Read authority-bearing storage only. */
async function inviteStorage() {
  const { results } = await env.DB.prepare(
    `select id, recoverable_token, is_current
       from course_invites order by rowid`,
  ).all();

  return results;
}
