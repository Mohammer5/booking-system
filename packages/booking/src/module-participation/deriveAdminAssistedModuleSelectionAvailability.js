import { getAdminAssistedModuleSelectionRefusal } from "./getAdminAssistedModuleSelectionRefusal.js";

/**
 * Derive whether Admin-assisted set/remove is open for one Participant Module.
 *
 * @param {object} input Current actor, target, Course, Module, and time.
 * @returns {"open" | "closed"} Authoritative mutation availability.
 */
export function deriveAdminAssistedModuleSelectionAvailability(input) {
  return getAdminAssistedModuleSelectionRefusal(input, "remove") === null
    ? "open"
    : "closed";
}
