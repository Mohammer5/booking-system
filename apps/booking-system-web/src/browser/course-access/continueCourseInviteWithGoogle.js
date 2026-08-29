import { createAuthClient } from "better-auth/react";

const courseInviteAuthenticationClient = createAuthClient();

/**
 * Start Google sign-in with one Invite-owned success and failure destination.
 *
 * @returns {Promise<object | null>} Initiation data when no redirect occurs.
 */
export async function continueCourseInviteWithGoogle() {
  const result = await courseInviteAuthenticationClient.signIn.social({
    provider: "google",
    callbackURL: "/invite",
    errorCallbackURL: "/api/auth/invite-error",
  });

  if (result.error !== null) {
    const error = new Error("authentication-failed");

    error.outcome = "authentication-failed";
    throw error;
  }

  return result.data;
}
