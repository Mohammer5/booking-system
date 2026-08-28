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
  await insertAdmin("admin-1", "active");
  await insertCourse("course-1", "active");
  await insertCourse("course-2", "active");
});

describe("Group field persistence", () => {
  it("updates complete Active fields while preserving identity, ownership, state, and Selections", async () => {
    await insertGroup("group-1", "course-1", "Group One", "group one", "Old", "active");
    await insertParticipantStructure("group-1", [
      ["history", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
    ]);
    const persistence = createGroupPersistence(env.DB);

    await expect(
      persistence.updateGroupForActiveAdmin({
        adminUserId: "admin-1",
        expectedState: "active",
        group: groupCandidate({
          name: " Renamed ",
          normalizedName: "renamed",
          details: "Updated details",
        }),
      }),
    ).resolves.toBe("updated");
    await expect(persistence.findGroupById("course-1", "group-1")).resolves.toEqual(
      groupCandidate({
        name: " Renamed ",
        normalizedName: "renamed",
        details: "Updated details",
      }),
    );
    await expect(selectionIds()).resolves.toEqual(["selection-module-history"]);
  });

  it("enforces Active normalized-name uniqueness but permits Archived conflicts", async () => {
    await insertGroup("group-1", "course-1", "One", "one", null, "active");
    await insertGroup("group-2", "course-1", "Two", "two", null, "active");
    await insertGroup("group-3", "course-1", "Archived", "archived", null, "archived");
    const persistence = createGroupPersistence(env.DB);

    await expect(
      updateGroup(persistence, "group-1", "active", " TWO ", "two"),
    ).resolves.toBe("group-name-conflict");
    await expect(
      updateGroup(persistence, "group-3", "archived", "TWO", "two"),
    ).resolves.toBe("updated");
    await expect(groupRow("group-1")).resolves.toMatchObject({
      name: "One",
      normalized_name: "one",
    });
    await expect(groupRow("group-3")).resolves.toMatchObject({
      name: "TWO",
      normalized_name: "two",
      state: "archived",
    });
  });

  it("allows the same Active normalized name in another Course", async () => {
    await insertGroup("group-1", "course-1", "One", "one", null, "active");
    await insertGroup("group-2", "course-2", "Other", "other", null, "active");
    const persistence = createGroupPersistence(env.DB);

    await expect(
      persistence.updateGroupForActiveAdmin({
        adminUserId: "admin-1",
        expectedState: "active",
        group: groupCandidate({
          id: "group-2",
          courseId: "course-2",
          name: " ONE ",
          normalizedName: "one",
        }),
      }),
    ).resolves.toBe("updated");
  });

  it.each([
    ["disabled", "active", "active", "admin-not-active"],
    ["active", "archived", "active", "course-not-active"],
    ["active", "active", "archived", "group-state-changed"],
  ])("refuses stale Admin %s, Course %s, or Group %s without a partial edit", async (
    adminState,
    courseState,
    groupState,
    outcome,
  ) => {
    await insertGroup("group-1", "course-1", "Original", "original", "Old", groupState);
    await env.DB.prepare("update admin_users set state = ? where id = 'admin-1'")
      .bind(adminState)
      .run();
    await env.DB.prepare("update courses set state = ? where id = 'course-1'")
      .bind(courseState)
      .run();
    const persistence = createGroupPersistence(env.DB);

    await expect(
      persistence.updateGroupForActiveAdmin({
        adminUserId: "admin-1",
        expectedState: "active",
        group: groupCandidate({ name: "Changed", normalizedName: "changed", details: "New" }),
      }),
    ).resolves.toBe(outcome);
    await expect(groupRow("group-1")).resolves.toMatchObject({
      name: "Original",
      normalized_name: "original",
      details: "Old",
      state: groupState,
    });
  });
});

describe("Group archival persistence", () => {
  it("blocks only upcoming Scheduled retained intent and preserves every other Selection", async () => {
    await insertGroup("group-1", "course-1", "Group One", "group one", "Details", "active");
    await insertParticipantStructure("group-1", [
      ["upcoming", nowEpoch + 1, nowEpoch + 60_000, "scheduled"],
      ["exact", nowEpoch, nowEpoch + 60_000, "scheduled"],
      ["progress", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
      ["ended", nowEpoch - 120_000, nowEpoch - 60_000, "scheduled"],
      ["cancelled", nowEpoch + 60_000, nowEpoch + 120_000, "cancelled"],
    ]);
    const persistence = createGroupPersistence(env.DB);

    await expect(
      persistence.listSelectionContextsByGroupId("course-1", "group-1"),
    ).resolves.toEqual([
      { moduleState: "scheduled", startsAt: new Date(nowEpoch - 120_000).toISOString() },
      { moduleState: "scheduled", startsAt: new Date(nowEpoch - 60_000).toISOString() },
      { moduleState: "scheduled", startsAt: new Date(nowEpoch).toISOString() },
      { moduleState: "scheduled", startsAt: new Date(nowEpoch + 1).toISOString() },
      { moduleState: "cancelled", startsAt: new Date(nowEpoch + 60_000).toISOString() },
    ]);
    await expect(archiveGroup(persistence, "group-1")).resolves.toBe(
      "group-archival-blocked",
    );
    await env.DB.prepare(
      "delete from module_selections where module_id = 'module-upcoming'",
    ).run();
    await expect(archiveGroup(persistence, "group-1")).resolves.toBe("archived");
    await expect(groupRow("group-1")).resolves.toMatchObject({
      id: "group-1",
      details: "Details",
      state: "archived",
    });
    await expect(selectionIds()).resolves.toEqual([
      "selection-module-cancelled",
      "selection-module-ended",
      "selection-module-exact",
      "selection-module-progress",
    ]);
  });

  it("gives exactly one winner to concurrent archival and future Selection creation", async () => {
    await insertGroup("group-1", "course-1", "Group One", "group one", null, "active");
    await insertParticipantStructure("group-1", [
      ["future", nowEpoch + 60_000, nowEpoch + 120_000, "scheduled", false],
    ]);
    const groups = createGroupPersistence(env.DB);
    const selections = createModuleSelectionPersistence(env.DB);
    const outcomes = await Promise.all([
      archiveGroup(groups, "group-1"),
      selections.setParticipantModuleSelection({
        selection: {
          id: "selection-race",
          participantId: "participant-1",
          courseId: "course-1",
          moduleId: "module-future",
          groupId: "group-1",
        },
        nowEpoch,
      }),
    ]);

    expect([
      ["archived", "group-not-selectable"],
      ["group-archival-blocked", "created"],
    ]).toContainEqual([outcomes[0], outcomes[1].outcome]);
    const row = await groupRow("group-1");
    const ids = await selectionIds();

    if (outcomes[0] === "archived") {
      expect(row.state).toBe("archived");
      expect(ids).toEqual([]);
    } else {
      expect(row.state).toBe("active");
      expect(ids).toEqual(["selection-race"]);
    }
  });

  it.each([
    ["disabled", "active", "active", "admin-not-active"],
    ["active", "archived", "active", "course-not-active"],
    ["active", "active", "archived", "group-not-active"],
  ])("refuses stale archival state without removing a Selection", async (
    adminState,
    courseState,
    groupState,
    outcome,
  ) => {
    await insertGroup("group-1", "course-1", "Group", "group", null, groupState);
    await insertParticipantStructure("group-1", [
      ["history", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
    ]);
    await env.DB.prepare("update admin_users set state = ? where id = 'admin-1'")
      .bind(adminState)
      .run();
    await env.DB.prepare("update courses set state = ? where id = 'course-1'")
      .bind(courseState)
      .run();
    const persistence = createGroupPersistence(env.DB);

    await expect(archiveGroup(persistence, "group-1")).resolves.toBe(outcome);
    await expect(selectionIds()).resolves.toEqual(["selection-module-history"]);
  });
});

describe("Group reactivation persistence", () => {
  it("preserves identity/details and retained history without restoring removed Selections", async () => {
    await insertGroup("group-1", "course-1", "Archived", "archived", "Details", "archived");
    await insertParticipantStructure("group-1", [
      ["retained", nowEpoch - 60_000, nowEpoch + 60_000, "scheduled"],
      ["removed", nowEpoch + 60_000, nowEpoch + 120_000, "scheduled"],
    ]);
    await env.DB.prepare(
      "delete from module_selections where module_id = 'module-removed'",
    ).run();
    const persistence = createGroupPersistence(env.DB);

    await expect(reactivateGroup(persistence, "group-1")).resolves.toBe(
      "reactivated",
    );
    await expect(groupRow("group-1")).resolves.toMatchObject({
      id: "group-1",
      course_id: "course-1",
      name: "Archived",
      details: "Details",
      state: "active",
    });
    await expect(selectionIds()).resolves.toEqual(["selection-module-retained"]);
  });

  it("refuses a conflict, then permits an Archived rename and reactivation", async () => {
    await insertGroup("group-1", "course-1", "Shared", "shared", null, "archived");
    await insertGroup("group-2", "course-1", "SHARED", "shared", null, "active");
    const persistence = createGroupPersistence(env.DB);

    await expect(reactivateGroup(persistence, "group-1")).resolves.toBe(
      "group-name-conflict",
    );
    await expect(
      updateGroup(persistence, "group-1", "archived", "Renamed", "renamed"),
    ).resolves.toBe("updated");
    await expect(reactivateGroup(persistence, "group-1")).resolves.toBe(
      "reactivated",
    );
  });

  it("accepts only one concurrent Archived Group with a shared normalized name", async () => {
    await insertGroup("group-1", "course-1", "Shared", "shared", null, "archived");
    await insertGroup("group-2", "course-1", "SHARED", "shared", null, "archived");
    const persistence = createGroupPersistence(env.DB);
    const outcomes = await Promise.all([
      reactivateGroup(persistence, "group-1"),
      reactivateGroup(persistence, "group-2"),
    ]);

    expect(outcomes.sort()).toEqual(["group-name-conflict", "reactivated"]);
    await expect(activeGroupIds()).resolves.toHaveLength(1);
  });

  it("rolls back a failed Group field or lifecycle statement", async () => {
    await insertGroup("group-1", "course-1", "Original", "original", "Old", "active");
    await env.DB.prepare(
      `create trigger refuse_group_change
       before update on groups
       when old.id = 'group-1'
       begin
         select raise(abort, 'forced Group failure');
       end`,
    ).run();
    const persistence = createGroupPersistence(env.DB);

    await expect(
      updateGroup(persistence, "group-1", "active", "Changed", "changed"),
    ).rejects.toThrow("forced Group failure");
    await expect(archiveGroup(persistence, "group-1")).rejects.toThrow(
      "forced Group failure",
    );
    await expect(groupRow("group-1")).resolves.toMatchObject({
      name: "Original",
      normalized_name: "original",
      details: "Old",
      state: "active",
    });
  });
});

/** @returns {Promise<string>} Update one complete Group representation. */
function updateGroup(persistence, id, expectedState, name, normalizedName) {
  return persistence.updateGroupForActiveAdmin({
    adminUserId: "admin-1",
    expectedState,
    group: groupCandidate({ id, name, normalizedName, state: expectedState }),
  });
}

/** @returns {Promise<string>} Archive one deterministic Group. */
function archiveGroup(persistence, groupId) {
  return persistence.archiveActiveGroup({
    adminUserId: "admin-1",
    courseId: "course-1",
    groupId,
    nowEpoch,
  });
}

/** @returns {Promise<string>} Reactivate one deterministic Group. */
function reactivateGroup(persistence, groupId) {
  return persistence.reactivateArchivedGroup({
    adminUserId: "admin-1",
    courseId: "course-1",
    groupId,
  });
}

/** @returns {object} Complete Group persistence data. */
function groupCandidate(override = {}) {
  return {
    id: "group-1",
    courseId: "course-1",
    name: "Group One",
    normalizedName: "group one",
    details: null,
    state: "active",
    ...override,
  };
}

/** @returns {Promise<void>} Insert one Admin User. */
async function insertAdmin(id, state) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, 'admin')`,
  )
    .bind(id, `principal-${id}`, `Admin ${id}`, state)
    .run();
}

/** @returns {Promise<void>} Insert one Course. */
async function insertCourse(id, state) {
  await env.DB.prepare(
    `insert into courses (id, name, description, timezone, state)
     values (?, ?, null, 'Europe/Berlin', ?)`,
  )
    .bind(id, `Course ${id}`, state)
    .run();
}

/** @returns {Promise<void>} Insert one Group. */
async function insertGroup(id, courseId, name, normalizedName, details, state) {
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, courseId, name, normalizedName, details, state)
    .run();
}

/** @returns {Promise<void>} Insert Participant membership, Modules, and selected rows. */
async function insertParticipantStructure(groupId, modules) {
  await env.DB.batch([
    env.DB.prepare(
      `insert or ignore into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values ('participant-1', 'participant-principal', 'Participant',
               'participant@example.com', 'participant@example.com', 'active')`,
    ),
    env.DB.prepare(
      `insert or ignore into course_assignments
         (id, participant_id, course_id, state)
       values ('assignment-1', 'participant-1', 'course-1', 'active')`,
    ),
  ]);

  for (const [suffix, startsAt, endsAt, state, withSelection = true] of modules) {
    await env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values (?, 'course-1', ?, null, null, ?, ?, ?)`,
    )
      .bind(`module-${suffix}`, `Module ${suffix}`, startsAt, endsAt, state)
      .run();

    if (withSelection) {
      await env.DB.prepare(
        `insert into module_selections
           (id, participant_id, course_id, module_id, group_id)
         values (?, 'participant-1', 'course-1', ?, ?)`,
      )
        .bind(`selection-module-${suffix}`, `module-${suffix}`, groupId)
        .run();
    }
  }
}

/** @returns {Promise<object>} Read one Group row. */
function groupRow(groupId) {
  return env.DB.prepare("select * from groups where id = ?").bind(groupId).first();
}

/** @returns {Promise<Array<string>>} Ordered retained Selection identities. */
async function selectionIds() {
  const { results } = await env.DB.prepare(
    "select id from module_selections order by id",
  ).all();

  return results.map(({ id }) => id);
}

/** @returns {Promise<Array<string>>} Ordered Active Group identities. */
async function activeGroupIds() {
  const { results } = await env.DB.prepare(
    "select id from groups where state = 'active' order by id",
  ).all();

  return results.map(({ id }) => id);
}
