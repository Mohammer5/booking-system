import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toAdminCollectionRequestSearch } from "../admin-collections/index.js";

/** @returns {object} One URL-owned Course Group collection query. */
export function useGroupCollection(courseId, collectionState) {
  return useQuery({
    queryKey: ["course-structure", "groups", courseId, collectionState],
    queryFn: () => requestJson(
      `/api/admin/courses/${courseId}/groups?${
        toAdminCollectionRequestSearch(collectionState)
      }`,
    ),
    placeholderData: (previousData) => previousData,
    retry: false,
  });
}

/** @returns {object} One guarded Course Group detail query. */
export function useGroupDetail(courseId, groupId) {
  return useQuery({
    queryKey: ["course-structure", "group", courseId, groupId],
    queryFn: () => requestJson(
      `/api/admin/courses/${courseId}/groups/${groupId}`,
    ),
    retry: false,
  });
}

/** @returns {object} Active-Course Group creation mutation. */
export function useCreateGroup(courseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => requestJson(
      `/api/admin/courses/${courseId}/groups`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    ),
    async onSuccess(group) {
      await invalidateGroupQueries(queryClient, courseId, group.id);
    },
    async onError(error) {
      if (error.status === 409) {
        await invalidateGroupQueries(queryClient, courseId);
      }
    },
  });
}

/** @returns {object} Complete Group-field update mutation. */
export function useUpdateGroup(courseId, groupId) {
  return useGroupMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}`,
    method: "PUT",
  });
}

/** @returns {object} Permanent unreferenced-Group deletion mutation. */
export function useDeleteGroup(courseId, groupId, onDeleted) {
  return useGroupMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}`,
    method: "DELETE",
    onDeleted,
  });
}

/** @returns {object} Active-to-Archived Group mutation. */
export function useArchiveGroup(courseId, groupId) {
  return useGroupMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}/archival`,
  });
}

/** @returns {object} Archived-to-Active Group mutation. */
export function useReactivateGroup(courseId, groupId) {
  return useGroupMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}/reactivation`,
  });
}

/** @returns {object} One Group management mutation and reconciliation. */
function useGroupMutation(input) {
  const method = input.method ?? "POST";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => requestJson(input.path, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    async onSuccess(result) {
      input.onDeleted?.(result);
      await invalidateGroupQueries(
        queryClient,
        input.courseId,
        result.group?.id,
      );
    },
    async onError(error) {
      if (error.status === 409) {
        await invalidateGroupQueries(queryClient, input.courseId);
      }
    },
  });
}

/** Reconcile one Group item, all pages, counts, and dependent Course reads. */
function invalidateGroupQueries(queryClient, courseId, groupId) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["course-structure", "groups", courseId],
    }),
    queryClient.invalidateQueries({
      queryKey: groupId === undefined
        ? ["course-structure", "group", courseId]
        : ["course-structure", "group", courseId, groupId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["course-structure", "course", courseId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["course-access", "course-participant", courseId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["course-access", "participant-course", courseId],
    }),
  ]);
}

/** @returns {Promise<object>} One successful JSON representation. */
async function requestJson(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body.outcome ?? "technical-error");

    error.outcome = body.outcome ?? "technical-error";
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}
