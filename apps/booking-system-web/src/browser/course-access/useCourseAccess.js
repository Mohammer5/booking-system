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

/** @returns {object} One freshly authorized Admin Participant detail query. */
export function useParticipantDetail(participantId) {
  return useQuery({
    queryKey: ["course-access", "participant", participantId],
    queryFn: () => requestJson(`/api/admin/participants/${participantId}`),
    retry: false,
  });
}

/** @returns {object} Current Active Participant self-profile mutation. */
export function useUpdateOwnParticipantProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile) => updateProfile("/api/participant/me", profile),
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: ["course-access", "current-participant"],
      });
    },
  });
}

/** @returns {object} Active-Admin Participant profile mutation. */
export function useUpdateParticipantProfileAsAdmin(participantId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile) =>
      updateProfile(`/api/admin/participants/${participantId}`, profile),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: participantDirectoryQueryKey }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant", participantId],
        }),
      ]);
    },
  });
}

/** @returns {object} Active-Admin Participant Disable mutation. */
export function useDisableParticipant(participantId) {
  return useParticipantLifecycleMutation(participantId, "disablement");
}

/** @returns {object} Active-Admin Participant Re-enable mutation. */
export function useReenableParticipant(participantId) {
  return useParticipantLifecycleMutation(participantId, "reenablement");
}

/** @returns {object} One explicit Participant lifecycle mutation. */
function useParticipantLifecycleMutation(participantId, action) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      requestJson(
        `/api/admin/participants/${participantId}/${action}`,
        { method: "POST" },
      ),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: participantDirectoryQueryKey }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant", participantId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "assignments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "current-participant"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-courses"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-course"],
        }),
      ]);
    },
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
      await invalidateMembershipQueries(queryClient, courseId);
    },
  });
}

/**
 * Revoke one retained Assignment and reconcile Admin/Participant Course state.
 *
 * @param {string} courseId Stable Course identity.
 * @returns {object} TanStack Assignment-revocation mutation state.
 */
export function useRevokeCourseAssignment(courseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId) =>
      requestJson(
        `/api/admin/courses/${courseId}/assignments/${assignmentId}/revocation`,
        { method: "POST" },
      ),
    async onSuccess() {
      await invalidateMembershipQueries(queryClient, courseId);
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

  return response.body;
}

/** @returns {Promise<void>} Refresh membership and any same-session private reads. */
async function invalidateMembershipQueries(queryClient, courseId) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["course-access", "assignments", courseId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["course-access", "participant-courses"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["course-access", "participant-course", courseId],
    }),
  ]);
}

/** @returns {Promise<object>} Replace one complete Participant profile. */
function updateProfile(path, profile) {
  return requestJson(path, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(profile),
  });
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
