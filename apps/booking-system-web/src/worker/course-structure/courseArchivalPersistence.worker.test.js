import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCourseAssignmentPersistence } from "../course-access/index.js";
import { createModuleSelectionPersistence } from "../module-participation/index.js";
import { createCoursePersistence } from "./createCoursePersistence.js";
import { createGroupPersistence } from "./createGroupPersistence.js";
import { createModulePersistence } from "./createModulePersistence.js";

const nowEpoch = 2_000_000_000_000;
const futureStart = nowEpoch + 60_000;
const futureEnd = nowEpoch + 120_000;

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

describe("Course archival persistence", () => {
  it.each([
    ["zero Modules", null, null],
    ["exact-end Scheduled Module", "scheduled", nowEpoch],
    ["ended Scheduled Module", "scheduled", nowEpoch - 1],
    ["future Cancelled Module", "cancelled", futureEnd],
  ])("archives with %s", async (_label, moduleState, endsAt) => {
    if (moduleState !== null) {
      await insertModule({
        state: moduleState,
        startsAt: Math.min(nowEpoch - 60_000, endsAt - 1),
        endsAt,
      });
    }

    await expect(createCoursePersistence(env.DB).archiveActiveCourse(
      archivalInput(),
    )).resolves.toBe("archived");
    await expect(courseRow()).resolves.toMatchObject({ state: "archived" });
  });

  it.each([
    ["upcoming", futureStart, futureEnd],
    ["in progress", nowEpoch - 60_000, nowEpoch + 1],
  ])("blocks one %s Scheduled Module", async (_label, startsAt, endsAt) => {
    await insertModule({ startsAt, endsAt });

    await expect(createCoursePersistence(env.DB).archiveActiveCourse(
      archivalInput(),
    )).resolves.toBe("course-archival-blocked");
    await expect(courseRow()).resolves.toMatchObject({ state: "active" });
    await expect(moduleRow("module-1")).resolves.toMatchObject({
      starts_at: startsAt,
      ends_at: endsAt,
      state: "scheduled",
    });
  });

  it("blocks a mixed Course only for its unresolved Scheduled Module", async () => {
    await insertModule({ id: "ended", startsAt: nowEpoch - 2, endsAt: nowEpoch - 1 });
    await insertModule({ id: "cancelled", state: "cancelled" });
    await insertModule({ id: "unresolved" });

    await expect(createCoursePersistence(env.DB).archiveActiveCourse(
      archivalInput(),
    )).resolves.toBe("course-archival-blocked");
    await expect(allModules()).resolves.toHaveLength(3);
  });

  it("changes only Course state and preserves every retained related row", async () => {
    await insertRetainedGraph();
    const before = await retainedSnapshot();

    await expect(createCoursePersistence(env.DB).archiveActiveCourse(
      archivalInput(),
    )).resolves.toBe("archived");
    const after = await retainedSnapshot();

    expect(after.course).toEqual({ ...before.course, state: "archived" });
    expect(after.groups).toEqual(before.groups);
    expect(after.modules).toEqual(before.modules);
    expect(after.participants).toEqual(before.participants);
    expect(after.assignments).toEqual(before.assignments);
    expect(after.selections).toEqual(before.selections);
  });

  it.each([
    ["Disabled Admin", "disabled", "active", "admin-not-active"],
    ["already Archived Course", "active", "archived", "course-not-active"],
  ])("refuses a stale %s without effects", async (
    _label,
    adminState,
    courseState,
    outcome,
  ) => {
    await env.DB.prepare("update admin_users set state = ?")
      .bind(adminState)
      .run();
    await env.DB.prepare("update courses set state = ?")
      .bind(courseState)
      .run();

    await expect(createCoursePersistence(env.DB).archiveActiveCourse(
      archivalInput(),
    )).resolves.toBe(outcome);
    await expect(courseRow()).resolves.toMatchObject({ state: courseState });
  });

  it("serializes archival with new future Module creation to one valid winner", async () => {
    const courses = createCoursePersistence(env.DB);
    const modules = createModulePersistence(env.DB);
    const [archiveOutcome, moduleOutcome] = await Promise.all([
      courses.archiveActiveCourse(archivalInput()),
      modules.createModuleForActiveAdmin(moduleCreationInput()),
    ]);
    const resultPair = [archiveOutcome, moduleOutcome];

    expect([
      ["archived", "course-not-active"],
      ["course-archival-blocked", "created"],
    ]).toContainEqual(resultPair);

    if (archiveOutcome === "archived") {
      await expect(courseRow()).resolves.toMatchObject({
        state: "archived",
        has_ever_had_module: 0,
      });
      await expect(moduleRow("module-race")).resolves.toBeNull();
    } else {
      await expect(courseRow()).resolves.toMatchObject({
        state: "active",
        has_ever_had_module: 1,
      });
      await expect(moduleRow("module-race")).resolves.toMatchObject({
        state: "scheduled",
      });
    }
  });

  it("keeps every implemented structural and booking write closed afterwards", async () => {
    await insertRetainedGraph();
    const courses = createCoursePersistence(env.DB);

    await expect(courses.archiveActiveCourse(archivalInput()))
      .resolves.toBe("archived");

    const [courseEdit, groupCreate, moduleCreate, assignmentCreate, selectionSet] =
      await Promise.all([
        courses.updateActiveCourseForActiveAdmin(courseUpdateInput()),
        createGroupPersistence(env.DB).createGroupForActiveAdmin(groupInput()),
        createModulePersistence(env.DB).createModuleForActiveAdmin(
          moduleCreationInput(),
        ),
        createCourseAssignmentPersistence(env.DB).assignParticipantToActiveCourse(
          assignmentInput(),
        ),
        createModuleSelectionPersistence(env.DB).setParticipantModuleSelection(
          selectionInput(),
        ),
      ]);

    expect(courseEdit).toBe("course-not-active");
    expect(groupCreate).toBe("course-not-active");
    expect(moduleCreate).toBe("course-not-active");
    expect(assignmentCreate).toEqual({ outcome: "course-not-active" });
    expect(selectionSet).toEqual({ outcome: "course-not-active" });
    await expect(courseRow()).resolves.toMatchObject({
      name: "Original Course",
      state: "archived",
    });
    await expect(env.DB.prepare("select count(*) as count from groups").first())
      .resolves.toEqual({ count: 2 });
    await expect(env.DB.prepare("select count(*) as count from modules").first())
      .resolves.toEqual({ count: 2 });
  });

  it("rolls back and surfaces an unexplained technical archival failure", async () => {
    await env.DB.prepare(
      `create trigger refuse_course_archival
       before update of state on courses
       when old.id = 'course-1'
       begin
         select raise(abort, 'forced Course archival failure');
       end`,
    ).run();

    await expect(createCoursePersistence(env.DB).archiveActiveCourse(
      archivalInput(),
    )).rejects.toThrow("forced Course archival failure");
    await expect(courseRow()).resolves.toMatchObject({ state: "active" });
  });
});

/** @returns {object} Guarded Course archival input. */
function archivalInput() {
  return { adminUserId: "admin-1", courseId: "course-1", nowEpoch };
}

/** @returns {object} Guarded Course complete-field update. */
function courseUpdateInput() {
  return {
    adminUserId: "admin-1",
    expectedTimezone: "Europe/Berlin",
    course: {
      id: "course-1",
      name: "Changed Course",
      description: "Changed",
      timezone: "Europe/Berlin",
    },
  };
}

/** @returns {object} Guarded Group creation input. */
function groupInput() {
  return {
    adminUserId: "admin-1",
    group: {
      id: "group-new",
      courseId: "course-1",
      name: "New Group",
      normalizedName: "new group",
      details: null,
      state: "active",
    },
  };
}

/** @returns {object} Guarded future Module creation input. */
function moduleCreationInput() {
  return {
    adminUserId: "admin-1",
    courseTimezone: "Europe/Berlin",
    module: {
      id: "module-race",
      courseId: "course-1",
      title: "Race Module",
      description: null,
      instructions: null,
      startsAt: new Date(futureStart).toISOString(),
      endsAt: new Date(futureEnd).toISOString(),
      state: "scheduled",
    },
  };
}

/** @returns {object} Guarded direct Assignment input. */
function assignmentInput() {
  return {
    adminUserId: "admin-1",
    assignment: {
      id: "assignment-new",
      participantId: "participant-new",
      courseId: "course-1",
      state: "active",
    },
  };
}

/** @returns {object} Guarded Selection mutation input. */
function selectionInput() {
  return {
    selection: {
      id: "selection-new",
      participantId: "participant-active",
      courseId: "course-1",
      moduleId: "module-ended",
      groupId: "group-active",
    },
    nowEpoch,
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
       values ('course-1', 'Original Course', 'Retained description',
               'Europe/Berlin', 'active', 0)`,
    ),
  ]);
}

/** @returns {Promise<void>} Insert one raw same-Course Module. */
async function insertModule(options = {}) {
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'course-1', ?, 'Description', 'Instructions', ?, ?, ?)`,
  ).bind(
    options.id ?? "module-1",
    options.id ?? "Module 1",
    options.startsAt ?? futureStart,
    options.endsAt ?? futureEnd,
    options.state ?? "scheduled",
  ).run();
}

/** @returns {Promise<void>} Seed retained Course structure and participation. */
async function insertRetainedGraph() {
  await insertModule({
    id: "module-ended",
    startsAt: nowEpoch - 120_000,
    endsAt: nowEpoch,
  });
  await insertModule({ id: "module-cancelled", state: "cancelled" });
  await env.DB.batch([
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-active', 'course-1', 'Active Group', 'active group',
               'Active details', 'active')`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-archived', 'course-1', 'Archived Group', 'archived group',
               'Archived details', 'archived')`,
    ),
    participantStatement("participant-active", "active@example.com"),
    participantStatement("participant-new", "new@example.com"),
    env.DB.prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       values ('assignment-active', 'participant-active', 'course-1', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments
         (id, participant_id, course_id, state)
       values ('assignment-revoked', 'participant-new', 'course-1', 'revoked')`,
    ),
    env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-ended', 'participant-active', 'course-1',
               'module-ended', 'group-active')`,
    ),
    env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-cancelled', 'participant-new', 'course-1',
               'module-cancelled', 'group-archived')`,
    ),
  ]);
}

/** @returns {object} One raw Participant insertion. */
function participantStatement(id, email) {
  return env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, 'active')`,
  ).bind(id, `principal-${id}`, id, email, email);
}

/** @returns {Promise<object>} Complete retained graph snapshot. */
async function retainedSnapshot() {
  const [course, groups, modules, participants, assignments, selections] =
    await Promise.all([
      courseRow(),
      allRows("groups"),
      allRows("modules"),
      allRows("participants"),
      allRows("course_assignments"),
      allRows("module_selections"),
    ]);

  return { course, groups, modules, participants, assignments, selections };
}

/** @returns {Promise<Array<object>>} All deterministic rows in one table. */
async function allRows(table) {
  const { results } = await env.DB.prepare(
    `select * from ${table} order by id`,
  ).all();

  return results;
}

/** @returns {Promise<Array<object>>} All Module rows. */
async function allModules() {
  return allRows("modules");
}

/** @returns {Promise<object | null>} Raw Course state. */
function courseRow() {
  return env.DB.prepare("select * from courses where id = 'course-1'").first();
}

/** @returns {Promise<object | null>} Raw Module state. */
function moduleRow(moduleId) {
  return env.DB.prepare("select * from modules where id = ?")
    .bind(moduleId)
    .first();
}
