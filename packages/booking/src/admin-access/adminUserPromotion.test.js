import { describe, expect, it, vi } from "vitest";

import { createPromoteAdminUser } from "./createPromoteAdminUser.js";
import { isAdminUserPromotable } from "./isAdminUserPromotable.js";

describe("Admin User promotion authorization", () => {
  it.each([
    [superAdmin("actor"), admin("target"), true],
    [admin("actor"), admin("target"), false],
    [superAdmin("actor", { state: "disabled" }), admin("target"), false],
    [superAdmin("actor"), admin("target", { state: "disabled" }), false],
    [superAdmin("actor"), superAdmin("target"), false],
    [superAdmin("actor"), null, false],
    [superAdmin("actor"), superAdmin("actor"), false],
  ])("evaluates actor %j and target %j", (adminUser, targetAdminUser, expected) => {
    expect(isAdminUserPromotable({ adminUser, targetAdminUser })).toBe(expected);
  });
});

describe("one-way Admin User promotion", () => {
  it("promotes another Active ordinary Admin without changing another fact", async () => {
    const promoteAuthorizedAdminUser = vi.fn().mockResolvedValue("promoted");
    const promoteAdminUser = createPromoteAdminUser({
      promoteAuthorizedAdminUser,
    });
    const targetAdminUser = {
      ...admin("target"),
      externalPrincipalId: "principal-target",
      relationships: ["retained"],
    };

    await expect(promoteAdminUser({
      adminUser: superAdmin("actor"),
      targetAdminUser,
    })).resolves.toEqual({
      outcome: "promoted",
      adminUser: { ...targetAdminUser, authority: "super-admin" },
    });
    expect(promoteAuthorizedAdminUser).toHaveBeenCalledWith({
      adminUserId: "admin-actor",
      targetAdminUserId: "admin-target",
    });
  });

  it.each([
    [superAdmin("actor", { state: "disabled" }), admin("target"), "admin-not-active"],
    [superAdmin("actor"), null, "admin-user-not-found"],
    [admin("actor"), admin("target"), "admin-user-not-promotable"],
    [superAdmin("actor"), admin("target", { state: "disabled" }), "admin-user-not-promotable"],
    [superAdmin("actor"), superAdmin("target"), "admin-user-not-promotable"],
    [superAdmin("actor"), superAdmin("actor"), "admin-user-not-promotable"],
  ])("refuses actor %j and target %j before persistence", async (
    adminUser,
    targetAdminUser,
    outcome,
  ) => {
    const promoteAuthorizedAdminUser = vi.fn();
    const promoteAdminUser = createPromoteAdminUser({
      promoteAuthorizedAdminUser,
    });

    await expect(promoteAdminUser({ adminUser, targetAdminUser }))
      .resolves.toEqual({ outcome });
    expect(promoteAuthorizedAdminUser).not.toHaveBeenCalled();
  });

  it.each([
    "admin-not-active",
    "admin-user-not-found",
    "admin-user-not-promotable",
  ])("preserves guarded persistence refusal %s", async (outcome) => {
    const promoteAdminUser = createPromoteAdminUser({
      promoteAuthorizedAdminUser: async () => outcome,
    });

    await expect(promoteAdminUser({
      adminUser: superAdmin("actor"),
      targetAdminUser: admin("target"),
    })).resolves.toEqual({ outcome });
  });

});

/** @returns {object} One current ordinary Admin User. */
function admin(id, overrides = {}) {
  return {
    id: `admin-${id}`,
    name: `Admin ${id}`,
    state: "active",
    authority: "admin",
    ...overrides,
  };
}

/** @returns {object} One current Super Admin User. */
function superAdmin(id, overrides = {}) {
  return admin(id, { authority: "super-admin", ...overrides });
}
