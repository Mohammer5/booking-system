import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createModuleSelectionPersistence } from "../module-participation/index.js";
import { createModulePersistence } from "./createModulePersistence.js";

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

describe("Module deletion persistence", () => {
  it.each([
    ["upcoming Scheduled", nowEpoch + 60_000, nowEpoch + 120_000, "scheduled"],
    ["exact-start Scheduled", nowEpoch, nowEpoch + 60_000, "scheduled"],
    ["in-progress Scheduled", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
    ["ended Scheduled", nowEpoch - 120_000, nowEpoch - 60_000, "scheduled"],
    ["Cancelled", nowEpoch + 60_000, nowEpoch + 120_000, "cancelled"],
  ])("deletes only one unreferenced %s Module", async (
    _label,
    startsAt,
    endsAt,
    state,
  ) => {
    await insertModule("module-target", { startsAt, endsAt, state });
    await insertModule("module-other");
    await insertParticipantGraph();

    await expect(deleteModule(createModulePersistence(env.DB))).resolves.toBe(
      "deleted",
    );
    await expect(moduleRow("module-target")).resolves.toBeNull();
    await expect(moduleRow("module-other")).resolves.toMatchObject({
      id: "module-other",
      state: "scheduled",
    });
    await expect(rowCounts()).resolves.toEqual({
      assignments: 1,
      courses: 1,
      groups: 1,
      modules: 1,
      participants: 1,
      selections: 0,
    });
    await expect(courseHistory()).resolves.toBe(1);
  });

  it.each([
    ["upcoming Scheduled", nowEpoch + 1, nowEpoch + 60_000, "scheduled"],
    ["exact-start Scheduled", nowEpoch, nowEpoch + 60_000, "scheduled"],
    ["in-progress Scheduled", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
    ["ended Scheduled", nowEpoch - 120_000, nowEpoch - 60_000, "scheduled"],
    ["Cancelled", nowEpoch + 60_000, nowEpoch + 120_000, "cancelled"],
  ])("blocks and retains a %s Selection", async (
    _label,
    startsAt,
    endsAt,
    state,
  ) => {
    await insertModule("module-target", { startsAt, endsAt, state });
    await insertParticipantGraph({ selectedModuleId: "module-target" });
    const persistence = createModulePersistence(env.DB);

    await expect(deleteModule(persistence)).resolves.toBe(
      "module-deletion-blocked",
    );
    await expect(moduleRow("module-target")).resolves.not.toBeNull();
    await expect(selectionIds()).resolves.toEqual(["selection-1"]);
    await expect(
      persistence.listSelectionContextsByModuleId(
        "course-1",
        "module-target",
      ),
    ).resolves.toEqual([{ selectionId: "selection-1" }]);
  });

  it("deletes first, last, and every current Module without clearing history", async () => {
    const persistence = createModulePersistence(env.DB);
    await insertModule("module-target");
    await insertModule("module-second");

    await expect(deleteModule(persistence)).resolves.toBe("deleted");
    await expect(deleteModule(persistence, "module-second")).resolves.toBe(
      "deleted",
    );
    await expect(moduleIds()).resolves.toEqual([]);
    await expect(courseHistory()).resolves.toBe(1);
  });

  it("permits deletion after a pre-start Selection was removed", async () => {
    await insertModule("module-target");
    await insertParticipantGraph({ selectedModuleId: "module-target" });
    await env.DB.prepare("delete from module_selections").run();

    await expect(deleteModule(createModulePersistence(env.DB))).resolves.toBe(
      "deleted",
    );
    await expect(selectionIds()).resolves.toEqual([]);
    await expect(courseHistory()).resolves.toBe(1);
  });

  it.each([
    ["disabled Admin", "disabled", "active", "admin-not-active"],
    ["Archived Course", "active", "archived", "course-not-active"],
  ])("refuses a stale %s without deleting", async (
    _label,
    adminState,
    courseState,
    outcome,
  ) => {
    await insertModule("module-target");
    await env.DB.prepare("update admin_users set state = ?").bind(adminState).run();
    await env.DB.prepare("update courses set state = ?").bind(courseState).run();

    await expect(deleteModule(createModulePersistence(env.DB))).resolves.toBe(
      outcome,
    );
    await expect(moduleRow("module-target")).resolves.not.toBeNull();
  });

  it("keeps the restrictive foreign key as direct reference protection", async () => {
    await insertModule("module-target");
    await insertParticipantGraph({ selectedModuleId: "module-target" });

    await expect(
      env.DB.prepare("delete from modules where id = 'module-target'").run(),
    ).rejects.toThrow();
    await expect(moduleRow("module-target")).resolves.not.toBeNull();
    await expect(selectionIds()).resolves.toEqual(["selection-1"]);
  });

  it("gives one winner to concurrent deletion and Selection creation", async () => {
    await insertModule("module-target");
    await insertParticipantGraph();
    const modules = createModulePersistence(env.DB);
    const selections = createModuleSelectionPersistence(env.DB);
    const outcomes = await Promise.all([
      deleteModule(modules),
      selections.setParticipantModuleSelection({
        selection: selection("module-target", "selection-race"),
        nowEpoch,
      }),
    ]);

    expect([
      ["deleted", "module-not-selectable"],
      ["module-deletion-blocked", "created"],
    ]).toContainEqual([outcomes[0], outcomes[1].outcome]);
    expect((await moduleRow("module-target")) === null).toBe(
      outcomes[0] === "deleted",
    );
    await expect(selectionIds()).resolves.toHaveLength(
      outcomes[0] === "deleted" ? 0 : 1,
    );
  });

  it("rolls back and surfaces an unexpected failed delete", async () => {
    await insertModule("module-target");
    await env.DB.prepare(
      `create trigger refuse_module_delete
       before delete on modules
       when old.id = 'module-target'
       begin
         select raise(abort, 'forced Module deletion failure');
       end`,
    ).run();

    await expect(deleteModule(createModulePersistence(env.DB))).rejects.toThrow(
      "forced Module deletion failure",
    );
    await expect(moduleRow("module-target")).resolves.not.toBeNull();
    await expect(courseHistory()).resolves.toBe(1);
  });
});

/** @returns {Promise<string>} Delete one deterministic Module target. */
function deleteModule(persistence, moduleId = "module-target") {
  return persistence.deleteUnreferencedModule({
    adminUserId: "admin-1",
    courseId: "course-1",
    moduleId,
  });
}

/** @returns {object} One valid Selection input. */
function selection(moduleId, id) {
  return {
    id,
    participantId: "participant-1",
    courseId: "course-1",
    moduleId,
    groupId: "group-1",
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
     values ('course-1', 'Course', null, 'Europe/Berlin', ?, 0)`,
  ).bind(state).run();
}

/** @returns {Promise<void>} Insert one Module. */
async function insertModule(id, options = {}) {
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'course-1', ?, 'Details', 'Instructions', ?, ?, ?)`,
  ).bind(
    id,
    id,
    options.startsAt ?? nowEpoch + 60_000,
    options.endsAt ?? nowEpoch + 120_000,
    options.state ?? "scheduled",
  ).run();
}

/** @returns {Promise<void>} Insert unrelated Participant graph and optional Selection. */
async function insertParticipantGraph(options = {}) {
  await env.DB.batch([
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-1', 'course-1', 'Group', 'group', null, 'active')`,
    ),
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
  ]);

  if (options.selectedModuleId !== undefined) {
    await env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-1', 'participant-1', 'course-1', ?, 'group-1')`,
    ).bind(options.selectedModuleId).run();
  }
}

/** @returns {Promise<object | null>} Read one Module row. */
function moduleRow(id) {
  return env.DB.prepare("select id, state from modules where id = ?").bind(id).first();
}

/** @returns {Promise<Array<string>>} Read current Module identities. */
async function moduleIds() {
  const { results } = await env.DB.prepare("select id from modules order by id").all();

  return results.map(({ id }) => id);
}

/** @returns {Promise<Array<string>>} Read current Selection identities. */
async function selectionIds() {
  const { results } = await env.DB
    .prepare("select id from module_selections order by id")
    .all();

  return results.map(({ id }) => id);
}

/** @returns {Promise<number>} Read permanent Course Module history. */
async function courseHistory() {
  const row = await env.DB
    .prepare("select has_ever_had_module from courses where id = 'course-1'")
    .first();

  return row.has_ever_had_module;
}

/** @returns {Promise<object>} Read counts for every preserved data owner. */
async function rowCounts() {
  const row = await env.DB.prepare(
    `select
       (select count(*) from course_assignments) as assignments,
       (select count(*) from courses) as courses,
       (select count(*) from groups) as groups,
       (select count(*) from modules) as modules,
       (select count(*) from participants) as participants,
       (select count(*) from module_selections) as selections`,
  ).first();

  return row;
}
