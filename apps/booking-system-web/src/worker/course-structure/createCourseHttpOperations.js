import {
  createCreateCourse,
  createCreateGroup,
  createCreateModule,
  createResolveAdminContext,
  createUpdateCourse,
} from "@booking-system/booking";

import { createGroupManagementOperations } from "./createGroupManagementHttp.js";
import { createCourseArchivalOperations } from "./createCourseArchivalHttp.js";
import { createModuleCancellationOperations } from "./createModuleCancellationHttp.js";
import { createModuleManagementOperations } from "./createModuleManagementHttp.js";

/**
 * Compose narrow Course-structure domain and application operations.
 *
 * @param {object} capabilities Raw application capabilities.
 * @returns {object} Composed Course-structure operations.
 */
export function createCourseHttpOperations(capabilities) {
  return {
    ...capabilities,
    ...createCourseArchivalOperations(capabilities),
    ...createGroupManagementOperations(capabilities),
    ...createModuleCancellationOperations(capabilities),
    ...createModuleManagementOperations(capabilities),
    createCourse: createCreateCourse({
      createCourseId: capabilities.createCourseId,
      createCourseForActiveAdmin:
        capabilities.coursePersistence.createCourseForActiveAdmin,
    }),
    createGroup: createCreateGroup({
      createGroupId: capabilities.createGroupId,
      createGroupForActiveAdmin:
        capabilities.groupPersistence?.createGroupForActiveAdmin,
    }),
    createModule: createCreateModule({
      createModuleId: capabilities.createModuleId,
      createModuleForActiveAdmin:
        capabilities.modulePersistence?.createModuleForActiveAdmin,
      now: capabilities.now,
    }),
    updateCourse: createUpdateCourse({
      updateActiveCourseForActiveAdmin:
        capabilities.coursePersistence.updateActiveCourseForActiveAdmin,
    }),
    resolveAdminContext: createResolveAdminContext({
      findAdminUserByExternalPrincipalId:
        capabilities.adminPersistence.findAdminUserByExternalPrincipalId,
    }),
  };
}
