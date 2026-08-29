import { adminUserLifecycleRefusal } from "./adminUserLifecyclePolicy.js";

/**
 * Create authoritative current Admin User identity deletion.
 *
 * @param {object} capabilities Guarded Admin User deletion persistence.
 * @returns {(input: object) => Promise<object>} Admin User delete operation.
 */
export function createDeleteAdminUser({ deleteAuthorizedAdminUser }) {
  return async function deleteAdminUser(input) {
    const refusal = adminUserLifecycleRefusal(input, "delete");

    if (refusal !== null) return { outcome: refusal };
    const outcome = await deleteAuthorizedAdminUser({
      adminUserId: input.adminUser.id,
      targetAdminUserId: input.targetAdminUser.id,
    });

    return outcome === "deleted"
      ? { outcome, adminUserId: input.targetAdminUser.id }
      : { outcome };
  };
}
