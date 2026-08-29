import { describe, expect, it } from "vitest";

import { createAdminInviteContinuation } from "./createAdminInviteContinuation.js";

const digest = "b".repeat(64);
const rawToken = "a".repeat(64);

describe("Admin Invite continuation cookie", () => {
  it("round-trips only a signed digest through a hardened session cookie", async () => {
    const continuation = createAdminInviteContinuation("test-secret-a");
    const request = new Request("https://booking.example/admin/invite");
    const header = await continuation.issueCookie(request, digest);

    expect(header).toContain(
      "booking_admin_invite_continuation=v1.",
    );
    expect(header).toContain("Path=/; HttpOnly; SameSite=Lax; Secure");
    expect(header).not.toContain("Max-Age");
    expect(header).not.toContain(rawToken);
    await expect(continuation.readDigest(withCookie(header))).resolves.toBe(digest);
  });

  it("is cryptographically distinct from the Course Invite purpose", async () => {
    const continuation = createAdminInviteContinuation("test-secret-a");
    const header = await continuation.issueCookie(
      new Request("https://booking.example/admin/invite"),
      digest,
    );

    expect(header).not.toContain("booking_course_invite_continuation");
  });

  it("omits Secure only for the local HTTP development boundary", async () => {
    const continuation = createAdminInviteContinuation("test-secret-a");
    const header = await continuation.issueCookie(
      new Request("http://localhost/admin/invite"),
      digest,
    );

    expect(header).not.toContain("Secure");
    expect(header).toContain("HttpOnly; SameSite=Lax");
  });

  it.each(["digest", "signature", "secret"])(
    "rejects a tampered %s without returning authority",
    async (part) => {
      const continuation = createAdminInviteContinuation("test-secret-a");
      const header = await continuation.issueCookie(
        new Request("https://booking.example/admin/invite"),
        digest,
      );
      let cookie = header.split(";", 1)[0];

      if (part === "digest") cookie = cookie.replace(digest, "c".repeat(64));
      if (part === "signature") cookie = `${cookie.slice(0, -1)}A`;
      const reader = part === "secret"
        ? createAdminInviteContinuation("test-secret-b")
        : continuation;

      await expect(reader.readDigest(withCookie(cookie))).resolves.toBeNull();
    },
  );

  it.each([null, "", "other=value", "booking_admin_invite_continuation=bad"])(
    "treats missing or malformed cookie %j as unavailable",
    async (cookie) => {
      const headers = cookie === null ? {} : { cookie };
      const request = new Request("https://booking.example/admin/invite", {
        headers,
      });

      await expect(createAdminInviteContinuation("test-secret-a").readDigest(
        request,
      )).resolves.toBeNull();
    },
  );

  it("clears prior continuation with matching safe scope", () => {
    const header = createAdminInviteContinuation("test-secret-a").clearCookie(
      new Request("https://booking.example/admin/invite"),
    );

    expect(header).toBe(
      "booking_admin_invite_continuation=; Path=/; HttpOnly; " +
      "SameSite=Lax; Secure; Max-Age=0",
    );
  });

  it("rejects invalid issue input and missing key configuration", async () => {
    await expect(createAdminInviteContinuation("test-secret-a").issueCookie(
      new Request("https://booking.example/admin/invite"),
      rawToken.slice(1),
    )).rejects.toThrow("continuation digest is invalid");
    expect(() => createAdminInviteContinuation(""))
      .toThrow("continuation secret is missing");
  });
});

/** @returns {Request} Request carrying only one cookie-pair header. */
function withCookie(cookieHeader) {
  return new Request("https://booking.example/admin/invite", {
    headers: { cookie: cookieHeader.split(";", 1)[0] },
  });
}
