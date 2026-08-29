/** @returns {string} One 256-bit lowercase hexadecimal Course Invite token. */
export function createCourseInviteToken() {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/** @returns {Promise<string>} SHA-256 lookup digest for one opaque token. */
export async function hashCourseInviteToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return bytesToHex(new Uint8Array(digest));
}

/** @returns {string} Lowercase fixed-width hexadecimal bytes. */
function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
