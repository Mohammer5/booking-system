import { betterAuth } from "better-auth";

/**
 * Create application-private Better Auth request capabilities.
 *
 * @param {object} options Authentication runtime options.
 * @param {object} options.database The application D1 binding.
 * @param {string} options.baseURL The current same-origin application URL.
 * @param {string} options.secret The environment-owned Better Auth secret.
 * @param {string} options.googleClientId The environment-owned Google Client ID.
 * @param {string} options.googleClientSecret The environment-owned Google Client Secret.
 * @returns {{authenticate: (request: Request) => Promise<object>, handleAuthRequest: (request: Request) => Promise<Response>}} Narrow authentication capabilities.
 */
export function createAuthentication(options) {
  const auth = betterAuth(createAuthenticationOptions(options));

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

/**
 * Build the complete normal Better Auth configuration from runtime values.
 *
 * @param {object} options Authentication runtime options.
 * @returns {object} Better Auth configuration.
 */
export function createAuthenticationOptions({
  database,
  baseURL,
  secret,
  googleClientId,
  googleClientSecret,
}) {
  requireAuthenticationConfiguration({
    baseURL,
    secret,
    googleClientId,
    googleClientSecret,
  });

  return {
    database,
    baseURL,
    basePath: "/api/auth",
    secret,
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
    account: {
      accountLinking: {
        enabled: false,
        disableImplicitLinking: true,
      },
    },
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    advanced: {
      useSecureCookies: new URL(baseURL).protocol === "https:",
    },
  };
}

/**
 * Refuse incomplete normal authentication instead of selecting a fallback.
 *
 * @param {object} configuration Required environment configuration.
 * @returns {void}
 */
function requireAuthenticationConfiguration(configuration) {
  const requiredValues = [
    configuration.baseURL,
    configuration.secret,
    configuration.googleClientId,
    configuration.googleClientSecret,
  ];

  if (requiredValues.some((value) => !isNonBlankString(value))) {
    throw new Error("Required authentication configuration is missing.");
  }

  if (configuration.secret.length < 32) {
    throw new Error("The authentication secret is too short.");
  }
}

/**
 * Check one required runtime string without exposing its value.
 *
 * @param {unknown} value A required environment value.
 * @returns {boolean} Whether the value is a nonblank string.
 */
function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
