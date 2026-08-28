import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Read the current Active Participant's assigned Active Courses.
 *
 * @returns {object} TanStack Participant Course-list query state.
 */
export function useParticipantCourseList() {
  return useQuery({
    queryKey: ["course-access", "participant-courses"],
    queryFn: () => requestJson("/api/participant/courses"),
    retry: false,
  });
}

/**
 * Read one freshly authorized Participant Course by stable identity.
 *
 * @param {string} courseId Stable Participant Course route identity.
 * @returns {object} TanStack Participant Course-detail query state.
 */
export function useParticipantCourseDetail(courseId) {
  return useQuery({
    queryKey: ["course-access", "participant-course", courseId],
    queryFn: () => requestJson(`/api/participant/courses/${courseId}`),
    retry: false,
  });
}

/**
 * Set or change one explicit own Module Selection.
 *
 * @param {string} courseId Stable Course identity.
 * @param {string} moduleId Stable Module identity.
 * @returns {object} TanStack Selection mutation state.
 */
export function useSetParticipantModuleSelection(courseId, moduleId) {
  return useParticipantModuleSelectionMutation(courseId, moduleId, "PUT");
}

/**
 * Remove one own pre-start Module Selection.
 *
 * @param {string} courseId Stable Course identity.
 * @param {string} moduleId Stable Module identity.
 * @returns {object} TanStack Selection removal state.
 */
export function useRemoveParticipantModuleSelection(courseId, moduleId) {
  return useParticipantModuleSelectionMutation(courseId, moduleId, "DELETE");
}

/** @returns {object} One mutation with stable Course-detail reconciliation. */
function useParticipantModuleSelectionMutation(courseId, moduleId, method) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId) =>
      requestJson(selectionPath(courseId, moduleId), {
        method,
        headers: method === "PUT" ? { "content-type": "application/json" } : {},
        body: method === "PUT" ? JSON.stringify({ groupId }) : undefined,
      }),
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: ["course-access", "participant-course", courseId],
      });
    },
  });
}

/** @returns {string} Stable Participant Selection resource path. */
function selectionPath(courseId, moduleId) {
  return `/api/participant/courses/${courseId}/modules/${moduleId}/selection`;
}

/**
 * Perform one slice-owned same-origin Participant Course request.
 *
 * @param {string} path Same-origin Participant Course path.
 * @returns {Promise<object>} Successful JSON response.
 */
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
