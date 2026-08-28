import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const participantDirectoryQueryKey = ["course-access", "participants"];

/**
 * Read the freshly authorized Participant administration directory.
 *
 * @returns {object} TanStack Participant-directory query state.
 */
export function useParticipantDirectory() {
  return useQuery({
    queryKey: participantDirectoryQueryKey,
    queryFn: () => requestJson("/api/admin/participants"),
    retry: false,
  });
}

/**
 * Read one Course's current Assignments after fresh Admin authorization.
 *
 * @param {string} courseId Stable Course identity.
 * @returns {object} TanStack Course-membership query state.
 */
export function useCourseAssignments(courseId) {
  return useQuery({
    queryKey: ["course-access", "assignments", courseId],
    queryFn: () =>
      requestJson(`/api/admin/courses/${courseId}/assignments`),
    retry: false,
  });
}

/**
 * Establish Course membership and refresh its Assignment collection.
 *
 * @param {string} courseId Stable Course identity.
 * @returns {object} TanStack direct-Assignment mutation state.
 */
export function useAssignParticipant(courseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participantId) => assignParticipant(courseId, participantId),
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: ["course-access", "assignments", courseId],
      });
    },
  });
}

/**
 * Submit one Participant identity while deriving all Assignment data server-side.
 *
 * @param {string} courseId Stable Course identity.
 * @param {string} participantId Stable Participant identity.
 * @returns {Promise<object>} Assignment plus created/idempotent result meaning.
 */
async function assignParticipant(courseId, participantId) {
  const response = await requestJsonResponse(
    `/api/admin/courses/${courseId}/assignments`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ participantId }),
    },
  );

  return {
    assignment: response.body,
    isCreated: response.status === 201,
  };
}

/**
 * Perform one slice-owned same-origin JSON request.
 *
 * @param {string} path Same-origin path.
 * @param {RequestInit} [options] Fetch options.
 * @returns {Promise<object>} Successful response body.
 */
async function requestJson(path, options) {
  const response = await requestJsonResponse(path, options);

  return response.body;
}

/**
 * Preserve response status while translating one JSON refusal to an Error.
 *
 * @param {string} path Same-origin path.
 * @param {RequestInit} [options] Fetch options.
 * @returns {Promise<object>} Successful body and HTTP status.
 * @throws {Error} Failure carrying the machine-readable outcome.
 */
async function requestJsonResponse(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body.outcome ?? "technical-error");
    error.outcome = body.outcome ?? "technical-error";
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return { body, status: response.status };
}
