import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toAdminCollectionRequestSearch } from "../admin-collections/index.js";

const directoryQueryKeyPrefix = ["admin-access", "admin-users"];
const currentAdminQueryKey = ["admin-access", "current-admin"];

/** @returns {object} Current freshly authorized Admin User directory query. */
export function useAdminUsers(collectionState) {
  return useQuery({
    queryKey: [...directoryQueryKeyPrefix, collectionState],
    queryFn: () => requestJson(
      `/api/admin/users?${toAdminCollectionRequestSearch(collectionState)}`,
    ),
    placeholderData: (previousData) => previousData,
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
      setAdminUserDetail(queryClient, adminUserId, adminUser);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: directoryQueryKeyPrefix }),
        queryClient.invalidateQueries({ queryKey: currentAdminQueryKey }),
      ]);
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
    async onSuccess(adminUser) {
      setAdminUserDetail(queryClient, adminUserId, adminUser);
      await queryClient.invalidateQueries({ queryKey: directoryQueryKeyPrefix });
    },
    async onError(error) {
      if (!isStaleAdminUserError(error)) return;
      await invalidateAdminUserQueries(queryClient, adminUserId);
    },
  });
}

/** @returns {object} Guarded Admin User lifecycle command mutation. */
export function useChangeAdminUserLifecycle(adminUserId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action }) => {
      const commands = {
        disable: [`/api/admin/users/${adminUserId}/disablement`, "POST"],
        reenable: [`/api/admin/users/${adminUserId}/reenablement`, "POST"],
        delete: [`/api/admin/users/${adminUserId}`, "DELETE"],
      };
      const [path, method] = commands[action];

      return requestJson(path, { method });
    },
    async onSuccess(result, { action }) {
      if (action === "delete") {
        queryClient.removeQueries({
          queryKey: ["admin-access", "admin-user", adminUserId],
        });
        await queryClient.invalidateQueries({ queryKey: directoryQueryKeyPrefix });
        return;
      }

      setAdminUserDetail(queryClient, adminUserId, result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: directoryQueryKeyPrefix }),
        queryClient.invalidateQueries({ queryKey: currentAdminQueryKey }),
      ]);
    },
    async onError(error) {
      if (!isStaleAdminUserError(error)) return;
      await invalidateAdminUserQueries(queryClient, adminUserId);
    },
  });
}

/** @returns {void} Replace one authoritative Admin detail. */
function setAdminUserDetail(queryClient, adminUserId, adminUser) {
  queryClient.setQueryData(
    ["admin-access", "admin-user", adminUserId],
    adminUser,
  );
}

/** @returns {Promise<void>} Refresh stale Admin action and actor state. */
async function invalidateAdminUserQueries(queryClient, adminUserId) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: directoryQueryKeyPrefix }),
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
    "admin-user-last-active-super",
    "admin-user-not-active",
    "admin-user-not-deleted",
    "admin-user-not-disabled",
    "admin-user-not-manageable",
    "admin-user-not-re-enabled",
    "admin-user-not-found",
    "admin-user-not-promotable",
    "admin-user-not-promoted",
    "admin-user-not-updated",
    "admin-user-self-protected",
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
