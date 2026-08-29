import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  continueParticipantWithGoogle,
  signOutParticipant,
} from "./participantAuthenticationClient.js";

const currentParticipantQueryKey = ["course-access", "current-participant"];

/**
 * Own the remote Participant context and onboarding/authentication mutations.
 *
 * @returns {object} Query and mutation state for the Participant entry flow.
 */
export function useParticipantEntry(options = {}) {
  const queryClient = useQueryClient();
  const continueWithGoogle = options.continueWithGoogle ??
    continueParticipantWithGoogle;
  const currentParticipantQuery = useQuery({
    queryKey: currentParticipantQueryKey,
    queryFn: fetchCurrentParticipant,
    enabled: options.enabled ?? true,
    retry: false,
  });
  const registrationMutation = useMutation({
    mutationFn: registerParticipant,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: currentParticipantQueryKey,
      });
    },
    async onError(error) {
      const currentContextChanged = [
        "participant-already-exists",
        "unauthenticated",
      ].includes(error.outcome);

      if (currentContextChanged) {
        await queryClient.invalidateQueries({
          queryKey: currentParticipantQueryKey,
        });
      }
    },
  });
  const signInMutation = useMutation({
    mutationFn: continueWithGoogle,
  });
  const signOutMutation = useMutation({
    mutationFn: signOutParticipant,
    async onSuccess() {
      registrationMutation.reset();
      await queryClient.resetQueries();
    },
  });

  return {
    currentParticipantQuery,
    registrationMutation,
    signInMutation,
    signOutMutation,
  };
}

/**
 * Fetch current Participant context from authoritative state.
 *
 * @returns {Promise<object>} The current Participant representation.
 */
async function fetchCurrentParticipant() {
  return requestJson("/api/participant/me");
}

/**
 * Submit the explicit booking-system Participant profile.
 *
 * @param {{name: string, email: string}} profile Explicit profile input.
 * @returns {Promise<object>} The created current Participant representation.
 */
async function registerParticipant(profile) {
  return requestJson("/api/participant/onboarding", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(profile),
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
