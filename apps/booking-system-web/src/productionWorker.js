import { createAuthentication } from "./authentication/index.js";
import {
  createAdminPersistence,
  createAdminInvitePersistence,
  createAdminInviteToken,
  createCourseAssignmentPersistence,
  createCourseInvitePersistence,
  createCourseInviteContinuation,
  createCourseInviteJoinPersistence,
  createCourseInviteToken,
  createCoursePersistence,
  createGroupPersistence,
  createModulePersistence,
  createModuleSelectionPersistence,
  createParticipantCoursePersistence,
  createParticipantPersistence,
  createWorkerApplication,
  hashCourseInviteToken,
  hashAdminInviteToken,
} from "./worker/index.js";

export default {
  async fetch(request, environment) {
    const baseURL = new URL(request.url).origin;
    const authentication = createAuthentication({
      database: environment.DB,
      baseURL,
      secret: environment.BETTER_AUTH_SECRET,
      googleClientId: environment.GOOGLE_CLIENT_ID,
      googleClientSecret: environment.GOOGLE_CLIENT_SECRET,
    });
    const handleWorkerRequest = createWorkerApplication({
      authentication,
      adminInviteNow: () => Math.floor(Date.now() / 1000),
      createAdminInviteId: () => crypto.randomUUID(),
      createAdminInviteToken,
      createAdminUserId: () => crypto.randomUUID(),
      createCourseAssignmentId: () => crypto.randomUUID(),
      createCourseInviteId: () => crypto.randomUUID(),
      createCourseInviteToken,
      createCourseId: () => crypto.randomUUID(),
      createGroupId: () => crypto.randomUUID(),
      createModuleId: () => crypto.randomUUID(),
      createModuleSelectionId: () => crypto.randomUUID(),
      createParticipantId: () => crypto.randomUUID(),
      now: () => new Date().toISOString(),
      hashCourseInviteToken,
      hashAdminInviteToken,
      adminInvitePersistence: createAdminInvitePersistence(environment.DB),
      inviteContinuation: createCourseInviteContinuation(
        environment.BETTER_AUTH_SECRET,
      ),
      inviteJoinPersistence: createCourseInviteJoinPersistence(environment.DB),
      adminPersistence: createAdminPersistence(environment.DB),
      assignmentPersistence: createCourseAssignmentPersistence(environment.DB),
      coursePersistence: createCoursePersistence(environment.DB),
      invitePersistence: createCourseInvitePersistence(environment.DB),
      groupPersistence: createGroupPersistence(environment.DB),
      modulePersistence: createModulePersistence(environment.DB),
      selectionPersistence: createModuleSelectionPersistence(environment.DB),
      participantCoursePersistence: createParticipantCoursePersistence(
        environment.DB,
      ),
      participantPersistence: createParticipantPersistence(environment.DB),
    });

    return handleWorkerRequest(request);
  },
};
