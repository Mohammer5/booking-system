import { describe, expect, it, vi } from "vitest";

import { createDisableParticipant } from "./createDisableParticipant.js";
import { createReenableParticipant } from "./createReenableParticipant.js";

const currentInstant = "2026-08-28T10:00:00.000Z";

describe("Participant Disable", () => {
  it.each([
    ["missing Admin", null, participant(), "admin-not-active"],
    ["Disabled Admin", admin("disabled"), participant(), "admin-not-active"],
    ["missing Participant", admin(), null, "participant-not-active"],
    ["Disabled Participant", admin(), participant("disabled"), "participant-not-active"],
  ])("refuses %s before persistence", async (_case, adminUser, target, outcome) => {
    const disableActiveParticipant = vi.fn();
    const disableParticipant = createDisableParticipant({
      now: () => currentInstant,
      disableActiveParticipant,
    });

    await expect(
      disableParticipant({ adminUser, participant: target }),
    ).resolves.toEqual({ outcome });
    expect(disableActiveParticipant).not.toHaveBeenCalled();
  });

  it("passes the exact injected instant and preserves retained identity data", async () => {
    const disableActiveParticipant = vi.fn().mockResolvedValue({
      outcome: "disabled",
      removedSelectionCount: 3,
    });
    const disableParticipant = createDisableParticipant({
      now: () => currentInstant,
      disableActiveParticipant,
    });
    const target = {
      ...participant(),
      externalPrincipalId: "shared-principal",
      name: "Participant A",
      email: "participant@example.com",
    };

    await expect(
      disableParticipant({ adminUser: admin(), participant: target }),
    ).resolves.toEqual({
      outcome: "disabled",
      participant: { ...target, state: "disabled" },
      removedSelectionCount: 3,
    });
    expect(disableActiveParticipant).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      participantId: "participant-a",
      nowEpoch: Date.parse(currentInstant),
    });
  });

  it("preserves an authoritative stale persistence result", async () => {
    const disableParticipant = createDisableParticipant({
      now: () => currentInstant,
      disableActiveParticipant: async () => ({ outcome: "admin-not-active" }),
    });

    await expect(
      disableParticipant({ adminUser: admin(), participant: participant() }),
    ).resolves.toEqual({ outcome: "admin-not-active" });
  });
});

describe("Participant Re-enable", () => {
  it.each([
    ["missing Admin", null, participant("disabled"), "admin-not-active"],
    ["Disabled Admin", admin("disabled"), participant("disabled"), "admin-not-active"],
    ["missing Participant", admin(), null, "participant-not-disabled"],
    ["Active Participant", admin(), participant(), "participant-not-disabled"],
  ])("refuses %s before persistence", async (_case, adminUser, target, outcome) => {
    const reenableDisabledParticipant = vi.fn();
    const reenableParticipant = createReenableParticipant({
      reenableDisabledParticipant,
    });

    await expect(
      reenableParticipant({ adminUser, participant: target }),
    ).resolves.toEqual({ outcome });
    expect(reenableDisabledParticipant).not.toHaveBeenCalled();
  });

  it("reuses the Participant identity without restoring another relationship", async () => {
    const reenableDisabledParticipant = vi.fn().mockResolvedValue({
      outcome: "re-enabled",
    });
    const reenableParticipant = createReenableParticipant({
      reenableDisabledParticipant,
    });
    const target = {
      ...participant("disabled"),
      externalPrincipalId: "shared-principal",
      name: "Participant A",
      email: "participant@example.com",
    };

    await expect(
      reenableParticipant({ adminUser: admin(), participant: target }),
    ).resolves.toEqual({
      outcome: "re-enabled",
      participant: { ...target, state: "active" },
    });
    expect(reenableDisabledParticipant).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      participantId: "participant-a",
    });
  });
});

/** @returns {object} Current Admin data. */
function admin(state = "active") {
  return { id: "admin-a", state };
}

/** @returns {object} Current Participant data. */
function participant(state = "active") {
  return { id: "participant-a", state };
}
