const publicRecognitionPath = "/api/course-invites/recognition";
const adminCoursePrefix = "/api/admin/courses/";

/** @returns {object | null} Exact public or Admin Course Invite route. */
export function matchCourseInviteRoute(pathname) {
  if (pathname === publicRecognitionPath) {
    return { kind: "invite-recognition" };
  }

  if (!pathname.startsWith(adminCoursePrefix)) return null;

  const segments = pathname.slice(adminCoursePrefix.length).split("/");

  if (
    segments.length === 3 &&
    segments[0].length > 0 &&
    segments[1] === "invites" &&
    segments[2] === "current"
  ) {
    return { kind: "current-invite", courseId: segments[0] };
  }

  if (
    segments.length !== 4 ||
    segments[0].length === 0 ||
    segments[1] !== "invites" ||
    segments[2].length === 0 ||
    !new Set(["disablement", "reenablement", "replacement"]).has(segments[3])
  ) {
    return null;
  }

  return {
    kind: `invite-${segments[3]}`,
    courseId: segments[0],
    inviteId: segments[2],
  };
}

/** @returns {Promise<object>} JSON object or empty invalid input. */
export async function readInviteJsonObject(request) {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/** @returns {object} Narrow related current-Invite Admin representation. */
export function toCourseInviteResponse(request, invite) {
  const url = new URL("/invite", request.url);

  url.hash = invite.token;
  return {
    id: invite.id,
    state: invite.state,
    url: url.toString(),
  };
}

/** @returns {Response} JSON response excluded from HTTP caching. */
export function inviteJsonResponse(body, status) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
