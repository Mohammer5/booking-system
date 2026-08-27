import { createAuthentication } from "./authentication/index.js";
import {
  createAdminPersistence,
  createCoursePersistence,
  createWorkerApplication,
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
      createCourseId: () => crypto.randomUUID(),
      adminPersistence: createAdminPersistence(environment.DB),
      coursePersistence: createCoursePersistence(environment.DB),
    });

    return handleWorkerRequest(request);
  },
};
