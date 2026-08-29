import { describe, expect, it, vi } from "vitest";

import { deriveAdminUserLifecycleActions } from "./adminUserLifecyclePolicy.js";
import { createDeleteAdminUser } from "./createDeleteAdminUser.js";
import { createDisableAdminUser } from "./createDisableAdminUser.js";
import { createReenableAdminUser } from "./createReenableAdminUser.js";

describe("Admin User lifecycle authorization", () => {
  it.each([
    [admin("actor"), admin("target"), [true, false, true, null]],
    [admin("actor"), admin("target", { state: "disabled" }), [false, true, true, null]],
    [superAdmin("actor"), admin("target"), [true, false, true, null]],
    [superAdmin("actor"), superAdmin("target"), [true, false, true, null]],
    [superAdmin("actor"), superAdmin("target", { state: "disabled" }), [false, true, true, null]],
    [admin("actor"), superAdmin("target"), [false, false, false, "super-admin-protected"]],
    [superAdmin("actor"), superAdmin("actor"), [false, false, false, "self-protected"]],
    [admin("actor", { state: "disabled" }), admin("target"), [false, false, false, null]],
    [superAdmin("actor"), null, [false, false, false, null]],
  ])("derives actor %j against target %j", (
    adminUser,
    targetAdminUser,
    [canDisable, canReenable, canDelete, restriction],
  ) => {
    expect(deriveAdminUserLifecycleActions({ adminUser, targetAdminUser }))
      .toEqual({ canDisable, canReenable, canDelete, restriction });
  });
});

describe("Admin User Disable", () => {
  it("preserves identity, authority, and every unrelated target fact", async () => {
    const disableAuthorizedAdminUser = vi.fn().mockResolvedValue("disabled");
    const disableAdminUser = createDisableAdminUser({
      disableAuthorizedAdminUser,
    });
    const targetAdminUser = {
      ...superAdmin("target"),
      externalPrincipalId: "principal-target",
      relationships: ["retained"],
    };

    await expect(disableAdminUser({
      adminUser: superAdmin("actor"),
      targetAdminUser,
    })).resolves.toEqual({
      outcome: "disabled",
      adminUser: { ...targetAdminUser, state: "disabled" },
    });
    expect(disableAuthorizedAdminUser).toHaveBeenCalledWith({
      adminUserId: "admin-actor",
      targetAdminUserId: "admin-target",
    });
  });

  it.each([
    [admin("actor", { state: "disabled" }), admin("target"), "admin-not-active"],
    [admin("actor"), null, "admin-user-not-found"],
    [admin("actor"), admin("actor"), "admin-user-self-protected"],
    [admin("actor"), superAdmin("target"), "admin-user-not-manageable"],
    [superAdmin("actor"), admin("target", { state: "disabled" }), "admin-user-not-active"],
  ])("refuses actor %j and target %j", async (
    adminUser,
    targetAdminUser,
    outcome,
  ) => {
    const capability = vi.fn();
    const operation = createDisableAdminUser({
      disableAuthorizedAdminUser: capability,
    });

    await expect(operation({ adminUser, targetAdminUser }))
      .resolves.toEqual({ outcome });
    expect(capability).not.toHaveBeenCalled();
  });
});

describe("Admin User Re-enable", () => {
  it("preserves the same identity and authority while restoring Active state", async () => {
    const targetAdminUser = superAdmin("target", { state: "disabled" });
    const operation = createReenableAdminUser({
      reenableAuthorizedAdminUser: async () => "re-enabled",
    });

    await expect(operation({
      adminUser: superAdmin("actor"),
      targetAdminUser,
    })).resolves.toEqual({
      outcome: "re-enabled",
      adminUser: { ...targetAdminUser, state: "active" },
    });
  });

  it.each([
    [admin("actor", { state: "disabled" }), admin("target", { state: "disabled" }), "admin-not-active"],
    [admin("actor"), null, "admin-user-not-found"],
    [admin("actor"), admin("actor", { state: "disabled" }), "admin-user-self-protected"],
    [admin("actor"), superAdmin("target", { state: "disabled" }), "admin-user-not-manageable"],
    [superAdmin("actor"), admin("target"), "admin-user-not-disabled"],
  ])("refuses actor %j and target %j", async (
    adminUser,
    targetAdminUser,
    outcome,
  ) => {
    const capability = vi.fn();
    const operation = createReenableAdminUser({
      reenableAuthorizedAdminUser: capability,
    });

    await expect(operation({ adminUser, targetAdminUser }))
      .resolves.toEqual({ outcome });
    expect(capability).not.toHaveBeenCalled();
  });
});

describe("Admin User deletion", () => {
  it("returns only the removed current Admin identity", async () => {
    const operation = createDeleteAdminUser({
      deleteAuthorizedAdminUser: async () => "deleted",
    });

    await expect(operation({
      adminUser: admin("actor"),
      targetAdminUser: admin("target", { state: "disabled" }),
    })).resolves.toEqual({
      outcome: "deleted",
      adminUserId: "admin-target",
    });
  });

  it.each([
    [admin("actor", { state: "disabled" }), admin("target"), "admin-not-active"],
    [admin("actor"), null, "admin-user-not-found"],
    [superAdmin("actor"), superAdmin("actor"), "admin-user-self-protected"],
    [admin("actor"), superAdmin("target"), "admin-user-not-manageable"],
  ])("refuses actor %j and target %j", async (
    adminUser,
    targetAdminUser,
    outcome,
  ) => {
    const capability = vi.fn();
    const operation = createDeleteAdminUser({
      deleteAuthorizedAdminUser: capability,
    });

    await expect(operation({ adminUser, targetAdminUser }))
      .resolves.toEqual({ outcome });
    expect(capability).not.toHaveBeenCalled();
  });

  it.each([
    "admin-not-active",
    "admin-user-not-found",
    "admin-user-self-protected",
    "admin-user-not-manageable",
    "admin-user-last-active-super",
  ])("preserves guarded persistence refusal %s", async (outcome) => {
    const operation = createDeleteAdminUser({
      deleteAuthorizedAdminUser: async () => outcome,
    });

    await expect(operation({
      adminUser: superAdmin("actor"),
      targetAdminUser: admin("target"),
    })).resolves.toEqual({ outcome });
  });
});

/** @returns {object} One ordinary Admin User. */
function admin(id, overrides = {}) {
  return {
    id: `admin-${id}`,
    name: `Admin ${id}`,
    state: "active",
    authority: "admin",
    ...overrides,
  };
}

/** @returns {object} One Super Admin User. */
function superAdmin(id, overrides = {}) {
  return admin(id, { authority: "super-admin", ...overrides });
}
