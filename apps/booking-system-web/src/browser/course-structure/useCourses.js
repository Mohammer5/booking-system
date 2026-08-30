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
    async onSuccess() {
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
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "groups", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "group", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "modules", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "module", courseId],
        }),
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
          queryKey: ["course-structure", "groups", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "group", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "modules", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "module", courseId],
        }),
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
