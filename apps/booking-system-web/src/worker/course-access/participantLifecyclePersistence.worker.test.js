import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createParticipantPersistence } from "./createParticipantPersistence.js";

const currentEpoch = Date.parse("2026-08-28T10:00:00.000Z");

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.exec("drop trigger if exists fail_participant_disable");
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
});

describe("Participant lifecycle persistence", () => {
  it("Disables globally at the exact boundary and preserves identities and history", async () => {
    await insertAdmin("active", "shared-principal");
    await insertParticipant("active", "shared-principal");
    await insertLifecycleGraph();
    const persistence = createParticipantPersistence(env.DB);

    await expect(
      persistence.disableActiveParticipant(lifecycleInput()),
    ).resolves.toEqual({ outcome: "disabled", removedSelectionCount: 2 });
    await expect(participantRow()).resolves.toMatchObject({
      id: "participant-a",
      external_principal_id: "shared-principal",
      name: "Participant A",
      email: "participant-a@example.com",
      state: "disabled",
    });
    await expect(adminRow()).resolves.toMatchObject({
      external_principal_id: "shared-principal",
      state: "active",
      authority: "super-admin",
    });
    await expect(assignmentRows()).resolves.toEqual([
      { id: "assignment-a", course_id: "course-a", state: "active" },
      { id: "assignment-b", course_id: "course-b", state: "revoked" },
    ]);
    await expect(selectionIds()).resolves.toEqual([
      "selection-cancelled",
      "selection-ended",
      "selection-exact-end",
      "selection-exact-start",
      "selection-in-progress",
    ]);
    await expect(countRows("courses")).resolves.toBe(2);
    await expect(countRows("modules")).resolves.toBe(7);
  });

  it("Re-enables only the retained Participant and never restores removed choices", async () => {
    await insertAdmin();
    await insertParticipant();
    await insertLifecycleGraph();
    const persistence = createParticipantPersistence(env.DB);

    await persistence.disableActiveParticipant(lifecycleInput());
    const retainedBefore = await selectionIds();
    await expect(
      persistence.reenableDisabledParticipant({
        adminUserId: "admin-a",
        participantId: "participant-a",
      }),
    ).resolves.toEqual({ outcome: "re-enabled" });

    await expect(participantRow()).resolves.toMatchObject({ state: "active" });
    await expect(selectionIds()).resolves.toEqual(retainedBefore);
    await expect(assignmentRows()).resolves.toEqual([
      { id: "assignment-a", course_id: "course-a", state: "active" },
      { id: "assignment-b", course_id: "course-b", state: "revoked" },
    ]);
  });

  it("refuses stale actor and target states without partial Selection removal", async () => {
    await insertAdmin("disabled");
    await insertParticipant("active");
    await insertLifecycleGraph();
    const persistence = createParticipantPersistence(env.DB);
    const before = await selectionIds();

    await expect(
      persistence.disableActiveParticipant(lifecycleInput()),
    ).resolves.toEqual({ outcome: "admin-not-active" });
    await expect(selectionIds()).resolves.toEqual(before);
    await expect(participantRow()).resolves.toMatchObject({ state: "active" });

    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-a'",
    ).run();
    await env.DB.prepare(
      "update participants set state = 'disabled' where id = 'participant-a'",
    ).run();
    await expect(
      persistence.disableActiveParticipant(lifecycleInput()),
    ).resolves.toEqual({ outcome: "participant-not-active" });
    await expect(selectionIds()).resolves.toEqual(before);
    await expect(
      persistence.reenableDisabledParticipant({
        adminUserId: "missing-admin",
        participantId: "participant-a",
      }),
    ).resolves.toEqual({ outcome: "admin-not-active" });
  });

  it("serializes concurrent lifecycle attempts to one accepted transition", async () => {
    await insertAdmin();
    await insertParticipant("active");
    await insertLifecycleGraph();
    const persistence = createParticipantPersistence(env.DB);
    const disableOutcomes = await Promise.all([
      persistence.disableActiveParticipant(lifecycleInput()),
      persistence.disableActiveParticipant(lifecycleInput()),
    ]);

    expect(disableOutcomes.map(({ outcome }) => outcome).sort()).toEqual([
      "disabled",
      "participant-not-active",
    ]);
    await expect(selectionIds()).resolves.toEqual([
      "selection-cancelled",
      "selection-ended",
      "selection-exact-end",
      "selection-exact-start",
      "selection-in-progress",
    ]);

    const reenableInput = {
      adminUserId: "admin-a",
      participantId: "participant-a",
    };
    const reenableOutcomes = await Promise.all([
      persistence.reenableDisabledParticipant(reenableInput),
      persistence.reenableDisabledParticipant(reenableInput),
    ]);

    expect(reenableOutcomes.map(({ outcome }) => outcome).sort()).toEqual([
      "participant-not-disabled",
      "re-enabled",
    ]);
  });

  it("rolls future-Selection removal back when the Participant update fails", async () => {
    await insertAdmin();
    await insertParticipant("active");
    await insertLifecycleGraph();
    const persistence = createParticipantPersistence(env.DB);
    const before = await selectionIds();
    await env.DB.prepare(
      `create trigger fail_participant_disable
       before update of state on participants
       when new.state = 'disabled'
       begin
         select raise(abort, 'forced participant disable failure');
       end`,
    ).run();

    await expect(
      persistence.disableActiveParticipant(lifecycleInput()),
    ).rejects.toThrow("forced participant disable failure");
    await expect(participantRow()).resolves.toMatchObject({ state: "active" });
    await expect(selectionIds()).resolves.toEqual(before);
  });

  it("classifies missing and wrong-state targets without creating data", async () => {
    await insertAdmin();
    const persistence = createParticipantPersistence(env.DB);

    await expect(
      persistence.disableActiveParticipant(lifecycleInput()),
    ).resolves.toEqual({ outcome: "participant-not-editable" });
    await expect(
      persistence.reenableDisabledParticipant({
        adminUserId: "admin-a",
        participantId: "participant-a",
      }),
    ).resolves.toEqual({ outcome: "participant-not-editable" });
    await insertParticipant("active");
    await expect(
      persistence.reenableDisabledParticipant({
        adminUserId: "admin-a",
        participantId: "participant-a",
      }),
    ).resolves.toEqual({ outcome: "participant-not-disabled" });
  });
});

/** @returns {object} One current Participant Disable input. */
function lifecycleInput() {
  return {
    adminUserId: "admin-a",
    participantId: "participant-a",
    nowEpoch: currentEpoch,
  };
}

/** @returns {Promise<void>} Insert one Admin User. */
async function insertAdmin(
  state = "active",
  externalPrincipalId = "admin-principal",
) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-a', ?, 'Admin A', ?, 'super-admin')`,
  )
    .bind(externalPrincipalId, state)
    .run();
}

/** @returns {Promise<void>} Insert one retained Participant. */
async function insertParticipant(
  state = "disabled",
  externalPrincipalId = "participant-principal",
) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values ('participant-a', ?, 'Participant A',
             'participant-a@example.com', 'participant-a@example.com', ?)`,
  )
    .bind(externalPrincipalId, state)
    .run();
}

/** @returns {Promise<void>} Insert two Courses and all retention boundaries. */
async function insertLifecycleGraph() {
  await env.DB.batch([
    courseStatement("a"),
    courseStatement("b"),
    groupStatement("a"),
    groupStatement("b"),
    moduleStatement("future-a", "a", currentEpoch + 60_000, "scheduled"),
    moduleStatement("exact-start", "a", currentEpoch, "scheduled"),
    moduleStatement(
      "in-progress",
      "a",
      currentEpoch - 60_000,
      "scheduled",
      currentEpoch + 60_000,
    ),
    moduleStatement(
      "exact-end",
      "a",
      currentEpoch - 60_000,
      "scheduled",
      currentEpoch,
    ),
    moduleStatement(
      "ended",
      "a",
      currentEpoch - 120_000,
      "scheduled",
      currentEpoch - 60_000,
    ),
    moduleStatement("cancelled", "a", currentEpoch + 60_000, "cancelled"),
    moduleStatement("future-b", "b", currentEpoch + 60_000, "scheduled"),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-a', 'participant-a', 'course-a', 'active')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-b', 'participant-a', 'course-b', 'revoked')`,
    ),
    selectionStatement("future-a", "a"),
    selectionStatement("exact-start", "a"),
    selectionStatement("in-progress", "a"),
    selectionStatement("exact-end", "a"),
    selectionStatement("ended", "a"),
    selectionStatement("cancelled", "a"),
    selectionStatement("future-b", "b"),
  ]);
}

/** @returns {object} One Course insert statement. */
function courseStatement(suffix) {
  return env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, null, 'Europe/Berlin', 'active', 1)`,
  ).bind(`course-${suffix}`, `Course ${suffix}`);
}

/** @returns {object} One Group insert statement. */
function groupStatement(suffix) {
  return env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, ?, ?, ?, null, 'active')`,
  ).bind(
    `group-${suffix}`,
    `course-${suffix}`,
    `Group ${suffix}`,
    `group ${suffix}`,
  );
}

/** @returns {object} One temporal Module insert statement. */
function moduleStatement(
  suffix,
  courseSuffix,
  startsAt,
  state,
  endsAt = startsAt + 30_000,
) {
  return env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, ?, ?, null, null, ?, ?, ?)`,
  ).bind(
    `module-${suffix}`,
    `course-${courseSuffix}`,
    `Module ${suffix}`,
    startsAt,
    endsAt,
    state,
  );
}

/** @returns {object} One Selection insert statement. */
function selectionStatement(moduleSuffix, courseSuffix) {
  return env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values (?, 'participant-a', ?, ?, ?)`,
  ).bind(
    `selection-${moduleSuffix}`,
    `course-${courseSuffix}`,
    `module-${moduleSuffix}`,
    `group-${courseSuffix}`,
  );
}

/** @returns {Promise<object | null>} Raw Participant row. */
function participantRow() {
  return env.DB.prepare(
    `select id, external_principal_id, name, email, state
       from participants where id = 'participant-a'`,
  ).first();
}

/** @returns {Promise<object | null>} Raw same-principal Admin row. */
function adminRow() {
  return env.DB.prepare(
    `select external_principal_id, state, authority
       from admin_users where id = 'admin-a'`,
  ).first();
}

/** @returns {Promise<Array<object>>} Stable Assignment rows. */
async function assignmentRows() {
  const { results } = await env.DB.prepare(
    `select id, course_id, state from course_assignments order by id`,
  ).all();

  return results;
}

/** @returns {Promise<Array<string>>} Ordered retained Selection identities. */
async function selectionIds() {
  const { results } = await env.DB.prepare(
    "select id from module_selections order by id",
  ).all();

  return results.map(({ id }) => id);
}

/** @returns {Promise<number>} Count rows in one test-owned table. */
async function countRows(tableName) {
  const row = await env.DB
    .prepare(`select count(*) as count from "${tableName}"`)
    .first();

  return row.count;
}
