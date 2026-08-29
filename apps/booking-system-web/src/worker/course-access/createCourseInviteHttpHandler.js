import {
  createCourseInvite,
  createDisableCourseInvite,
  createReenableCourseInvite,
  createReplaceCourseInvite,
  createResolveAdminContext,
} from "@booking-system/booking";

import {
  inviteJsonResponse,
  matchCourseInviteRoute,
  toCourseInviteResponse,
} from "./courseInviteHttpContract.js";

/**
 * Create Admin Course Invite HTTP handling.
 *
 * @param {object} capabilities Invite application capabilities.
 * @returns {(request: Request) => Promise<Response>} Course Invite handler.
 */
export function createCourseInviteHttpHandler(capabilities) {
  const operations = createCourseInviteOperations(capabilities);

  return async function handleCourseInviteHttpRequest(request) {
    try {
      const route = matchCourseInviteRoute(new URL(request.url).pathname);

      if (route === null || !isSupportedInviteRoute(route, request.method)) {
        return inviteJsonResponse({ outcome: "not-found" }, 404);
      }

      const authorization = await authorizeAdminRequest(request, operations);

      if (authorization.response !== undefined) return authorization.response;

      const response = await handleAuthorizedInviteRequest(
        { request, route, adminUser: authorization.adminUser },
        operations,
      );

      return response;
    } catch {
      return inviteJsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/** @returns {object} Domain operations composed from application capabilities. */
function createCourseInviteOperations(capabilities) {
  const persistence = capabilities.invitePersistence;
  const generation = {
    createCourseInviteId: capabilities.createCourseInviteId,
    createCourseInviteToken: capabilities.createCourseInviteToken,
    hashCourseInviteToken: capabilities.hashCourseInviteToken,
  };

  return {
    ...capabilities,
    createInvite: createCourseInvite({
      ...generation,
      createFirstEnabledCourseInvite: persistence.createFirstEnabledCourseInvite,
    }),
    disableInvite: createDisableCourseInvite({
      disableEnabledCourseInvite: persistence.disableEnabledCourseInvite,
    }),
    reenableInvite: createReenableCourseInvite({
      reenableDisabledCourseInvite: persistence.reenableDisabledCourseInvite,
    }),
    replaceInvite: createReplaceCourseInvite({
      ...generation,
      replaceCurrentCourseInvite: persistence.replaceCurrentCourseInvite,
    }),
    resolveAdminContext: createResolveAdminContext({
      findAdminUserByExternalPrincipalId:
        capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
    }),
  };
}

/** @returns {boolean} Whether one exact route/method is supported. */
function isSupportedInviteRoute(route, method) {
  const lifecycleKinds = new Set([
    "invite-disablement",
    "invite-reenablement",
    "invite-replacement",
  ]);

  if (lifecycleKinds.has(route.kind)) return method === "POST";
  if (route.kind !== "current-invite") return false;
  return new Set(["GET", "POST"]).has(method);
}

/** @returns {Promise<Response>} Current Invite read/create/lifecycle result. */
async function handleAuthorizedInviteRequest(context, operations) {
  const [course, currentInvite] = await Promise.all([
    operations.coursePersistence.findCourseById(context.route.courseId),
    operations.invitePersistence.findCurrentCourseInvite(context.route.courseId),
  ]);

  if (course === null) {
    return inviteJsonResponse({ outcome: "course-not-found" }, 404);
  }

  if (context.route.kind === "current-invite") {
    return context.request.method === "GET"
      ? currentInviteResponse(context.request, course, currentInvite)
      : createInviteResponse(
          context,
          { course, currentInvite },
          operations,
        );
  }

  return lifecycleInviteResponse(
    context,
    { course, currentInvite },
    operations,
  );
}

/** @returns {Response} Active-Course current Invite or exact refusal. */
function currentInviteResponse(request, course, currentInvite) {
  if (course.state !== "active") {
    return inviteJsonResponse({ outcome: "course-not-active" }, 409);
  }

  return inviteJsonResponse({
    invite: currentInvite === null
      ? null
      : toCourseInviteResponse(request, currentInvite),
  }, 200);
}

/** @returns {Promise<Response>} First current Invite result. */
async function createInviteResponse(context, resolution, operations) {
  const result = await operations.createInvite({
    adminUser: context.adminUser,
    course: resolution.course,
    currentInvite: resolution.currentInvite,
  });

  return inviteMutationResponse(
    { request: context.request, result, successStatus: 201 },
    operations,
  );
}

/** @returns {Promise<Response>} Exact disable/re-enable/replace result. */
async function lifecycleInviteResponse(
  context,
  resolution,
  operations,
) {
  if (resolution.currentInvite?.id !== context.route.inviteId) {
    return inviteJsonResponse({ outcome: "course-invite-not-current" }, 409);
  }

  const operationByKind = new Map([
    ["invite-disablement", operations.disableInvite],
    ["invite-reenablement", operations.reenableInvite],
    ["invite-replacement", operations.replaceInvite],
  ]);
  const result = await operationByKind.get(context.route.kind)({
    adminUser: context.adminUser,
    course: resolution.course,
    currentInvite: resolution.currentInvite,
  });

  return inviteMutationResponse(
    { request: context.request, result, successStatus: 200 },
    operations,
  );
}

/** @returns {Promise<Response>} Narrow mutation result or current refusal. */
async function inviteMutationResponse(context, operations) {
  const { request, result, successStatus } = context;

  if (new Set(["created", "disabled", "re-enabled", "replaced"]).has(
    result.outcome,
  )) {
    return inviteJsonResponse({
      outcome: result.outcome,
      invite: toCourseInviteResponse(request, result.invite),
    }, successStatus);
  }

  if (result.outcome === "admin-not-active") {
    return staleAdminResponse(request, operations);
  }

  return inviteJsonResponse(result, 409);
}

/** @returns {Promise<object>} Fresh Active Admin or exact refusal. */
async function authorizeAdminRequest(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return {
      response: inviteJsonResponse({ outcome: "unauthenticated" }, 401),
    };
  }

  const context = await operations.resolveAdminContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-admin"
    ? { adminUser: context.adminUser }
    : { response: inviteJsonResponse(context, 403) };
}

/** @returns {Promise<Response>} Re-resolved stale Admin refusal. */
async function staleAdminResponse(request, operations) {
  const authorization = await authorizeAdminRequest(request, operations);

  return authorization.response ?? inviteJsonResponse(
    { outcome: "admin-not-active" },
    403,
  );
}
