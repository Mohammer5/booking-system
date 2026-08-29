import { isAdminUserPromotable } from "./isAdminUserPromotable.js";

/**
 * Create authoritative one-way Admin User promotion.
 *
 * @param {object} capabilities Guarded Admin User authority persistence.
 * @returns {(input: object) => Promise<object>} Admin User promotion operation.
 */
export function createPromoteAdminUser({ promoteAuthorizedAdminUser }) {
  return async function promoteAdminUser(input) {
    if (input.adminUser?.state !== "active") {
      return { outcome: "admin-not-active" };
    }

    if (input.targetAdminUser === null) {
      return { outcome: "admin-user-not-found" };
    }

    if (!isAdminUserPromotable(input)) {
      return { outcome: "admin-user-not-promotable" };
    }

    const outcome = await promoteAuthorizedAdminUser({
      adminUserId: input.adminUser.id,
      targetAdminUserId: input.targetAdminUser.id,
    });

    return outcome === "promoted"
      ? {
          outcome,
          adminUser: {
            ...input.targetAdminUser,
            authority: "super-admin",
          },
        }
      : { outcome };
  };
}
