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
  it("uses the one normal provider callback and rejects an external application destination", async () => {
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
