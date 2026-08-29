import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const inviteSessionKey = "booking-system.course-invite-token";

/** @returns {object} Current Active-Course Invite query. */
export function useCurrentCourseInvite(courseId) {
  return useQuery({
    queryKey: inviteQueryKey(courseId),
    queryFn: () => requestInviteJson(
      `/api/admin/courses/${courseId}/invites/current`,
    ),
    retry: false,
  });
}

/** @returns {object} First shared-Invite mutation. */
export function useCreateCourseInvite(courseId) {
  return useInviteMutation(courseId, "current");
}

/** @returns {object} Current Invite disablement mutation. */
export function useDisableCourseInvite(courseId, inviteId) {
  return useInviteMutation(courseId, `${inviteId}/disablement`);
}

/** @returns {object} Current Invite re-enablement mutation. */
export function useReenableCourseInvite(courseId, inviteId) {
  return useInviteMutation(courseId, `${inviteId}/reenablement`);
}

/** @returns {object} Current Invite replacement mutation. */
export function useReplaceCourseInvite(courseId, inviteId) {
  return useInviteMutation(courseId, `${inviteId}/replacement`);
}

/** @returns {object} Anonymous public Invite recognition query. */
export function useRecognizedCourseInvite(token) {
  return useQuery({
    queryKey: ["course-access", "recognized-invite", token],
    queryFn: () => recognizeOrContinueCourseInvite(token),
    retry: false,
  });
}

/** @returns {object} Explicit body-free shared-Invite Join mutation. */
export function useJoinCourseInvite() {
  return useMutation({
    mutationFn: () => requestInviteJson("/api/course-invites/join", {
      method: "POST",
    }),
  });
}

/**
 * Capture raw fragment authority outside React state and clean the address bar.
 *
 * @returns {string | null} Current Invite-specific session token.
 */
export function captureCourseInviteToken() {
  const token = globalThis.location.hash.slice(1);

  if (token.length > 0) {
    globalThis.sessionStorage.setItem(inviteSessionKey, token);
    globalThis.history.replaceState(
      null,
      "",
      `${globalThis.location.pathname}${globalThis.location.search}`,
    );
    return token;
  }

  return globalThis.sessionStorage.getItem(inviteSessionKey);
}

/** @returns {Promise<object>} Initial raw recognition or signed continuation. */
async function recognizeOrContinueCourseInvite(token) {
  if (token === null) {
    return requestInviteJson("/api/course-invites/continuation");
  }

  try {
    const result = await requestInviteJson("/api/course-invites/recognition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });

    globalThis.sessionStorage.removeItem(inviteSessionKey);
    return result;
  } catch (error) {
    if (error.status === 404) {
      globalThis.sessionStorage.removeItem(inviteSessionKey);
    }

    throw error;
  }
}

/** @returns {object} One lifecycle mutation updating the related query. */
function useInviteMutation(courseId, suffix) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestInviteJson(
      `/api/admin/courses/${courseId}/invites/${suffix}`,
      { method: "POST" },
    ),
    onSuccess(result) {
      queryClient.setQueryData(inviteQueryKey(courseId), {
        invite: result.invite,
      });
    },
  });
}

/** @returns {Array<string>} One related current-Invite query key. */
function inviteQueryKey(courseId) {
  return ["course-access", "course-invite", courseId];
}

/** @returns {Promise<object>} Successful JSON or an outcome-carrying Error. */
async function requestInviteJson(path, options) {
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
