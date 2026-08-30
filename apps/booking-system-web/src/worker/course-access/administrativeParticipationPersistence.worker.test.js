import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createAdministrativeParticipationPersistence } from "./createAdministrativeParticipationPersistence.js";

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

describe("administrative participation persistence", () => {
  it("reads one fully registered target with nullable retained Assignment", async () => {
    await seedAdmin("active");
    await seedCourse("a", "Target Course", "active");
    await seedParticipant("target", "Target", "active");
    await seedGroup("active", "a", "Active Group", "active");
    await seedModule("future", "a", "Future", 1_800_000_000_000, "scheduled");
    const persistence = createAdministrativeParticipationPersistence(env.DB);

    await expect(
      persistence.findParticipantParticipation(
        "admin-a",
        "course-a",
        "participant-target",
      ),
    ).resolves.toMatchObject({
      course: { id: "course-a" },
      groups: [{ id: "group-active" }],
      modules: [{ id: "module-future" }],
      participation: {
        participant: participantResult("target", "Target", "active"),
        assignment: null,
        selections: [],
      },
    });

    await seedAssignment("target", "target", "a", "revoked");
    await seedSelection("target", "target", "a", "future", "active");
    await expect(
      persistence.findParticipantParticipation(
        "admin-a",
        "course-a",
        "participant-target",
      ),
    ).resolves.toMatchObject({
      participation: {
        assignment: assignmentResult("target", "target", "revoked"),
        selections: [{ id: "selection-target", groupId: "group-active" }],
      },
    });
  });

  it.each([
    ["missing target", "active", "admin-a", "course-a", "participant-missing"],
    ["missing Admin", "active", "admin-missing", "course-a", "participant-target"],
    ["Disabled Admin", "disabled", "admin-a", "course-a", "participant-target"],
    ["missing Course", "active", "admin-a", "course-missing", "participant-target"],
  ])("returns no target data for %s", async (
    _case,
    adminState,
    adminId,
    courseId,
    participantId,
  ) => {
    await seedAdmin(adminState);
    await seedCourse("a", "Target Course", "active");
    await seedParticipant("target", "Target", "active");
    const persistence = createAdministrativeParticipationPersistence(env.DB);

    await expect(
      persistence.findParticipantParticipation(adminId, courseId, participantId),
    ).resolves.toBeNull();
  });
});

/** @returns {Promise<void>} Insert one current Admin identity. */
async function seedAdmin(state) {
  await env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-a', 'principal-admin', 'Admin', ?, 'super-admin')`,
  )
    .bind(state)
    .run();
}

/** @returns {Promise<void>} Insert one Course. */
async function seedCourse(suffix, name, state) {
  await env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, ?, 'Europe/Berlin', ?, 0)`,
  )
    .bind(`course-${suffix}`, name, `Description ${name}`, state)
    .run();
}

/** @returns {Promise<void>} Insert one Participant. */
async function seedParticipant(suffix, name, state) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `participant-${suffix}`,
      `principal-${suffix}`,
      name,
      `${suffix}@example.com`,
      `${suffix}@example.com`,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert one retained Assignment. */
async function seedAssignment(suffix, participantSuffix, courseSuffix, state) {
  await env.DB.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, ?, ?, ?)`,
  )
    .bind(
      `assignment-${suffix}`,
      `participant-${participantSuffix}`,
      `course-${courseSuffix}`,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert one Group. */
async function seedGroup(suffix, courseSuffix, name, state) {
  await env.DB.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `group-${suffix}`,
      `course-${courseSuffix}`,
      name,
      `${name}-${suffix}`.toLowerCase(),
      `Details ${suffix}`,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert one Module. */
async function seedModule(suffix, courseSuffix, title, startsAt, state) {
  await env.DB.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `module-${suffix}`,
      `course-${courseSuffix}`,
      title,
      `Description ${suffix}`,
      `Instructions ${suffix}`,
      startsAt,
      startsAt + 3_600_000,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert one retained Selection. */
async function seedSelection(suffix, participant, course, module, group) {
  await env.DB.prepare(
    `insert into module_selections
       (id, participant_id, course_id, module_id, group_id)
     values (?, ?, ?, ?, ?)`,
  )
    .bind(
      `selection-${suffix}`,
      `participant-${participant}`,
      `course-${course}`,
      `module-${module}`,
      `group-${group}`,
    )
    .run();
}

/** @returns {object} Expected Participant data. */
function participantResult(suffix, name, state) {
  return {
    id: `participant-${suffix}`,
    name,
    email: `${suffix}@example.com`,
    state,
  };
}

/** @returns {object} Expected Assignment data. */
function assignmentResult(suffix, participantSuffix, state) {
  return {
    id: `assignment-${suffix}`,
    participantId: `participant-${participantSuffix}`,
    courseId: "course-a",
    state,
  };
}
