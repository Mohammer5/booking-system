const cookieName = "booking_course_invite_continuation";
const digestPattern = /^[0-9a-f]{64}$/;
const valuePattern = /^v1\.([0-9a-f]{64})\.([A-Za-z0-9_-]{43})$/;
const encoder = new TextEncoder();

/**
 * Create signed same-origin Course Invite continuation capabilities.
 *
 * @param {string} secret Environment-owned authentication secret.
 * @returns {object} Issue, read, and clear cookie operations.
 */
export function createCourseInviteContinuation(secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("Course Invite continuation secret is missing.");
  }

  const signingKey = derivePurposeSigningKey(secret);

  return {
    clearCookie: (request) => continuationCookie(request, "", "Max-Age=0"),
    async issueCookie(request, tokenDigest) {
      if (!digestPattern.test(tokenDigest)) {
        throw new Error("Course Invite continuation digest is invalid.");
      }

      const payload = `v1.${tokenDigest}`;
      const signature = await crypto.subtle.sign(
        "HMAC",
        await signingKey,
        encoder.encode(payload),
      );

      return continuationCookie(
        request,
        `${payload}.${bytesToBase64URL(new Uint8Array(signature))}`,
      );
    },
    async readDigest(request) {
      const value = readCookieValue(request.headers.get("cookie"));
      const match = valuePattern.exec(value ?? "");

      if (match === null) return null;
      const payload = `v1.${match[1]}`;
      const isValid = await crypto.subtle.verify(
        "HMAC",
        await signingKey,
        base64URLToBytes(match[2]),
        encoder.encode(payload),
      );

      return isValid ? match[1] : null;
    },
  };
}

/** @returns {Promise<CryptoKey>} HMAC key separated from other secret uses. */
async function derivePurposeSigningKey(secret) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const keyBytes = await crypto.subtle.sign(
    "HMAC",
    baseKey,
    encoder.encode("booking-system:course-invite-continuation:v1:key"),
  );

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** @returns {string} Complete session-cookie header with safe attributes. */
function continuationCookie(request, value, extraAttribute) {
  const attributes = [
    `${cookieName}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (new URL(request.url).protocol === "https:") attributes.push("Secure");
  if (extraAttribute !== undefined) attributes.push(extraAttribute);
  return attributes.join("; ");
}

/** @returns {string | null} Exact continuation cookie value. */
function readCookieValue(cookieHeader) {
  if (cookieHeader === null) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");

    if (name === cookieName) return valueParts.join("=");
  }

  return null;
}

/** @returns {string} Unpadded URL-safe base64. */
function bytesToBase64URL(bytes) {
  const binary = String.fromCharCode(...bytes);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

/** @returns {Uint8Array} Decoded unpadded URL-safe base64. */
function base64URLToBytes(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
