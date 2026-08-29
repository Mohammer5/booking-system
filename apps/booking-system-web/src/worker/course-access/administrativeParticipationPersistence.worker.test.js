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
  it("composes every retained Course participation row in deterministic order", async () => {
    await seedAdmin("active");
    await seedCourse("a", "Archived Course", "archived");
    await seedCourse("other", "Other Course", "active");
    await seedParticipant("bravo", "Bravo", "active");
    await seedParticipant("alpha", "alpha", "disabled");
    await seedAssignment("bravo", "bravo", "a", "active");
    await seedAssignment("alpha", "alpha", "a", "revoked");
    await seedGroup("archived", "a", "Archived Group", "archived");
    await seedGroup("active", "a", "Active Group", "active");
    await seedGroup("other", "other", "Other Group", "active");
    await seedModule("later", "a", "Later", 1_800_000_000_000, "cancelled");
    await seedModule("earlier", "a", "Earlier", 1_700_000_000_000, "scheduled");
    await seedModule("other", "other", "Other", 1_700_000_000_000, "scheduled");
    await seedSelection("alpha", "alpha", "a", "earlier", "archived");
    const persistence = createAdministrativeParticipationPersistence(env.DB);

    const result = await persistence.findCourseParticipation(
      "admin-a",
      "course-a",
    );

    expect(result).toEqual({
      course: {
        id: "course-a",
        name: "Archived Course",
        description: "Description Archived Course",
        timezone: "Europe/Berlin",
        state: "archived",
      },
      groups: [
        groupResult("active", "Active Group", "active"),
        groupResult("archived", "Archived Group", "archived"),
      ],
      modules: [
        moduleResult("earlier", "Earlier", 1_700_000_000_000, "scheduled"),
        moduleResult("later", "Later", 1_800_000_000_000, "cancelled"),
      ],
      participations: [
        {
          participant: participantResult("alpha", "alpha", "disabled"),
          assignment: assignmentResult("alpha", "alpha", "revoked"),
          selections: [selectionResult()],
        },
        {
          participant: participantResult("bravo", "Bravo", "active"),
          assignment: assignmentResult("bravo", "bravo", "active"),
          selections: [],
        },
      ],
    });
  });

  it("returns an empty normalized model for a zero-participation Active Course", async () => {
    await seedAdmin("active");
    await seedCourse("a", "Empty Course", "active");
    const persistence = createAdministrativeParticipationPersistence(env.DB);

    await expect(
      persistence.findCourseParticipation("admin-a", "course-a"),
    ).resolves.toEqual({
      course: {
        id: "course-a",
        name: "Empty Course",
        description: "Description Empty Course",
        timezone: "Europe/Berlin",
        state: "active",
      },
      groups: [],
      modules: [],
      participations: [],
    });
  });

  it.each([
    ["missing Admin", null, "course-a"],
    ["Disabled Admin", "disabled", "course-a"],
    ["missing Course", "active", "course-missing"],
  ])("returns no data for %s", async (_case, adminState, courseId) => {
    if (adminState !== null) await seedAdmin(adminState);
    await seedCourse("a", "Private Course", "active");
    await seedParticipant("private", "Private", "active");
    await seedAssignment("private", "private", "a", "active");
    const persistence = createAdministrativeParticipationPersistence(env.DB);

    await expect(
      persistence.findCourseParticipation("admin-a", courseId),
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

/** @returns {object} Expected Group data. */
function groupResult(suffix, name, state) {
  return {
    id: `group-${suffix}`,
    courseId: "course-a",
    name,
    details: `Details ${suffix}`,
    state,
  };
}

/** @returns {object} Expected Module data. */
function moduleResult(suffix, title, startsAt, state) {
  return {
    id: `module-${suffix}`,
    courseId: "course-a",
    title,
    description: `Description ${suffix}`,
    instructions: `Instructions ${suffix}`,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(startsAt + 3_600_000).toISOString(),
    state,
  };
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

/** @returns {object} Expected retained Selection data. */
function selectionResult() {
  return {
    id: "selection-alpha",
    participantId: "participant-alpha",
    courseId: "course-a",
    moduleId: "module-earlier",
    groupId: "group-archived",
    group: {
      id: "group-archived",
      name: "Archived Group",
      details: "Details archived",
      state: "archived",
    },
  };
}
