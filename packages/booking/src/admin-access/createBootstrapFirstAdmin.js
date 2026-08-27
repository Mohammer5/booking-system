/**
 * Create the first-Admin bootstrap operation from narrow capabilities.
 *
 * @param {object} capabilities Narrow creation and persistence capabilities.
 * @param {() => string} capabilities.createAdminUserId Create a stable booking identity.
 * @param {(candidate: object) => Promise<"created" | "bootstrap-unavailable">} capabilities.claimFirstAdmin Atomically claim bootstrap.
 * @returns {(input: {externalPrincipalId: string, name: unknown}) => Promise<object>} The bootstrap operation.
 */
export function createBootstrapFirstAdmin({
  createAdminUserId,
  claimFirstAdmin,
}) {
  return async function bootstrapFirstAdmin({ externalPrincipalId, name }) {
    if (!isValidAdminName(name)) {
      return { outcome: "invalid-name" };
    }

    const candidateAdminUser = {
      id: createAdminUserId(),
      externalPrincipalId,
      name,
      state: "active",
      authority: "super-admin",
    };
    const claimOutcome = await claimFirstAdmin(candidateAdminUser);

    if (claimOutcome === "bootstrap-unavailable") {
      return { outcome: "bootstrap-unavailable" };
    }

    return {
      outcome: "created",
      adminUser: candidateAdminUser,
    };
  };
}

/**
 * Check the canonical Admin User name validity without normalizing storage.
 *
 * @param {unknown} name The supplied booking-system name.
 * @returns {boolean} Whether the name is nonblank after validation trimming.
 */
function isValidAdminName(name) {
  return typeof name === "string" && name.trim().length > 0;
}
