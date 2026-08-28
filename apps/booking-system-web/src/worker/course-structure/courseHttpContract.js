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

  return matchCourseItemRoute(segments) ?? matchCourseActionRoute(segments);
}

/** @returns {object | null} One nested Group or Module item route. */
function matchCourseItemRoute(segments) {
  if (
    segments.length !== 3 ||
    segments[0].length === 0 ||
    !new Set(["groups", "modules"]).has(segments[1]) ||
    segments[2].length === 0
  ) {
    return null;
  }

  return segments[1] === "groups"
    ? { kind: "group", courseId: segments[0], groupId: segments[2] }
    : { kind: "module", courseId: segments[0], moduleId: segments[2] };
}

/** @returns {object | null} One nested lifecycle or schedule action route. */
function matchCourseActionRoute(segments) {
  if (segments.length !== 4 || segments[0].length === 0 || segments[2].length === 0) {
    return null;
  }

  if (
    segments[1] === "groups" &&
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

  if (segments[1] !== "modules") return null;

  const kindByAction = {
    cancellation: "moduleCancellation",
    schedule: "moduleSchedule",
  };
  const kind = kindByAction[segments[3]];

  return kind === undefined
    ? null
    : { kind, courseId: segments[0], moduleId: segments[2] };
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
 * @param {object} structures Groups, Modules, and definite response instant.
 * @returns {object} Narrow complete Course-detail representation.
 */
export function toCourseDetailResponse(course, structures) {
  return {
    ...toCourseResponse(course),
    groups: structures.groups.map(toGroupResponse),
    modules: structures.modules.map((module) =>
      toModuleResponse(module, structures.currentInstant),
    ),
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
 * @param {string} currentInstant Definite response instant.
 * @returns {object} Narrow browser Module representation.
 */
export function toModuleResponse(module, currentInstant) {
  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    description: module.description,
    instructions: module.instructions,
    startsAt: module.startsAt,
    endsAt: module.endsAt,
    state: module.state,
    isCancellationAvailable:
      module.state === "scheduled" &&
      Date.parse(currentInstant) < Date.parse(module.endsAt),
    isScheduleEditable:
      module.state === "scheduled" &&
      Date.parse(currentInstant) < Date.parse(module.startsAt),
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
