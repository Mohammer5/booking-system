import { describe, expect, it, vi } from "vitest";

import { createAdminInvite } from "./createAdminInvite.js";
import { createListAdminInvites } from "./createListAdminInvites.js";
import { createRevokeAdminInvite } from "./createRevokeAdminInvite.js";

describe("Admin Invite creation", () => {
  it("creates independent Active candidates without expiry or recovery metadata", async () => {
    let identity = 0;
    let tokenIdentity = 0;
    const createActiveAdminInvite = vi.fn().mockResolvedValue("created");
    const createInvite = createAdminInvite({
      createAdminInviteId: () => `invite-${identity += 1}`,
      createAdminInviteToken: () => `token-${tokenIdentity += 1}`,
      hashAdminInviteToken: async (token) => `digest-${token}`,
      now: () => 1_800_000_000,
      createActiveAdminInvite,
    });
    const adminUser = activeAdmin();
    const first = await createInvite({ adminUser });
    const second = await createInvite({ adminUser });

    expect(first).toEqual({
      outcome: "created",
      invite: {
        id: "invite-1",
        createdAt: 1_800_000_000,
        state: "active",
        token: "token-1",
      },
    });
    expect(second.invite.id).toBe("invite-2");
    expect(createActiveAdminInvite).toHaveBeenCalledTimes(2);
    expect(createActiveAdminInvite).toHaveBeenNthCalledWith(1, {
      id: "invite-1",
      createdAt: 1_800_000_000,
      createdByAdminUserId: "admin-a",
      state: "active",
      tokenDigest: "digest-token-1",
    });
    expect(createActiveAdminInvite.mock.calls.flat())
      .not.toContainEqual(expect.objectContaining({ token: expect.anything() }));
    expect(first.invite).not.toHaveProperty("expiresAt");
    expect(first.invite).not.toHaveProperty("email");
  });

  it.each([null, { id: "admin-a", state: "disabled" }])(
    "refuses non-Active actor %j before generating authority",
    async (adminUser) => {
      const createAdminInviteToken = vi.fn();
      const createInvite = createAdminInvite({ createAdminInviteToken });

      await expect(createInvite({ adminUser })).resolves.toEqual({
        outcome: "admin-not-active",
      });
      expect(createAdminInviteToken).not.toHaveBeenCalled();
    },
  );

  it("preserves a guarded stale-actor refusal without returning authority", async () => {
    const createInvite = createAdminInvite({
      createAdminInviteId: () => "invite-a",
      createAdminInviteToken: () => "private-token",
      hashAdminInviteToken: async () => "digest-a",
      now: () => 1,
      createActiveAdminInvite: async () => "admin-not-active",
    });

    await expect(createInvite({ adminUser: activeAdmin() })).resolves.toEqual({
      outcome: "admin-not-active",
    });
  });
});

describe("Admin Invite list and terminal Revoke", () => {
  it("lists only persistence-provided non-secret metadata for an Active actor", async () => {
    const invites = [invite("claimed"), invite("active", "invite-b")];
    const listInvites = createListAdminInvites({
      listAdminInvites: async (adminUserId) => {
        expect(adminUserId).toBe("admin-a");
        return invites;
      },
    });

    await expect(listInvites({ adminUser: activeAdmin() })).resolves.toEqual({
      outcome: "listed",
      invites,
    });
  });

  it.each(["claimed", "revoked"])(
    "keeps %s terminal without invoking persistence",
    async (state) => {
      const revokeActiveAdminInvite = vi.fn();
      const revokeInvite = createRevokeAdminInvite({ revokeActiveAdminInvite });

      await expect(revokeInvite({
        adminUser: activeAdmin(),
        invite: invite(state),
      })).resolves.toEqual({ outcome: "admin-invite-not-active" });
      expect(revokeActiveAdminInvite).not.toHaveBeenCalled();
    },
  );

  it("allows a different Active Admin to Revoke and preserves metadata", async () => {
    const revokeActiveAdminInvite = vi.fn().mockResolvedValue("revoked");
    const revokeInvite = createRevokeAdminInvite({ revokeActiveAdminInvite });
    const currentInvite = invite("active");

    await expect(revokeInvite({
      adminUser: activeAdmin("admin-b"),
      invite: currentInvite,
    })).resolves.toEqual({
      outcome: "revoked",
      invite: { ...currentInvite, state: "revoked" },
    });
    expect(revokeActiveAdminInvite).toHaveBeenCalledWith({
      adminUserId: "admin-b",
      inviteId: "invite-a",
    });
  });

  it.each([
    [null, "admin-invite-not-found"],
    [invite("active"), "admin-not-active"],
  ])("refuses unavailable context without mutation", async (currentInvite, outcome) => {
    const revokeActiveAdminInvite = vi.fn();
    const revokeInvite = createRevokeAdminInvite({ revokeActiveAdminInvite });
    const adminUser = outcome === "admin-not-active"
      ? { id: "admin-a", state: "disabled" }
      : activeAdmin();

    await expect(revokeInvite({ adminUser, invite: currentInvite }))
      .resolves.toEqual({ outcome });
    expect(revokeActiveAdminInvite).not.toHaveBeenCalled();
  });

  it("preserves guarded terminal-race outcomes", async () => {
    const revokeInvite = createRevokeAdminInvite({
      revokeActiveAdminInvite: async () => "admin-invite-not-active",
    });

    await expect(revokeInvite({
      adminUser: activeAdmin(),
      invite: invite("active"),
    })).resolves.toEqual({ outcome: "admin-invite-not-active" });
  });
});

/** @returns {object} One domain Admin User fixture. */
function activeAdmin(id = "admin-a") {
  return { id, state: "active", authority: "admin" };
}

/** @returns {object} One non-secret Admin Invite fixture. */
function invite(state, id = "invite-a") {
  return { id, createdAt: 1_800_000_000, state };
}
