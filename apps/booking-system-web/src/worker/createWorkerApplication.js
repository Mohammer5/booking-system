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
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith("/api/auth/")) {
      return authentication.handleAuthRequest(request);
    }

    if (pathname.startsWith("/api/admin/")) {
      return handleAdminHttpRequest(request);
    }

    return Response.json({ outcome: "not-found" }, { status: 404 });
  };
}
