import { createAdminHttpHandler } from "./admin-bootstrap/index.js";

/**
 * Create the normal Worker request application around narrow capabilities.
 *
 * @param {object} capabilities Runtime capabilities.
 * @returns {(request: Request) => Promise<Response>} The request handler.
 */
export function createWorkerApplication({
  authentication,
  createAdminUserId,
  persistence,
}) {
  const handleAdminHttpRequest = createAdminHttpHandler({
    authenticate: authentication.authenticate,
    createAdminUserId,
    persistence,
  });

  return async function handleWorkerRequest(request) {
    const requestURL = new URL(request.url);
    const pathname = requestURL.pathname;

    if (
      request.method === "GET" &&
      pathname === "/api/auth/application-error"
    ) {
      return authenticationFailureRedirect(requestURL);
    }

    if (pathname.startsWith("/api/auth/")) {
      return authentication.handleAuthRequest(request);
    }

    if (pathname.startsWith("/api/admin/")) {
      return handleAdminHttpRequest(request);
    }

    return Response.json({ outcome: "not-found" }, { status: 404 });
  };
}

/**
 * Remove provider callback details before returning to localized browser UI.
 *
 * @param {URL} requestURL The same-origin authentication failure request.
 * @returns {Response} A fixed application redirect without provider payloads.
 */
function authenticationFailureRedirect(requestURL) {
  const destination = new URL("/admin?authentication=failed", requestURL);

  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location: destination.toString(),
    },
  });
}
