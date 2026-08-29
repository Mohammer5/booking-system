import { describe, expect, it } from "vitest";

import {
  createCourseInviteToken,
  hashCourseInviteToken,
} from "./courseInviteSecrets.js";

describe("Course Invite secrets", () => {
  it("creates independent 256-bit lowercase hexadecimal tokens", () => {
    const tokens = new Set(Array.from(
      { length: 32 },
      () => createCourseInviteToken(),
    ));

    expect(tokens.size).toBe(32);
    for (const token of tokens) {
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("derives a stable lowercase SHA-256 digest without returning the token", async () => {
    const token = "a".repeat(64);

    await expect(hashCourseInviteToken(token)).resolves.toBe(
      "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb",
    );
    await expect(hashCourseInviteToken(token)).resolves.not.toBe(token);
  });
});
