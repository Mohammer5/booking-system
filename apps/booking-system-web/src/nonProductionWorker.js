import { createAuthentication } from "./authentication/index.js";
import { createFixtureSessionEstablishment } from "./authentication/fixture-session/index.js";
import {
  createAdminPersistence,
  createWorkerApplication,
} from "./worker/index.js";

export default {
  async fetch(request, environment) {
    const baseURL = new URL(request.url).origin;
    const normalAuthentication = createAuthentication({
      database: environment.DB,
      baseURL,
      secret: environment.BETTER_AUTH_SECRET,
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
      persistence: createAdminPersistence(environment.DB),
    });

    return handleWorkerRequest(request);
  },
};
