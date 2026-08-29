import { adminUserLifecycleRefusal } from "./adminUserLifecyclePolicy.js";

/**
 * Create authoritative Admin User Disable.
 *
 * @param {object} capabilities Guarded Admin User lifecycle persistence.
 * @returns {(input: object) => Promise<object>} Admin User Disable operation.
 */
export function createDisableAdminUser({ disableAuthorizedAdminUser }) {
  return async function disableAdminUser(input) {
    const refusal = adminUserLifecycleRefusal(input, "disable");

    if (refusal !== null) return { outcome: refusal };
    const outcome = await disableAuthorizedAdminUser({
      adminUserId: input.adminUser.id,
      targetAdminUserId: input.targetAdminUser.id,
    });

    return outcome === "disabled"
      ? {
          outcome,
          adminUser: { ...input.targetAdminUser, state: "disabled" },
        }
      : { outcome };
  };
}
