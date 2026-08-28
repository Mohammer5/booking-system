import { createAdminHttpHandler } from "./admin-bootstrap/index.js";
import {
  createCourseAccessHttpHandler,
  createParticipantCourseHttpHandler,
  createParticipantHttpHandler,
} from "./course-access/index.js";
import { createCourseHttpHandler } from "./course-structure/index.js";

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
  const handleAdminHttpRequest = createAdminHttpHandler({
    authenticate: authentication.authenticate,
    createAdminUserId: capabilities.createAdminUserId,
    persistence: capabilities.adminPersistence,
  });
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
    adminPersistence: capabilities.adminPersistence,
    assignmentPersistence: capabilities.assignmentPersistence,
    coursePersistence: capabilities.coursePersistence,
    participantPersistence: capabilities.participantPersistence,
  });
  const handleParticipantHttpRequest = createParticipantHttpHandler({
    authenticate: authentication.authenticate,
    createParticipantId: capabilities.createParticipantId,
    persistence: capabilities.participantPersistence,
  });
  const handleParticipantCourseHttpRequest = createParticipantCourseHttpHandler({
    authenticate: authentication.authenticate,
    participantPersistence: capabilities.participantPersistence,
    persistence: capabilities.participantCoursePersistence,
  });

  return {
    handleAdminHttpRequest,
    handleCourseAccessHttpRequest,
    handleCourseHttpRequest,
    handleParticipantCourseHttpRequest,
    handleParticipantHttpRequest,
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

  if (
    requestURL.pathname === "/api/admin/participants" ||
    (requestURL.pathname.startsWith("/api/admin/courses/") &&
      requestURL.pathname.endsWith("/assignments"))
  ) {
    return handlers.handleCourseAccessHttpRequest(request);
  }

  if (
    requestURL.pathname === "/api/admin/courses" ||
    requestURL.pathname.startsWith("/api/admin/courses/")
  ) {
    return handlers.handleCourseHttpRequest(request);
  }

  if (requestURL.pathname.startsWith("/api/admin/")) {
    return handlers.handleAdminHttpRequest(request);
  }

  if (requestURL.pathname.startsWith("/api/participant/")) {
    return isParticipantCoursePath(requestURL.pathname)
      ? handlers.handleParticipantCourseHttpRequest(request)
      : handlers.handleParticipantHttpRequest(request);
  }

  return Response.json({ outcome: "not-found" }, { status: 404 });
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
