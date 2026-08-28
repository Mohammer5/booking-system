import { describe, expect, it, vi } from "vitest";

import { createUpdateOwnParticipantProfile } from "./createUpdateOwnParticipantProfile.js";
import { createUpdateParticipantProfileAsAdmin } from "./createUpdateParticipantProfileAsAdmin.js";

describe("Participant self-service profile editing", () => {
  it("refuses a Disabled Participant before validation or persistence", async () => {
    const updateActiveParticipantProfile = vi.fn();
    const updateProfile = createUpdateOwnParticipantProfile({
      updateActiveParticipantProfile,
    });

    await expect(
      updateProfile({
        participant: participant("disabled"),
        name: "Updated",
        email: "updated@example.com",
      }),
    ).resolves.toEqual({ outcome: "participant-not-active" });
    expect(updateActiveParticipantProfile).not.toHaveBeenCalled();
  });

  it.each([
    [{ name: " ", email: "valid@example.com" }, "invalid-name"],
    [{ name: "Valid", email: "invalid" }, "invalid-email"],
  ])("refuses invalid profile input without an effect", async (input, outcome) => {
    const updateActiveParticipantProfile = vi.fn();
    const updateProfile = createUpdateOwnParticipantProfile({
      updateActiveParticipantProfile,
    });

    await expect(
      updateProfile({ participant: participant(), ...input }),
    ).resolves.toEqual({ outcome });
    expect(updateActiveParticipantProfile).not.toHaveBeenCalled();
  });

  it("retains exact valid profile policy and preserves identity and relationships", async () => {
    const updateActiveParticipantProfile = vi
      .fn()
      .mockResolvedValue({ outcome: "updated" });
    const updateProfile = createUpdateOwnParticipantProfile({
      updateActiveParticipantProfile,
    });
    const current = participant("active", {
      assignments: ["assignment-a"],
      selections: ["selection-a"],
      history: ["retained"],
    });

    await expect(
      updateProfile({
        participant: current,
        name: "  Updated Name  ",
        email: "  First.Last+Course@Example.COM  ",
      }),
    ).resolves.toEqual({
      outcome: "updated",
      participant: {
        ...current,
        name: "  Updated Name  ",
        email: "First.Last+Course@Example.COM",
      },
    });
    expect(updateActiveParticipantProfile).toHaveBeenCalledWith({
      participantId: "participant-a",
      profile: {
        name: "  Updated Name  ",
        email: "First.Last+Course@Example.COM",
        normalizedEmail: "first.last+course@example.com",
      },
    });
  });

  it.each(["email-already-exists", "participant-not-active"])(
    "preserves persistence refusal %s",
    async (outcome) => {
      const updateProfile = createUpdateOwnParticipantProfile({
        updateActiveParticipantProfile: async () => ({ outcome }),
      });

      await expect(
        updateProfile({
          participant: participant(),
          name: "Updated",
          email: "updated@example.com",
        }),
      ).resolves.toEqual({ outcome });
    },
  );
});

describe("Admin Participant profile editing", () => {
  it.each([
    [null, participant(), "admin-not-active"],
    [admin("disabled"), participant(), "admin-not-active"],
    [admin(), null, "participant-not-editable"],
    [admin(), participant("pending"), "participant-not-editable"],
  ])("refuses ineligible actor or target state", async (
    adminUser,
    target,
    outcome,
  ) => {
    const updateParticipantProfileAsActiveAdmin = vi.fn();
    const updateProfile = createUpdateParticipantProfileAsAdmin({
      updateParticipantProfileAsActiveAdmin,
    });

    await expect(
      updateProfile({
        adminUser,
        participant: target,
        name: "Updated",
        email: "updated@example.com",
      }),
    ).resolves.toEqual({ outcome });
    expect(updateParticipantProfileAsActiveAdmin).not.toHaveBeenCalled();
  });

  it.each(["active", "disabled"])(
    "updates one registered %s target without changing its state",
    async (state) => {
      const updateParticipantProfileAsActiveAdmin = vi
        .fn()
        .mockResolvedValue({ outcome: "updated" });
      const updateProfile = createUpdateParticipantProfileAsAdmin({
        updateParticipantProfileAsActiveAdmin,
      });
      const target = participant(state, {
        assignments: ["assignment-a"],
        selections: ["selection-a"],
      });

      await expect(
        updateProfile({
          adminUser: admin(),
          participant: target,
          name: "Admin Updated",
          email: "different+tag@example.com",
        }),
      ).resolves.toEqual({
        outcome: "updated",
        participant: {
          ...target,
          name: "Admin Updated",
          email: "different+tag@example.com",
        },
      });
      expect(updateParticipantProfileAsActiveAdmin).toHaveBeenCalledWith({
        adminUserId: "admin-a",
        participantId: "participant-a",
        profile: {
          name: "Admin Updated",
          email: "different+tag@example.com",
          normalizedEmail: "different+tag@example.com",
        },
      });
    },
  );

  it.each([
    ["First.Last@gmail.com", "first.last@gmail.com"],
    ["FirstLast@gmail.com", "firstlast@gmail.com"],
    ["Alice+Course@Example.com", "alice+course@example.com"],
    ["Alice@Example.com", "alice@example.com"],
  ])("normalizes only complete-address case for %s", async (email, normalizedEmail) => {
    const updateParticipantProfileAsActiveAdmin = vi
      .fn()
      .mockResolvedValue({ outcome: "updated" });
    const updateProfile = createUpdateParticipantProfileAsAdmin({
      updateParticipantProfileAsActiveAdmin,
    });

    await updateProfile({
      adminUser: admin(),
      participant: participant(),
      name: "Alice",
      email,
    });

    expect(updateParticipantProfileAsActiveAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({ normalizedEmail }),
      }),
    );
  });

  it.each(["email-already-exists", "admin-not-active", "participant-not-editable"])(
    "preserves guarded persistence refusal %s",
    async (outcome) => {
      const updateProfile = createUpdateParticipantProfileAsAdmin({
        updateParticipantProfileAsActiveAdmin: async () => ({ outcome }),
      });

      await expect(
        updateProfile({
          adminUser: admin(),
          participant: participant(),
          name: "Updated",
          email: "updated@example.com",
        }),
      ).resolves.toEqual({ outcome });
    },
  );
});

/** @returns {object} One Admin User. */
function admin(state = "active") {
  return { id: "admin-a", name: "Independent Admin", state };
}

/** @returns {object} One Participant with stable identity and principal. */
function participant(state = "active", extra = {}) {
  return {
    id: "participant-a",
    externalPrincipalId: "shared-principal",
    name: "Original",
    email: "original@example.com",
    state,
    ...extra,
  };
}
