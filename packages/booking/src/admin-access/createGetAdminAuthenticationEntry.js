/**
 * Create the public administration-entry read operation from persistence.
 *
 * @param {{hasAdminUserEverBeenCreated: () => Promise<boolean>}} capabilities Persistence capabilities.
 * @returns {() => Promise<{mode: "register-admin" | "login"}>} The entry read.
 */
export function createGetAdminAuthenticationEntry({
  hasAdminUserEverBeenCreated,
}) {
  return async function getAdminAuthenticationEntry() {
    const hasCompletedBootstrap = await hasAdminUserEverBeenCreated();

    return {
      mode: hasCompletedBootstrap ? "login" : "register-admin",
    };
  };
}
