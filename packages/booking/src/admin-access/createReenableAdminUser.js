import { adminUserLifecycleRefusal } from "./adminUserLifecyclePolicy.js";

/**
 * Create authoritative Admin User Re-enable.
 *
 * @param {object} capabilities Guarded Admin User lifecycle persistence.
 * @returns {(input: object) => Promise<object>} Admin User Re-enable operation.
 */
export function createReenableAdminUser({ reenableAuthorizedAdminUser }) {
  return async function reenableAdminUser(input) {
    const refusal = adminUserLifecycleRefusal(input, "re-enable");

    if (refusal !== null) return { outcome: refusal };
    const outcome = await reenableAuthorizedAdminUser({
      adminUserId: input.adminUser.id,
      targetAdminUserId: input.targetAdminUser.id,
    });

    return outcome === "re-enabled"
      ? {
          outcome,
          adminUser: { ...input.targetAdminUser, state: "active" },
        }
      : { outcome };
  };
}
