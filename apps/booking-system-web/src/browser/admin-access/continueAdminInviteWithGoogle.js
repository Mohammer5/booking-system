import { createAuthClient } from "better-auth/react";

const adminInviteAuthenticationClient = createAuthClient();

/**
 * Start Google sign-in with fixed Admin Invite continuation destinations.
 *
 * @returns {Promise<object | null>} Initiation data when no redirect occurs.
 */
export async function continueAdminInviteWithGoogle() {
  const result = await adminInviteAuthenticationClient.signIn.social({
    provider: "google",
    callbackURL: "/admin/invite",
    errorCallbackURL: "/api/auth/admin-invite-error",
  });

  if (result.error !== null) {
    const error = new Error("authentication-failed");

    error.outcome = "authentication-failed";
    throw error;
  }

  return result.data;
}
