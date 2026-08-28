const participantCoursesPath = "/api/participant/courses";
const participantCoursePrefix = `${participantCoursesPath}/`;

/**
 * Match one exact Participant Course list or stable detail path.
 *
 * @param {string} pathname Request pathname.
 * @returns {object | null} Matched route data or null.
 */
export function matchParticipantCourseRoute(pathname) {
  if (pathname === participantCoursesPath) {
    return { kind: "courses" };
  }

  if (!pathname.startsWith(participantCoursePrefix)) {
    return null;
  }

  const segments = pathname.slice(participantCoursePrefix.length).split("/");

  return segments.length === 1 && segments[0].length > 0
    ? { kind: "course", courseId: segments[0] }
    : null;
}

/** @returns {object} Narrow Participant Course list item. */
export function toParticipantCourseResponse(course) {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    timezone: course.timezone,
    state: course.state,
  };
}

/** @returns {object} Narrow Participant Course detail representation. */
export function toParticipantCourseDetailResponse(result) {
  return {
    ...toParticipantCourseResponse(result.course),
    groups: result.groups.map(toParticipantGroupResponse),
    modules: result.modules.map(toParticipantModuleResponse),
  };
}

/** @returns {object} Narrow Active Group representation. */
function toParticipantGroupResponse(group) {
  return {
    id: group.id,
    name: group.name,
    details: group.details,
    state: group.state,
  };
}

/** @returns {object} Narrow Module and current own-Selection presentation. */
function toParticipantModuleResponse(module) {
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    instructions: module.instructions,
    startsAt: module.startsAt,
    endsAt: module.endsAt,
    state: module.state,
    selectionAvailability: module.selectionAvailability,
    selection:
      module.selection === null
        ? null
        : {
            id: module.selection.id,
            meaning: module.selection.meaning,
            phase: module.selection.phase,
            group: {
              id: module.selection.group.id,
              name: module.selection.group.name,
              details: module.selection.group.details,
              state: module.selection.group.state,
            },
          },
  };
}

/** @returns {Response} One narrow JSON response. */
export function participantCourseJsonResponse(body, status) {
  return Response.json(body, { status });
}
