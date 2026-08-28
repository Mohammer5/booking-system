import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

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
  ]);
  await insertEligibleState();
});

describe("Participant Module Selection persistence", () => {
  it("creates, reselects, and replaces one stable current Selection", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await expect(persistence.setParticipantModuleSelection(setInput("a")))
      .resolves.toMatchObject({ outcome: "created", selection: selection("a", "a") });
    await expect(persistence.setParticipantModuleSelection(setInput("a", "repeat")))
      .resolves.toMatchObject({ outcome: "already-selected", selection: selection("a", "a") });
    await expect(persistence.setParticipantModuleSelection(setInput("b", "change")))
      .resolves.toMatchObject({ outcome: "changed", selection: selection("a", "b") });
    await expect(countRows("module_selections")).resolves.toBe(1);
  });

  it("serializes concurrent valid choices to one accepted current Group", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.setParticipantModuleSelection(setInput("a", "race-a")),
      persistence.setParticipantModuleSelection(setInput("b", "race-b")),
    ]);
    const row = await currentSelection();

    expect(outcomes.every(({ outcome }) =>
      new Set(["created", "changed", "already-selected"]).has(outcome))).toBe(true);
    expect(new Set(["group-a", "group-b"])).toContain(row.group_id);
    await expect(countRows("module_selections")).resolves.toBe(1);
  });

  it.each([
    ["Disabled Participant", "participant-not-active", "update participants set state = 'disabled'"],
    ["Revoked Assignment", "assignment-not-active", "update course_assignments set state = 'revoked'"],
    ["Archived Course", "course-not-active", "update courses set state = 'archived'"],
    ["Cancelled Module", "module-not-selectable", "update modules set state = 'cancelled'"],
    ["exact deadline", "module-not-selectable", null],
  ])("refuses %s and preserves the prior choice", async (_case, outcome, mutation) => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await persistence.setParticipantModuleSelection(setInput("a"));
    if (mutation !== null) await env.DB.prepare(mutation).run();
    const input = setInput("b", "refused");
    if (mutation === null) input.nowEpoch = 1_900_000_000_000;

    await expect(persistence.setParticipantModuleSelection(input)).resolves.toEqual({ outcome });
    await expect(currentSelection()).resolves.toMatchObject({ group_id: "group-a" });
  });

  it("removes before start and preserves idempotent absence", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await persistence.setParticipantModuleSelection(setInput("a"));
    await expect(persistence.removeParticipantModuleSelection(removeInput()))
      .resolves.toEqual({ outcome: "removed" });
    await expect(persistence.removeParticipantModuleSelection(removeInput()))
      .resolves.toEqual({ outcome: "already-absent" });
    await expect(countRows("module_selections")).resolves.toBe(0);
  });

  it("refuses stale removal without deleting the retained row", async () => {
    const persistence = createModuleSelectionPersistence(env.DB);

    await persistence.setParticipantModuleSelection(setInput("a"));
    await env.DB.prepare("update course_assignments set state = 'revoked'").run();

    await expect(persistence.removeParticipantModuleSelection(removeInput()))
      .resolves.toEqual({ outcome: "assignment-not-active" });
    await expect(countRows("module_selections")).resolves.toBe(1);
  });
});

/** @returns {object} Guarded set input for one Group. */
function setInput(groupSuffix, selectionSuffix = "a") {
  return {
    selection: {
      id: `selection-${selectionSuffix}`,
      participantId: "participant-a",
      courseId: "course-a",
      moduleId: "module-a",
      groupId: `group-${groupSuffix}`,
    },
    nowEpoch: beforeStart,
  };
}

/** @returns {object} Guarded removal input. */
function removeInput() {
  return {
    participantId: "participant-a",
    courseId: "course-a",
    moduleId: "module-a",
    nowEpoch: beforeStart,
  };
}

/** @returns {object} Expected stable Selection. */
function selection(selectionSuffix, groupSuffix) {
  return {
    id: `selection-${selectionSuffix}`,
    participantId: "participant-a",
    courseId: "course-a",
    moduleId: "module-a",
    groupId: `group-${groupSuffix}`,
  };
}

/** @returns {Promise<void>} Insert one complete eligible current-state graph. */
async function insertEligibleState() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-a', 'Course A', null, 'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-a', 'principal-a', 'Participant A',
               'a@example.com', 'a@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-a', 'participant-a', 'course-a', 'active')`,
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

/** @returns {Promise<object | null>} Read the sole test Selection. */
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
