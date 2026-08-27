import { createAuthentication } from "./authentication/index.js";
import {
  createAdminPersistence,
  createWorkerApplication,
} from "./worker/index.js";

export default {
  async fetch(request, environment) {
    const baseURL = new URL(request.url).origin;
    const authentication = createAuthentication({
      database: environment.DB,
      baseURL,
      secret: environment.BETTER_AUTH_SECRET,
    });
    const handleWorkerRequest = createWorkerApplication({
      authentication,
      createAdminUserId: () => crypto.randomUUID(),
      persistence: createAdminPersistence(environment.DB),
    });

    return handleWorkerRequest(request);
  },
};
