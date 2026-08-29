import {
  createJoinCourseThroughInvite,
  createResolveParticipantContext,
  recognizeCourseInvite,
} from "@booking-system/booking";

import {
  inviteJsonResponse,
  matchCourseInviteRoute,
  readInviteJsonObject,
} from "./courseInviteHttpContract.js";

const tokenPattern = /^[0-9a-f]{64}$/;

/**
 * Create public continuation and explicit shared-Invite Join HTTP handling.
 *
 * @param {object} capabilities Invite Join application capabilities.
 * @returns {(request: Request) => Promise<Response>} Public Invite handler.
 */
export function createCourseInviteJoinHttpHandler(capabilities) {
  const operations = createJoinOperations(capabilities);

  return async function handleCourseInviteJoinHttpRequest(request) {
    try {
      const route = matchCourseInviteRoute(new URL(request.url).pathname);

      if (!isSupportedPublicRoute(route, request.method)) {
        return inviteJsonResponse({ outcome: "not-found" }, 404);
      }

      if (route.kind === "invite-recognition") {
        return await handleInitialRecognition(request, operations);
      }

      if (route.kind === "invite-continuation") {
        return await handleContinuationRecognition(request, operations);
      }

      return await handleCourseJoin(request, operations);
    } catch {
      return inviteJsonResponse({ outcome: "technical-error" }, 500);
    }
  };
}

/** @returns {object} Domain operations composed from application capabilities. */
function createJoinOperations(capabilities) {
  return {
    ...capabilities,
    joinCourse: createJoinCourseThroughInvite({
      createCourseAssignmentId: capabilities.createCourseAssignmentId,
      joinParticipantToInvitedCourse:
        capabilities.inviteJoinPersistence.joinParticipantToInvitedCourse,
    }),
    resolveParticipantContext: createResolveParticipantContext({
      findParticipantByExternalPrincipalId:
        capabilities.participantPersistence.findParticipantByExternalPrincipalId,
    }),
  };
}

/** @returns {boolean} Whether one exact public route/method is supported. */
function isSupportedPublicRoute(route, method) {
  if (route === null) return false;
  const methods = {
    "invite-recognition": "POST",
    "invite-continuation": "GET",
    "invite-join": "POST",
  };

  return methods[route.kind] === method;
}

/** @returns {Promise<Response>} Recognize raw authority and replace it. */
async function handleInitialRecognition(request, operations) {
  const body = await readInviteJsonObject(request);

  if (!tokenPattern.test(body.token)) {
    return unavailableResponse(request, operations, true);
  }

  const digest = await operations.hashCourseInviteToken(body.token);
  const resolution = await resolveRecognition(digest, operations);

  if (resolution.result.outcome !== "available") {
    return recognitionResponse({
      request,
      result: resolution.result,
      digest: null,
    }, operations);
  }

  return recognitionResponse({ request, result: resolution.result, digest }, operations);
}

/** @returns {Promise<Response>} Recognize only a signed server continuation. */
async function handleContinuationRecognition(request, operations) {
  const resolution = await resolveContinuation(request, operations);

  if (resolution === null) return unavailableResponse(request, operations);
  return inviteJsonResponse(resolution.result, recognitionStatus(resolution.result));
}

/** @returns {Promise<Response>} Explicit Active-Participant Join result. */
async function handleCourseJoin(request, operations) {
  const resolution = await resolveContinuation(request, operations);

  if (resolution === null) return unavailableResponse(request, operations);

  const participantContext = await resolveJoinParticipant(request, operations);

  if (participantContext.response !== undefined) {
    return participantContext.response;
  }

  const assignment = resolution.invite?.courseId === undefined
    ? null
    : await operations.inviteJoinPersistence
      .findAssignmentByParticipantAndCourse(
        participantContext.participant.id,
        resolution.invite.courseId,
      );
  const result = await operations.joinCourse({
    participant: participantContext.participant,
    invite: resolution.invite,
    assignment,
  });

  return joinResponse(result, resolution.result.courseName);
}

/** @returns {Promise<object | null>} Verified cookie and current recognition. */
async function resolveContinuation(request, operations) {
  const digest = await operations.inviteContinuation.readDigest(request);

  return digest === null ? null : resolveRecognition(digest, operations);
}

/** @returns {Promise<object>} Internal Invite plus narrow public meaning. */
async function resolveRecognition(digest, operations) {
  const invite = await operations.invitePersistence
    .findRecognizedCourseInviteByDigest(digest);

  return { invite, result: recognizeCourseInvite(invite) };
}

/** @returns {Promise<object>} Fresh current Participant or exact response. */
async function resolveJoinParticipant(request, operations) {
  const authentication = await operations.authenticate(request);

  if (authentication.outcome === "unauthenticated") {
    return { response: inviteJsonResponse({ outcome: "unauthenticated" }, 401) };
  }

  const context = await operations.resolveParticipantContext(
    authentication.externalPrincipalId,
  );

  return context.outcome === "active-participant"
    ? { participant: context.participant }
    : { response: inviteJsonResponse(context, 403) };
}

/** @returns {Promise<Response>} Narrow result plus issued/cleared cookie. */
async function recognitionResponse(context, operations) {
  const { request, result, digest } = context;
  const cookie = digest === null
    ? operations.inviteContinuation.clearCookie(request)
    : await operations.inviteContinuation.issueCookie(request, digest);

  return inviteJsonResponse(
    result,
    recognitionStatus(result),
    { "set-cookie": cookie },
  );
}

/** @returns {Response} One private unavailable result with optional clearing. */
function unavailableResponse(request, operations, clearCookie = false) {
  const headers = clearCookie
    ? { "set-cookie": operations.inviteContinuation.clearCookie(request) }
    : {};

  return inviteJsonResponse({ outcome: "invite-unavailable" }, 404, headers);
}

/** @returns {Response} Accepted, idempotent, or exact safe Join refusal. */
function joinResponse(result, courseName) {
  if (new Set(["joined", "already-joined"]).has(result.outcome)) {
    return inviteJsonResponse({
      outcome: result.outcome,
      assignment: { id: result.assignment.id, state: result.assignment.state },
      course: result.course,
    }, result.outcome === "joined" ? 201 : 200);
  }

  if (result.outcome === "assignment-revoked") {
    return inviteJsonResponse({ outcome: result.outcome, courseName }, 409);
  }

  if (result.outcome === "participant-not-active") {
    return inviteJsonResponse({ outcome: result.outcome }, 403);
  }

  if (result.outcome === "invite-not-joinable") {
    return inviteJsonResponse({ outcome: "invite-unavailable", courseName }, 409);
  }

  throw new Error("Course Invite Join was not accepted.");
}

/** @returns {number} Unknown is private; recognized unavailable remains useful. */
function recognitionStatus(result) {
  return result.outcome === "invite-unavailable" ? 404 : 200;
}
