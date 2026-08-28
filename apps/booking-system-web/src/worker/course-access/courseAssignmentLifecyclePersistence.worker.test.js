import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCourseAssignmentPersistence } from "./createCourseAssignmentPersistence.js";

const currentEpoch = Date.parse("2026-08-28T10:00:00.000Z");

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("drop trigger if exists test_assignment_revocation_failure"),
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
});

describe("Course Assignment reactivation persistence", () => {
  it.each(["active", "disabled"])(
    "reactivates the retained row for a registered %s Participant",
    async (participantState) => {
      await seedMembership({ participantState, assignmentState: "revoked" });
      const persistence = createCourseAssignmentPersistence(env.DB);

      await expect(
        persistence.assignParticipantToActiveCourse({
          adminUserId: "admin-a",
          assignment: assignment("replacement"),
        }),
      ).resolves.toEqual({
        outcome: "reactivated",
        assignment: assignment("retained"),
      });
      await expect(readAssignment("assignment-retained")).resolves.toEqual(
        assignment("retained"),
      );
      await expect(countRows("course_assignments")).resolves.toBe(1);
      await expect(countRows("module_selections")).resolves.toBe(0);
    },
  );

  it("makes one concurrent reactivation win while preserving one identity", async () => {
    await seedMembership({ assignmentState: "revoked" });
    const persistence = createCourseAssignmentPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("race-a"),
      }),
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("race-b"),
      }),
    ]);

    expect(outcomes.map(({ outcome }) => outcome).sort()).toEqual([
      "already-active",
      "reactivated",
    ]);
    expect(outcomes[0].assignment).toEqual(assignment("retained"));
    expect(outcomes[1].assignment).toEqual(assignment("retained"));
    await expect(countRows("course_assignments")).resolves.toBe(1);
  });

  it("refuses Archived-Course reactivation without changing retained data", async () => {
    await seedMembership({ assignmentState: "revoked", courseState: "archived" });
    const persistence = createCourseAssignmentPersistence(env.DB);

    await expect(
      persistence.assignParticipantToActiveCourse({
        adminUserId: "admin-a",
        assignment: assignment("replacement"),
      }),
    ).resolves.toEqual({ outcome: "course-not-active" });
    await expect(readAssignment("assignment-retained")).resolves.toEqual({
      ...assignment("retained"),
      state: "revoked",
    });
  });
});

describe("atomic Course Assignment revocation persistence", () => {
  it.each(["active", "archived"])(
    "revokes in a %s Course at the exact Selection-retention boundary",
    async (courseState) => {
      await seedRetentionScenario(courseState);
      const persistence = createCourseAssignmentPersistence(env.DB);

      await expect(
        persistence.revokeActiveCourseAssignment(revocationInput()),
      ).resolves.toEqual({
        outcome: "revoked",
        assignment: { ...assignment("retained"), state: "revoked" },
        removedSelectionCount: 1,
      });
      await expect(selectionIds()).resolves.toEqual([
        "selection-cancelled",
        "selection-exact-start",
        "selection-in-progress",
        "selection-other-course",
      ]);
      await expect(readAssignment("assignment-retained")).resolves.toMatchObject({
        state: "revoked",
      });
      await expect(readAssignment("assignment-other")).resolves.toMatchObject({
        state: "active",
      });
    },
  );

  it("is idempotent and changes no Selection after the Assignment is Revoked", async () => {
    await seedRetentionScenario("active");
    const persistence = createCourseAssignmentPersistence(env.DB);

    await persistence.revokeActiveCourseAssignment(revocationInput());
    const retainedIds = await selectionIds();

    await expect(
      persistence.revokeActiveCourseAssignment(revocationInput()),
    ).resolves.toEqual({
      outcome: "already-revoked",
      assignment: { ...assignment("retained"), state: "revoked" },
      removedSelectionCount: 0,
    });
    await expect(selectionIds()).resolves.toEqual(retainedIds);
  });

  it("serializes concurrent revocation into one transition and one no-op", async () => {
    await seedRetentionScenario("active");
    const persistence = createCourseAssignmentPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.revokeActiveCourseAssignment(revocationInput()),
      persistence.revokeActiveCourseAssignment(revocationInput()),
    ]);

    expect(outcomes.map(({ outcome }) => outcome).sort()).toEqual([
      "already-revoked",
      "revoked",
    ]);
    expect(
      outcomes.reduce(
        (count, result) => count + result.removedSelectionCount,
        0,
      ),
    ).toBe(1);
    await expect(selectionIds()).resolves.not.toContain("selection-future");
  });

  it("rechecks current Admin and Assignment ownership without partial effects", async () => {
    await seedRetentionScenario("active");
    const persistence = createCourseAssignmentPersistence(env.DB);
    await env.DB.prepare("update admin_users set state = 'disabled' where id = ?")
      .bind("admin-a")
      .run();
    const initialSelections = await selectionIds();

    await expect(
      persistence.revokeActiveCourseAssignment(revocationInput()),
    ).resolves.toEqual({ outcome: "admin-not-active" });
    await expect(
      persistence.revokeActiveCourseAssignment({
        ...revocationInput(),
        assignmentId: "assignment-other",
      }),
    ).resolves.toEqual({ outcome: "admin-not-active" });
    await expect(readAssignment("assignment-retained")).resolves.toMatchObject({
      state: "active",
    });
    await expect(selectionIds()).resolves.toEqual(initialSelections);
  });

  it("rolls back Selection deletion when the Assignment transition fails", async () => {
    await seedRetentionScenario("active");
    await env.DB.prepare(
      `create trigger test_assignment_revocation_failure
       before update of state on course_assignments
       when old.id = 'assignment-retained' and new.state = 'revoked'
       begin
         select raise(abort, 'forced revocation failure');
       end`,
    ).run();
    const persistence = createCourseAssignmentPersistence(env.DB);

    await expect(
      persistence.revokeActiveCourseAssignment(revocationInput()),
    ).rejects.toThrow("forced revocation failure");
    await expect(readAssignment("assignment-retained")).resolves.toMatchObject({
      state: "active",
    });
    await expect(selectionIds()).resolves.toContain("selection-future");
  });
});

/** @returns {Promise<void>} Seed one retained Assignment without Selections. */
async function seedMembership({
  participantState = "active",
  assignmentState = "active",
  courseState = "active",
} = {}) {
  await insertAdmin();
  await insertCourse("course-a", courseState);
  await insertParticipant(participantState);
  await insertAssignment("assignment-retained", "course-a", assignmentState);
}

/** @returns {Promise<void>} Seed exact boundary and multi-Course Selection data. */
async function seedRetentionScenario(courseState) {
  await insertAdmin();
  await insertParticipant("active");
  await insertCourse("course-a", courseState);
  await insertCourse("course-b", "active");
  await insertAssignment("assignment-retained", "course-a", "active");
  await insertAssignment("assignment-other", "course-b", "active");
  await insertGroupAndModules("course-a", [
    ["future", currentEpoch + 1, "scheduled"],
    ["exact-start", currentEpoch, "scheduled"],
    ["in-progress", currentEpoch - 1_000, "scheduled"],
    ["cancelled", currentEpoch + 10_000, "cancelled"],
  ]);
  await insertGroupAndModules("course-b", [
    ["other-course", currentEpoch + 1, "scheduled"],
  ]);
}

/** @returns {Promise<void>} Insert the deterministic Active Admin. */
async function insertAdmin() {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-a', 'principal-admin', 'Admin', 'active', 'admin')`,
  ).run();
}

/** @returns {Promise<void>} Insert one Course. */
async function insertCourse(courseId, state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, null, 'Europe/Berlin', ?, 0)`,
  )
    .bind(courseId, `Course ${courseId}`, state)
    .run();
}

/** @returns {Promise<void>} Insert the deterministic Participant. */
async function insertParticipant(state) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values ('participant-a', 'principal-a', 'Participant A',
             'a@example.com', 'a@example.com', ?)`,
  )
    .bind(state)
    .run();
}

/** @returns {Promise<void>} Insert one retained Assignment. */
async function insertAssignment(assignmentId, courseId, state) {
  await env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, 'participant-a', ?, ?)`,
  )
    .bind(assignmentId, courseId, state)
    .run();
}

/** @returns {Promise<void>} Insert one Group and its Module/Selection rows. */
async function insertGroupAndModules(courseId, moduleValues) {
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, ?, ?, ?, null, 'active')`,
  )
    .bind(`group-${courseId}`, courseId, `Group ${courseId}`, courseId)
    .run();

  for (const [suffix, startsAt, state] of moduleValues) {
    await env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values (?, ?, ?, null, null, ?, ?, ?)`,
    )
      .bind(
        `module-${suffix}`,
        courseId,
        `Module ${suffix}`,
        startsAt,
        startsAt + 60_000,
        state,
      )
      .run();
    await env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values (?, 'participant-a', ?, ?, ?)`,
    )
      .bind(
        `selection-${suffix}`,
        courseId,
        `module-${suffix}`,
        `group-${courseId}`,
      )
      .run();
  }
}

/** @returns {object} Candidate or retained Assignment. */
function assignment(suffix) {
  return {
    id: `assignment-${suffix}`,
    participantId: "participant-a",
    courseId: "course-a",
    state: "active",
  };
}

/** @returns {object} Deterministic revocation persistence input. */
function revocationInput() {
  return {
    adminUserId: "admin-a",
    assignmentId: "assignment-retained",
    courseId: "course-a",
    nowEpoch: currentEpoch,
  };
}

/** @returns {Promise<object | null>} Read one Assignment row. */
async function readAssignment(assignmentId) {
  const row = await env.DB.prepare(
    `select id, participant_id, course_id, state
       from course_assignments where id = ?`,
  )
    .bind(assignmentId)
    .first();

  return row === null
    ? null
    : {
        id: row.id,
        participantId: row.participant_id,
        courseId: row.course_id,
        state: row.state,
      };
}

/** @returns {Promise<Array<string>>} Read stable remaining Selection identities. */
async function selectionIds() {
  const { results } = await env.DB.prepare(
    "select id from module_selections order by id",
  ).all();

  return results.map(({ id }) => id);
}

/** @returns {Promise<number>} Count one fixed test-owned table. */
async function countRows(tableName) {
  const row = await env.DB.prepare(
    `select count(*) as count from "${tableName}"`,
  ).first();

  return row.count;
}
