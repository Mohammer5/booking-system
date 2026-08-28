/**
 * Validate Module descriptive fields for create or complete field editing.
 *
 * @param {object} input Candidate Module text.
 * @param {object} [options] Validation variation.
 * @returns {string | null} First field outcome or null.
 */
export function validateModuleText(input, options = {}) {
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return "invalid-title";
  }

  if (!isValidOptionalText(input.description, options)) {
    return "invalid-description";
  }

  return isValidOptionalText(input.instructions, options)
    ? null
    : "invalid-instructions";
}

/** @returns {boolean} Whether one optional text field is valid. */
function isValidOptionalText(value, { allowOmittedOptionals = false }) {
  return (
    value === null ||
    typeof value === "string" ||
    (allowOmittedOptionals && value === undefined)
  );
}
