import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCourseInvitePersistence } from "./createCourseInvitePersistence.js";
import { createCourseInviteJoinPersistence } from "./createCourseInviteJoinPersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from course_invites"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
  await seedJoinContext();
});

describe("Course Invite Join persistence", () => {
  it("creates one ordinary Active Assignment and returns minimal Course identity", async () => {
    const persistence = createCourseInviteJoinPersistence(env.DB);

    await expect(persistence.joinParticipantToInvitedCourse(
      joinInput(),
    )).resolves.toEqual({
      outcome: "joined",
      assignment: assignment(),
      course: { id: "course-a", name: "Course A" },
    });
    await expect(allAssignments()).resolves.toEqual([assignment()]);
  });

  it("makes repeated and concurrent Join idempotent without replacing identity", async () => {
    const persistence = createCourseInviteJoinPersistence(env.DB);
    const results = await Promise.all([
      persistence.joinParticipantToInvitedCourse(joinInput()),
      persistence.joinParticipantToInvitedCourse(joinInput("assignment-b")),
    ]);

    expect(results.map(({ outcome }) => outcome).sort()).toEqual([
      "already-joined",
      "joined",
    ]);
    expect(results[0].assignment).toEqual(results[1].assignment);
    await expect(allAssignments()).resolves.toHaveLength(1);

    await expect(persistence.joinParticipantToInvitedCourse(
      joinInput("assignment-c"),
    )).resolves.toMatchObject({
      outcome: "already-joined",
      assignment: results[0].assignment,
    });
  });

  it("allows two Active Participants to reuse the same current Invite", async () => {
    await insertParticipant("participant-b", "active");
    const persistence = createCourseInviteJoinPersistence(env.DB);
    const results = await Promise.all([
      persistence.joinParticipantToInvitedCourse(joinInput()),
      persistence.joinParticipantToInvitedCourse({
        ...joinInput("assignment-b"),
        participantId: "participant-b",
        assignment: assignment("assignment-b", "participant-b"),
      }),
    ]);

    expect(results.map(({ outcome }) => outcome)).toEqual(["joined", "joined"]);
    await expect(allAssignments()).resolves.toHaveLength(2);
  });

  it("refuses a retained Revoked Assignment without reactivation", async () => {
    await insertAssignment("assignment-revoked", "revoked");

    await expect(createCourseInviteJoinPersistence(env.DB)
      .joinParticipantToInvitedCourse({
        ...joinInput("assignment-revoked"),
        assignment: assignment("assignment-revoked"),
      })).resolves.toEqual({
      outcome: "assignment-revoked",
      assignment: { ...assignment("assignment-revoked"), state: "revoked" },
    });
    await expect(allAssignments()).resolves.toEqual([
      { ...assignment("assignment-revoked"), state: "revoked" },
    ]);
  });

  it.each([
    ["Disabled Participant", "disabled", "enabled", true, "active", "participant-not-active"],
    ["Disabled Invite", "active", "disabled", true, "active", "invite-not-joinable"],
    ["Replaced Invite", "active", "enabled", false, "active", "invite-not-joinable"],
    ["Archived Course", "active", "enabled", true, "archived", "invite-not-joinable"],
  ])("refuses current %s without an Assignment", async (
    _label,
    participantState,
    inviteState,
    isCurrent,
    courseState,
    outcome,
  ) => {
    await setJoinState({ participantState, inviteState, isCurrent, courseState });

    await expect(createCourseInviteJoinPersistence(env.DB)
      .joinParticipantToInvitedCourse(joinInput())).resolves.toEqual({ outcome });
    await expect(allAssignments()).resolves.toEqual([]);
  });

  it("serializes Invite disablement and Join to one coherent result", async () => {
    const assignments = createCourseInviteJoinPersistence(env.DB);
    const invites = createCourseInvitePersistence(env.DB);
    const [joinResult, disableResult] = await Promise.all([
      assignments.joinParticipantToInvitedCourse(joinInput()),
      invites.disableEnabledCourseInvite({
        adminUserId: "admin-a",
        courseId: "course-a",
        inviteId: "invite-a",
      }),
    ]);

    expect(disableResult).toBe("disabled");
    expect(["joined", "invite-not-joinable"]).toContain(joinResult.outcome);
    await expect(allAssignments()).resolves.toHaveLength(
      joinResult.outcome === "joined" ? 1 : 0,
    );
  });
});

/** @returns {object} Guarded Invite Join input. */
function joinInput(assignmentId = "assignment-a") {
  return {
    participantId: "participant-a",
    inviteId: "invite-a",
    courseId: "course-a",
    assignment: assignment(assignmentId),
  };
}

/** @returns {object} Ordinary Assignment data. */
function assignment(id = "assignment-a", participantId = "participant-a") {
  return { id, participantId, courseId: "course-a", state: "active" };
}

/** @returns {Promise<void>} Seed one complete available Join context. */
async function seedJoinContext() {
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
  await insertParticipant("participant-a", "active");
  await createCourseInvitePersistence(env.DB).createFirstEnabledCourseInvite({
    adminUserId: "admin-a",
    invite: {
      id: "invite-a",
      courseId: "course-a",
      token: hex("a"),
      tokenDigest: hex("b"),
    },
  });
}

/** @returns {Promise<void>} Insert one Participant. */
async function insertParticipant(id, state) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    `principal-${id}`,
    id,
    `${id}@example.com`,
    `${id}@example.com`,
    state,
  ).run();
}

/** @returns {Promise<void>} Insert one retained Assignment. */
async function insertAssignment(id, state) {
  await env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, 'participant-a', 'course-a', ?)`,
  ).bind(id, state).run();
}

/** @returns {Promise<void>} Set current acceptance state. */
async function setJoinState(input) {
  if (!input.isCurrent) {
    await createCourseInvitePersistence(env.DB).replaceCurrentCourseInvite({
      adminUserId: "admin-a",
      courseId: "course-a",
      currentInviteId: "invite-a",
      invite: {
        id: "invite-replacement",
        courseId: "course-a",
        token: hex("c"),
        tokenDigest: hex("d"),
      },
    });
  }

  await env.DB.batch([
    env.DB.prepare("update participants set state = ? where id = 'participant-a'")
      .bind(input.participantState),
    env.DB.prepare("update courses set state = ? where id = 'course-a'")
      .bind(input.courseState),
    env.DB.prepare(
      "update course_invites set is_enabled = ? where id = 'invite-a'",
    ).bind(Number(input.inviteState === "enabled")),
  ]);
}

/** @returns {Promise<Array<object>>} Read every Assignment in stable order. */
async function allAssignments() {
  const { results } = await env.DB.prepare(
    `select id, participant_id, course_id, state
       from course_assignments order by id`,
  ).all();

  return results.map((row) => ({
    id: row.id,
    participantId: row.participant_id,
    courseId: row.course_id,
    state: row.state,
  }));
}

/** @returns {string} Fixed valid hexadecimal secret/digest. */
function hex(character) {
  return character.repeat(64);
}
