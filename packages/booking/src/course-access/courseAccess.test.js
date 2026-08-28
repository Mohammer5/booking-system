import { describe, expect, it, vi } from "vitest";

import { createRegisterParticipant } from "./createRegisterParticipant.js";
import { createResolveParticipantContext } from "./createResolveParticipantContext.js";

describe("Participant registration", () => {
  it.each([undefined, null, 42, "", " ", "\n\t"])(
    "refuses invalid required name %j before creating or persisting an identity",
    async (name) => {
      const createParticipantId = vi.fn();
      const registerParticipant = vi.fn();
      const register = createRegisterParticipant({
        createParticipantId,
        registerParticipant,
      });

      await expect(
        register({
          externalPrincipalId: "principal-a",
          name,
          email: "alice@example.com",
        }),
      ).resolves.toEqual({ outcome: "invalid-name" });
      expect(createParticipantId).not.toHaveBeenCalled();
      expect(registerParticipant).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    null,
    "",
    "alice",
    "@example.com",
    "alice@",
    "alice @example.com",
    "alice@example",
    "alice@example.com trailing",
  ])("refuses invalid complete email %j before any effect", async (email) => {
    const createParticipantId = vi.fn();
    const registerParticipant = vi.fn();
    const register = createRegisterParticipant({
      createParticipantId,
      registerParticipant,
    });

    await expect(
      register({ externalPrincipalId: "principal-a", name: "Alice", email }),
    ).resolves.toEqual({ outcome: "invalid-email" });
    expect(createParticipantId).not.toHaveBeenCalled();
    expect(registerParticipant).not.toHaveBeenCalled();
  });

  it("retains trimmed email, preserves valid name, and creates one Active candidate", async () => {
    const registerParticipant = vi.fn().mockResolvedValue("created");
    const register = createRegisterParticipant({
      createParticipantId: () => "participant-a",
      registerParticipant,
    });

    await expect(
      register({
        externalPrincipalId: "principal-a",
        name: "  Alice Example  ",
        email: "  Alice.Example+Course@Example.COM  ",
      }),
    ).resolves.toEqual({
      outcome: "created",
      participant: {
        id: "participant-a",
        externalPrincipalId: "principal-a",
        name: "  Alice Example  ",
        email: "Alice.Example+Course@Example.COM",
        state: "active",
      },
    });
    expect(registerParticipant).toHaveBeenCalledWith({
      id: "participant-a",
      externalPrincipalId: "principal-a",
      name: "  Alice Example  ",
      email: "Alice.Example+Course@Example.COM",
      normalizedEmail: "alice.example+course@example.com",
      state: "active",
    });
  });

  it.each([
    ["Alice+Course@Example.com", "alice+course@example.com"],
    ["Alice@Example.com", "alice@example.com"],
    ["First.Last@gmail.com", "first.last@gmail.com"],
    ["FirstLast@gmail.com", "firstlast@gmail.com"],
  ])("normalizes only case for complete address %s", async (email, expected) => {
    const registerParticipant = vi.fn().mockResolvedValue("created");
    const register = createRegisterParticipant({
      createParticipantId: () => `participant-${expected}`,
      registerParticipant,
    });

    await register({ externalPrincipalId: email, name: "Alice", email });

    expect(registerParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ normalizedEmail: expected }),
    );
  });

  it.each(["participant-already-exists", "email-already-exists"])(
    "returns persistence refusal %s without a created Participant",
    async (outcome) => {
      const register = createRegisterParticipant({
        createParticipantId: () => "unused-participant",
        registerParticipant: async () => outcome,
      });

      await expect(
        register({
          externalPrincipalId: "principal-a",
          name: "Alice",
          email: "alice@example.com",
        }),
      ).resolves.toEqual({ outcome });
    },
  );
});

describe("Participant context", () => {
  it("distinguishes missing, Disabled, and Active current Participant state", async () => {
    const findParticipantByExternalPrincipalId = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "participant-a", state: "disabled" })
      .mockResolvedValueOnce({
        id: "participant-a",
        name: "Alice",
        email: "alice@example.com",
        state: "active",
      });
    const resolve = createResolveParticipantContext({
      findParticipantByExternalPrincipalId,
    });

    await expect(resolve("missing")).resolves.toEqual({
      outcome: "no-participant",
    });
    await expect(resolve("disabled")).resolves.toEqual({
      outcome: "disabled-participant",
    });
    await expect(resolve("active")).resolves.toMatchObject({
      outcome: "active-participant",
      participant: { id: "participant-a", state: "active" },
    });
  });
});
