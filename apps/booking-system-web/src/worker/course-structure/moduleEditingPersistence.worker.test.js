import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createModuleSelectionPersistence } from "../module-participation/index.js";
import { createModulePersistence } from "./createModulePersistence.js";

const oldStartsAt = 2_000_000_000_000;
const oldEndsAt = oldStartsAt + 3_600_000;
const acceptedNowEpoch = oldStartsAt - 60_000;
const newStartsAt = oldStartsAt + 3_600_000;
const newEndsAt = newStartsAt + 3_600_000;

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
  await seedAdminAndCourse();
});

describe("Module descriptive editing persistence", () => {
  it.each([
    ["upcoming Scheduled", oldStartsAt, oldEndsAt, "scheduled"],
    ["in-progress Scheduled", oldStartsAt - 120_000, oldEndsAt, "scheduled"],
    ["ended Scheduled", oldStartsAt - 240_000, oldStartsAt - 120_000, "scheduled"],
    ["Cancelled", oldStartsAt, oldEndsAt, "cancelled"],
  ])("updates complete text for a %s Module and nothing else", async (
    _label,
    startsAt,
    endsAt,
    state,
  ) => {
    await insertModule({ startsAt, endsAt, state });
    await insertSelectionGraph();
    const persistence = createModulePersistence(env.DB);
    const module = {
      ...await persistence.findModuleById("course-1", "module-1"),
      title: "Updated",
      description: null,
      instructions: "New instructions",
    };

    await expect(persistence.updateModuleDetailsForActiveAdmin({
      adminUserId: "admin-1",
      module,
    })).resolves.toBe("updated");
    await expect(persistence.findModuleById("course-1", "module-1"))
      .resolves.toEqual(module);
    await expect(selectionRow()).resolves.toEqual({
      id: "selection-1",
      module_id: "module-1",
      group_id: "group-1",
    });
    await expect(structureCounts()).resolves.toEqual({
      assignments: 1,
      courses: 1,
      groups: 1,
      participants: 1,
      selections: 1,
    });
  });

  it.each([
    ["Disabled Admin", "disabled", "active", "admin-not-active"],
    ["Archived Course", "active", "archived", "course-not-active"],
  ])("refuses a stale %s with no text mutation", async (
    _label,
    adminState,
    courseState,
    outcome,
  ) => {
    await insertModule();
    await env.DB.prepare("update admin_users set state = ?").bind(adminState).run();
    await env.DB.prepare("update courses set state = ?").bind(courseState).run();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.updateModuleDetailsForActiveAdmin({
      adminUserId: "admin-1",
      module: editedModule(),
    })).resolves.toBe(outcome);
    await expect(moduleRow()).resolves.toMatchObject({
      title: "Original",
      description: "Old description",
      instructions: "Old instructions",
    });
  });

  it("rolls back and surfaces a technical detail-update failure", async () => {
    await insertModule();
    await env.DB.prepare(
      `create trigger refuse_module_text_update
       before update of title on modules
       when old.id = 'module-1'
       begin
         select raise(abort, 'forced Module text failure');
       end`,
    ).run();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.updateModuleDetailsForActiveAdmin({
      adminUserId: "admin-1",
      module: editedModule(),
    })).rejects.toThrow("forced Module text failure");
    await expect(moduleRow()).resolves.toMatchObject({ title: "Original" });
  });
});

describe("Module rescheduling persistence", () => {
  it("atomically reschedules while retaining identity, text, and Selection", async () => {
    await insertModule();
    await insertSelectionGraph();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.rescheduleModuleForActiveAdmin(
      validRescheduleInput(),
    )).resolves.toBe("rescheduled");
    await expect(moduleRow()).resolves.toMatchObject({
      id: "module-1",
      course_id: "course-1",
      title: "Original",
      description: "Old description",
      instructions: "Old instructions",
      starts_at: newStartsAt,
      ends_at: newEndsAt,
      state: "scheduled",
    });
    await expect(selectionRow()).resolves.toMatchObject({ id: "selection-1" });
  });

  it("makes Selection mutation eligibility follow the new start immediately", async () => {
    await insertModule();
    await insertSelectionGraph();
    const modules = createModulePersistence(env.DB);
    const selections = createModuleSelectionPersistence(env.DB);

    await expect(modules.rescheduleModuleForActiveAdmin(
      validRescheduleInput(),
    )).resolves.toBe("rescheduled");
    await expect(selections.removeParticipantModuleSelection({
      participantId: "participant-1",
      courseId: "course-1",
      moduleId: "module-1",
      nowEpoch: oldStartsAt + 1,
    })).resolves.toEqual({ outcome: "removed" });
    await expect(selectionRow()).resolves.toBeNull();
  });

  it.each([
    ["exact current start", {}, oldStartsAt, "module-schedule-locked"],
    ["Cancelled state", { state: "cancelled" }, acceptedNowEpoch, "module-schedule-locked"],
    ["concurrent interval", { startsAt: oldStartsAt + 1 }, acceptedNowEpoch, "module-schedule-changed"],
  ])("refuses a %s without changing either instant", async (
    _label,
    moduleOverride,
    nowEpoch,
    outcome,
  ) => {
    await insertModule(moduleOverride);
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.rescheduleModuleForActiveAdmin({
      ...validRescheduleInput(),
      acceptedNowEpoch: nowEpoch,
    })).resolves.toBe(outcome);
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: moduleOverride.startsAt ?? oldStartsAt,
      ends_at: oldEndsAt,
      state: moduleOverride.state ?? "scheduled",
    });
  });

  it.each([
    ["Disabled Admin", "disabled", "active", "Europe/Berlin", "admin-not-active"],
    ["Archived Course", "active", "archived", "Europe/Berlin", "course-not-active"],
    ["changed timezone", "active", "active", "Europe/Paris", "course-timezone-changed"],
  ])("refuses a stale %s", async (
    _label,
    adminState,
    courseState,
    timezone,
    outcome,
  ) => {
    await insertModule();
    await env.DB.prepare("update admin_users set state = ?").bind(adminState).run();
    await env.DB.prepare("update courses set state = ?, timezone = ?")
      .bind(courseState, timezone)
      .run();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.rescheduleModuleForActiveAdmin(
      validRescheduleInput(),
    )).resolves.toBe(outcome);
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: oldStartsAt,
      ends_at: oldEndsAt,
    });
  });

  it.each([
    [acceptedNowEpoch, acceptedNowEpoch + 3_600_000],
    [newStartsAt, newStartsAt],
  ])("refuses invalid definite interval %s to %s", async (startsAt, endsAt) => {
    await insertModule();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.rescheduleModuleForActiveAdmin({
      ...validRescheduleInput(),
      module: {
        ...validRescheduleInput().module,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      },
    })).resolves.toBe("module-schedule-invalid");
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: oldStartsAt,
      ends_at: oldEndsAt,
    });
  });

  it("rolls back and surfaces a technical schedule failure", async () => {
    await insertModule();
    await env.DB.prepare(
      `create trigger refuse_module_schedule_update
       before update of starts_at on modules
       when old.id = 'module-1'
       begin
         select raise(abort, 'forced Module schedule failure');
       end`,
    ).run();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.rescheduleModuleForActiveAdmin(
      validRescheduleInput(),
    )).rejects.toThrow("forced Module schedule failure");
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: oldStartsAt,
      ends_at: oldEndsAt,
    });
  });

  it("finds only a Module owned by the requested Course", async () => {
    await insertModule();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.findModuleById("course-1", "module-1"))
      .resolves.toMatchObject({ id: "module-1", courseId: "course-1" });
    await expect(persistence.findModuleById("course-other", "module-1"))
      .resolves.toBeNull();
  });
});

/** @returns {object} Complete deterministic schedule input. */
function validRescheduleInput() {
  return {
    acceptedNowEpoch,
    adminUserId: "admin-1",
    courseTimezone: "Europe/Berlin",
    expectedStartsAt: new Date(oldStartsAt).toISOString(),
    expectedEndsAt: new Date(oldEndsAt).toISOString(),
    module: {
      ...editedModule(),
      title: "Original",
      description: "Old description",
      instructions: "Old instructions",
      startsAt: new Date(newStartsAt).toISOString(),
      endsAt: new Date(newEndsAt).toISOString(),
    },
  };
}

/** @returns {object} Module representation with edited text. */
function editedModule() {
  return {
    id: "module-1",
    courseId: "course-1",
    title: "Updated",
    description: null,
    instructions: "New instructions",
    startsAt: new Date(oldStartsAt).toISOString(),
    endsAt: new Date(oldEndsAt).toISOString(),
    state: "scheduled",
  };
}

/** @returns {Promise<void>} Seed one Active Admin and Course. */
async function seedAdminAndCourse() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into admin_users
         (id, external_principal_id, name, state, authority)
       values ('admin-1', 'principal-admin-1', 'Admin', 'active', 'admin')`,
    ),
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-1', 'Course', null, 'Europe/Berlin', 'active', 1)`,
    ),
  ]);
}

/** @returns {Promise<void>} Insert one raw Module. */
async function insertModule(options = {}) {
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values ('module-1', 'course-1', 'Original', 'Old description',
             'Old instructions', ?, ?, ?)`,
  ).bind(
    options.startsAt ?? oldStartsAt,
    options.endsAt ?? oldEndsAt,
    options.state ?? "scheduled",
  ).run();
}

/** @returns {Promise<void>} Insert retained Selection dependencies and row. */
async function insertSelectionGraph() {
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
    env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-1', 'participant-1', 'course-1',
               'module-1', 'group-1')`,
    ),
  ]);
}

/** @returns {Promise<object | null>} Raw Module state. */
function moduleRow() {
  return env.DB.prepare("select * from modules where id = 'module-1'").first();
}

/** @returns {Promise<object | null>} Narrow retained Selection state. */
function selectionRow() {
  return env.DB.prepare(
    `select id, module_id, group_id from module_selections
      where id = 'selection-1'`,
  ).first();
}

/** @returns {Promise<object>} Counts for every unrelated retained owner. */
async function structureCounts() {
  const row = await env.DB.prepare(
    `select
       (select count(*) from courses) as courses,
       (select count(*) from groups) as groups,
       (select count(*) from participants) as participants,
       (select count(*) from course_assignments) as assignments,
       (select count(*) from module_selections) as selections`,
  ).first();

  return row;
}
