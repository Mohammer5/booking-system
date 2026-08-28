import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createModuleSelectionPersistence } from "../module-participation/index.js";
import { createModulePersistence } from "./createModulePersistence.js";

const startsAt = 2_000_000_000_000;
const endsAt = startsAt + 3_600_000;
const beforeStart = startsAt - 60_000;

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

describe("Module cancellation persistence", () => {
  it.each([
    ["upcoming", startsAt, beforeStart],
    ["exact start", startsAt, startsAt],
    ["in progress", startsAt - 120_000, startsAt],
  ])("cancels %s and retains every field and Selection", async (
    _label,
    moduleStartsAt,
    nowEpoch,
  ) => {
    await insertModule({ startsAt: moduleStartsAt });
    await insertSelectionGraph({ includeSelection: true });
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.cancelScheduledModule(
      cancellationInput(nowEpoch),
    )).resolves.toBe("cancelled");
    await expect(moduleRow()).resolves.toMatchObject({
      id: "module-1",
      course_id: "course-1",
      title: "Original",
      description: "Retained description",
      instructions: "Retained instructions",
      starts_at: moduleStartsAt,
      ends_at: endsAt,
      state: "cancelled",
    });
    await expect(selectionRow()).resolves.toEqual({
      id: "selection-1",
      participant_id: "participant-1",
      module_id: "module-1",
      group_id: "group-1",
    });
  });

  it.each([
    ["exact end", endsAt],
    ["ended", endsAt + 1],
  ])("refuses %s without changing state or references", async (_label, nowEpoch) => {
    await insertModule();
    await insertSelectionGraph({ includeSelection: true });
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.cancelScheduledModule(
      cancellationInput(nowEpoch),
    )).resolves.toBe("module-cancellation-deadline-reached");
    await expect(moduleRow()).resolves.toMatchObject({ state: "scheduled" });
    await expect(selectionRow()).resolves.toMatchObject({ id: "selection-1" });
  });

  it("makes repeated cancellation terminal without changing the interval", async () => {
    await insertModule({ state: "cancelled" });
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.cancelScheduledModule(
      cancellationInput(beforeStart),
    )).resolves.toBe("module-not-scheduled");
    await expect(moduleRow()).resolves.toMatchObject({
      starts_at: startsAt,
      ends_at: endsAt,
      state: "cancelled",
    });
  });

  it.each([
    ["Disabled Admin", "disabled", "active", "admin-not-active"],
    ["Archived Course", "active", "archived", "course-not-active"],
  ])("refuses a stale %s", async (_label, adminState, courseState, outcome) => {
    await insertModule();
    await env.DB.prepare("update admin_users set state = ?").bind(adminState).run();
    await env.DB.prepare("update courses set state = ?").bind(courseState).run();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.cancelScheduledModule(
      cancellationInput(beforeStart),
    )).resolves.toBe(outcome);
    await expect(moduleRow()).resolves.toMatchObject({ state: "scheduled" });
  });

  it("serializes cancellation with a new Selection and retains any winner", async () => {
    await insertModule();
    await insertSelectionGraph();
    const modules = createModulePersistence(env.DB);
    const selections = createModuleSelectionPersistence(env.DB);
    const [cancelOutcome, selectionOutcome] = await Promise.all([
      modules.cancelScheduledModule(cancellationInput(beforeStart)),
      selections.setParticipantModuleSelection(selectionInput()),
    ]);

    expect(cancelOutcome).toBe("cancelled");
    expect(new Set(["created", "module-not-selectable"]))
      .toContain(selectionOutcome.outcome);
    await expect(moduleRow()).resolves.toMatchObject({ state: "cancelled" });
    await expect(selectionRow()).resolves.toEqual(
      selectionOutcome.outcome === "created"
        ? expect.objectContaining({ id: "selection-race" })
        : null,
    );
  });

  it("serializes cancellation with rescheduling to one immutable final interval", async () => {
    await insertModule();
    const modules = createModulePersistence(env.DB);
    const [cancelOutcome, scheduleOutcome] = await Promise.all([
      modules.cancelScheduledModule(cancellationInput(beforeStart)),
      modules.rescheduleModuleForActiveAdmin(rescheduleInput()),
    ]);
    const row = await moduleRow();

    expect(cancelOutcome).toBe("cancelled");
    expect(new Set(["rescheduled", "module-schedule-locked"]))
      .toContain(scheduleOutcome);
    expect(row.state).toBe("cancelled");
    expect([
      [startsAt, endsAt],
      [endsAt + 3_600_000, endsAt + 7_200_000],
    ]).toContainEqual([row.starts_at, row.ends_at]);
  });

  it("allows concurrent descriptive editing because it remains eligible", async () => {
    await insertModule();
    const modules = createModulePersistence(env.DB);
    const [cancelOutcome, editOutcome] = await Promise.all([
      modules.cancelScheduledModule(cancellationInput(beforeStart)),
      modules.updateModuleDetailsForActiveAdmin({
        adminUserId: "admin-1",
        module: { ...moduleData(), title: "Edited", state: "scheduled" },
      }),
    ]);

    expect(cancelOutcome).toBe("cancelled");
    expect(editOutcome).toBe("updated");
    await expect(moduleRow()).resolves.toMatchObject({
      title: "Edited",
      state: "cancelled",
    });
  });

  it("rolls back and surfaces a technical cancellation failure", async () => {
    await insertModule();
    await env.DB.prepare(
      `create trigger refuse_module_cancellation
       before update of state on modules
       when old.id = 'module-1'
       begin
         select raise(abort, 'forced Module cancellation failure');
       end`,
    ).run();
    const persistence = createModulePersistence(env.DB);

    await expect(persistence.cancelScheduledModule(
      cancellationInput(beforeStart),
    )).rejects.toThrow("forced Module cancellation failure");
    await expect(moduleRow()).resolves.toMatchObject({ state: "scheduled" });
  });
});

/** @returns {object} Guarded cancellation input. */
function cancellationInput(nowEpoch) {
  return {
    adminUserId: "admin-1",
    courseId: "course-1",
    moduleId: "module-1",
    nowEpoch,
  };
}

/** @returns {object} Guarded Selection creation input. */
function selectionInput() {
  return {
    selection: {
      id: "selection-race",
      participantId: "participant-1",
      courseId: "course-1",
      moduleId: "module-1",
      groupId: "group-1",
    },
    nowEpoch: beforeStart,
  };
}

/** @returns {object} Guarded schedule replacement input. */
function rescheduleInput() {
  const newStartsAt = endsAt + 3_600_000;
  const newEndsAt = endsAt + 7_200_000;

  return {
    acceptedNowEpoch: beforeStart,
    adminUserId: "admin-1",
    courseTimezone: "Europe/Berlin",
    expectedStartsAt: new Date(startsAt).toISOString(),
    expectedEndsAt: new Date(endsAt).toISOString(),
    module: {
      ...moduleData(),
      startsAt: new Date(newStartsAt).toISOString(),
      endsAt: new Date(newEndsAt).toISOString(),
    },
  };
}

/** @returns {object} Current Module domain data. */
function moduleData() {
  return {
    id: "module-1",
    courseId: "course-1",
    title: "Original",
    description: "Retained description",
    instructions: "Retained instructions",
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    state: "scheduled",
  };
}

/** @returns {Promise<void>} Seed Active Admin and Course. */
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
     values ('module-1', 'course-1', 'Original', 'Retained description',
             'Retained instructions', ?, ?, ?)`,
  ).bind(
    options.startsAt ?? startsAt,
    options.endsAt ?? endsAt,
    options.state ?? "scheduled",
  ).run();
}

/** @returns {Promise<void>} Insert Selection owners and optional row. */
async function insertSelectionGraph({ includeSelection = false } = {}) {
  const statements = [
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
  ];

  if (includeSelection) {
    statements.push(env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-1', 'participant-1', 'course-1',
               'module-1', 'group-1')`,
    ));
  }

  await env.DB.batch(statements);
}

/** @returns {Promise<object | null>} Raw Module state. */
function moduleRow() {
  return env.DB.prepare("select * from modules where id = 'module-1'").first();
}

/** @returns {Promise<object | null>} Retained Selection state. */
function selectionRow() {
  return env.DB.prepare(
    `select id, participant_id, module_id, group_id
       from module_selections where module_id = 'module-1'`,
  ).first();
}
