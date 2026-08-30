import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toAdminCollectionRequestSearch } from "../admin-collections/index.js";

const participantDirectoryQueryKey = ["course-access", "participants"];

/** @returns {object} One Admin-targeted Participant participation query. */
export function useAdministrativeParticipantParticipation(
  courseId,
  participantId,
) {
  return useQuery({
    queryKey: administrativeParticipantParticipationKey(
      courseId,
      participantId,
    ),
    queryFn: () => requestJson(
      `/api/admin/courses/${courseId}/participation/${participantId}`,
    ),
    retry: false,
  });
}

/** @returns {object} Admin-assisted Selection set/change mutation. */
export function useSetParticipantModuleSelectionAsAdmin(
  courseId,
  participantId,
  moduleId,
) {
  return useAdministrativeSelectionMutation(
    { courseId, participantId, moduleId, method: "PUT" },
  );
}

/** @returns {object} Admin-assisted Selection removal mutation. */
export function useRemoveParticipantModuleSelectionAsAdmin(
  courseId,
  participantId,
  moduleId,
) {
  return useAdministrativeSelectionMutation(
    { courseId, participantId, moduleId, method: "DELETE" },
  );
}

/** @returns {object} One Admin Selection mutation and exact invalidation. */
function useAdministrativeSelectionMutation(options) {
  const { courseId, participantId, moduleId, method } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId) => requestJson(
      `/api/admin/courses/${courseId}/participation/${participantId}/modules/${moduleId}/selection`,
      {
        method,
        ...(method === "PUT" ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ groupId }),
        } : {}),
      },
    ),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: administrativeParticipantParticipationKey(
            courseId,
            participantId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "assignments", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-options", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-structure", "course", courseId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-courses"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-course", courseId],
        }),
      ]);
    },
  });
}

/** @returns {Array<string>} Stable Admin target-detail query key. */
function administrativeParticipantParticipationKey(courseId, participantId) {
  return [
    "course-access",
    "course-participant",
    courseId,
    participantId,
  ];
}

/**
 * Read the freshly authorized Participant administration directory.
 *
 * @returns {object} TanStack Participant-directory query state.
 */
export function useParticipantDirectory(collectionState) {
  return useQuery({
    queryKey: [...participantDirectoryQueryKey, collectionState],
    queryFn: () => requestJson(
      `/api/admin/participants?${toAdminCollectionRequestSearch(collectionState)}`,
    ),
    placeholderData: (previousData) => previousData,
    retry: false,
  });
}

/** @returns {object} Bounded server-searched Course Participant options. */
export function useCourseParticipantOptions(courseId, q) {
  const search = new URLSearchParams();

  if (q !== undefined) search.set("q", q);

  return useQuery({
    queryKey: ["course-access", "participant-options", courseId, q],
    queryFn: () => requestJson(
      `/api/admin/courses/${courseId}/participant-options?${search}`,
    ),
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
        queryClient.invalidateQueries({
          queryKey: ["course-access", "assignments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "course-participant"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-options"],
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
          queryKey: ["course-access", "course-participant"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["course-access", "participant-options"],
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
export function useCourseAssignments(courseId, collectionState) {
  return useQuery({
    queryKey: ["course-access", "assignments", courseId, collectionState],
    queryFn: () => requestJson(
      `/api/admin/courses/${courseId}/assignments?${
        toAdminCollectionRequestSearch(collectionState)
      }`,
    ),
    placeholderData: (previousData) => previousData,
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
    async onSuccess(_result, participantId) {
      await invalidateMembershipQueries(queryClient, courseId, participantId);
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
async function invalidateMembershipQueries(queryClient, courseId, participantId) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["course-access", "assignments", courseId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["course-access", "participant-options", courseId],
    }),
    queryClient.invalidateQueries({
      queryKey: participantId === undefined
        ? ["course-access", "course-participant", courseId]
        : administrativeParticipantParticipationKey(courseId, participantId),
    }),
    queryClient.invalidateQueries({
      queryKey: ["course-structure", "course", courseId],
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
