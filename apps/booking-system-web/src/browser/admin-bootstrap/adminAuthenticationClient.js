import { createAuthClient } from "better-auth/react";

const adminAuthenticationClient = createAuthClient();

/**
 * Start Google sign-in with application-owned success and failure destinations.
 *
 * @returns {Promise<object | null>} Better Auth initiation data when no redirect occurs.
 */
export async function continueWithGoogle() {
  const result = await adminAuthenticationClient.signIn.social({
    provider: "google",
    callbackURL: "/admin",
    errorCallbackURL: "/api/auth/application-error",
  });

  if (result.error !== null) {
    throw authenticationFailure();
  }

  return result.data;
}

/**
 * Terminate the current normal Better Auth session.
 *
 * @returns {Promise<object | null>} Better Auth sign-out data.
 */
export async function signOutAdmin() {
  const result = await adminAuthenticationClient.signOut();

  if (result.error !== null) {
    throw authenticationFailure();
  }

  return result.data;
}

/**
 * Create one language-neutral browser authentication failure.
 *
 * @returns {Error} The application failure.
 */
function authenticationFailure() {
  const error = new Error("authentication-failed");

  error.outcome = "authentication-failed";

  return error;
}
