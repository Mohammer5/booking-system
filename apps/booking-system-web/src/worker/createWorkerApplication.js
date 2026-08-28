import { createAdminHttpHandler } from "./admin-bootstrap/index.js";
import { createParticipantHttpHandler } from "./course-access/index.js";
import { createCourseHttpHandler } from "./course-structure/index.js";

/**
 * Create the normal Worker request application around narrow capabilities.
 *
 * @param {object} capabilities Runtime capabilities.
 * @returns {(request: Request) => Promise<Response>} The request handler.
 */
export function createWorkerApplication({
  authentication,
  createAdminUserId,
  createCourseId,
  createGroupId,
  createModuleId,
  createParticipantId,
  now,
  adminPersistence,
  coursePersistence,
  groupPersistence,
  modulePersistence,
  participantPersistence,
}) {
  const handleAdminHttpRequest = createAdminHttpHandler({
    authenticate: authentication.authenticate,
    createAdminUserId,
    persistence: adminPersistence,
  });
  const handleCourseHttpRequest = createCourseHttpHandler({
    authenticate: authentication.authenticate,
    createCourseId,
    createGroupId,
    createModuleId,
    now,
    adminPersistence,
    coursePersistence,
    groupPersistence,
    modulePersistence,
  });
  const handleParticipantHttpRequest = createParticipantHttpHandler({
    authenticate: authentication.authenticate,
    createParticipantId,
    persistence: participantPersistence,
  });

  return async function handleWorkerRequest(request) {
    const requestURL = new URL(request.url);
    const pathname = requestURL.pathname;
    const failureResponse = authenticationFailureResponse(request, requestURL);

    if (failureResponse !== null) {
      return failureResponse;
    }

    if (pathname.startsWith("/api/auth/")) {
      return authentication.handleAuthRequest(request);
    }

    if (
      pathname === "/api/admin/courses" ||
      pathname.startsWith("/api/admin/courses/")
    ) {
      return handleCourseHttpRequest(request);
    }

    if (pathname.startsWith("/api/admin/")) {
      return handleAdminHttpRequest(request);
    }

    if (pathname.startsWith("/api/participant/")) {
      return handleParticipantHttpRequest(request);
    }

    return Response.json({ outcome: "not-found" }, { status: 404 });
  };
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
