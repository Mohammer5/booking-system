import {
  createCreateCourse,
  createCreateGroup,
  createCreateModule,
  createResolveAdminContext,
  createUpdateCourse,
} from "@booking-system/booking";

import {
  jsonResponse,
  matchCourseRoute,
  readJsonObject,
  toCourseDetailResponse,
  toCourseResponse,
  toGroupResponse,
} from "./courseHttpContract.js";
import {
  createGroupManagementOperations,
  groupManagementResultResponse,
  resolveGroupManagementRequest,
} from "./createGroupManagementHttp.js";
import {
  createModuleManagementOperations,
  handleModuleManagementRequest,
  moduleCreationResultResponse,
} from "./createModuleManagementHttp.js";

/**
 * Create the same-origin Course, Group, and Module HTTP operations.
 *
 * @param {object} capabilities Application and booking capabilities.
 * @returns {(request: Request) => Promise<Response>} Course-structure HTTP handler.
 */
export function createCourseHttpHandler(capabilities) {
  const operations = createOperations(capabilities);

  return async function handleCourseHttpRequest(request) {
    try {
      const route = matchCourseRoute(new URL(request.url).pathname);

      if (route === null || !isSupportedRoute(route, request.method)) {
        return jsonResponse({ outcome: "not-found" }, 404);
      }

      const authorization = await authorizeAdminRequest(request, operations);

      return authorization.response ?? await handleAuthorizedRoute(
        { request, route, adminUser: authorization.adminUser },
        operations,
      );
    } catch {
      return jsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/**
 * Compose narrow domain and application operations once per Worker request graph.
 *
 * @param {object} capabilities Raw application capabilities.
 * @returns {object} Course-structure HTTP operations.
 */
function createOperations(capabilities) {
  return {
    ...capabilities,
    ...createGroupManagementOperations(capabilities),
    ...createModuleManagementOperations(capabilities),
    createCourse: createCreateCourse({
      createCourseId: capabilities.createCourseId,
      createCourseForActiveAdmin:
        capabilities.coursePersistence.createCourseForActiveAdmin,
    }),
    createGroup: createCreateGroup({
      createGroupId: capabilities.createGroupId,
      createGroupForActiveAdmin:
        capabilities.groupPersistence?.createGroupForActiveAdmin,
    }),
    createModule: createCreateModule({
      createModuleId: capabilities.createModuleId,
      createModuleForActiveAdmin:
        capabilities.modulePersistence?.createModuleForActiveAdmin,
      now: capabilities.now,
    }),
    updateCourse: createUpdateCourse({
      updateActiveCourseForActiveAdmin:
        capabilities.coursePersistence.updateActiveCourseForActiveAdmin,
    }),
    resolveAdminContext: createResolveAdminContext({
      findAdminUserByExternalPrincipalId:
        capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
    }),
  };
}

/**
 * Check the exact method owned by one matched route.
 *
 * @param {object} route Matched route.
 * @param {string} method Request method.
 * @returns {boolean} Whether the operation exists.
 */
function isSupportedRoute(route, method) {
  const methodsByKind = {
    courses: new Set(["GET", "POST"]),
    course: new Set(["GET", "PUT"]),
    groups: new Set(["POST"]),
    group: new Set(["DELETE", "PUT"]),
    groupArchival: new Set(["POST"]),
    groupReactivation: new Set(["POST"]),
    modules: new Set(["POST"]),
    module: new Set(["PUT"]),
    moduleSchedule: new Set(["PUT"]),
  };

  return methodsByKind[route.kind].has(method);
}

/**
 * Dispatch one freshly authorized Course-structure request.
 *
 * @param {object} context Request, route, and current Active Admin User.
 * @param {object} operations Course-structure operations.
 * @returns {Promise<Response>} Exact operation response.
 */
function handleAuthorizedRoute(context, operations) {
  const { request, route, adminUser } = context;

  if (route.kind === "courses" && request.method === "GET") {
    return handleCourseListRequest(operations);
  }

  if (route.kind === "courses") {
    return handleCreateCourseRequest(request, adminUser, operations);
  }

  if (route.kind === "course") {
    return request.method === "GET"
      ? handleCourseDetailRequest(route.courseId, operations)
      : handleUpdateCourseRequest(
          { request, courseId: route.courseId, adminUser },
          operations,
        );
  }

  if (
    new Set(["group", "groupArchival", "groupReactivation"]).has(
      route.kind,
    )
  ) {
    return handleGroupManagementRequest(context, operations);
  }

  if (new Set(["module", "moduleSchedule"]).has(route.kind)) {
    return handleModuleManagementRequest(
      context, operations, currentStateRefusal,
    );
  }

  return route.kind === "groups"
    ? handleCreateGroupRequest(
        { request, courseId: route.courseId, adminUser },
        operations,
      )
    : handleCreateModuleRequest(
        { request, courseId: route.courseId, adminUser },
        operations,
      );
}

/** @returns {Promise<Response>} One exact Group field or lifecycle response. */
async function handleGroupManagementRequest(context, operations) {
  const resolution = await resolveGroupManagementRequest(context, operations);

  if (resolution.response !== undefined) return resolution.response;

  const staleResponse = await currentStateRefusal(
    resolution.result,
    { request: context.request, courseId: context.route.courseId },
    operations,
  );

  return staleResponse ?? groupManagementResultResponse(resolution);
}

/**
 * Update one Active Course through complete fields and guarded current state.
 *
 * @param {object} context Request, target identity, and current Admin.
 * @param {object} operations Course operations.
 * @returns {Promise<Response>} Exact update result or refusal.
 */
async function handleUpdateCourseRequest(context, operations) {
  const course = await operations.coursePersistence.findCourseById(
    context.courseId,
  );

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  const body = await readJsonObject(context.request);
  const result = await operations.updateCourse({
    adminUser: context.adminUser,
    course,
    name: body.name,
    description: body.description,
    timezone: body.timezone,
  });
  const staleResponse = await currentStateRefusal(
    result,
    { request: context.request, courseId: context.courseId },
    operations,
  );

  return staleResponse ?? courseUpdateResultResponse(result);
}

/** @returns {Response} Exact non-stale Course update response. */
function courseUpdateResultResponse(result) {
  if (result.outcome === "updated") {
    return jsonResponse(toCourseResponse(result.course), 200);
  }

  const fieldOutcomes = new Set([
    "invalid-name",
    "invalid-description",
    "invalid-timezone",
  ]);

  return jsonResponse(result, fieldOutcomes.has(result.outcome) ? 422 : 409);
}

/**
 * List Courses after fresh Active Admin resolution.
 *
 * @param {object} operations Course operations.
 * @returns {Promise<Response>} Course index response.
 */
async function handleCourseListRequest(operations) {
  const courses = await operations.coursePersistence.listCourses();

  return jsonResponse({ courses: courses.map(toCourseResponse) }, 200);
}

/**
 * Create one Course from server-resolved Admin context.
 *
 * @returns {Promise<Response>} Course creation response.
 */
async function handleCreateCourseRequest(request, adminUser, operations) {
  const body = await readJsonObject(request);
  const result = await operations.createCourse({
    adminUser,
    name: body.name,
    description: body.description,
    timezone: body.timezone,
  });

  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(request, operations);
  }

  return result.outcome === "created"
    ? jsonResponse(toCourseResponse(result.course), 201)
    : jsonResponse(result, 422);
}

/**
 * Read one Course with its ordered owned structures.
 *
 * @returns {Promise<Response>} Complete Course detail response.
 */
async function handleCourseDetailRequest(courseId, operations) {
  const course = await operations.coursePersistence.findCourseById(courseId);

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  const [groups, modules] = await Promise.all([
    operations.groupPersistence.listGroupsByCourseId(courseId),
    operations.modulePersistence.listModulesByCourseId(courseId),
  ]);

  return jsonResponse(
    toCourseDetailResponse(course, {
      groups,
      modules,
      currentInstant: operations.now(),
    }),
    200,
  );
}

/**
 * Create one Course-wide Group with authoritative write guards.
 *
 * @returns {Promise<Response>} Group creation or refusal response.
 */
async function handleCreateGroupRequest(context, operations) {
  const { request, courseId, adminUser } = context;
  const course = await operations.coursePersistence.findCourseById(courseId);

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  const body = await readJsonObject(request);
  const result = await operations.createGroup({
    adminUser,
    course,
    name: body.name,
    details: body.details,
  });
  const staleResponse = await currentStateRefusal(
    result,
    { request, courseId },
    operations,
  );

  return staleResponse ?? groupResultResponse(result);
}

/**
 * Create one future Scheduled Module with authoritative write guards.
 *
 * @returns {Promise<Response>} Module creation or refusal response.
 */
async function handleCreateModuleRequest(context, operations) {
  const { request, courseId, adminUser } = context;
  const course = await operations.coursePersistence.findCourseById(courseId);

  if (course === null) {
    return jsonResponse({ outcome: "course-not-found" }, 404);
  }

  const body = await readJsonObject(request);
  const result = await operations.createModule({
    adminUser,
    course,
    title: body.title,
    description: body.description,
    instructions: body.instructions,
    startsAtLocal: body.startsAtLocal,
    startsAtOccurrence: body.startsAtOccurrence,
    endsAtLocal: body.endsAtLocal,
    endsAtOccurrence: body.endsAtOccurrence,
  });
  const staleResponse = await currentStateRefusal(
    result,
    { request, courseId },
    operations,
  );

  return staleResponse ?? moduleCreationResultResponse(
    result,
    operations.now(),
  );
}

/**
 * Re-resolve any guarded-write current-state refusal.
 *
 * @returns {Promise<Response | null>} Exact stale response or null.
 */
async function currentStateRefusal(result, context, operations) {
  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(context.request, operations);
  }

  return result.outcome === "course-not-active"
    ? staleCourseResponse(context.request, context.courseId, operations)
    : null;
}

/**
 * Map one Group result to its exact non-stale HTTP response.
 *
 * @returns {Response} Group result response.
 */
function groupResultResponse(result) {
  if (result.outcome === "created") {
    return jsonResponse(toGroupResponse(result.group), 201);
  }

  const status = result.outcome === "group-name-conflict" ? 409 : 422;

  return jsonResponse(result, status);
}

/**
 * Authenticate and freshly resolve Active Admin state.
 *
 * @returns {Promise<object>} Active Admin or exact refusal response.
 */
async function authorizeAdminRequest(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return { response: jsonResponse({ outcome: "unauthenticated" }, 401) };
  }

  const context = await operations.resolveAdminContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-admin"
    ? { adminUser: context.adminUser }
    : { response: jsonResponse(context, 403) };
}

/**
 * Re-resolve an actor rejected by a guarded write.
 *
 * @returns {Promise<Response>} Current Admin refusal response.
 */
async function staleAdminResponse(request, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  return authorization.response ??
    jsonResponse({ outcome: "admin-not-active" }, 403);
}

/**
 * Re-resolve a Course rejected by a guarded structural write.
 *
 * @returns {Promise<Response>} Current Course refusal response.
 */
async function staleCourseResponse(request, courseId, operations) {
  const adminRefusal = await staleAdminResponseIfNeeded(request, operations);

  if (adminRefusal !== null) {
    return adminRefusal;
  }

  const course = await operations.coursePersistence.findCourseById(courseId);

  return course === null
    ? jsonResponse({ outcome: "course-not-found" }, 404)
    : jsonResponse({ outcome: "course-not-active" }, 409);
}

/**
 * Return a current Admin refusal without manufacturing one for an Active actor.
 *
 * @returns {Promise<Response | null>} Refusal or null.
 */
async function staleAdminResponseIfNeeded(request, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  return authorization.response ?? null;
}
