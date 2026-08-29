import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const queryKey = ["admin-access", "admin-invites"];

/** @returns {object} Current non-secret Admin Invite list query. */
export function useAdminInvites() {
  return useQuery({
    queryKey,
    queryFn: () => requestJson("/api/admin/invites"),
    retry: false,
  });
}

/** @returns {object} One-time secret-bearing Admin Invite creation mutation. */
export function useCreateAdminInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestJson("/api/admin/invites", { method: "POST" }),
    onSuccess(result) {
      queryClient.setQueryData(queryKey, (current) => ({
        invites: [toListedInvite(result.invite), ...(current?.invites ?? [])],
      }));
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
    onSuccess(result) {
      queryClient.setQueryData(queryKey, (current) => ({
        invites: (current?.invites ?? []).map((invite) =>
          invite.id === result.invite.id ? result.invite : invite,
        ),
      }));
    },
  });
}

/** @returns {object} Remove the one-time URL from cached list state. */
function toListedInvite(invite) {
  return {
    id: invite.id,
    createdAt: invite.createdAt,
    state: invite.state,
  };
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
