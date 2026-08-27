import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  continueWithGoogle,
  signOutAdmin,
} from "./adminAuthenticationClient.js";

const entryQueryKey = ["admin-access", "entry"];
const currentAdminQueryKey = ["admin-access", "current-admin"];

/**
 * Own the remote Admin entry, current context, and bootstrap mutation.
 *
 * @returns {object} Query and mutation state for the Admin bootstrap flow.
 */
export function useAdminBootstrap() {
  const queryClient = useQueryClient();
  const entryQuery = useQuery({
    queryKey: entryQueryKey,
    queryFn: fetchAdminEntry,
  });
  const currentAdminQuery = useQuery({
    queryKey: currentAdminQueryKey,
    queryFn: fetchCurrentAdmin,
    retry: false,
  });
  const bootstrapMutation = useMutation({
    mutationFn: bootstrapFirstAdmin,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: entryQueryKey });
      await queryClient.invalidateQueries({ queryKey: currentAdminQueryKey });
    },
    async onError(error) {
      if (error.outcome === "bootstrap-unavailable") {
        await queryClient.invalidateQueries({ queryKey: entryQueryKey });
        await queryClient.invalidateQueries({
          queryKey: currentAdminQueryKey,
        });
      }
    },
  });
  const signInMutation = useMutation({ mutationFn: continueWithGoogle });
  const signOutMutation = useMutation({
    mutationFn: signOutAdmin,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: entryQueryKey });
      await queryClient.resetQueries({ queryKey: currentAdminQueryKey });
    },
  });

  return {
    entryQuery,
    currentAdminQuery,
    bootstrapMutation,
    signInMutation,
    signOutMutation,
  };
}

/**
 * Fetch the public Admin authentication entry.
 *
 * @returns {Promise<object>} The entry mode.
 */
async function fetchAdminEntry() {
  return requestJson("/api/admin/entry");
}

/**
 * Fetch current Admin context from authoritative state.
 *
 * @returns {Promise<object>} The current Admin representation.
 */
async function fetchCurrentAdmin() {
  return requestJson("/api/admin/me");
}

/**
 * Submit the booking-system Admin name.
 *
 * @param {string} name The explicit Admin User name.
 * @returns {Promise<object>} The created current Admin representation.
 */
async function bootstrapFirstAdmin(name) {
  return requestJson("/api/admin/bootstrap", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}

/**
 * Perform one slice-owned same-origin JSON request.
 *
 * @param {string} path The same-origin path.
 * @param {RequestInit} [options] Fetch options.
 * @returns {Promise<object>} The successful JSON body.
 * @throws {Error} A failure carrying the machine-readable outcome.
 */
async function requestJson(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body.outcome ?? "technical-error");
    error.outcome = body.outcome ?? "technical-error";
    throw error;
  }

  return body;
}
