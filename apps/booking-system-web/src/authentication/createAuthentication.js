import { betterAuth } from "better-auth";

/**
 * Create application-private Better Auth request capabilities.
 *
 * @param {object} options Authentication runtime options.
 * @param {object} options.database The application D1 binding.
 * @param {string} options.baseURL The current same-origin application URL.
 * @param {string} options.secret The environment-owned Better Auth secret.
 * @returns {{authenticate: (request: Request) => Promise<object>, handleAuthRequest: (request: Request) => Promise<Response>}} Narrow authentication capabilities.
 */
export function createAuthentication({ database, baseURL, secret }) {
  const auth = betterAuth({
    database,
    baseURL,
    basePath: "/api/auth",
    secret,
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    advanced: {
      useSecureCookies: new URL(baseURL).protocol === "https:",
    },
  });

  return {
    async authenticate(request) {
      const session = await auth.api.getSession({ headers: request.headers });

      if (session === null) {
        return { outcome: "unauthenticated" };
      }

      return {
        outcome: "authenticated",
        externalPrincipalId: session.user.id,
      };
    },
    async handleAuthRequest(request) {
      return auth.handler(request);
    },
  };
}
