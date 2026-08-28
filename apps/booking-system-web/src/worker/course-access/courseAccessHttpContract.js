const participantsPath = "/api/admin/participants";
const coursePrefix = "/api/admin/courses/";

/**
 * Match one Admin Course-access pathname to its exact resource.
 *
 * @param {string} pathname Request pathname.
 * @returns {object | null} Matched route data or null.
 */
export function matchCourseAccessRoute(pathname) {
  if (pathname === participantsPath) {
    return { kind: "participants" };
  }

  if (!pathname.startsWith(coursePrefix)) {
    return null;
  }

  const segments = pathname.slice(coursePrefix.length).split("/");

  return segments.length === 2 &&
    segments[0].length > 0 &&
    segments[1] === "assignments"
    ? { kind: "assignments", courseId: segments[0] }
    : null;
}

/**
 * Read a narrow JSON object, treating malformed input as invalid fields.
 *
 * @param {Request} request Incoming request.
 * @returns {Promise<object>} Parsed input or an empty object.
 */
export async function readJsonObject(request) {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/**
 * Remove application-private identity data from a Participant response.
 *
 * @param {object} participant Booking-domain Participant.
 * @returns {object} Minimum administration representation.
 */
export function toParticipantResponse(participant) {
  return {
    id: participant.id,
    name: participant.name,
    email: participant.email,
    state: participant.state,
  };
}

/**
 * Create the narrow Course membership representation.
 *
 * @param {object} assignment Course Assignment data.
 * @param {object} [participant] Participant data for a newly created result.
 * @returns {object} Assignment and minimum Participant representation.
 */
export function toAssignmentResponse(
  assignment,
  participant = assignment.participant,
) {
  return {
    id: assignment.id,
    state: assignment.state,
    participant: toParticipantResponse(participant),
  };
}

/**
 * Create one JSON response without a universal envelope.
 *
 * @param {object} body Response body.
 * @param {number} status HTTP status.
 * @returns {Response} JSON response.
 */
export function jsonResponse(body, status) {
  return Response.json(body, { status });
}
