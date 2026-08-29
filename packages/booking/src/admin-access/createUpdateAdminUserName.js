import { isAdminUserNameEditable } from "./isAdminUserNameEditable.js";

/**
 * Create authoritative Admin User name editing under current target policy.
 *
 * @param {object} capabilities Guarded Admin User name persistence.
 * @returns {(input: object) => Promise<object>} Admin User name operation.
 */
export function createUpdateAdminUserName({ updateAuthorizedAdminUserName }) {
  return async function updateAdminUserName(input) {
    if (input.adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (input.targetAdminUser === null) {
      return { outcome: "admin-user-not-found" };
    }

    if (!isAdminUserNameEditable(input)) {
      return { outcome: "admin-user-not-editable" };
    }

    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      return { outcome: "invalid-name" };
    }

    const outcome = await updateAuthorizedAdminUserName({
      adminUserId: input.adminUser.id,
      targetAdminUserId: input.targetAdminUser.id,
      name: input.name,
    });

    return outcome === "updated"
      ? {
          outcome,
          adminUser: { ...input.targetAdminUser, name: input.name },
        }
      : { outcome };
  };
}
