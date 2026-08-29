import { describe, expect, it, vi } from "vitest";

import { createCourseInvite } from "./createCourseInvite.js";
import { createDisableCourseInvite } from "./createDisableCourseInvite.js";
import { createReenableCourseInvite } from "./createReenableCourseInvite.js";
import { createReplaceCourseInvite } from "./createReplaceCourseInvite.js";
import { recognizeCourseInvite } from "./recognizeCourseInvite.js";

describe("Course Invite creation", () => {
  it("creates one enabled current Invite without an expiry", async () => {
    const capabilities = generationCapabilities();
    const createInvite = createCourseInvite(capabilities);

    await expect(createInvite({
      adminUser: admin(),
      course: course(),
      currentInvite: null,
    })).resolves.toEqual({
      outcome: "created",
      invite: invite(),
    });
    expect(capabilities.hashCourseInviteToken).toHaveBeenCalledWith("token-a");
    expect(capabilities.createFirstEnabledCourseInvite).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      invite: { ...invite(), tokenDigest: "digest-token-a" },
    });
    expect(Object.keys(invite())).not.toContain("expiresAt");
  });

  it.each([
    [null, course(), null, "admin-not-active"],
    [{ id: "admin-a", state: "disabled" }, course(), null, "admin-not-active"],
    [admin(), course("archived"), null, "course-not-active"],
    [admin(), course(), undefined, "course-invite-already-exists"],
    [admin(), course(), invite(), "course-invite-already-exists"],
  ])("refuses invalid creation context before generating a secret", async (
    adminUser,
    currentCourse,
    currentInvite,
    outcome,
  ) => {
    const capabilities = generationCapabilities();
    const createInvite = createCourseInvite(capabilities);

    await expect(createInvite({
      adminUser,
      course: currentCourse,
      currentInvite,
    })).resolves.toEqual({ outcome });
    expect(capabilities.createCourseInviteId).not.toHaveBeenCalled();
    expect(capabilities.createCourseInviteToken).not.toHaveBeenCalled();
    expect(capabilities.hashCourseInviteToken).not.toHaveBeenCalled();
    expect(capabilities.createFirstEnabledCourseInvite).not.toHaveBeenCalled();
  });

  it("preserves an authoritative concurrent creation refusal", async () => {
    const capabilities = generationCapabilities();
    capabilities.createFirstEnabledCourseInvite.mockResolvedValue(
      "course-invite-already-exists",
    );

    await expect(createCourseInvite(capabilities)({
      adminUser: admin(),
      course: course(),
      currentInvite: null,
    })).resolves.toEqual({ outcome: "course-invite-already-exists" });
  });
});

describe("Course Invite enablement lifecycle", () => {
  it("disables one enabled current Invite without changing identity or token", async () => {
    const disableEnabledCourseInvite = vi.fn().mockResolvedValue("disabled");
    const disableInvite = createDisableCourseInvite({
      disableEnabledCourseInvite,
    });

    await expect(disableInvite(currentInput())).resolves.toEqual({
      outcome: "disabled",
      invite: invite("disabled"),
    });
    expect(disableEnabledCourseInvite).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      courseId: "course-a",
      inviteId: "invite-a",
    });
  });

  it("re-enables the same disabled current Invite and token", async () => {
    const reenableDisabledCourseInvite = vi.fn().mockResolvedValue("re-enabled");
    const reenableInvite = createReenableCourseInvite({
      reenableDisabledCourseInvite,
    });

    await expect(reenableInvite(currentInput("disabled"))).resolves.toEqual({
      outcome: "re-enabled",
      invite: invite("enabled"),
    });
    expect(reenableDisabledCourseInvite).toHaveBeenCalledWith({
      adminUserId: "admin-a",
      courseId: "course-a",
      inviteId: "invite-a",
    });
  });

  it.each([
    ["disable", { ...currentInput(), adminUser: null }, "admin-not-active"],
    ["disable", { ...currentInput(), course: course("archived") }, "course-not-active"],
    ["disable", currentInput("disabled"), "course-invite-not-enabled"],
    ["disable", { ...currentInput(), currentInvite: null }, "course-invite-not-enabled"],
    ["reenable", { ...currentInput("disabled"), adminUser: null }, "admin-not-active"],
    ["reenable", { ...currentInput("disabled"), course: course("archived") }, "course-not-active"],
    ["reenable", currentInput("enabled"), "course-invite-not-disabled"],
    [
      "reenable",
      { ...currentInput("disabled"), currentInvite: { ...invite("disabled"), courseId: "course-b" } },
      "course-invite-not-disabled",
    ],
  ])("refuses %s for invalid current state", async (action, input, outcome) => {
    const persistence = vi.fn();
    const operation = action === "disable"
      ? createDisableCourseInvite({ disableEnabledCourseInvite: persistence })
      : createReenableCourseInvite({ reenableDisabledCourseInvite: persistence });

    await expect(operation(input)).resolves.toEqual({ outcome });
    expect(persistence).not.toHaveBeenCalled();
  });
});

describe("Course Invite replacement", () => {
  it.each(["enabled", "disabled"])(
    "replaces a current %s Invite with a new enabled secret",
    async (state) => {
      const capabilities = generationCapabilities("invite-b", "token-b");
      capabilities.replaceCurrentCourseInvite = vi.fn().mockResolvedValue("replaced");
      const replaceInvite = createReplaceCourseInvite(capabilities);
      const predecessor = invite(state);

      await expect(replaceInvite({
        adminUser: admin(),
        course: course(),
        currentInvite: predecessor,
      })).resolves.toEqual({
        outcome: "replaced",
        invite: invite("enabled", "invite-b", "token-b"),
      });
      expect(capabilities.replaceCurrentCourseInvite).toHaveBeenCalledWith({
        adminUserId: "admin-a",
        courseId: "course-a",
        currentInviteId: "invite-a",
        invite: {
          ...invite("enabled", "invite-b", "token-b"),
          tokenDigest: "digest-token-b",
        },
      });
      expect(predecessor).toEqual(invite(state));
    },
  );

  it.each([
    [{ ...currentInput(), adminUser: null }, "admin-not-active"],
    [{ ...currentInput(), course: course("archived") }, "course-not-active"],
    [{ ...currentInput(), currentInvite: null }, "course-invite-not-current"],
    [{ ...currentInput(), currentInvite: { ...invite(), state: "replaced" } }, "course-invite-not-current"],
    [{ ...currentInput(), currentInvite: { ...invite(), courseId: "course-b" } }, "course-invite-not-current"],
  ])("refuses invalid replacement before generating authority", async (input, outcome) => {
    const capabilities = generationCapabilities();
    capabilities.replaceCurrentCourseInvite = vi.fn();

    await expect(createReplaceCourseInvite(capabilities)(input)).resolves.toEqual({
      outcome,
    });
    expect(capabilities.createCourseInviteToken).not.toHaveBeenCalled();
    expect(capabilities.replaceCurrentCourseInvite).not.toHaveBeenCalled();
  });
});

describe("Course Invite public recognition", () => {
  it.each([
    [true, "enabled", "active", "available"],
    [true, "disabled", "active", "unavailable"],
    [false, "enabled", "active", "unavailable"],
    [false, "disabled", "active", "unavailable"],
    [true, "enabled", "archived", "unavailable"],
  ])("derives %s/%s/%s as %s with Course name only", (
    isCurrent,
    inviteState,
    courseState,
    outcome,
  ) => {
    expect(recognizeCourseInvite({
      isCurrent,
      inviteState,
      courseState,
      courseName: "Course A",
      roster: "private",
    })).toEqual({ outcome, courseName: "Course A" });
  });

  it.each([
    null,
    {},
    { courseName: "", courseState: "active", inviteState: "enabled", isCurrent: true },
    { courseName: "Course A", courseState: "deleted", inviteState: "enabled", isCurrent: true },
    { courseName: "Course A", courseState: "active", inviteState: "replaced", isCurrent: false },
  ])("returns one private unavailable result for %j", (value) => {
    expect(recognizeCourseInvite(value)).toEqual({
      outcome: "invite-unavailable",
    });
  });
});

/** @returns {object} Deterministic generation and persistence capabilities. */
function generationCapabilities(id = "invite-a", token = "token-a") {
  return {
    createCourseInviteId: vi.fn(() => id),
    createCourseInviteToken: vi.fn(() => token),
    hashCourseInviteToken: vi.fn(async (value) => `digest-${value}`),
    createFirstEnabledCourseInvite: vi.fn().mockResolvedValue("created"),
  };
}

/** @returns {object} Current Invite operation input. */
function currentInput(state = "enabled") {
  return { adminUser: admin(), course: course(), currentInvite: invite(state) };
}

/** @returns {object} Active Admin. */
function admin() {
  return { id: "admin-a", state: "active" };
}

/** @returns {object} Course. */
function course(state = "active") {
  return { id: "course-a", state };
}

/** @returns {object} Current Course Invite. */
function invite(state = "enabled", id = "invite-a", token = "token-a") {
  return { id, courseId: "course-a", state, token };
}
