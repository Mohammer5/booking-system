import { describe, expect, it, vi } from "vitest";

import { createClaimAdminInvite } from "./createClaimAdminInvite.js";
import { recognizeAdminInvite } from "./recognizeAdminInvite.js";

describe("Admin Invite recognition", () => {
  it("reveals availability only for an Active Invite", () => {
    expect(recognizeAdminInvite(invite("active"))).toEqual({
      outcome: "available",
    });
  });

  it.each([null, invite("claimed"), invite("revoked")])(
    "collapses unavailable state %j without private metadata",
    (currentInvite) => {
      expect(recognizeAdminInvite(currentInvite)).toEqual({
        outcome: "invite-unavailable",
      });
    },
  );
});

describe("Invited Admin onboarding", () => {
  it.each([undefined, null, "", " ", "\n\t"])(
    "refuses invalid name %j before identity generation",
    async (name) => {
      const createAdminUserId = vi.fn();
      const claimActiveAdminInvite = vi.fn();
      const claimInvite = createClaimAdminInvite({
        createAdminUserId,
        claimActiveAdminInvite,
      });

      await expect(claimInvite(validInput({ name }))).resolves.toEqual({
        outcome: "invalid-name",
      });
      expect(createAdminUserId).not.toHaveBeenCalled();
      expect(claimActiveAdminInvite).not.toHaveBeenCalled();
    },
  );

  it.each(["active", "disabled"])(
    "refuses a current %s Admin without consuming the Invite",
    async (state) => {
      const claimActiveAdminInvite = vi.fn();
      const claimInvite = createClaimAdminInvite({ claimActiveAdminInvite });

      await expect(claimInvite(validInput({
        currentAdminUser: { id: "admin-existing", state },
      }))).resolves.toEqual({ outcome: "admin-user-already-exists" });
      expect(claimActiveAdminInvite).not.toHaveBeenCalled();
    },
  );

  it.each([null, invite("claimed"), invite("revoked")])(
    "refuses unavailable Invite state %j without creating a candidate",
    async (currentInvite) => {
      const createAdminUserId = vi.fn();
      const claimInvite = createClaimAdminInvite({ createAdminUserId });

      await expect(claimInvite(validInput({ invite: currentInvite })))
        .resolves.toEqual({ outcome: "invite-unavailable" });
      expect(createAdminUserId).not.toHaveBeenCalled();
    },
  );

  it("creates one fresh ordinary Active Admin for a principal with no current row", async () => {
    const claimActiveAdminInvite = vi.fn().mockResolvedValue("claimed");
    const claimInvite = createClaimAdminInvite({
      createAdminUserId: () => "admin-new",
      claimActiveAdminInvite,
    });
    const result = await claimInvite(validInput({ name: "  Neue Admina  " }));

    expect(result).toEqual({
      outcome: "created",
      adminUser: {
        id: "admin-new",
        externalPrincipalId: "principal-new",
        name: "  Neue Admina  ",
        state: "active",
        authority: "admin",
      },
    });
    expect(claimActiveAdminInvite).toHaveBeenCalledWith({
      inviteId: "invite-a",
      adminUser: result.adminUser,
    });
    expect(result.adminUser).not.toHaveProperty("participantId");
    expect(result.adminUser).not.toHaveProperty("pending");
  });

  it.each([
    ["admin-user-already-exists", "admin-user-already-exists"],
    ["invite-unavailable", "invite-unavailable"],
  ])("preserves guarded %s competition without a created result", async (
    persistenceOutcome,
    outcome,
  ) => {
    const claimInvite = createClaimAdminInvite({
      createAdminUserId: () => "admin-loser",
      claimActiveAdminInvite: async () => persistenceOutcome,
    });

    await expect(claimInvite(validInput())).resolves.toEqual({ outcome });
  });
});

/** @returns {object} One current non-secret Invite. */
function invite(state) {
  return { id: "invite-a", createdAt: 1, state };
}

/** @returns {object} One valid final-claim input with optional overrides. */
function validInput(overrides = {}) {
  return {
    externalPrincipalId: "principal-new",
    name: "Neue Admina",
    currentAdminUser: null,
    invite: invite("active"),
    ...overrides,
  };
}
