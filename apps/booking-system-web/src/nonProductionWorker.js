import { createAuthentication } from "./authentication/index.js";
import { createFixtureSessionEstablishment } from "./authentication/fixture-session/index.js";
import {
  createAdminPersistence,
  createCoursePersistence,
  createGroupPersistence,
  createModulePersistence,
  createWorkerApplication,
} from "./worker/index.js";

export default {
  async fetch(request, environment) {
    const baseURL = new URL(request.url).origin;
    const normalAuthentication = createAuthentication({
      database: environment.DB,
      baseURL,
      secret: environment.BETTER_AUTH_SECRET,
      googleClientId: environment.GOOGLE_CLIENT_ID,
      googleClientSecret: environment.GOOGLE_CLIENT_SECRET,
    });
    const establishFixtureSession = createFixtureSessionEstablishment({
      database: environment.DB,
      baseURL,
      secret: environment.BETTER_AUTH_SECRET,
    });
    const fixtureResponse = await establishFixtureSession(request);

    if (fixtureResponse !== null) {
      return fixtureResponse;
    }

    const handleWorkerRequest = createWorkerApplication({
      authentication: normalAuthentication,
      createAdminUserId: () => crypto.randomUUID(),
      createCourseId: () => crypto.randomUUID(),
      createGroupId: () => crypto.randomUUID(),
      createModuleId: () => crypto.randomUUID(),
      now: () => environment.BOOKING_TEST_NOW,
      adminPersistence: createAdminPersistence(environment.DB),
      coursePersistence: createCoursePersistence(environment.DB),
      groupPersistence: createGroupPersistence(environment.DB),
      modulePersistence: createModulePersistence(environment.DB),
    });

    return handleWorkerRequest(request);
  },
};
