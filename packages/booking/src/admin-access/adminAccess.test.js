import { describe, expect, it, vi } from "vitest";

import { createBootstrapFirstAdmin } from "./createBootstrapFirstAdmin.js";
import { createGetAdminAuthenticationEntry } from "./createGetAdminAuthenticationEntry.js";
import { createResolveAdminContext } from "./createResolveAdminContext.js";

describe("Admin authentication entry", () => {
  it("reveals registration only before bootstrap has ever completed", async () => {
    const availableEntry = createGetAdminAuthenticationEntry({
      hasAdminUserEverBeenCreated: async () => false,
    });
    const consumedEntry = createGetAdminAuthenticationEntry({
      hasAdminUserEverBeenCreated: async () => true,
    });

    await expect(availableEntry()).resolves.toEqual({
      mode: "register-admin",
    });
    await expect(consumedEntry()).resolves.toEqual({ mode: "login" });
  });
});

describe("First Admin bootstrap", () => {
  it.each(["", " ", "\n\t"])(
    "returns invalid-name for blank input %j",
    async (name) => {
      const claimFirstAdmin = vi.fn();
      const bootstrapFirstAdmin = createBootstrapFirstAdmin({
        createAdminUserId: () => "admin-1",
        claimFirstAdmin,
      });

      await expect(
        bootstrapFirstAdmin({ externalPrincipalId: "principal-1", name }),
      ).resolves.toEqual({ outcome: "invalid-name" });
      expect(claimFirstAdmin).not.toHaveBeenCalled();
    },
  );

  it("creates an Active Super Admin candidate and preserves the supplied valid name", async () => {
    const claimFirstAdmin = vi.fn().mockResolvedValue("created");
    const bootstrapFirstAdmin = createBootstrapFirstAdmin({
      createAdminUserId: () => "admin-1",
      claimFirstAdmin,
    });
    const result = await bootstrapFirstAdmin({
      externalPrincipalId: "principal-1",
      name: "  Jane Doe  ",
    });

    expect(result).toEqual({
      outcome: "created",
      adminUser: {
        id: "admin-1",
        externalPrincipalId: "principal-1",
        name: "  Jane Doe  ",
        state: "active",
        authority: "super-admin",
      },
    });
    expect(claimFirstAdmin).toHaveBeenCalledOnce();
  });

  it("returns bootstrap-unavailable without reporting a created Admin", async () => {
    const claimFirstAdmin = vi.fn().mockResolvedValue("bootstrap-unavailable");
    const bootstrapFirstAdmin = createBootstrapFirstAdmin({
      createAdminUserId: () => "admin-loser",
      claimFirstAdmin,
    });

    await expect(
      bootstrapFirstAdmin({
        externalPrincipalId: "principal-loser",
        name: "Later Admin",
      }),
    ).resolves.toEqual({ outcome: "bootstrap-unavailable" });
  });
});

describe("Admin context", () => {
  it("distinguishes missing, disabled, and active current Admin state", async () => {
    const findAdminUserByExternalPrincipalId = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "admin-1", state: "disabled" })
      .mockResolvedValueOnce({
        id: "admin-1",
        name: "Jane Doe",
        state: "active",
        authority: "super-admin",
      });
    const resolveAdminContext = createResolveAdminContext({
      findAdminUserByExternalPrincipalId,
    });

    await expect(resolveAdminContext("missing")).resolves.toEqual({
      outcome: "no-admin-user",
    });
    await expect(resolveAdminContext("disabled")).resolves.toEqual({
      outcome: "disabled-admin",
    });
    await expect(resolveAdminContext("active")).resolves.toMatchObject({
      outcome: "active-admin",
      adminUser: { id: "admin-1", authority: "super-admin" },
    });
    expect(findAdminUserByExternalPrincipalId).toHaveBeenCalledTimes(3);
  });
});

describe("Public booking package interface", () => {
  it("exports only the implemented booking operation factories", async () => {
    const publicInterface = await import("../index.js");

    expect(Object.keys(publicInterface).sort()).toEqual([
      "createBootstrapFirstAdmin",
      "createCreateCourse",
      "createGetAdminAuthenticationEntry",
      "createResolveAdminContext",
    ]);
  });
});
