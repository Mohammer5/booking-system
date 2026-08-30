import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toAdminCollectionRequestSearch } from "../admin-collections/index.js";

const queryKeyPrefix = ["admin-access", "admin-invites"];

/** @returns {object} Current non-secret Admin Invite list query. */
export function useAdminInvites(collectionState) {
  return useQuery({
    queryKey: [...queryKeyPrefix, collectionState],
    queryFn: () => requestJson(
      `/api/admin/invites?${toAdminCollectionRequestSearch(collectionState)}`,
    ),
    placeholderData: (previousData) => previousData,
    retry: false,
  });
}

/** @returns {object} One-time secret-bearing Admin Invite creation mutation. */
export function useCreateAdminInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestJson("/api/admin/invites", { method: "POST" }),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeyPrefix });
    },
  });
}

/** @returns {object} Terminal Admin Invite Revoke mutation. */
export function useRevokeAdminInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invite) => requestJson(
      `/api/admin/invites/${invite.id}/revocation`,
      { method: "POST" },
    ),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeyPrefix });
    },
  });
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
