import { describe, expect, it } from "vitest";

import {
  createAdminInviteToken,
  hashAdminInviteToken,
} from "./adminInviteSecrets.js";

describe("Admin Invite secret adapters", () => {
  it("generates independent 256-bit hexadecimal authority", () => {
    const first = createAdminInviteToken();
    const second = createAdminInviteToken();

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toMatch(/^[0-9a-f]{64}$/);
    expect(second).not.toBe(first);
  });

  it("hashes deterministically without preserving raw authority", async () => {
    const token = "a".repeat(64);
    const first = await hashAdminInviteToken(token);
    const second = await hashAdminInviteToken(token);

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toBe(second);
    expect(first).not.toBe(token);
    await expect(hashAdminInviteToken("b".repeat(64)))
      .resolves.not.toBe(first);
  });
});
