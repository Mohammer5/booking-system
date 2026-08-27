import {
  createCreateCourse,
  createResolveAdminContext,
} from "@booking-system/booking";

const coursesPath = "/api/admin/courses";
const courseDetailPrefix = `${coursesPath}/`;

/**
 * Create the same-origin Course index, creation, and detail HTTP operations.
 *
 * @param {object} capabilities Application and booking capabilities.
 * @returns {(request: Request) => Promise<Response>} The Course HTTP handler.
 */
export function createCourseHttpHandler({
  authenticate,
  createCourseId,
  adminPersistence,
  coursePersistence,
}) {
  const resolveAdminContext = createResolveAdminContext({
    findAdminUserByExternalPrincipalId:
      adminPersistence.findAdminUserByExternalPrincipalId,
  });
  const createCourse = createCreateCourse({
    createCourseId,
    createCourseForActiveAdmin:
      coursePersistence.createCourseForActiveAdmin,
  });
  const operations = {
    authenticate,
    createCourse,
    coursePersistence,
    resolveAdminContext,
  };

  return async function handleCourseHttpRequest(request) {
    const pathname = new URL(request.url).pathname;

    if (pathname === coursesPath && request.method === "GET") {
      return handleCourseListRequest(request, operations);
    }

    if (pathname === coursesPath && request.method === "POST") {
      return handleCreateCourseRequest(request, operations);
    }

    const courseId = courseIdFromPath(pathname);

    if (courseId !== null && request.method === "GET") {
      return handleCourseDetailRequest(request, courseId, operations);
    }

    return jsonResponse({ outcome: "not-found" }, 404);
  };
}

/**
 * List Courses only after fresh Active Admin resolution.
 *
 * @param {Request} request The list request.
 * @param {object} operations Course HTTP operations.
 * @returns {Promise<Response>} The Course index response.
 */
async function handleCourseListRequest(request, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  if (authorization.response !== undefined) {
    return authorization.response;
  }

  const courses = await operations.coursePersistence.listCourses();

  return jsonResponse({ courses: courses.map(toCourseResponse) }, 200);
}

/**
 * Create a Course only from server-resolved current Admin context.
 *
 * @param {Request} request The creation request.
 * @param {object} operations Course HTTP operations.
 * @returns {Promise<Response>} The Course creation response.
 */
async function handleCreateCourseRequest(request, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  if (authorization.response !== undefined) {
    return authorization.response;
  }

  const body = await readJsonObject(request);
  const result = await operations.createCourse({
    adminUser: authorization.adminUser,
    name: body.name,
    description: body.description,
    timezone: body.timezone,
  });

  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(request, operations);
  }

  if (result.outcome !== "created") {
    return jsonResponse(result, 422);
  }

  return jsonResponse(toCourseResponse(result.course), 201);
}

/**
 * Read one Course only after fresh Active Admin resolution.
 *
 * @param {Request} request The detail request.
 * @param {string} courseId The stable Course identity from the route.
 * @param {object} operations Course HTTP operations.
 * @returns {Promise<Response>} The Course detail response.
 */
async function handleCourseDetailRequest(request, courseId, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  if (authorization.response !== undefined) {
    return authorization.response;
  }

  const course = await operations.coursePersistence.findCourseById(courseId);

  return course === null
    ? jsonResponse({ outcome: "course-not-found" }, 404)
    : jsonResponse(toCourseResponse(course), 200);
}

/**
 * Authenticate and resolve current Admin state for one Course request.
 *
 * @param {Request} request The incoming request.
 * @param {object} operations Authentication and Admin-resolution operations.
 * @returns {Promise<object>} An Active Admin or an exact refusal response.
 */
async function authorizeAdminRequest(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return {
      response: jsonResponse({ outcome: "unauthenticated" }, 401),
    };
  }

  const context = await operations.resolveAdminContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-admin"
    ? { adminUser: context.adminUser }
    : { response: jsonResponse(context, 403) };
}

/**
 * Re-resolve an actor rejected by the guarded write and refuse safely.
 *
 * @param {Request} request The stale creation request.
 * @param {object} operations Authentication and Admin-resolution operations.
 * @returns {Promise<Response>} The current refusal response.
 */
async function staleAdminResponse(request, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  return (
    authorization.response ??
    jsonResponse({ outcome: "admin-not-active" }, 403)
  );
}

/**
 * Extract one non-nested Course identity from a detail route.
 *
 * @param {string} pathname The request pathname.
 * @returns {string | null} The route identity or null.
 */
function courseIdFromPath(pathname) {
  if (!pathname.startsWith(courseDetailPrefix)) {
    return null;
  }

  const courseId = pathname.slice(courseDetailPrefix.length);

  return courseId.length > 0 && !courseId.includes("/") ? courseId : null;
}

/**
 * Read a narrow JSON object, treating malformed input as invalid fields.
 *
 * @param {Request} request The incoming request.
 * @returns {Promise<object>} Parsed input or an empty object.
 */
async function readJsonObject(request) {
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
 * @param {object} course The booking-domain Course.
 * @returns {object} The narrow browser representation.
 */
function toCourseResponse(course) {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    timezone: course.timezone,
    state: course.state,
  };
}

/**
 * Create one JSON response without a universal envelope.
 *
 * @param {object} body The response body.
 * @param {number} status The HTTP status.
 * @returns {Response} The JSON response.
 */
function jsonResponse(body, status) {
  return Response.json(body, { status });
}
