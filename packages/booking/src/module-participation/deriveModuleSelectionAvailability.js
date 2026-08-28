import { getModuleSelectionRefusal } from "./getModuleSelectionRefusal.js";

/**
 * Derive whether Participant Selection mutations are currently open.
 *
 * @param {object} input Current Participant, membership, Module, and time.
 * @returns {"open" | "closed"} Authoritative mutation availability.
 */
export function deriveModuleSelectionAvailability(input) {
  return getModuleSelectionRefusal(input, "remove") === null
    ? "open"
    : "closed";
}
