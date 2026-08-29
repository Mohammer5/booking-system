import { describe, expect, it, vi } from "vitest";

import { createListAdminUsers } from "./createListAdminUsers.js";
import { createUpdateAdminUserName } from "./createUpdateAdminUserName.js";
import { isAdminUserNameEditable } from "./isAdminUserNameEditable.js";

describe("Admin User directory", () => {
  it("lists every persistence-provided current Admin for an Active actor", async () => {
    const current = [admin("ordinary"), admin("super", { authority: "super-admin" })];
    const listCurrentAdminUsers = vi.fn().mockResolvedValue(current);
    const listAdminUsers = createListAdminUsers({ listCurrentAdminUsers });

    await expect(listAdminUsers({ adminUser: admin("actor") })).resolves.toEqual({
      outcome: "listed",
      adminUsers: current,
    });
    expect(listCurrentAdminUsers).toHaveBeenCalledWith("admin-actor");
  });

  it.each([null, admin("actor", { state: "disabled" })])(
    "refuses non-Active actor %j before reading the directory",
    async (adminUser) => {
      const listCurrentAdminUsers = vi.fn();
      const listAdminUsers = createListAdminUsers({ listCurrentAdminUsers });

      await expect(listAdminUsers({ adminUser })).resolves.toEqual({
        outcome: "admin-not-active",
      });
      expect(listCurrentAdminUsers).not.toHaveBeenCalled();
    },
  );

  it("preserves a guarded stale-actor list refusal", async () => {
    const listAdminUsers = createListAdminUsers({
      listCurrentAdminUsers: async () => "admin-not-active",
    });

    await expect(listAdminUsers({ adminUser: admin("actor") })).resolves.toEqual({
      outcome: "admin-not-active",
    });
  });
});

describe("Admin User name edit authorization", () => {
  it.each([
    [admin("ordinary"), admin("ordinary"), true],
    [admin("super", { authority: "super-admin" }), admin("super", { authority: "super-admin" }), true],
    [admin("ordinary"), admin("peer"), true],
    [admin("ordinary"), admin("peer", { state: "disabled" }), true],
    [admin("super", { authority: "super-admin" }), admin("peer"), true],
    [admin("super", { authority: "super-admin" }), admin("peer", { authority: "super-admin" }), true],
    [admin("ordinary"), admin("super", { authority: "super-admin" }), false],
    [admin("ordinary", { state: "disabled" }), admin("peer"), false],
    [admin("ordinary"), null, false],
  ])("evaluates actor %j and target %j", (adminUser, targetAdminUser, expected) => {
    expect(isAdminUserNameEditable({ adminUser, targetAdminUser })).toBe(expected);
  });
});

describe("Admin User name editing", () => {
  it.each([
    [admin("ordinary"), admin("ordinary")],
    [admin("ordinary"), admin("peer")],
    [admin("ordinary"), admin("peer", { state: "disabled" })],
    [admin("super", { authority: "super-admin" }), admin("peer")],
    [admin("super", { authority: "super-admin" }), admin("peer", { authority: "super-admin" })],
  ])("updates an authorized target without changing any other fact", async (
    adminUser,
    targetAdminUser,
  ) => {
    const updateAuthorizedAdminUserName = vi.fn().mockResolvedValue("updated");
    const updateName = createUpdateAdminUserName({
      updateAuthorizedAdminUserName,
    });
    const target = {
      ...targetAdminUser,
      externalPrincipalId: "principal-target",
      relationships: ["retained"],
    };

    await expect(updateName({
      adminUser,
      targetAdminUser: target,
      name: "  Neuer Name  ",
    })).resolves.toEqual({
      outcome: "updated",
      adminUser: { ...target, name: "  Neuer Name  " },
    });
    expect(updateAuthorizedAdminUserName).toHaveBeenCalledWith({
      adminUserId: adminUser.id,
      targetAdminUserId: target.id,
      name: "  Neuer Name  ",
    });
  });

  it.each([undefined, null, "", " ", "\n\t"])(
    "refuses invalid name %j without persistence",
    async (name) => {
      const updateAuthorizedAdminUserName = vi.fn();
      const updateName = createUpdateAdminUserName({
        updateAuthorizedAdminUserName,
      });

      await expect(updateName({
        adminUser: admin("ordinary"),
        targetAdminUser: admin("ordinary"),
        name,
      })).resolves.toEqual({ outcome: "invalid-name" });
      expect(updateAuthorizedAdminUserName).not.toHaveBeenCalled();
    },
  );

  it.each([
    [admin("actor", { state: "disabled" }), admin("peer"), "admin-not-active"],
    [admin("actor"), null, "admin-user-not-found"],
    [admin("actor"), admin("super", { authority: "super-admin" }), "admin-user-not-editable"],
  ])("refuses actor or target policy before persistence", async (
    adminUser,
    targetAdminUser,
    outcome,
  ) => {
    const updateAuthorizedAdminUserName = vi.fn();
    const updateName = createUpdateAdminUserName({
      updateAuthorizedAdminUserName,
    });

    await expect(updateName({ adminUser, targetAdminUser, name: "Valid" }))
      .resolves.toEqual({ outcome });
    expect(updateAuthorizedAdminUserName).not.toHaveBeenCalled();
  });

  it.each(["admin-not-active", "admin-user-not-found", "admin-user-not-editable"])(
    "preserves guarded persistence refusal %s",
    async (outcome) => {
      const updateName = createUpdateAdminUserName({
        updateAuthorizedAdminUserName: async () => outcome,
      });

      await expect(updateName({
        adminUser: admin("super", { authority: "super-admin" }),
        targetAdminUser: admin("peer"),
        name: "Valid",
      })).resolves.toEqual({ outcome });
    },
  );
});

/** @returns {object} One current Admin User. */
function admin(id, overrides = {}) {
  return {
    id: `admin-${id}`,
    name: `Admin ${id}`,
    state: "active",
    authority: "admin",
    ...overrides,
  };
}
