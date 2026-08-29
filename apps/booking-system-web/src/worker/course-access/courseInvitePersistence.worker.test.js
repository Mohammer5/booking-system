import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCoursePersistence } from "../course-structure/index.js";
import { createCourseInvitePersistence } from "./createCourseInvitePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from course_invites"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
  await seedAdminAndCourse();
});

describe("Course Invite persistence", () => {
  it("creates and repeatedly retrieves one recoverable current Invite", async () => {
    const persistence = createCourseInvitePersistence(env.DB);

    await expect(persistence.createFirstEnabledCourseInvite(
      creationInput(),
    )).resolves.toBe("created");
    await expect(persistence.findCurrentCourseInvite("course-a"))
      .resolves.toEqual(invite());
    await expect(persistence.findCurrentCourseInvite("course-a"))
      .resolves.toEqual(invite());
    await expect(allInviteRows()).resolves.toHaveLength(1);
  });

  it("accepts exactly one of two concurrent first Invite creations", async () => {
    const persistence = createCourseInvitePersistence(env.DB);
    const [first, second] = await Promise.all([
      persistence.createFirstEnabledCourseInvite(creationInput()),
      persistence.createFirstEnabledCourseInvite(creationInput("invite-b", "b")),
    ]);

    expect([first, second].sort()).toEqual([
      "course-invite-already-exists",
      "created",
    ]);
    await expect(allInviteRows()).resolves.toHaveLength(1);
  });

  it("disables and re-enables the same current identity and token", async () => {
    const persistence = createCourseInvitePersistence(env.DB);
    await persistence.createFirstEnabledCourseInvite(creationInput());

    await expect(persistence.disableEnabledCourseInvite(stateInput()))
      .resolves.toBe("disabled");
    await expect(persistence.findCurrentCourseInvite("course-a"))
      .resolves.toEqual(invite("disabled"));
    await expect(persistence.reenableDisabledCourseInvite(stateInput()))
      .resolves.toBe("re-enabled");
    await expect(persistence.findCurrentCourseInvite("course-a"))
      .resolves.toEqual(invite());
  });

  it.each(["enabled", "disabled"])(
    "replaces a current %s Invite and clears predecessor authority",
    async (state) => {
      const persistence = createCourseInvitePersistence(env.DB);
      await persistence.createFirstEnabledCourseInvite(creationInput());
      if (state === "disabled") {
        await persistence.disableEnabledCourseInvite(stateInput());
      }

      await expect(persistence.replaceCurrentCourseInvite(
        replacementInput(),
      )).resolves.toBe("replaced");
      await expect(persistence.findCurrentCourseInvite("course-a"))
        .resolves.toEqual(invite("enabled", "invite-b", "b"));
      const rows = await allInviteRows();

      expect(rows).toEqual([
        {
          id: "invite-a",
          token_digest: hex("a"),
          recoverable_token: null,
          is_enabled: state === "enabled" ? 1 : 0,
          is_current: 0,
          replaces_invite_id: null,
          replacement_invite_id: "invite-b",
        },
        {
          id: "invite-b",
          token_digest: hex("b"),
          recoverable_token: hex("b"),
          is_enabled: 1,
          is_current: 1,
          replaces_invite_id: "invite-a",
          replacement_invite_id: null,
        },
      ]);
      await expect(persistence.findRecognizedCourseInviteByDigest(hex("a")))
        .resolves.toMatchObject({ isCurrent: false, inviteState: state });
      await expect(persistence.findRecognizedCourseInviteByDigest(hex("b")))
        .resolves.toMatchObject({ isCurrent: true, inviteState: "enabled" });
    },
  );

  it("allows exactly one of two concurrent replacements", async () => {
    const persistence = createCourseInvitePersistence(env.DB);
    await persistence.createFirstEnabledCourseInvite(creationInput());

    const results = await Promise.all([
      persistence.replaceCurrentCourseInvite(replacementInput()),
      persistence.replaceCurrentCourseInvite(
        replacementInput("invite-c", "c"),
      ),
    ]);

    expect(results).toContain("replaced");
    expect(results).toContain("course-invite-not-current");
    expect((await allInviteRows())).toHaveLength(2);
    await expect(currentCount()).resolves.toBe(1);
  });

  it.each([
    ["Disabled Admin", "disabled", "active", "admin-not-active"],
    ["Archived Course", "active", "archived", "course-not-active"],
  ])("refuses creation for a stale %s", async (
    _label,
    adminState,
    courseState,
    outcome,
  ) => {
    await setActorAndCourseState(adminState, courseState);

    await expect(createCourseInvitePersistence(env.DB)
      .createFirstEnabledCourseInvite(creationInput())).resolves.toBe(outcome);
    await expect(allInviteRows()).resolves.toEqual([]);
  });

  it("refuses stale lifecycle identities and expected states", async () => {
    const persistence = createCourseInvitePersistence(env.DB);
    await persistence.createFirstEnabledCourseInvite(creationInput());

    await expect(persistence.disableEnabledCourseInvite({
      ...stateInput(),
      inviteId: "missing",
    })).resolves.toBe("course-invite-not-current");
    await persistence.disableEnabledCourseInvite(stateInput());
    await expect(persistence.disableEnabledCourseInvite(stateInput()))
      .resolves.toBe("course-invite-not-enabled");
    await persistence.reenableDisabledCourseInvite(stateInput());
    await expect(persistence.reenableDisabledCourseInvite(stateInput()))
      .resolves.toBe("course-invite-not-disabled");
  });

  it("serializes Course archival with replacement to one coherent outcome", async () => {
    const invites = createCourseInvitePersistence(env.DB);
    await invites.createFirstEnabledCourseInvite(creationInput());

    const [archiveOutcome, replaceOutcome] = await Promise.all([
      createCoursePersistence(env.DB).archiveActiveCourse({
        adminUserId: "admin-a",
        courseId: "course-a",
        nowEpoch: 2_000_000_000_000,
      }),
      invites.replaceCurrentCourseInvite(replacementInput()),
    ]);

    expect([
      ["archived", "course-not-active"],
      ["archived", "replaced"],
    ]).toContainEqual([archiveOutcome, replaceOutcome]);
    await expect(currentCount()).resolves.toBe(1);
    await expect(env.DB.prepare(
      "select state from courses where id = 'course-a'",
    ).first()).resolves.toEqual({ state: "archived" });
  });

  it("rolls back predecessor invalidation when replacement insertion fails", async () => {
    const persistence = createCourseInvitePersistence(env.DB);
    await persistence.createFirstEnabledCourseInvite(creationInput());
    await env.DB.prepare(
      `create trigger refuse_invite_replacement
       before insert on course_invites
       when new.id = 'invite-b'
       begin
         select raise(abort, 'forced Invite replacement failure');
       end`,
    ).run();

    await expect(persistence.replaceCurrentCourseInvite(
      replacementInput(),
    )).rejects.toThrow("forced Invite replacement failure");
    await expect(allInviteRows()).resolves.toEqual([
      {
        id: "invite-a",
        token_digest: hex("a"),
        recoverable_token: hex("a"),
        is_enabled: 1,
        is_current: 1,
        replaces_invite_id: null,
        replacement_invite_id: null,
      },
    ]);
  });

  it("does not translate a technical state-update failure into stale state", async () => {
    const persistence = createCourseInvitePersistence(env.DB);
    await persistence.createFirstEnabledCourseInvite(creationInput());
    await env.DB.prepare(
      `create trigger refuse_invite_disablement
       before update of is_enabled on course_invites
       begin
         select raise(abort, 'forced Invite disablement failure');
       end`,
    ).run();

    await expect(persistence.disableEnabledCourseInvite(
      stateInput(),
    )).rejects.toThrow("forced Invite disablement failure");
    await expect(persistence.findCurrentCourseInvite("course-a"))
      .resolves.toEqual(invite());
    await env.DB.prepare("drop trigger refuse_invite_disablement").run();
  });

  it("returns null for an unknown digest without exposing another Invite", async () => {
    const persistence = createCourseInvitePersistence(env.DB);
    await persistence.createFirstEnabledCourseInvite(creationInput());

    await expect(persistence.findRecognizedCourseInviteByDigest(hex("f")))
      .resolves.toBeNull();
  });
});

/** @returns {object} First-Invite persistence input. */
function creationInput(id = "invite-a", character = "a") {
  return {
    adminUserId: "admin-a",
    invite: {
      id,
      courseId: "course-a",
      state: "enabled",
      token: hex(character),
      tokenDigest: hex(character),
    },
  };
}

/** @returns {object} Exact current Invite state input. */
function stateInput() {
  return { adminUserId: "admin-a", courseId: "course-a", inviteId: "invite-a" };
}

/** @returns {object} Guarded replacement input. */
function replacementInput(id = "invite-b", character = "b") {
  return {
    adminUserId: "admin-a",
    courseId: "course-a",
    currentInviteId: "invite-a",
    invite: creationInput(id, character).invite,
  };
}

/** @returns {object} Current domain Invite. */
function invite(state = "enabled", id = "invite-a", character = "a") {
  return { id, courseId: "course-a", state, token: hex(character) };
}

/** @returns {Promise<void>} Seed one Active Admin and Active Course. */
async function seedAdminAndCourse() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into admin_users
         (id, external_principal_id, name, state, authority)
       values ('admin-a', 'principal-admin-a', 'Admin', 'active', 'admin')`,
    ),
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-a', 'Course A', null, 'Europe/Berlin', 'active', 0)`,
    ),
  ]);
}

/** @returns {Promise<void>} Set authoritative actor and Course state. */
async function setActorAndCourseState(adminState, courseState) {
  await env.DB.batch([
    env.DB.prepare("update admin_users set state = ? where id = 'admin-a'")
      .bind(adminState),
    env.DB.prepare("update courses set state = ? where id = 'course-a'")
      .bind(courseState),
  ]);
}

/** @returns {Promise<Array<object>>} Stable complete Invite rows. */
async function allInviteRows() {
  const { results } = await env.DB.prepare(
    `select id, token_digest, recoverable_token, is_enabled, is_current,
            replaces_invite_id, replacement_invite_id
       from course_invites order by id`,
  ).all();

  return results;
}

/** @returns {Promise<number>} Number of current Invite rows. */
async function currentCount() {
  const row = await env.DB.prepare(
    "select count(*) as count from course_invites where is_current = 1",
  ).first();

  return row.count;
}

/** @returns {string} One valid fixed 256-bit hexadecimal value. */
function hex(character) {
  return character.repeat(64);
}
