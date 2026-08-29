/** @returns {string} One 256-bit lowercase hexadecimal Admin Invite token. */
export function createAdminInviteToken() {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** @returns {Promise<string>} SHA-256 digest for exact Admin Invite lookup. */
export async function hashAdminInviteToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
