import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toAdminCollectionRequestSearch } from "../admin-collections/index.js";

const courseIndexQueryKey = ["course-structure", "courses"];

/**
 * Read the freshly authorized Course index.
 *
 * @returns {object} TanStack Course-index query state.
 */
export function useCourseIndex(collectionState) {
  return useQuery({
    queryKey: [...courseIndexQueryKey, collectionState],
    queryFn: () => requestJson(
      `/api/admin/courses?${toAdminCollectionRequestSearch(collectionState)}`,
    ),
    placeholderData: (previousData) => previousData,
    retry: false,
  });
}

/**
 * Read one freshly authorized Course by stable identity.
 *
 * @param {string} courseId Course route identity.
 * @returns {object} TanStack Course-detail query state.
 */
export function useCourseDetail(courseId) {
  return useQuery({
    queryKey: ["course-structure", "course", courseId],
    queryFn: () => requestJson(`/api/admin/courses/${courseId}`),
    retry: false,
  });
}

/**
 * Create a Course and reconcile the index and stable detail cache entries.
 *
 * @returns {object} TanStack Course-creation mutation state.
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourse,
    async onSuccess(course) {
      queryClient.setQueryData(
        ["course-structure", "course", course.id],
        course,
      );
      await queryClient.invalidateQueries({ queryKey: courseIndexQueryKey });
    },
  });
}

/**
 * Update complete Active-Course fields and reconcile stable Course reads.
 *
 * @param {string} courseId Stable Course identity.
 * @returns {object} TanStack Course-edit mutation state.
 */
export function useUpdateCourse(courseId) {
  const queryClient = useQueryClient();
  const detailQueryKey = ["course-structure", "course", courseId];

  return useMutation({
    mutationFn: (input) =>
      requestJson(`/api/admin/courses/${courseId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    async onSuccess(course) {
      queryClient.setQueryData(detailQueryKey, (current) => ({
        ...current,
        ...course,
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: courseIndexQueryKey }),
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
      ]);
    },
    async onError(error) {
      if (error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: detailQueryKey });
      }
    },
  });
}

/**
 * Terminally archive one eligible Course and reconcile every Course view.
 *
 * @param {string} courseId Stable Course identity.
 * @param {(result: object) => void} onArchived Parent-owned success callback.
 * @returns {object} TanStack Course archival mutation state.
 */
export function useArchiveCourse(courseId, onArchived) {
  const queryClient = useQueryClient();
  const detailQueryKey = ["course-structure", "course", courseId];

  return useMutation({
    mutationFn: () => requestJson(
      `/api/admin/courses/${courseId}/archival`,
      { method: "POST" },
    ),
    async onSuccess(result) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: courseIndexQueryKey }),
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "assignments", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "course-participant", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-options", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-courses"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-course", courseId],
        }),
      ]);
      onArchived(result);
    },
    async onError(error) {
      if (error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: detailQueryKey });
      }
    },
  });
}

/**
 * Create a Course-wide Group and refresh its parent Course detail.
 *
 * @param {string} courseId Parent Course identity.
 * @returns {object} TanStack Group-creation mutation state.
 */
export function useCreateGroup(courseId) {
  return useCourseStructureMutation(courseId, "groups");
}

/**
 * Update complete fields for one retained Active or Archived Group.
 *
 * @param {string} courseId Parent Course identity.
 * @param {string} groupId Stable Group identity.
 * @returns {object} TanStack Group-edit mutation state.
 */
export function useUpdateGroup(courseId, groupId) {
  return useGroupManagementMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}`,
    method: "PUT",
  });
}

/**
 * Permanently delete one unreferenced Active or Archived Group.
 *
 * @param {string} courseId Parent Course identity.
 * @param {string} groupId Stable Group identity.
 * @param {(result: object) => void} onDeleted Parent-owned success callback.
 * @returns {object} TanStack Group-deletion mutation state.
 */
export function useDeleteGroup(courseId, groupId, onDeleted) {
  return useGroupManagementMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}`,
    method: "DELETE",
    onDeleted,
  });
}

/** @returns {object} TanStack Active-to-Archived Group mutation state. */
export function useArchiveGroup(courseId, groupId) {
  return useGroupManagementMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}/archival`,
  });
}

/** @returns {object} TanStack Archived-to-Active Group mutation state. */
export function useReactivateGroup(courseId, groupId) {
  return useGroupManagementMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/groups/${groupId}/reactivation`,
  });
}

/**
 * Create a future Scheduled Module and refresh its parent Course detail.
 *
 * @param {string} courseId Parent Course identity.
 * @returns {object} TanStack Module-creation mutation state.
 */
export function useCreateModule(courseId) {
  return useCourseStructureMutation(courseId, "modules");
}

/**
 * Update complete descriptive fields for one retained Module.
 *
 * @param {string} courseId Parent Course identity.
 * @param {string} moduleId Stable Module identity.
 * @returns {object} TanStack Module-detail mutation state.
 */
export function useUpdateModuleDetails(courseId, moduleId) {
  return useModuleManagementMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/modules/${moduleId}`,
  });
}

/**
 * Replace the future schedule of one editable Scheduled Module.
 *
 * @param {string} courseId Parent Course identity.
 * @param {string} moduleId Stable Module identity.
 * @returns {object} TanStack Module-schedule mutation state.
 */
export function useRescheduleModule(courseId, moduleId) {
  return useModuleManagementMutation({
    courseId,
    path: `/api/admin/courses/${courseId}/modules/${moduleId}/schedule`,
  });
}

/**
 * Terminally cancel one eligible Scheduled Module.
 *
 * @param {string} courseId Parent Course identity.
 * @param {string} moduleId Stable Module identity.
 * @returns {object} TanStack Module cancellation mutation state.
 */
export function useCancelModule(courseId, moduleId) {
  return useModuleManagementMutation({
    courseId,
    method: "POST",
    path: `/api/admin/courses/${courseId}/modules/${moduleId}/cancellation`,
  });
}

/**
 * Permanently delete one unreferenced Module.
 *
 * @param {string} courseId Parent Course identity.
 * @param {string} moduleId Stable Module identity.
 * @param {(result: object) => void} onDeleted Parent-owned success callback.
 * @returns {object} TanStack Module deletion mutation state.
 */
export function useDeleteModule(courseId, moduleId, onDeleted) {
  return useModuleManagementMutation({
    courseId,
    method: "DELETE",
    onDeleted,
    path: `/api/admin/courses/${courseId}/modules/${moduleId}`,
  });
}

/**
 * Create one nested Course-structure mutation with detail reconciliation.
 *
 * @param {string} courseId Parent Course identity.
 * @param {"groups" | "modules"} resource Nested resource name.
 * @returns {object} TanStack mutation state.
 */
function useCourseStructureMutation(courseId, resource) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) =>
      requestJson(`/api/admin/courses/${courseId}/${resource}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: ["course-structure", "course", courseId],
      });
    },
    async onError(error) {
      if (error.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: ["course-structure", "course", courseId],
        });
      }
    },
  });
}

/**
 * Mutate one Group resource and reconcile Admin and Participant Course views.
 *
 * @param {object} input Group request and reconciliation properties.
 * @returns {object} TanStack Group management mutation state.
 */
function useGroupManagementMutation(input) {
  const method = input.method ?? "POST";
  const queryClient = useQueryClient();
  const detailQueryKey = ["course-structure", "course", input.courseId];

  return useMutation({
    mutationFn: (body) =>
      requestJson(input.path, {
        method,
        headers: body === undefined ? {} : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    async onSuccess(result) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-course", input.courseId],
        }),
      ]);
      input.onDeleted?.(result);
    },
    async onError(error) {
      if (error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: detailQueryKey });
      }
    },
  });
}

/**
 * Mutate one Module and reconcile Admin and Participant Course views.
 *
 * @param {object} input Module request properties.
 * @returns {object} TanStack Module management mutation state.
 */
function useModuleManagementMutation(input) {
  const method = input.method ?? "PUT";
  const queryClient = useQueryClient();
  const detailQueryKey = ["course-structure", "course", input.courseId];

  return useMutation({
    mutationFn: (body) =>
      requestJson(input.path, {
        method,
        headers: body === undefined ? {} : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    async onSuccess(result) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-course", input.courseId],
        }),
      ]);
      input.onDeleted?.(result);
    },
    async onError(error) {
      if (error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: detailQueryKey });
      }
    },
  });
}

/**
 * Submit the slice-owned Course creation request.
 *
 * @param {object} input User-supplied Course fields.
 * @returns {Promise<object>} The created Course representation.
 */
function createCourse(input) {
  return requestJson("/api/admin/courses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Perform one slice-owned same-origin JSON request.
 *
 * @param {string} path Same-origin path.
 * @param {RequestInit} [options] Fetch options.
 * @returns {Promise<object>} The successful response body.
 * @throws {Error} A failure carrying the machine-readable outcome.
 */
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
