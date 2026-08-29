import { describe, expect, it } from "vitest";

import { createCourseInviteContinuation } from "./createCourseInviteContinuation.js";

const digest = "b".repeat(64);
const rawToken = "a".repeat(64);

describe("Course Invite continuation cookie", () => {
  it("round-trips only a signed digest through a hardened session cookie", async () => {
    const continuation = createCourseInviteContinuation("test-secret-a");
    const request = new Request("https://booking.example/invite");
    const header = await continuation.issueCookie(request, digest);

    expect(header).toContain("Path=/; HttpOnly; SameSite=Lax; Secure");
    expect(header).not.toContain("Max-Age");
    expect(header).not.toContain(rawToken);
    await expect(continuation.readDigest(withCookie(header))).resolves.toBe(digest);
  });

  it("omits Secure only for the local HTTP development boundary", async () => {
    const continuation = createCourseInviteContinuation("test-secret-a");
    const header = await continuation.issueCookie(
      new Request("http://localhost/invite"),
      digest,
    );

    expect(header).not.toContain("Secure");
    expect(header).toContain("HttpOnly; SameSite=Lax");
  });

  it.each(["digest", "signature", "secret"])(
    "rejects a tampered %s without returning authority",
    async (part) => {
      const continuation = createCourseInviteContinuation("test-secret-a");
      const header = await continuation.issueCookie(
        new Request("https://booking.example/invite"),
        digest,
      );
      let cookie = header.split(";", 1)[0];

      if (part === "digest") cookie = cookie.replace(digest, "c".repeat(64));
      if (part === "signature") cookie = `${cookie.slice(0, -1)}A`;
      const reader = part === "secret"
        ? createCourseInviteContinuation("test-secret-b")
        : continuation;

      await expect(reader.readDigest(withCookie(cookie))).resolves.toBeNull();
    },
  );

  it.each([null, "", "other=value", "booking_course_invite_continuation=bad"])(
    "treats missing or malformed cookie %j as unavailable",
    async (cookie) => {
      const headers = cookie === null ? {} : { cookie };

      await expect(createCourseInviteContinuation("test-secret-a").readDigest(
        new Request("https://booking.example/invite", { headers }),
      )).resolves.toBeNull();
    },
  );

  it("clears prior continuation with matching safe scope", () => {
    const header = createCourseInviteContinuation("test-secret-a").clearCookie(
      new Request("https://booking.example/invite"),
    );

    expect(header).toBe(
      "booking_course_invite_continuation=; Path=/; HttpOnly; " +
      "SameSite=Lax; Secure; Max-Age=0",
    );
  });

  it("rejects invalid issue input and missing key configuration", async () => {
    await expect(createCourseInviteContinuation("test-secret-a").issueCookie(
      new Request("https://booking.example/invite"),
      rawToken.slice(1),
    )).rejects.toThrow("continuation digest is invalid");
    expect(() => createCourseInviteContinuation(""))
      .toThrow("continuation secret is missing");
  });
});

/** @returns {Request} Request carrying only one cookie-pair header. */
function withCookie(cookieHeader) {
  return new Request("https://booking.example/invite", {
    headers: { cookie: cookieHeader.split(";", 1)[0] },
  });
}
