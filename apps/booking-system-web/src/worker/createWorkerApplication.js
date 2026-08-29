import {
  createAdminHttpHandler,
  createAdminInviteOnboardingHttpHandler,
  createAdminInviteHttpHandler,
  createAdminUserHttpHandler,
} from "./admin-bootstrap/index.js";
import {
  createCourseAccessHttpHandler,
  createCourseInviteHttpHandler,
  createCourseInviteJoinHttpHandler,
  createParticipantCourseHttpHandler,
  createParticipantHttpHandler,
} from "./course-access/index.js";
import { createCourseHttpHandler } from "./course-structure/index.js";
import { createModuleParticipationHttpHandler } from "./module-participation/index.js";

/**
 * Create the normal Worker request application around narrow capabilities.
 *
 * @param {object} capabilities Runtime capabilities.
 * @returns {(request: Request) => Promise<Response>} The request handler.
 */
export function createWorkerApplication(capabilities) {
  const handlers = createWorkerHandlers(capabilities);

  return (request) =>
    handleWorkerRequest(request, capabilities.authentication, handlers);
}

/**
 * Compose the concrete HTTP handlers for one Worker request graph.
 *
 * @param {object} capabilities Runtime capabilities.
 * @returns {object} Admin, Course, membership, and Participant handlers.
 */
function createWorkerHandlers(capabilities) {
  const { authentication } = capabilities;
  const adminHandlers = createAdminHandlers(capabilities, authentication);
  const handleCourseHttpRequest = createCourseHttpHandler({
    authenticate: authentication.authenticate,
    createCourseId: capabilities.createCourseId,
    createGroupId: capabilities.createGroupId,
    createModuleId: capabilities.createModuleId,
    now: capabilities.now,
    adminPersistence: capabilities.adminPersistence,
    coursePersistence: capabilities.coursePersistence,
    groupPersistence: capabilities.groupPersistence,
    modulePersistence: capabilities.modulePersistence,
  });
  const handleCourseAccessHttpRequest = createCourseAccessHttpHandler({
    authenticate: authentication.authenticate,
    createCourseAssignmentId: capabilities.createCourseAssignmentId,
    now: capabilities.now,
    adminPersistence: capabilities.adminPersistence,
    assignmentPersistence: capabilities.assignmentPersistence,
    coursePersistence: capabilities.coursePersistence,
    participantPersistence: capabilities.participantPersistence,
  });
  const inviteHandlers = createInviteHandlers(capabilities, authentication);
  const participantHandlers = createParticipantHandlers(
    capabilities,
    authentication,
  );

  return {
    ...adminHandlers,
    handleCourseAccessHttpRequest,
    ...inviteHandlers,
    handleCourseHttpRequest,
    ...participantHandlers,
  };
}

/** @returns {object} Admin bootstrap, Invite, and onboarding handlers. */
function createAdminHandlers(capabilities, authentication) {
  const handleAdminHttpRequest = createAdminHttpHandler({
    authenticate: authentication.authenticate,
    createAdminUserId: capabilities.createAdminUserId,
    persistence: capabilities.adminPersistence,
  });
  const handleAdminInviteHttpRequest = createAdminInviteHttpHandler({
    authenticate: authentication.authenticate,
    adminInviteNow: capabilities.adminInviteNow,
    createAdminInviteId: capabilities.createAdminInviteId,
    createAdminInviteToken: capabilities.createAdminInviteToken,
    hashAdminInviteToken: capabilities.hashAdminInviteToken,
    adminPersistence: capabilities.adminPersistence,
    invitePersistence: capabilities.adminInvitePersistence,
  });
  const handleAdminInviteOnboardingHttpRequest =
    createAdminInviteOnboardingHttpHandler({
      authenticate: authentication.authenticate,
      createAdminUserId: capabilities.createAdminUserId,
      hashAdminInviteToken: capabilities.hashAdminInviteToken,
      adminPersistence: capabilities.adminPersistence,
      inviteContinuation: capabilities.adminInviteContinuation,
      invitePersistence: capabilities.adminInvitePersistence,
    });
  const handleAdminUserHttpRequest = createAdminUserHttpHandler({
    authenticate: authentication.authenticate,
    adminPersistence: capabilities.adminPersistence,
  });

  return {
    handleAdminHttpRequest,
    handleAdminInviteOnboardingHttpRequest,
    handleAdminInviteHttpRequest,
    handleAdminUserHttpRequest,
  };
}

/** @returns {object} Participant HTTP handlers sharing one capability graph. */
function createParticipantHandlers(capabilities, authentication) {
  return {
    handleParticipantHttpRequest: createParticipantHttpHandler({
      authenticate: authentication.authenticate,
      createParticipantId: capabilities.createParticipantId,
      persistence: capabilities.participantPersistence,
    }),
    handleParticipantCourseHttpRequest: createParticipantCourseHttpHandler({
      authenticate: authentication.authenticate,
      now: capabilities.now,
      participantPersistence: capabilities.participantPersistence,
      persistence: capabilities.participantCoursePersistence,
    }),
    handleModuleParticipationHttpRequest: createModuleParticipationHttpHandler({
      authenticate: authentication.authenticate,
      createModuleSelectionId: capabilities.createModuleSelectionId,
      now: capabilities.now,
      participantCoursePersistence: capabilities.participantCoursePersistence,
      participantPersistence: capabilities.participantPersistence,
      selectionPersistence: capabilities.selectionPersistence,
    }),
  };
}

/** @returns {Function} Focused public and Admin Course Invite handler. */
function createInviteHandlers(capabilities, authentication) {
  const shared = {
    authenticate: authentication.authenticate,
    hashCourseInviteToken: capabilities.hashCourseInviteToken,
    invitePersistence: capabilities.invitePersistence,
  };

  return {
    handleCourseInviteHttpRequest: createCourseInviteHttpHandler({
      ...shared,
      createCourseInviteId: capabilities.createCourseInviteId,
      createCourseInviteToken: capabilities.createCourseInviteToken,
      adminPersistence: capabilities.adminPersistence,
      coursePersistence: capabilities.coursePersistence,
    }),
    handleCourseInviteJoinHttpRequest: createCourseInviteJoinHttpHandler({
      ...shared,
      createCourseAssignmentId: capabilities.createCourseAssignmentId,
      inviteContinuation: capabilities.inviteContinuation,
      inviteJoinPersistence: capabilities.inviteJoinPersistence,
      participantPersistence: capabilities.participantPersistence,
    }),
  };
}

/**
 * Dispatch one Worker request across the concrete application handlers.
 *
 * @param {Request} request Incoming request.
 * @param {object} authentication Authentication operations.
 * @param {object} handlers Concrete HTTP handlers.
 * @returns {Promise<Response>} The application response.
 */
async function handleWorkerRequest(request, authentication, handlers) {
  const requestURL = new URL(request.url);
  const failureResponse = authenticationFailureResponse(request, requestURL);

  if (failureResponse !== null) {
    return failureResponse;
  }

  if (requestURL.pathname.startsWith("/api/auth/")) {
    return authentication.handleAuthRequest(request);
  }

  return handleDomainRequest(request, requestURL, handlers);
}

/** @returns {Promise<Response>} Dispatch one booking-domain HTTP request. */
function handleDomainRequest(request, requestURL, handlers) {
  const adminResponse = handleAdminDomainRequest(request, requestURL, handlers);

  if (adminResponse !== null) return adminResponse;

  if (
    requestURL.pathname === "/api/course-invites/recognition" ||
    requestURL.pathname === "/api/course-invites/continuation" ||
    requestURL.pathname === "/api/course-invites/join"
  ) {
    return handlers.handleCourseInviteJoinHttpRequest(request);
  }

  if (requestURL.pathname.startsWith("/api/participant/")) {
    return handleParticipantRequest(request, requestURL, handlers);
  }

  return Response.json({ outcome: "not-found" }, { status: 404 });
}

/** @returns {Response | Promise<Response> | null} One Admin API dispatch. */
function handleAdminDomainRequest(request, requestURL, handlers) {
  const { pathname } = requestURL;

  if (pathname.startsWith("/api/admin-invite/")) {
    return handlers.handleAdminInviteOnboardingHttpRequest(request);
  }

  if (pathname === "/api/admin/users" || pathname.startsWith("/api/admin/users/")) {
    return handlers.handleAdminUserHttpRequest(request);
  }

  if (pathname === "/api/admin/invites" || pathname.startsWith("/api/admin/invites/")) {
    return handlers.handleAdminInviteHttpRequest(request);
  }

  if (isAdminCourseInvitePath(pathname)) {
    return handlers.handleCourseInviteHttpRequest(request);
  }

  if (
    pathname.startsWith("/api/admin/participants") ||
    (pathname.startsWith("/api/admin/courses/") &&
      pathname.split("/").includes("assignments"))
  ) {
    return handlers.handleCourseAccessHttpRequest(request);
  }

  if (pathname === "/api/admin/courses" || pathname.startsWith("/api/admin/courses/")) {
    return handlers.handleCourseHttpRequest(request);
  }

  return pathname.startsWith("/api/admin/")
    ? handlers.handleAdminHttpRequest(request)
    : null;
}

/** @returns {boolean} Whether a path is nested Admin Course Invite API. */
function isAdminCourseInvitePath(pathname) {
  return pathname.startsWith("/api/admin/courses/") &&
    pathname.split("/").includes("invites");
}

/** @returns {Promise<Response>} Dispatch one Participant-context request. */
function handleParticipantRequest(request, requestURL, handlers) {
  if (requestURL.pathname.endsWith("/selection")) {
    return handlers.handleModuleParticipationHttpRequest(request);
  }

  return isParticipantCoursePath(requestURL.pathname)
    ? handlers.handleParticipantCourseHttpRequest(request)
    : handlers.handleParticipantHttpRequest(request);
}

/** @returns {boolean} Whether the path belongs to Participant Course access. */
function isParticipantCoursePath(pathname) {
  return (
    pathname === "/api/participant/courses" ||
    pathname.startsWith("/api/participant/courses/")
  );
}

/**
 * Resolve only fixed application-owned authentication failure destinations.
 *
 * @param {Request} request Incoming request.
 * @param {URL} requestURL Parsed request URL.
 * @returns {Response | null} Sanitized redirect or no handled response.
 */
function authenticationFailureResponse(request, requestURL) {
  if (request.method !== "GET") {
    return null;
  }

  const destinations = new Map([
    ["/api/auth/application-error", "/admin"],
    ["/api/auth/admin-invite-error", "/admin/invite"],
    ["/api/auth/invite-error", "/invite"],
    ["/api/auth/participant-error", "/"],
  ]);
  const destination = destinations.get(requestURL.pathname);

  return destination === undefined
    ? null
    : authenticationFailureRedirect(requestURL, destination);
}

/**
 * Remove provider callback details before returning to localized browser UI.
 *
 * @param {URL} requestURL The same-origin authentication failure request.
 * @returns {Response} A fixed application redirect without provider payloads.
 */
function authenticationFailureRedirect(requestURL, pathname) {
  const destination = new URL(pathname, requestURL);

  destination.searchParams.set("authentication", "failed");

  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location: destination.toString(),
    },
  });
}
