import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCourseAssignmentPersistence } from "./createCourseAssignmentPersistence.js";
import { createParticipantPersistence } from "./createParticipantPersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("Participant administration persistence", () => {
  it("finds stable identities and orders every registered Participant", async () => {
    await insertParticipants([
      participant("z", "beta", "active"),
      participant("b", "Alpha", "disabled"),
      participant("a", "alpha", "active"),
    ]);
    const persistence = createParticipantPersistence(env.DB);

    await expect(persistence.findParticipantById("participant-b")).resolves.toEqual(
      participant("b", "Alpha", "disabled"),
    );
    await expect(persistence.findParticipantById("missing")).resolves.toBeNull();
    await expect(persistence.listParticipants()).resolves.toMatchObject([
      { id: "participant-a" },
      { id: "participant-b" },
      { id: "participant-z" },
    ]);
  });
});

describe("direct Course Assignment persistence", () => {
  it("creates Active membership for Active and Disabled Participants", async () => {
    await insertAdmin("admin-a", "active");
    await insertCourse("course-a", "active");
    await insertParticipants([
      participant("active", "Active Participant", "active"),
      participant("disabled", "Disabled Participant", "disabled"),
    ]);
    const persistence = createCourseAssignmentPersistence(env.DB);

    await expect(
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("active", "participant-active"),
      }),
    ).resolves.toEqual({
      outcome: "created",
      assignment: assignment("active", "participant-active"),
    });
    await expect(
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("disabled", "participant-disabled"),
      }),
    ).resolves.toMatchObject({ outcome: "created" });
    await expect(
      persistence.listAssignmentsByCourseId("course-a"),
    ).resolves.toMatchObject([
      {
        id: "assignment-active",
        participant: { id: "participant-active", state: "active" },
      },
      {
        id: "assignment-disabled",
        participant: { id: "participant-disabled", state: "disabled" },
      },
    ]);
  });

  it("returns the retained row for repeated and concurrent Active assignment", async () => {
    await insertAdmin("admin-a", "active");
    await insertCourse("course-a", "active");
    await insertParticipants([participant("a", "Participant A", "active")]);
    const persistence = createCourseAssignmentPersistence(env.DB);

    const outcomes = await Promise.all([
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("race-a", "participant-a"),
      }),
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("race-b", "participant-a"),
      }),
    ]);
    const created = outcomes.find(({ outcome }) => outcome === "created");
    const repeated = outcomes.find(
      ({ outcome }) => outcome === "already-active",
    );

    expect(created).toBeDefined();
    expect(repeated).toEqual({
      outcome: "already-active",
      assignment: created.assignment,
    });
    await expect(countRows("course_assignments")).resolves.toBe(1);
  });

  it.each([
    ["disabled actor", "admin-not-active", "disabled", "active", "active"],
    ["Archived Course", "course-not-active", "active", "archived", "active"],
    ["missing target", "participant-not-assignable", "active", "active", null],
  ])(
    "refuses %s from current state without a partial row",
    async (_case, outcome, adminState, courseState, participantState) => {
      await insertAdmin("admin-a", adminState);
      await insertCourse("course-a", courseState);

      if (participantState !== null) {
        await insertParticipants([
          participant("a", "Participant A", participantState),
        ]);
      }

      const persistence = createCourseAssignmentPersistence(env.DB);

      await expect(
        persistence.assignParticipantToActiveCourse({
          adminUserId: "admin-a",
          assignment: assignment("refused", "participant-a"),
        }),
      ).resolves.toEqual({ outcome });
      await expect(countRows("course_assignments")).resolves.toBe(0);
    },
  );

  it("leaves a retained Revoked Assignment unchanged for later lifecycle work", async () => {
    await insertAdmin("admin-a", "active");
    await insertCourse("course-a", "active");
    await insertParticipants([participant("a", "Participant A", "active")]);
    await insertAssignmentDirect({
      ...assignment("retained", "participant-a"),
      state: "revoked",
    });
    const persistence = createCourseAssignmentPersistence(env.DB);

    await expect(
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("replacement", "participant-a"),
      }),
    ).resolves.toEqual({ outcome: "assignment-not-active" });
    await expect(
      persistence.listAssignmentsByCourseId("course-a"),
    ).resolves.toMatchObject([
      { id: "assignment-retained", state: "revoked" },
    ]);
    await expect(countRows("course_assignments")).resolves.toBe(1);
    await expect(membershipTables()).resolves.toEqual([
      { name: "course_assignments" },
    ]);
  });
});

/** @returns {object} Deterministic Participant persistence data. */
function participant(suffix, name, state) {
  return {
    id: `participant-${suffix}`,
    externalPrincipalId: `principal-${suffix}`,
    name,
    email: `${suffix}@example.com`,
    state,
  };
}

/** @returns {object} Deterministic Active Assignment candidate. */
function assignment(suffix, participantId) {
  return {
    id: `assignment-${suffix}`,
    participantId,
    courseId: "course-a",
    state: "active",
  };
}

/** @returns {Promise<void>} Insert deterministic authoritative Admin state. */
async function insertAdmin(id, state) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, 'admin')`,
  )
    .bind(id, `principal-${id}`, `Admin ${id}`, state)
    .run();
}

/** @returns {Promise<void>} Insert deterministic current Course state. */
async function insertCourse(id, state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, 'Course', null, 'Europe/Berlin', ?, 0)`,
  )
    .bind(id, state)
    .run();
}

/** @returns {Promise<void>} Insert deterministic fully registered Participants. */
async function insertParticipants(participants) {
  for (const value of participants) {
    await env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        value.id,
        value.externalPrincipalId,
        value.name,
        value.email,
        value.email.toLowerCase(),
        value.state,
      )
      .run();
  }
}

/** @returns {Promise<object>} Insert one Assignment without the adapter. */
function insertAssignmentDirect(value) {
  return env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, ?, ?, ?)`,
  )
    .bind(value.id, value.participantId, value.courseId, value.state)
    .run();
}

/** @returns {Promise<number>} Count rows in one fixed test-owned table. */
async function countRows(tableName) {
  const row = await env.DB.prepare(
    `select count(*) as count from "${tableName}"`,
  ).first();

  return row.count;
}

/** @returns {Promise<Array<object>>} Inspect membership schema ownership. */
async function membershipTables() {
  const { results } = await env.DB.prepare(
    `select name from sqlite_master
      where type = 'table'
        and name in ('course_assignments', 'module_selections')
      order by name`,
  ).all();

  return results;
}
