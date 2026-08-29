const participationPrefix = "/api/admin/courses/";

/** @returns {object | null} Exact Admin Course-participation route. */
export function matchAdministrativeParticipationRoute(pathname) {
  if (!pathname.startsWith(participationPrefix)) {
    return null;
  }

  const segments = pathname.slice(participationPrefix.length).split("/");

  return segments.length === 2 &&
    segments[0].length > 0 &&
    segments[1] === "participation"
    ? { courseId: segments[0] }
    : null;
}

/** @returns {object} Narrow Admin Course-participation response. */
export function toAdministrativeParticipationResponse(result) {
  return {
    course: toCourseResponse(result.course),
    groups: result.groups.map(toGroupResponse),
    modules: result.modules.map(toModuleResponse),
    participations: result.participations.map(toParticipationResponse),
  };
}

/** @returns {object} Course response fields. */
function toCourseResponse(course) {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    timezone: course.timezone,
    state: course.state,
  };
}

/** @returns {object} Group response fields. */
function toGroupResponse(group) {
  return {
    id: group.id,
    name: group.name,
    details: group.details,
    state: group.state,
  };
}

/** @returns {object} Module response fields. */
function toModuleResponse(module) {
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    instructions: module.instructions,
    startsAt: module.startsAt,
    endsAt: module.endsAt,
    state: module.state,
  };
}

/** @returns {object} Participant, Assignment, and Selection response fields. */
function toParticipationResponse(participation) {
  return {
    participant: {
      id: participation.participant.id,
      name: participation.participant.name,
      email: participation.participant.email,
      state: participation.participant.state,
    },
    assignment: {
      id: participation.assignment.id,
      state: participation.assignment.state,
    },
    selections: participation.selections.map(toSelectionResponse),
  };
}

/** @returns {object} Retained Selection and selected Group response fields. */
function toSelectionResponse(selection) {
  return {
    id: selection.id,
    moduleId: selection.moduleId,
    meaning: selection.meaning,
    phase: selection.phase,
    group: toGroupResponse(selection.group),
  };
}

/** @returns {Response} One no-store JSON response. */
export function administrativeParticipationJsonResponse(body, status) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
