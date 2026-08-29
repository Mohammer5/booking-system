import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import productionWorker from "../productionWorker.js";
import { createAuthenticationOptions } from "./createAuthentication.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("normal authentication configuration", () => {
  it("wires Google and disables every account-linking path explicitly", () => {
    const configuration = createAuthenticationOptions({
      database: env.DB,
      baseURL: "http://localhost",
      secret: env.BETTER_AUTH_SECRET,
      googleClientId: env.GOOGLE_CLIENT_ID,
      googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    });

    expect(configuration.socialProviders).toEqual({
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    });
    expect(configuration.account.accountLinking).toEqual({
      enabled: false,
      disableImplicitLinking: true,
    });
    expect(configuration.session.cookieCache.enabled).toBe(false);
  });

  it("fails closed when normal provider configuration is incomplete", () => {
    expect(() =>
      createAuthenticationOptions({
        database: env.DB,
        baseURL: "http://localhost",
        secret: env.BETTER_AUTH_SECRET,
        googleClientId: env.GOOGLE_CLIENT_ID,
        googleClientSecret: undefined,
      }),
    ).toThrow("Required authentication configuration is missing.");
  });
});

describe("Google authorization boundary", () => {
  it("uses one provider callback for fixed application destinations", async () => {
    const response = await initiateGoogleSignIn("/admin");
    const body = await response.json();
    const authorizationURL = new URL(body.url);

    expect(response.status).toBe(200);
    expect(authorizationURL.origin).toBe("https://accounts.google.com");
    expect(authorizationURL.searchParams.get("client_id")).toBe(
      env.GOOGLE_CLIENT_ID,
    );
    expect(authorizationURL.searchParams.get("redirect_uri")).toBe(
      "http://localhost/api/auth/callback/google",
    );

    const externalDestination = await initiateGoogleSignIn(
      "https://external.invalid/admin",
    );

    expect(externalDestination.status).toBe(403);

    const participantResponse = await initiateGoogleSignIn("/");
    const participantAuthorizationURL = new URL(
      (await participantResponse.json()).url,
    );

    expect(participantResponse.status).toBe(200);
    expect(participantAuthorizationURL.searchParams.get("redirect_uri")).toBe(
      "http://localhost/api/auth/callback/google",
    );

    const inviteResponse = await initiateGoogleSignIn("/invite");
    const inviteAuthorizationURL = new URL((await inviteResponse.json()).url);

    expect(inviteResponse.status).toBe(200);
    expect(inviteAuthorizationURL.searchParams.get("redirect_uri")).toBe(
      "http://localhost/api/auth/callback/google",
    );
    expect(inviteAuthorizationURL.toString()).not.toContain("invite-secret");

    const adminInviteResponse = await initiateGoogleSignIn("/admin/invite");
    const adminInviteAuthorizationURL = new URL(
      (await adminInviteResponse.json()).url,
    );

    expect(adminInviteResponse.status).toBe(200);
    expect(adminInviteAuthorizationURL.searchParams.get("redirect_uri")).toBe(
      "http://localhost/api/auth/callback/google",
    );
    expect(adminInviteAuthorizationURL.toString())
      .not.toContain("admin-invite-secret");
  });

  it("removes provider callback payloads before returning to Admin UI", async () => {
    const response = await productionWorker.fetch(
      new Request(
        "http://localhost/api/auth/application-error?error=provider-error&error_description=provider-payload",
      ),
      env,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin?authentication=failed",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("");
  });

  it("removes provider payloads before returning to the fixed Participant destination", async () => {
    const response = await productionWorker.fetch(
      new Request(
        "http://localhost/api/auth/participant-error?error=provider-error&error_description=private-payload",
      ),
      env,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/?authentication=failed",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("");
  });

  it("returns Invite authentication failures to one sanitized destination", async () => {
    const response = await productionWorker.fetch(
      new Request(
        "http://localhost/api/auth/invite-error?error=provider-error&error_description=invite-secret",
      ),
      env,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/invite?authentication=failed",
    );
    expect(response.headers.get("location")).not.toContain("invite-secret");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns Admin Invite failures to its fixed sanitized destination", async () => {
    const response = await productionWorker.fetch(
      new Request(
        "http://localhost/api/auth/admin-invite-error?error=provider-error&error_description=admin-invite-secret",
      ),
      env,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/invite?authentication=failed",
    );
    expect(response.headers.get("location"))
      .not.toContain("admin-invite-secret");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

/**
 * Initiate Google sign-in without following or contacting the provider.
 *
 * @param {string} callbackURL The requested post-authentication destination.
 * @returns {Promise<Response>} The Better Auth initiation response.
 */
function initiateGoogleSignIn(callbackURL) {
  return productionWorker.fetch(
    new Request("http://localhost/api/auth/sign-in/social", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        provider: "google",
        callbackURL,
        disableRedirect: true,
      }),
    }),
    env,
  );
}
