import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 6));
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values ('course-existing', 'Existing Course', null,
             'Europe/Berlin', 'active', 0)`,
  ).run();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("Course Invite schema upgrade", () => {
  it("preserves existing Course data and adds the focused Invite schema", async () => {
    const course = await env.DB
      .prepare("select name from courses where id = 'course-existing'")
      .first();
    const columns = await env.DB
      .prepare('pragma table_info("course_invites")')
      .all();

    expect(course).toEqual({ name: "Existing Course" });
    expect(columns.results.map(({ name }) => name)).toEqual([
      "id",
      "course_id",
      "token_digest",
      "recoverable_token",
      "is_enabled",
      "is_current",
      "replaces_invite_id",
      "replacement_invite_id",
    ]);
  });

  it("enforces one current Invite, secret shapes, and permanent ownership", async () => {
    await insertCourse("course-a");
    await insertRawInvite({ id: "invite-a", courseId: "course-a" });

    await expect(insertRawInvite({
      id: "invite-duplicate-current",
      courseId: "course-a",
      digest: hex("b"),
      token: hex("c"),
    })).rejects.toThrow();
    await expect(insertRawInvite({
      id: "invite-bad-digest",
      courseId: "course-existing",
      digest: "not-a-digest",
      token: hex("d"),
    })).rejects.toThrow();
    await expect(insertRawInvite({
      id: "invite-bad-token",
      courseId: "course-existing",
      digest: hex("e"),
      token: "not-a-token",
    })).rejects.toThrow();
    await expect(insertRawInvite({
      id: "invite-missing-course",
      courseId: "missing",
      digest: hex("f"),
      token: hex("1"),
    })).rejects.toThrow();
    await expect(env.DB.prepare(
      "update course_invites set course_id = 'course-existing' where id = 'invite-a'",
    ).run()).rejects.toThrow();
    await expect(env.DB.prepare(
      `update course_invites set token_digest = ? where id = 'invite-a'`,
    ).bind(hex("9")).run()).rejects.toThrow();
    await expect(env.DB.prepare(
      "delete from courses where id = 'course-a'",
    ).run()).rejects.toThrow();
  });

  it("requires the exact invalidated predecessor before replacement insert", async () => {
    await insertCourse("course-replacement");
    await insertRawInvite({
      id: "invite-predecessor",
      courseId: "course-replacement",
      digest: hex("2"),
      token: hex("3"),
    });

    await expect(insertRawInvite({
      id: "invite-unlinked",
      courseId: "course-replacement",
      digest: hex("4"),
      token: hex("5"),
      replacesInviteId: "invite-predecessor",
    })).rejects.toThrow("Course Invite replacement requires predecessor");

    await env.DB.prepare(
      `update course_invites
          set is_current = 0, recoverable_token = null,
              replacement_invite_id = 'invite-replacement'
        where id = 'invite-predecessor'`,
    ).run();
    await expect(insertRawInvite({
      id: "invite-replacement",
      courseId: "course-replacement",
      digest: hex("6"),
      token: hex("7"),
      replacesInviteId: "invite-predecessor",
    })).resolves.toMatchObject({ success: true });
  });
});

/** @returns {Promise<object>} Insert one raw Course. */
function insertCourse(id) {
  return env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, null, 'Europe/Berlin', 'active', 0)`,
  ).bind(id, id).run();
}

/** @returns {Promise<object>} Insert one raw current Course Invite. */
function insertRawInvite({
  id,
  courseId,
  digest = hex("a"),
  token = hex("0"),
  replacesInviteId = null,
}) {
  return env.DB.prepare(
    `insert into course_invites
       (id, course_id, token_digest, recoverable_token, is_enabled,
        is_current, replaces_invite_id, replacement_invite_id)
     values (?, ?, ?, ?, 1, 1, ?, null)`,
  ).bind(id, courseId, digest, token, replacesInviteId).run();
}

/** @returns {string} One valid fixed 256-bit hexadecimal value. */
function hex(character) {
  return character.repeat(64);
}
