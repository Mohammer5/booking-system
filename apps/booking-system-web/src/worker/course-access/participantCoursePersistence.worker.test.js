import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createParticipantCoursePersistence } from "./createParticipantCoursePersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from course_assignments"),
    env.DB.prepare("delete from modules"),
    env.DB.prepare("delete from groups"),
    env.DB.prepare("delete from courses"),
    env.DB.prepare("delete from participants"),
  ]);
});

describe("Participant Course list persistence", () => {
  it("orders current Active and Archived memberships for the current Active Participant", async () => {
    await insertParticipant("a", "active");
    await insertParticipant("other", "active");
    await insertCourses([
      ["z", "alpha", "active"],
      ["a", "Alpha", "active"],
      ["b", "Bravo", "active"],
      ["archived", "Archived", "archived"],
      ["revoked", "Revoked", "active"],
      ["other", "Other Participant", "active"],
    ]);
    await insertAssignments([
      ["a-z", "a", "z", "active"],
      ["a-a", "a", "a", "active"],
      ["a-b", "a", "b", "active"],
      ["a-archived", "a", "archived", "active"],
      ["a-revoked", "a", "revoked", "revoked"],
      ["other", "other", "other", "active"],
    ]);
    const persistence = createParticipantCoursePersistence(env.DB);

    await expect(
      persistence.listParticipantCourseMemberships("participant-a"),
    ).resolves.toMatchObject([
      { course: { id: "course-a" } },
      { course: { id: "course-z" } },
      { course: { id: "course-archived", state: "archived" } },
      { course: { id: "course-b" } },
    ]);
  });

  it("returns an empty list for zero membership or current Disabled state", async () => {
    await insertParticipant("a", "active");
    const persistence = createParticipantCoursePersistence(env.DB);

    await expect(
      persistence.listParticipantCourseMemberships("participant-a"),
    ).resolves.toEqual([]);
    await env.DB.prepare("update participants set state = 'disabled'").run();
    await expect(
      persistence.listParticipantCourseMemberships("participant-a"),
    ).resolves.toEqual([]);
  });
});

describe("Participant Course detail persistence", () => {
  it("returns narrow ordered Modules and only Active ordered Groups", async () => {
    await insertParticipant("a", "active");
    await insertCourses([["a", "Participant Course", "active"]]);
    await insertAssignments([["a", "a", "a", "active"]]);
    await insertGroups([
      ["z", "zeta", "active"],
      ["b", "Beta", "active"],
      ["a", "beta", "active"],
      ["archived", "Archived Group", "archived"],
    ]);
    await insertModules([
      ["late", "Late", 1_800_000_000_000, "scheduled"],
      ["b", "Second", 1_700_000_000_000, "cancelled"],
      ["a", "First", 1_700_000_000_000, "scheduled"],
    ]);
    const persistence = createParticipantCoursePersistence(env.DB);

    await expect(
      persistence.findParticipantCourseMembership(
        "participant-a",
        "course-a",
      ),
    ).resolves.toEqual({
      assignment: {
        id: "assignment-a",
        participantId: "participant-a",
        courseId: "course-a",
        state: "active",
      },
      course: {
        id: "course-a",
        name: "Participant Course",
        description: "Description for Participant Course",
        timezone: "Europe/Berlin",
        state: "active",
      },
      groups: [
        { id: "group-a", courseId: "course-a", name: "beta", details: "Details a", state: "active" },
        { id: "group-b", courseId: "course-a", name: "Beta", details: "Details b", state: "active" },
        { id: "group-z", courseId: "course-a", name: "zeta", details: "Details z", state: "active" },
      ],
      modules: [
        moduleResult("a", "First", 1_700_000_000_000, "scheduled"),
        moduleResult("b", "Second", 1_700_000_000_000, "cancelled"),
        moduleResult("late", "Late", 1_800_000_000_000, "scheduled"),
      ],
    });
  });

  it.each([
    ["unknown Course", null, null, null],
    ["Disabled Participant", "disabled", "active", "active"],
    ["Revoked Assignment", "active", "revoked", "active"],
  ])("returns the same null result for %s", async (
    _case,
    participantState,
    assignmentState,
    courseState,
  ) => {
    if (participantState !== null) {
      await insertParticipant("a", participantState);
      await insertCourses([["a", "Private Course", courseState]]);
      await insertAssignments([["a", "a", "a", assignmentState]]);
    }

    const persistence = createParticipantCoursePersistence(env.DB);

    await expect(
      persistence.findParticipantCourseMembership(
        "participant-a",
        "course-a",
      ),
    ).resolves.toBeNull();
  });

  it("returns private empty structure for an Archived Course", async () => {
    await insertParticipant("a", "active");
    await insertCourses([["a", "Archived Course", "archived"]]);
    await insertAssignments([["a", "a", "a", "active"]]);
    const persistence = createParticipantCoursePersistence(env.DB);

    await expect(
      persistence.findParticipantCourseMembership(
        "participant-a",
        "course-a",
      ),
    ).resolves.toMatchObject({
      course: { id: "course-a", state: "archived" },
      groups: [],
      modules: [],
    });
  });

  it("returns empty structure without adding schema or changing rows", async () => {
    await insertParticipant("a", "active");
    await insertCourses([["a", "Empty Course", "active"]]);
    await insertAssignments([["a", "a", "a", "active"]]);
    const before = await bookingCounts();
    const persistence = createParticipantCoursePersistence(env.DB);

    await expect(
      persistence.findParticipantCourseMembership(
        "participant-a",
        "course-a",
      ),
    ).resolves.toMatchObject({ groups: [], modules: [] });
    await expect(bookingCounts()).resolves.toEqual(before);
  });
});

/** @returns {Promise<void>} Insert deterministic Participant state. */
async function insertParticipant(suffix, state) {
  await env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `participant-${suffix}`,
      `principal-${suffix}`,
      `Participant ${suffix}`,
      `${suffix}@example.com`,
      `${suffix}@example.com`,
      state,
    )
    .run();
}

/** @returns {Promise<void>} Insert deterministic Course rows. */
async function insertCourses(courses) {
  for (const [suffix, name, state] of courses) {
    await env.DB.prepare(
      `insert into courses
         (id, name, description, timezone, state, has_ever_had_module)
       values (?, ?, ?, 'Europe/Berlin', ?, 0)`,
    )
      .bind(`course-${suffix}`, name, `Description for ${name}`, state)
      .run();
  }
}

/** @returns {Promise<void>} Insert deterministic Assignment rows. */
async function insertAssignments(assignments) {
  for (const [suffix, participantSuffix, courseSuffix, state] of assignments) {
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
}

/** @returns {Promise<void>} Insert deterministic Group rows. */
async function insertGroups(groups) {
  for (const [suffix, name, state] of groups) {
    await env.DB.prepare(
      `insert into groups
         (id, course_id, name, normalized_name, details, state)
       values (?, 'course-a', ?, ?, ?, ?)`,
    )
      .bind(`group-${suffix}`, name, `${name}-${suffix}`.toLowerCase(), `Details ${suffix}`, state)
      .run();
  }
}

/** @returns {Promise<void>} Insert deterministic Module rows. */
async function insertModules(modules) {
  for (const [suffix, title, startsAt, state] of modules) {
    await env.DB.prepare(
      `insert into modules
         (id, course_id, title, description, instructions,
          starts_at, ends_at, state)
       values (?, 'course-a', ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        `module-${suffix}`,
        title,
        `Description ${suffix}`,
        `Instructions ${suffix}`,
        startsAt,
        startsAt + 3_600_000,
        state,
      )
      .run();
  }
}

/** @returns {object} Expected mapped Module data. */
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
    selection: null,
  };
}

/** @returns {Promise<object>} Counts proving the read has no side effect. */
async function bookingCounts() {
  const [assignments, courses, groups, modules, participants, selections] =
    await Promise.all(
      ["course_assignments", "courses", "groups", "modules", "participants", "module_selections"].map(
        async (table) => {
          const row = await env.DB.prepare(
            `select count(*) as count from "${table}"`,
          ).first();

          return row.count;
        },
      ),
    );

  return { assignments, courses, groups, modules, participants, selections };
}
