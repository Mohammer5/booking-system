import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const courseIndexQueryKey = ["course-structure", "courses"];

/**
 * Read the freshly authorized Course index.
 *
 * @returns {object} TanStack Course-index query state.
 */
export function useCourseIndex() {
  return useQuery({
    queryKey: courseIndexQueryKey,
    queryFn: () => requestJson("/api/admin/courses"),
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
        { ...course, groups: [], modules: [] },
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
  return useGroupManagementMutation(
    courseId,
    `/api/admin/courses/${courseId}/groups/${groupId}`,
    "PUT",
  );
}

/** @returns {object} TanStack Active-to-Archived Group mutation state. */
export function useArchiveGroup(courseId, groupId) {
  return useGroupManagementMutation(
    courseId,
    `/api/admin/courses/${courseId}/groups/${groupId}/archival`,
  );
}

/** @returns {object} TanStack Archived-to-Active Group mutation state. */
export function useReactivateGroup(courseId, groupId) {
  return useGroupManagementMutation(
    courseId,
    `/api/admin/courses/${courseId}/groups/${groupId}/reactivation`,
  );
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
 * @param {string} courseId Parent Course identity.
 * @param {string} path Exact same-origin Group resource path.
 * @param {"POST" | "PUT"} [method] HTTP mutation method.
 * @returns {object} TanStack Group management mutation state.
 */
function useGroupManagementMutation(courseId, path, method = "POST") {
  const queryClient = useQueryClient();
  const detailQueryKey = ["course-structure", "course", courseId];

  return useMutation({
    mutationFn: (input) =>
      requestJson(path, {
        method,
        headers: input === undefined ? {} : { "content-type": "application/json" },
        body: input === undefined ? undefined : JSON.stringify(input),
      }),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-course", courseId],
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
