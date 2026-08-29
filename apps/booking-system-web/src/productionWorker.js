import { createAuthentication } from "./authentication/index.js";
import {
  createAdminPersistence,
  createCourseAssignmentPersistence,
  createCourseInvitePersistence,
  createCourseInviteToken,
  createCoursePersistence,
  createGroupPersistence,
  createModulePersistence,
  createModuleSelectionPersistence,
  createParticipantCoursePersistence,
  createParticipantPersistence,
  createWorkerApplication,
  hashCourseInviteToken,
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
