import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { signOutAdmin } from "../admin-bootstrap/adminAuthenticationClient.js";
import { continueAdminInviteWithGoogle } from "./continueAdminInviteWithGoogle.js";

const inviteSessionKey = "booking-system.admin-invite-token";
const currentAdminQueryKey = ["admin-access", "current-admin"];

/** @returns {object} Public recognition, current context, and onboarding state. */
export function useAdminInviteOnboarding(token) {
  const queryClient = useQueryClient();
  const recognitionQuery = useQuery({
    queryKey: [
      "admin-access",
      "admin-invite-continuation",
      token === null ? "continuation" : "recognition",
    ],
    queryFn: () => recognizeOrContinueAdminInvite(token),
    gcTime: 0,
    retry: false,
  });
  const currentAdminQuery = useQuery({
    queryKey: currentAdminQueryKey,
    queryFn: () => requestJson("/api/admin/me"),
    enabled: recognitionQuery.data?.outcome === "available",
    retry: false,
  });
  const claimMutation = useMutation({
    mutationFn: (name) => requestJson("/api/admin-invite/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  });
  const signInMutation = useMutation({
    mutationFn: continueAdminInviteWithGoogle,
  });
  const signOutMutation = useMutation({
    mutationFn: signOutAdmin,
    async onSuccess() {
      await queryClient.resetQueries({ queryKey: currentAdminQueryKey });
    },
  });

  return {
    claimMutation,
    currentAdminQuery,
    recognitionQuery,
    signInMutation,
    signOutMutation,
  };
}

/**
 * Capture raw fragment authority outside query state and clean the address.
 *
 * @returns {string | null} Current Admin-Invite-specific session token.
 */
export function captureAdminInviteToken() {
  const token = globalThis.location.hash.slice(1);

  if (token.length > 0) {
    globalThis.sessionStorage.setItem(inviteSessionKey, token);
    globalThis.history.replaceState(
      null,
      "",
      `${globalThis.location.pathname}${globalThis.location.search}`,
    );
    return token;
  }

  return globalThis.sessionStorage.getItem(inviteSessionKey);
}

/** @returns {Promise<object>} Initial raw recognition or signed continuation. */
async function recognizeOrContinueAdminInvite(token) {
  if (token === null) {
    return requestJson("/api/admin-invite/continuation");
  }

  try {
    const result = await requestJson("/api/admin-invite/recognition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });

    globalThis.sessionStorage.removeItem(inviteSessionKey);
    return result;
  } catch (error) {
    if (error.status === 404) {
      globalThis.sessionStorage.removeItem(inviteSessionKey);
    }

    throw error;
  }
}

/** @returns {Promise<object>} Successful JSON or outcome-carrying failure. */
async function requestJson(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body.outcome ?? "technical-error");

    error.outcome = body.outcome ?? "technical-error";
    error.status = response.status;
    throw error;
  }

  return body;
}
