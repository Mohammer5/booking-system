import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toAdminCollectionRequestSearch } from "../admin-collections/index.js";

/** @returns {object} One URL-owned Course Module collection query. */
export function useModuleCollection(courseId, collectionState) {
  return useQuery({
    queryKey: ["course-structure", "modules", courseId, collectionState],
    queryFn: () => requestJson(
      `/api/admin/courses/${courseId}/modules?${
        toAdminCollectionRequestSearch(collectionState)
      }`,
    ),
    placeholderData: (previousData) => previousData,
    retry: false,
  });
}

/** @returns {object} One guarded Course Module detail query. */
export function useModuleDetail(courseId, moduleId) {
  return useQuery({
    queryKey: ["course-structure", "module", courseId, moduleId],
    queryFn: () => requestJson(
      `/api/admin/courses/${courseId}/modules/${moduleId}`,
    ),
    retry: false,
  });
}

/** @returns {object} Active-Course future Module creation mutation. */
export function useCreateModule(courseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => requestJson(
      `/api/admin/courses/${courseId}/modules`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    ),
    async onSuccess(module) {
      await invalidateModuleQueries(queryClient, courseId, module.id);
    },
    async onError(error) {
      if (error.status === 409) {
        await invalidateModuleQueries(queryClient, courseId);
      }
    },
  });
}

/** @returns {object} Complete Module descriptive-field mutation. */
export function useUpdateModuleDetails(courseId, moduleId) {
  return useModuleMutation({
    courseId,
    moduleId,
    path: `/api/admin/courses/${courseId}/modules/${moduleId}`,
  });
}

/** @returns {object} Future Scheduled Module rescheduling mutation. */
export function useRescheduleModule(courseId, moduleId) {
  return useModuleMutation({
    courseId,
    moduleId,
    path: `/api/admin/courses/${courseId}/modules/${moduleId}/schedule`,
  });
}

/** @returns {object} Terminal eligible Module cancellation mutation. */
export function useCancelModule(courseId, moduleId) {
  return useModuleMutation({
    courseId,
    moduleId,
    method: "POST",
    path: `/api/admin/courses/${courseId}/modules/${moduleId}/cancellation`,
  });
}

/** @returns {object} Permanent unreferenced Module deletion mutation. */
export function useDeleteModule(courseId, moduleId, onDeleted) {
  return useModuleMutation({
    courseId,
    moduleId,
    method: "DELETE",
    onDeleted,
    path: `/api/admin/courses/${courseId}/modules/${moduleId}`,
  });
}

/** @returns {object} One Module management mutation and reconciliation. */
function useModuleMutation(input) {
  const method = input.method ?? "PUT";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => requestJson(input.path, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    async onSuccess(result) {
      input.onDeleted?.(result);
      await invalidateModuleQueries(
        queryClient,
        input.courseId,
        result.module?.id ?? result.id ?? input.moduleId,
      );
    },
    async onError(error) {
      if (error.status === 409) {
        await invalidateModuleQueries(queryClient, input.courseId, input.moduleId);
      }
    },
  });
}

/** Reconcile the item, all pages, count, and dependent participation reads. */
function invalidateModuleQueries(queryClient, courseId, moduleId) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["course-structure", "modules", courseId],
    }),
    queryClient.invalidateQueries({
      queryKey: moduleId === undefined
        ? ["course-structure", "module", courseId]
        : ["course-structure", "module", courseId, moduleId],
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
