import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const directoryQueryKey = ["admin-access", "admin-users"];
const currentAdminQueryKey = ["admin-access", "current-admin"];

/** @returns {object} Current freshly authorized Admin User directory query. */
export function useAdminUsers() {
  return useQuery({
    queryKey: directoryQueryKey,
    queryFn: () => requestJson("/api/admin/users"),
    retry: false,
  });
}

/** @returns {object} One current Admin User detail query. */
export function useAdminUser(adminUserId) {
  return useQuery({
    queryKey: ["admin-access", "admin-user", adminUserId],
    queryFn: () => requestJson(`/api/admin/users/${adminUserId}`),
    retry: false,
  });
}

/** @returns {object} Guarded current Admin User name mutation. */
export function useUpdateAdminUserName(adminUserId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }) => requestJson(`/api/admin/users/${adminUserId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
    async onSuccess(adminUser) {
      reconcileAdminUser(queryClient, adminUserId, adminUser);
      await queryClient.invalidateQueries({ queryKey: currentAdminQueryKey });
    },
    async onError(error) {
      if (!isStaleAdminUserError(error)) return;
      await invalidateAdminUserQueries(queryClient, adminUserId);
    },
  });
}

/** @returns {object} Guarded one-way Admin User promotion mutation. */
export function usePromoteAdminUser(adminUserId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestJson(
      `/api/admin/users/${adminUserId}/promotion`,
      { method: "POST" },
    ),
    onSuccess(adminUser) {
      reconcileAdminUser(queryClient, adminUserId, adminUser);
    },
    async onError(error) {
      if (!isStaleAdminUserError(error)) return;
      await invalidateAdminUserQueries(queryClient, adminUserId);
    },
  });
}

/** @returns {void} Replace one authoritative Admin in detail and directory. */
function reconcileAdminUser(queryClient, adminUserId, adminUser) {
  queryClient.setQueryData(
    ["admin-access", "admin-user", adminUserId],
    adminUser,
  );
  queryClient.setQueryData(directoryQueryKey, (current) => ({
    adminUsers: (current?.adminUsers ?? []).map((candidate) =>
      candidate.id === adminUser.id ? adminUser : candidate),
  }));
}

/** @returns {Promise<void>} Refresh stale Admin action and actor state. */
async function invalidateAdminUserQueries(queryClient, adminUserId) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: directoryQueryKey }),
    queryClient.invalidateQueries({
      queryKey: ["admin-access", "admin-user", adminUserId],
    }),
    queryClient.invalidateQueries({ queryKey: currentAdminQueryKey }),
  ]);
}

/** @returns {boolean} Whether fresh Admin state should replace cached detail. */
function isStaleAdminUserError(error) {
  return new Set([
    "admin-not-active",
    "admin-user-not-editable",
    "admin-user-not-found",
    "admin-user-not-promotable",
    "admin-user-not-promoted",
    "admin-user-not-updated",
    "disabled-admin",
    "no-admin-user",
    "unauthenticated",
  ]).has(error?.outcome);
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
