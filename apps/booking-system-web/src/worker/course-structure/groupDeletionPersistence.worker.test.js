import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createModuleSelectionPersistence } from "../module-participation/index.js";
import { createGroupPersistence } from "./createGroupPersistence.js";

const nowEpoch = Date.parse("2026-08-28T10:00:00.000Z");

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
    env.DB.prepare("delete from admin_bootstrap_history"),
    env.DB.prepare("delete from admin_users"),
  ]);
  await insertAdmin("active");
  await insertCourse("active");
});

describe("Group deletion persistence", () => {
  it.each(["active", "archived"])(
    "deletes one unreferenced %s Group and nothing else",
    async (state) => {
      await insertGroup("group-target", state);
      await insertGroup("group-other", "active");
      await insertParticipantGraph();
      const persistence = createGroupPersistence(env.DB);

      await expect(deleteGroup(persistence)).resolves.toBe("deleted");
      await expect(group("group-target")).resolves.toBeNull();
      await expect(group("group-other")).resolves.toMatchObject({
        id: "group-other",
        state: "active",
      });
      await expect(rowCounts()).resolves.toEqual({
        assignments: 1,
        courses: 1,
        modules: 1,
        participants: 1,
        selections: 0,
      });
      await expect(courseHistory()).resolves.toBe(1);
    },
  );

  it.each([
    ["upcoming Scheduled", nowEpoch + 1, nowEpoch + 60_000, "scheduled"],
    ["exact-start Scheduled", nowEpoch, nowEpoch + 60_000, "scheduled"],
    ["in-progress Scheduled", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
    ["ended Scheduled", nowEpoch - 120_000, nowEpoch - 60_000, "scheduled"],
    ["Cancelled", nowEpoch + 60_000, nowEpoch + 120_000, "cancelled"],
  ])("blocks a retained %s Selection and preserves it", async (
    _label,
    startsAt,
    endsAt,
    moduleState,
  ) => {
    await insertGroup("group-target", "active");
    await insertParticipantGraph({ startsAt, endsAt, moduleState, selected: true });
    const persistence = createGroupPersistence(env.DB);

    await expect(deleteGroup(persistence)).resolves.toBe(
      "group-deletion-blocked",
    );
    await expect(group("group-target")).resolves.not.toBeNull();
    await expect(selectionIds()).resolves.toEqual(["selection-1"]);
  });

  it("permits deletion after a pre-start Selection was replaced", async () => {
    await insertGroup("group-target", "active");
    await insertGroup("group-other", "active");
    await insertParticipantGraph();
    const selections = createModuleSelectionPersistence(env.DB);

    await expect(selections.setParticipantModuleSelection({
      selection: selection("group-target", "selection-1"),
      nowEpoch,
    })).resolves.toMatchObject({ outcome: "created" });
    await expect(selections.setParticipantModuleSelection({
      selection: selection("group-other", "selection-2"),
      nowEpoch,
    })).resolves.toMatchObject({ outcome: "changed" });
    await expect(deleteGroup(createGroupPersistence(env.DB))).resolves.toBe(
      "deleted",
    );
    await expect(selectionIds()).resolves.toEqual(["selection-1"]);
    await expect(currentSelectedGroup()).resolves.toBe("group-other");
  });

  it.each([
    ["disabled Admin", "disabled", "active", "admin-not-active"],
    ["Archived Course", "active", "archived", "course-not-active"],
  ])("refuses a stale %s without deleting the Group", async (
    _label,
    adminState,
    courseState,
    outcome,
  ) => {
    await insertGroup("group-target", "active");
    await env.DB.prepare("update admin_users set state = ?").bind(adminState).run();
    await env.DB.prepare("update courses set state = ?").bind(courseState).run();

    await expect(deleteGroup(createGroupPersistence(env.DB))).resolves.toBe(
      outcome,
    );
    await expect(group("group-target")).resolves.not.toBeNull();
  });

  it("keeps the restrictive foreign key as direct reference protection", async () => {
    await insertGroup("group-target", "active");
    await insertParticipantGraph({ selected: true });

    await expect(
      env.DB.prepare("delete from groups where id = 'group-target'").run(),
    ).rejects.toThrow();
    await expect(group("group-target")).resolves.not.toBeNull();
    await expect(selectionIds()).resolves.toEqual(["selection-1"]);
  });

  it("gives exactly one winner to concurrent deletion and Selection creation", async () => {
    await insertGroup("group-target", "active");
    await insertParticipantGraph();
    const groups = createGroupPersistence(env.DB);
    const selections = createModuleSelectionPersistence(env.DB);
    const outcomes = await Promise.all([
      deleteGroup(groups),
      selections.setParticipantModuleSelection({
        selection: selection("group-target", "selection-race"),
        nowEpoch,
      }),
    ]);

    expect([
      ["deleted", "group-not-selectable"],
      ["group-deletion-blocked", "created"],
    ]).toContainEqual([outcomes[0], outcomes[1].outcome]);
    expect((await group("group-target")) === null).toBe(
      outcomes[0] === "deleted",
    );
    await expect(selectionIds()).resolves.toHaveLength(
      outcomes[0] === "deleted" ? 0 : 1,
    );
  });

  it("rolls back and surfaces an unexpected failed delete", async () => {
    await insertGroup("group-target", "active");
    await env.DB.prepare(
      `create trigger refuse_group_delete
       before delete on groups
       when old.id = 'group-target'
       begin
         select raise(abort, 'forced Group deletion failure');
       end`,
    ).run();

    await expect(deleteGroup(createGroupPersistence(env.DB))).rejects.toThrow(
      "forced Group deletion failure",
    );
    await expect(group("group-target")).resolves.not.toBeNull();
  });
});

/** @returns {Promise<string>} Delete the deterministic Group target. */
function deleteGroup(persistence) {
  return persistence.deleteUnreferencedGroup({
    adminUserId: "admin-1",
    courseId: "course-1",
    groupId: "group-target",
  });
}

/** @returns {object} One valid Selection input. */
function selection(groupId, id) {
  return {
    id,
    participantId: "participant-1",
    courseId: "course-1",
    moduleId: "module-1",
    groupId,
  };
}

/** @returns {Promise<void>} Insert one Admin User. */
async function insertAdmin(state) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-1', 'admin-principal', 'Admin', ?, 'admin')`,
  ).bind(state).run();
}

/** @returns {Promise<void>} Insert one Course. */
async function insertCourse(state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values ('course-1', 'Course', null, 'Europe/Berlin', ?, 1)`,
  ).bind(state).run();
}

/** @returns {Promise<void>} Insert one Group. */
async function insertGroup(id, state) {
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, 'course-1', ?, ?, null, ?)`,
  ).bind(id, id, id, state).run();
}

/** @returns {Promise<void>} Insert unrelated Participant, Assignment, and Module rows. */
async function insertParticipantGraph(options = {}) {
  const startsAt = options.startsAt ?? nowEpoch + 60_000;
  const endsAt = options.endsAt ?? nowEpoch + 120_000;
  const moduleState = options.moduleState ?? "scheduled";

  await env.DB.batch([
    env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-1', 'participant-principal', 'Participant',
               'participant@example.com', 'participant@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       values ('assignment-1', 'participant-1', 'course-1', 'active')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-1', 'course-1', 'Module', null, null, ?, ?, ?)`,
    ).bind(startsAt, endsAt, moduleState),
  ]);

  if (options.selected === true) {
    await env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-1', 'participant-1', 'course-1',
               'module-1', 'group-target')`,
    ).run();
  }
}

/** @returns {Promise<object | null>} Read one Group row. */
function group(id) {
  return env.DB.prepare("select id, state from groups where id = ?").bind(id).first();
}

/** @returns {Promise<string>} Read the current selected Group identity. */
async function currentSelectedGroup() {
  const row = await env.DB.prepare(
    "select group_id from module_selections where id = 'selection-1'",
  ).first();

  return row.group_id;
}

/** @returns {Promise<Array<string>>} Read ordered current Selection identities. */
async function selectionIds() {
  const { results } = await env.DB.prepare(
    "select id from module_selections order by id",
  ).all();

  return results.map(({ id }) => id);
}

/** @returns {Promise<number>} Read permanent Course Module history. */
async function courseHistory() {
  const row = await env.DB.prepare(
    "select has_ever_had_module from courses where id = 'course-1'",
  ).first();

  return row.has_ever_had_module;
}

/** @returns {Promise<object>} Read preservation counts after Group deletion. */
async function rowCounts() {
  const row = await env.DB.prepare(
    `select
       (select count(*) from courses) as courses,
       (select count(*) from modules) as modules,
       (select count(*) from participants) as participants,
       (select count(*) from course_assignments) as assignments,
       (select count(*) from module_selections) as selections`,
  ).first();

  return row;
}
