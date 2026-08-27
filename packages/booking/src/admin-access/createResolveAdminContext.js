/**
 * Create fresh administration-context resolution from persistence.
 *
 * @param {{findAdminUserByExternalPrincipalId: (externalPrincipalId: string) => Promise<object | null>}} capabilities Persistence capabilities.
 * @returns {(externalPrincipalId: string) => Promise<object>} The context resolver.
 */
export function createResolveAdminContext({
  findAdminUserByExternalPrincipalId,
}) {
  return async function resolveAdminContext(externalPrincipalId) {
    const adminUser = await findAdminUserByExternalPrincipalId(
      externalPrincipalId,
    );

    if (adminUser === null) {
      return { outcome: "no-admin-user" };
    }

    if (adminUser.state === "disabled") {
      return { outcome: "disabled-admin" };
    }

    return {
      outcome: "active-admin",
      adminUser,
    };
  };
}
