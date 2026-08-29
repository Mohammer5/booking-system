import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCourseAssignmentPersistence } from "../course-access/createCourseAssignmentPersistence.js";
import { createModuleSelectionPersistence } from "./createModuleSelectionPersistence.js";

const beforeStart = 1_800_000_000_000;

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from module_selections"),
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from participants"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from admin_users"),
  ]);
  await seedEligibleState();
});

describe("Admin-assisted Module Selection persistence", () => {
  it("creates missing membership and one Selection, then reselects and replaces", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await expect(persistence.setParticipantModuleSelectionAsAdmin(setInput("a")))
      .resolves.toMatchObject({
        outcome: "created",
        assignmentOutcome: "created",
        assignment: assignment("assignment-new", "active"),
        selection: selection("selection-a", "a"),
      });
    await expect(persistence.setParticipantModuleSelectionAsAdmin(setInput("a", "repeat")))
      .resolves.toMatchObject({
        outcome: "already-selected",
        assignmentOutcome: "already-active",
        assignment: assignment("assignment-new", "active"),
        selection: selection("selection-a", "a"),
      });
    await expect(persistence.setParticipantModuleSelectionAsAdmin(setInput("b", "replace")))
      .resolves.toMatchObject({
        outcome: "changed",
        assignmentOutcome: "already-active",
        selection: selection("selection-a", "b"),
      });
    await expect(countRows("course_assignments")).resolves.toBe(1);
    await expect(countRows("module_selections")).resolves.toBe(1);
  });

  it("leaves Active membership unchanged and reactivates retained Revoked membership", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await seedAssignment("assignment-retained", "active");
    await expect(persistence.setParticipantModuleSelectionAsAdmin(setInput("a")))
      .resolves.toMatchObject({
        outcome: "created",
        assignmentOutcome: "already-active",
        assignment: assignment("assignment-retained", "active"),
      });
    await env.DB.prepare("delete from module_selections").run();
    await env.DB.prepare(
      "update course_assignments set state = 'revoked'",
    ).run();
    await expect(persistence.setParticipantModuleSelectionAsAdmin(
      setInput("b", "after-revoke", "assignment-retained"),
    ))
      .resolves.toMatchObject({
        outcome: "created",
        assignmentOutcome: "reactivated",
        assignment: assignment("assignment-retained", "active"),
      });
    await expect(countRows("course_assignments")).resolves.toBe(1);
  });

  it.each([
    ["Disabled Admin", "admin-not-active", "update admin_users set state = 'disabled'", "b"],
    ["Disabled Participant", "participant-not-active", "update participants set state = 'disabled'", "b"],
    ["Archived Course", "course-not-active", "update courses set state = 'archived'", "b"],
    ["Cancelled Module", "module-not-selectable", "update modules set state = 'cancelled'", "b"],
    ["exact deadline", "selection-deadline-reached", null, "b"],
    ["Archived Group", "group-not-selectable", "update groups set state = 'archived' where id = 'group-b'", "b"],
    ["cross-Course Group", "group-not-selectable", null, "other"],
  ])("refuses %s without membership or Selection side effects", async (
    _case,
    outcome,
    mutation,
    groupSuffix,
  ) => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await seedAssignment("assignment-retained", "revoked");
    await seedSelection("selection-old", "a");
    if (groupSuffix === "other") await seedOtherCourseGroup();
    if (mutation !== null) await env.DB.prepare(mutation).run();
    const input = setInput(groupSuffix, "refused", "assignment-retained");
    if (_case === "exact deadline") input.nowEpoch = 1_900_000_000_000;

    await expect(persistence.setParticipantModuleSelectionAsAdmin(input))
      .resolves.toEqual({ outcome });
    await expect(currentAssignment()).resolves.toMatchObject({ state: "revoked" });
    await expect(currentSelection()).resolves.toMatchObject({
      id: "selection-old",
      group_id: "group-a",
    });
  });

  it("rolls back Assignment creation when the Selection statement fails", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await seedParticipantBWithDuplicateSelection();
    const input = setInput("a", "duplicate");
    input.selection.id = "selection-duplicate";

    await expect(
      persistence.setParticipantModuleSelectionAsAdmin(input),
    ).rejects.toThrow();
    await expect(currentAssignment()).resolves.toBeNull();
    await expect(
      env.DB.prepare(
        "select count(*) as count from module_selections where participant_id = 'participant-a'",
      ).first(),
    ).resolves.toMatchObject({ count: 0 });
  });

  it("serializes concurrent missing-membership choices to one coherent pair", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);
    const results = await Promise.all([
      persistence.setParticipantModuleSelectionAsAdmin(setInput("a", "race-a", "assignment-a")),
      persistence.setParticipantModuleSelectionAsAdmin(setInput("b", "race-b", "assignment-b")),
    ]);

    expect(results.every((result) =>
      new Set(["created", "changed", "already-selected"]).has(result.outcome)))
      .toBe(true);
    await expect(countRows("course_assignments")).resolves.toBe(1);
    await expect(countRows("module_selections")).resolves.toBe(1);
    expect(new Set(["group-a", "group-b"])).toContain(
      (await currentSelection()).group_id,
    );
  });

  it("serializes set against a Group lifecycle change without partial membership", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await Promise.all([
      persistence.setParticipantModuleSelectionAsAdmin(setInput("a")),
      env.DB.prepare(
        `update groups set state = 'archived'
          where id = 'group-a'
            and not exists (
              select 1 from module_selections where group_id = 'group-a'
            )`,
      ).run(),
    ]);
    const group = await env.DB.prepare(
      "select state from groups where id = 'group-a'",
    ).first();

    if (group.state === "active") {
      await expect(countRows("course_assignments")).resolves.toBe(1);
      await expect(countRows("module_selections")).resolves.toBe(1);
    } else {
      await expect(countRows("course_assignments")).resolves.toBe(0);
      await expect(countRows("module_selections")).resolves.toBe(0);
    }
  });

  it("serializes concurrent set and remove to one coherent current Selection", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await seedAssignment("assignment-retained", "active");
    await seedSelection("selection-old", "a");
    const [setResult, removeResult] = await Promise.all([
      persistence.setParticipantModuleSelectionAsAdmin(
        setInput("b", "old", "assignment-retained"),
      ),
      persistence.removeParticipantModuleSelectionAsAdmin(removeInput()),
    ]);
    const current = await currentSelection();

    expect(new Set(["created", "changed", "already-selected"])).toContain(
      setResult.outcome,
    );
    expect(new Set(["removed", "already-absent"])).toContain(
      removeResult.outcome,
    );
    if (current !== null) expect(current.group_id).toBe("group-b");
    await expect(currentAssignment()).resolves.toMatchObject({ state: "active" });
    await expect(countRows("course_assignments")).resolves.toBe(1);
  });

  it("serializes set against Assignment revocation as either coherent outcome", async () => {
    const selections = createModuleSelectionPersistence(env.DB);
    const assignments = createCourseAssignmentPersistence(env.DB);

    await seedAssignment("assignment-retained", "active");
    await Promise.all([
      selections.setParticipantModuleSelectionAsAdmin(
        setInput("a", "race", "assignment-retained"),
      ),
      assignments.revokeActiveCourseAssignment({
        adminUserId: "admin-a",
        assignmentId: "assignment-retained",
        courseId: "course-a",
        nowEpoch: beforeStart,
      }),
    ]);
    const currentMembership = await currentAssignment();
    const current = await currentSelection();

    if (currentMembership.state === "active") {
      expect(current).toMatchObject({ group_id: "group-a" });
    } else {
      expect(currentMembership.state).toBe("revoked");
      expect(current).toBeNull();
    }
    await expect(countRows("course_assignments")).resolves.toBe(1);
  });

  it("removes without creating or reactivating membership and is idempotent", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await seedAssignment("assignment-retained", "revoked");
    await seedSelection("selection-old", "a");
    await expect(persistence.removeParticipantModuleSelectionAsAdmin(removeInput()))
      .resolves.toEqual({ outcome: "removed" });
    await expect(persistence.removeParticipantModuleSelectionAsAdmin(removeInput()))
      .resolves.toEqual({ outcome: "already-absent" });
    await expect(currentAssignment()).resolves.toMatchObject({ state: "revoked" });
  });

  it.each([
    ["exact deadline", "selection-deadline-reached", null],
    ["Cancelled Module", "module-not-selectable", "update modules set state = 'cancelled'"],
    ["Archived Course", "course-not-active", "update courses set state = 'archived'"],
  ])("refuses removal for %s and retains Selection and membership", async (
    _case,
    outcome,
    mutation,
  ) => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await seedAssignment("assignment-retained", "revoked");
    await seedSelection("selection-old", "a");
    if (mutation !== null) await env.DB.prepare(mutation).run();
    const input = removeInput();
    if (_case === "exact deadline") input.nowEpoch = 1_900_000_000_000;

    await expect(persistence.removeParticipantModuleSelectionAsAdmin(input))
      .resolves.toEqual({ outcome });
    await expect(currentSelection()).resolves.toMatchObject({ id: "selection-old" });
    await expect(currentAssignment()).resolves.toMatchObject({ state: "revoked" });
  });
});

/** @returns {object} One complete guarded Admin set input. */
function setInput(groupSuffix, selectionSuffix = "a", assignmentId = "assignment-new") {
  return {
    adminUserId: "admin-a",
    assignment: assignment(assignmentId, "active"),
    selection: selection(`selection-${selectionSuffix}`, groupSuffix),
    nowEpoch: beforeStart,
  };
}

/** @returns {object} One Admin removal input. */
function removeInput() {
  return {
    adminUserId: "admin-a",
    participantId: "participant-a",
    courseId: "course-a",
    moduleId: "module-a",
    nowEpoch: beforeStart,
  };
}

/** @returns {object} Assignment plain data. */
function assignment(id, state) {
  return {
    id,
    participantId: "participant-a",
    courseId: "course-a",
    state,
  };
}

/** @returns {object} Selection plain data. */
function selection(id, groupSuffix) {
  return {
    id,
    participantId: "participant-a",
    courseId: "course-a",
    moduleId: "module-a",
    groupId: `group-${groupSuffix}`,
  };
}

/** @returns {Promise<void>} Seed the eligible graph without membership. */
async function seedEligibleState() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into admin_users
         (id, external_principal_id, name, state, authority)
       values ('admin-a', 'principal-admin', 'Admin', 'active', 'admin')`,
    ),
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-a', 'Course A', null, 'Europe/Berlin', 'active', 1)`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-a', 'principal-a', 'Participant A',
               'a@example.com', 'a@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-a', 'course-a', 'Group A', 'group a', null, 'active'),
              ('group-b', 'course-a', 'Group B', 'group b', null, 'active')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-a', 'course-a', 'Module A', null, null,
               1900000000000, 1900003600000, 'scheduled')`,
    ),
  ]);
}

/** @returns {Promise<void>} Insert one retained Assignment. */
function seedAssignment(id, state) {
  return env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, 'participant-a', 'course-a', ?)`,
  ).bind(id, state).run();
}

/** @returns {Promise<void>} Insert one retained Selection. */
function seedSelection(id, groupSuffix) {
  return env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values (?, 'participant-a', 'course-a', 'module-a', ?)`,
  ).bind(id, `group-${groupSuffix}`).run();
}

/** @returns {Promise<void>} Seed a same-name target in another Course. */
async function seedOtherCourseGroup() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-other', 'Other', null, 'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-other', 'course-other', 'Other', 'other', null, 'active')`,
    ),
  ]);
}

/** @returns {Promise<void>} Seed a conflicting Selection identity. */
async function seedParticipantBWithDuplicateSelection() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-b', 'principal-b', 'Participant B',
               'b@example.com', 'b@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-b', 'participant-b', 'course-a', 'active')`,
    ),
    env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-duplicate', 'participant-b', 'course-a',
               'module-a', 'group-a')`,
    ),
  ]);
}

/** @returns {Promise<object | null>} Current target Assignment. */
function currentAssignment() {
  return env.DB.prepare(
    "select id, state from course_assignments where participant_id = 'participant-a'",
  ).first();
}

/** @returns {Promise<object | null>} Current target Selection. */
function currentSelection() {
  return env.DB.prepare(
    "select id, group_id from module_selections where participant_id = 'participant-a'",
  ).first();
}

/** @returns {Promise<number>} Count rows in one fixed test-owned table. */
async function countRows(tableName) {
  const row = await env.DB
    .prepare(`select count(*) as count from "${tableName}"`)
    .first();

  return row.count;
}
