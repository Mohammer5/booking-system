import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

const fixturesByPath = new Map([
  [
    "/api/_fixtures/session/first-admin",
    {
      id: "fixture-first-admin",
      name: "First Admin Fixture",
      email: "first-admin@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/later-admin",
    {
      id: "fixture-later-admin",
      name: "Later Admin Fixture",
      email: "later-admin@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/participant-a",
    {
      id: "fixture-participant-a",
      name: "Participant A Fixture",
      email: "participant-a@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/participant-b",
    {
      id: "fixture-participant-b",
      name: "Participant B Fixture",
      email: "participant-b@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/invite-participant-a",
    {
      id: "fixture-invite-participant-a",
      name: "Invite Participant A Fixture",
      email: "invite-participant-a@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/invite-participant-b",
    {
      id: "fixture-invite-participant-b",
      name: "Invite Participant B Fixture",
      email: "invite-participant-b@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/selection-participant",
    {
      id: "fixture-selection-participant",
      name: "Selection Participant Fixture",
      email: "selection-participant@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/admin-invite-a",
    {
      id: "fixture-admin-invite-a",
      name: "Admin Invite A Fixture",
      email: "admin-invite-a@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/admin-invite-b",
    {
      id: "fixture-admin-invite-b",
      name: "Admin Invite B Fixture",
      email: "admin-invite-b@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/admin-invite-c",
    {
      id: "fixture-admin-invite-c",
      name: "Admin Invite C Fixture",
      email: "admin-invite-c@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/admin-invite-d",
    {
      id: "fixture-admin-invite-d",
      name: "Admin Invite D Fixture",
      email: "admin-invite-d@fixture.invalid",
    },
  ],
  [
    "/api/_fixtures/session/returning-admin",
    {
      id: "fixture-returning-admin",
      name: "Returning Admin Fixture",
      email: "returning-admin@fixture.invalid",
    },
  ],
]);

/**
 * Create non-production fixed-identity session establishment.
 *
 * @param {object} options Non-production authentication options.
 * @param {object} options.database The isolated application D1 binding.
 * @param {string} options.baseURL The current same-origin application URL.
 * @param {string} options.secret The test-environment Better Auth secret.
 * @returns {(request: Request) => Promise<Response | null>} The fixture route handler.
 */
export function createFixtureSessionEstablishment({
  database,
  baseURL,
  secret,
}) {
  const fixtureAuth = betterAuth({
    database,
    baseURL,
    basePath: "/api/auth",
    secret,
    plugins: [testUtils()],
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    advanced: {
      useSecureCookies: new URL(baseURL).protocol === "https:",
    },
  });

  return async function establishFixtureSession(request) {
    const fixture = fixturesByPath.get(new URL(request.url).pathname);

    if (request.method !== "POST" || fixture === undefined) {
      return null;
    }

    const context = await fixtureAuth.$context;
    const existingUser = await database
      .prepare('select id from "user" where id = ?')
      .bind(fixture.id)
      .first();

    if (existingUser === null) {
      await context.test.saveUser(
        context.test.createUser({
          ...fixture,
          emailVerified: true,
        }),
      );
    }

    const { cookies } = await context.test.login({ userId: fixture.id });

    return new Response(null, {
      status: 204,
      headers: {
        "set-cookie": serializeFixtureCookie(cookies[0]),
      },
    });
  };
}

/**
 * Serialize the Better Auth test helper's normal signed session cookie.
 *
 * @param {object} cookie Better Auth cookie data.
 * @returns {string} A Set-Cookie header value.
 */
function serializeFixtureCookie(cookie) {
  const attributes = [
    `${cookie.name}=${cookie.value}`,
    `Path=${cookie.path}`,
    "HttpOnly",
    `SameSite=${cookie.sameSite}`,
  ];

  if (cookie.secure) {
    attributes.push("Secure");
  }

  if (cookie.expires !== undefined) {
    attributes.push(`Expires=${new Date(cookie.expires * 1000).toUTCString()}`);
  }

  return attributes.join("; ");
}
