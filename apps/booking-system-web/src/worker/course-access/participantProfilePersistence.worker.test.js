import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createParticipantPersistence } from "./createParticipantPersistence.js";

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
});

describe("Participant profile persistence", () => {
  it("self-edits only profile columns and preserves every identity and relationship", async () => {
    await insertAdmin("active", "shared-principal", "Independent Admin");
    await insertParticipant("a", "active", "original@example.com", "shared-principal");
    await insertParticipationGraph();
    const persistence = createParticipantPersistence(env.DB);

    await expect(
      persistence.updateActiveParticipantProfile(
        profileInput("a", "Self Updated", "self+tag@example.com"),
      ),
    ).resolves.toEqual({ outcome: "updated" });
    await expect(participantRow("a")).resolves.toEqual({
      id: "participant-a",
      external_principal_id: "shared-principal",
      name: "Self Updated",
      email: "self+tag@example.com",
      normalized_email: "self+tag@example.com",
      state: "active",
    });
    await expect(adminRow()).resolves.toEqual({
      id: "admin-a",
      external_principal_id: "shared-principal",
      name: "Independent Admin",
      state: "active",
      authority: "super-admin",
    });
    await expect(relationshipRows()).resolves.toEqual({
      assignment: {
        id: "assignment-a",
        participant_id: "participant-a",
        state: "active",
      },
      selection: {
        id: "selection-a",
        participant_id: "participant-a",
        group_id: "group-a",
      },
    });
  });

  it("refuses Disabled self-edit and retains the complete profile", async () => {
    await insertParticipant("a", "disabled", "original@example.com");
    const before = await participantRow("a");
    const persistence = createParticipantPersistence(env.DB);

    await expect(
      persistence.updateActiveParticipantProfile(
        profileInput("a", "Refused", "refused@example.com"),
      ),
    ).resolves.toEqual({ outcome: "participant-not-active" });
    await expect(participantRow("a")).resolves.toEqual(before);
  });

  it.each(["active", "disabled"])(
    "lets an Active Admin edit a registered %s Participant",
    async (state) => {
      await insertAdmin();
      await insertParticipant("a", state, "original@example.com");
      const persistence = createParticipantPersistence(env.DB);

      await expect(
        persistence.updateParticipantProfileAsActiveAdmin({
          adminUserId: "admin-a",
          ...profileInput("a", "Admin Updated", "admin.updated@example.com"),
        }),
      ).resolves.toEqual({ outcome: "updated" });
      await expect(participantRow("a")).resolves.toMatchObject({
        name: "Admin Updated",
        email: "admin.updated@example.com",
        state,
      });
    },
  );

  it("refuses a stale Admin and a missing target without changing current rows", async () => {
    await insertAdmin("disabled");
    await insertParticipant("a", "active", "original@example.com");
    const before = await participantRow("a");
    const persistence = createParticipantPersistence(env.DB);

    await expect(
      persistence.updateParticipantProfileAsActiveAdmin({
        adminUserId: "admin-a",
        ...profileInput("a", "Refused", "refused@example.com"),
      }),
    ).resolves.toEqual({ outcome: "admin-not-active" });
    await expect(participantRow("a")).resolves.toEqual(before);
    await env.DB.prepare(
      "update admin_users set state = 'active' where id = 'admin-a'",
    ).run();
    await expect(
      persistence.updateParticipantProfileAsActiveAdmin({
        adminUserId: "admin-a",
        ...profileInput("missing", "Missing", "missing@example.com"),
      }),
    ).resolves.toEqual({ outcome: "participant-not-editable" });
    await expect(participantRow("a")).resolves.toEqual(before);
  });

  it("uses case-insensitive complete-email uniqueness and preserves a refused target", async () => {
    await insertParticipant("a", "active", "original@example.com");
    await insertParticipant("b", "active", "Other+Tag@Example.COM");
    const before = await participantRow("a");
    const persistence = createParticipantPersistence(env.DB);

    await expect(
      persistence.updateActiveParticipantProfile(
        profileInput("a", "Refused", "other+tag@example.com"),
      ),
    ).resolves.toEqual({ outcome: "email-already-exists" });
    await expect(participantRow("a")).resolves.toEqual(before);
  });

  it("serializes concurrent duplicate-email edits to one accepted profile", async () => {
    await insertParticipant("a", "active", "a@example.com");
    await insertParticipant("b", "active", "b@example.com");
    const persistence = createParticipantPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.updateActiveParticipantProfile(
        profileInput("a", "Participant A", "Shared@Example.com"),
      ),
      persistence.updateActiveParticipantProfile(
        profileInput("b", "Participant B", "shared@example.com"),
      ),
    ]);

    expect(outcomes.map(({ outcome }) => outcome).sort()).toEqual([
      "email-already-exists",
      "updated",
    ]);
    const { count } = await env.DB.prepare(
      "select count(*) as count from participants where normalized_email = 'shared@example.com'",
    ).first();
    expect(count).toBe(1);
    await expect(countRows("participants")).resolves.toBe(2);
  });
});

/** @returns {object} Validated-profile-shaped persistence input. */
function profileInput(suffix, name, email) {
  return {
    participantId: `participant-${suffix}`,
    profile: { name, email, normalizedEmail: email.toLowerCase() },
  };
}

/** @returns {Promise<void>} Insert one Admin User. */
async function insertAdmin(
  state = "active",
  externalPrincipalId = "admin-principal",
  name = "Admin A",
) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-a', ?, ?, ?, 'super-admin')`,
  )
    .bind(externalPrincipalId, name, state)
    .run();
}

/** @returns {Promise<void>} Insert one Participant. */
async function insertParticipant(
  suffix,
  state,
  email,
  externalPrincipalId = `participant-principal-${suffix}`,
) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `participant-${suffix}`,
      externalPrincipalId,
      `Participant ${suffix}`,
      email,
      email.toLowerCase(),
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert Assignment and Selection preservation data. */
async function insertParticipationGraph() {
  await env.DB.batch([
    env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values ('course-a', 'Course A', null, 'Europe/Berlin', 'active', 0)`,
    ),
    env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values ('group-a', 'course-a', 'Group A', 'group a', null, 'active')`,
    ),
    env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values ('module-a', 'course-a', 'Module A', null, null,
               1900000000000, 1900003600000, 'scheduled')`,
    ),
    env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values ('assignment-a', 'participant-a', 'course-a', 'active')`,
    ),
    env.DB.prepare(
      `insert into module_selections
         (id, participant_id, course_id, module_id, group_id)
       values ('selection-a', 'participant-a', 'course-a', 'module-a', 'group-a')`,
    ),
  ]);
}

/** @returns {Promise<object | null>} Complete raw Participant row. */
function participantRow(suffix) {
  return env.DB.prepare(
    `select id, external_principal_id, name, email, normalized_email, state
       from participants where id = ?`,
  )
    .bind(`participant-${suffix}`)
    .first();
}

/** @returns {Promise<object | null>} Complete raw Admin row. */
function adminRow() {
  return env.DB.prepare(
    `select id, external_principal_id, name, state, authority
       from admin_users where id = 'admin-a'`,
  ).first();
}

/** @returns {Promise<object>} Retained relationship rows. */
async function relationshipRows() {
  const [assignment, selection] = await Promise.all([
    env.DB.prepare(
      `select id, participant_id, state from course_assignments
        where id = 'assignment-a'`,
    ).first(),
    env.DB.prepare(
      `select id, participant_id, group_id from module_selections
        where id = 'selection-a'`,
    ).first(),
  ]);

  return { assignment, selection };
}

/** @returns {Promise<number>} Count rows in one test-owned table. */
async function countRows(tableName) {
  const row = await env.DB
    .prepare(`select count(*) as count from "${tableName}"`)
    .first();

  return row.count;
}
