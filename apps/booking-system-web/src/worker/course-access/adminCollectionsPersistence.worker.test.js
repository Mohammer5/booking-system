import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  adminCollectionConfigurations,
  parseAdminCollectionQuery,
} from "../admin-collections/index.js";
import { createCourseAssignmentPersistence } from "./createCourseAssignmentPersistence.js";
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
  await insertAdmin();
  await insertCourse("course-a", "active");
});

describe("Participant collection persistence", () => {
  it("searches literals, filters, sorts, counts, pages, and guards the actor", async () => {
    await insertParticipantFixtures();
    const persistence = createParticipantPersistence(env.DB);
    const page = await persistence.listParticipantPage(
      "admin-a",
      query("participants", "page=2&pageSize=10&sort=name.asc"),
    );
    const literal = await persistence.listParticipantPage(
      "admin-a",
      query("participants", "q=%25_%5C&state=disabled"),
    );

    expect(page).toMatchObject({
      outcome: "listed",
      pagination: { page: 2, pageSize: 10, totalItems: 12, totalPages: 2 },
    });
    expect(page.items).toHaveLength(2);
    expect(literal).toMatchObject({
      items: [{ id: "participant-11" }],
      pagination: { totalItems: 1, totalPages: 1 },
    });

    for (const field of ["name", "email", "state"]) {
      for (const direction of ["asc", "desc"]) {
        await expect(persistence.listParticipantPage(
          "admin-a",
          query("participants", `sort=${field}.${direction}`),
        )).resolves.toMatchObject({ outcome: "listed" });
      }
    }

    await expect(persistence.listParticipantPage(
      "admin-a",
      query("participants", "page=99&pageSize=10"),
    )).resolves.toMatchObject({ items: [], pagination: { totalItems: 12 } });
    await env.DB.prepare(
      "update admin_users set state = 'disabled' where id = 'admin-a'",
    ).run();
    await expect(persistence.listParticipantPage(
      "admin-a",
      query("participants"),
    )).resolves.toEqual({ outcome: "admin-not-active" });
  });
});

describe("Course Assignment collection persistence", () => {
  it("joins retained membership with parent context and normalized state", async () => {
    await insertParticipantFixtures();
    await insertAssignmentFixtures();
    const persistence = createCourseAssignmentPersistence(env.DB);
    const page = await persistence.listAssignmentPage(
      "admin-a",
      "course-a",
      query("assignments", "page=2&pageSize=10"),
    );
    const literal = await persistence.listAssignmentPage(
      "admin-a",
      "course-a",
      query(
        "assignments",
        "q=%25_%5C&participantState=disabled&assignmentState=revoked",
      ),
    );

    expect(page).toMatchObject({
      outcome: "listed",
      context: { id: "course-a", state: "active" },
      pagination: { page: 2, pageSize: 10, totalItems: 12, totalPages: 2 },
    });
    expect(page.items).toHaveLength(2);
    expect(literal).toMatchObject({
      items: [{
        id: "assignment-11",
        state: "revoked",
        participant: { id: "participant-11", state: "disabled" },
      }],
      pagination: { totalItems: 1 },
    });

    for (const field of [
      "name",
      "email",
      "participantState",
      "assignmentState",
    ]) {
      for (const direction of ["asc", "desc"]) {
        await expect(persistence.listAssignmentPage(
          "admin-a",
          "course-a",
          query("assignments", `sort=${field}.${direction}`),
        )).resolves.toMatchObject({ outcome: "listed" });
      }
    }

    await expect(persistence.listAssignmentPage(
      "admin-a",
      "missing",
      query("assignments"),
    )).resolves.toEqual({ outcome: "parent-not-found" });
  });

  it("returns ten server-searched options with Course-specific Assignment state", async () => {
    await insertParticipantFixtures();
    await insertAssignmentFixtures();
    const persistence = createCourseAssignmentPersistence(env.DB);
    const options = await persistence.listParticipantOptions(
      "admin-a",
      "course-a",
    );
    const literal = await persistence.listParticipantOptions(
      "admin-a",
      "course-a",
      "%_\\",
    );

    expect(options).toMatchObject({
      outcome: "listed",
      course: { id: "course-a" },
    });
    expect(options.participants).toHaveLength(10);
    expect(options.participants[0]).toMatchObject({
      state: expect.stringMatching(/^(active|disabled)$/),
      assignmentState: expect.stringMatching(/^(active|revoked)$/),
    });
    expect(literal.participants).toEqual([{
      id: "participant-11",
      name: "Literal %_\\ participant",
      email: "11@example.com",
      state: "disabled",
      assignmentState: "revoked",
    }]);

    await insertCourse("course-empty", "archived");
    const unassigned = await persistence.listParticipantOptions(
      "admin-a",
      "course-empty",
      "%_\\",
    );

    expect(unassigned.participants[0].assignmentState).toBeNull();
    await expect(persistence.listParticipantOptions(
      "admin-a",
      "missing",
    )).resolves.toEqual({ outcome: "parent-not-found" });
  });
});

/** @returns {object} One normalized collection query. */
function query(resource, search = "") {
  return parseAdminCollectionQuery(
    new URLSearchParams(search),
    adminCollectionConfigurations[resource],
  ).query;
}

/** Insert the current Active Admin fixture. */
function insertAdmin() {
  return env.DB.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values ('admin-a', 'principal-admin-a', 'Admin', 'active', 'admin')`,
  ).run();
}

/** Insert one Course fixture. */
function insertCourse(id, state) {
  return env.DB.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, 'Course', null, 'Europe/Berlin', ?, 0)`,
  ).bind(id, state).run();
}

/** Insert enough deterministic Participants to cross one page. */
async function insertParticipantFixtures() {
  for (let index = 0; index < 12; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const name = index === 11
      ? "Literal %_\\ participant"
      : `${index < 2 ? "Same" : "Participant"} ${suffix}`;
    const state = index === 11 ? "disabled" : "active";

    await env.DB.prepare(
      `insert into participants
         (id, external_principal_id, name, email, normalized_email, state)
       values (?, ?, ?, ?, ?, ?)`,
    ).bind(
      `participant-${suffix}`,
      `principal-${suffix}`,
      name,
      `${suffix}@example.com`,
      `${suffix}@example.com`,
      state,
    ).run();
  }
}

/** Insert one retained Assignment for every Participant fixture. */
async function insertAssignmentFixtures() {
  for (let index = 0; index < 12; index += 1) {
    const suffix = String(index).padStart(2, "0");

    await env.DB.prepare(
      `insert into course_assignments (id, participant_id, course_id, state)
       values (?, ?, 'course-a', ?)`,
    ).bind(
      `assignment-${suffix}`,
      `participant-${suffix}`,
      index === 11 ? "revoked" : "active",
    ).run();
  }
}
