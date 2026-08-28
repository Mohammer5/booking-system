const coursesPath = "/api/admin/courses";
const courseDetailPrefix = `${coursesPath}/`;

/**
 * Match one Course HTTP pathname to its owned collection or nested resource.
 *
 * @param {string} pathname Request pathname.
 * @returns {object | null} Route data or null for an unknown path.
 */
export function matchCourseRoute(pathname) {
  if (pathname === coursesPath) {
    return { kind: "courses" };
  }

  if (!pathname.startsWith(courseDetailPrefix)) {
    return null;
  }

  const segments = pathname.slice(courseDetailPrefix.length).split("/");

  if (segments.length === 1 && segments[0].length > 0) {
    return { kind: "course", courseId: segments[0] };
  }

  if (
    segments.length === 2 &&
    segments[0].length > 0 &&
    new Set(["groups", "modules"]).has(segments[1])
  ) {
    return { kind: segments[1], courseId: segments[0] };
  }

  if (
    segments.length === 3 &&
    segments[0].length > 0 &&
    segments[1] === "groups" &&
    segments[2].length > 0
  ) {
    return {
      kind: "group",
      courseId: segments[0],
      groupId: segments[2],
    };
  }

  if (
    segments.length === 4 &&
    segments[0].length > 0 &&
    segments[1] === "groups" &&
    segments[2].length > 0 &&
    new Set(["archival", "reactivation"]).has(segments[3])
  ) {
    return {
      kind: segments[3] === "archival"
        ? "groupArchival"
        : "groupReactivation",
      courseId: segments[0],
      groupId: segments[2],
    };
  }

  return null;
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
 * Remove all fields outside the Course HTTP representation.
 *
 * @param {object} course Booking-domain Course.
 * @returns {object} Narrow browser Course representation.
 */
export function toCourseResponse(course) {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    timezone: course.timezone,
    state: course.state,
    isTimezoneEditable:
      course.state === "active" && course.hasEverHadModule !== true,
  };
}

/**
 * Compose one Course detail with its owned Groups and Modules.
 *
 * @param {object} course Booking-domain Course.
 * @param {Array<object>} groups Course-owned Groups.
 * @param {Array<object>} modules Course-owned Modules.
 * @returns {object} Narrow complete Course-detail representation.
 */
export function toCourseDetailResponse(course, groups, modules) {
  return {
    ...toCourseResponse(course),
    groups: groups.map(toGroupResponse),
    modules: modules.map(toModuleResponse),
  };
}

/**
 * Remove persistence-only normalization from a Group response.
 *
 * @param {object} group Booking-domain Group.
 * @returns {object} Narrow browser Group representation.
 */
export function toGroupResponse(group) {
  return {
    id: group.id,
    courseId: group.courseId,
    name: group.name,
    details: group.details,
    state: group.state,
  };
}

/**
 * Preserve definite Module instants in the browser response.
 *
 * @param {object} module Booking-domain Module.
 * @returns {object} Narrow browser Module representation.
 */
export function toModuleResponse(module) {
  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    description: module.description,
    instructions: module.instructions,
    startsAt: module.startsAt,
    endsAt: module.endsAt,
    state: module.state,
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
