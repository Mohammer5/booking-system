const fixturePath = "/api/_fixtures/admin-collections";
const fixtureCount = 12;

/**
 * Create one fixed non-production collection seed endpoint.
 *
 * @param {object} database Isolated non-production D1 binding.
 * @returns {(request: Request) => Promise<Response | null>} Fixture handler.
 */
export function createAdminCollectionFixture(database) {
  return async function handleAdminCollectionFixture(request) {
    if (
      request.method !== "POST" ||
      new URL(request.url).pathname !== fixturePath
    ) {
      return null;
    }

    await removePreviousFixtures(database);
    await database.batch([
      ...Array.from({ length: fixtureCount }, (_, index) =>
        courseStatement(database, index)),
      ...Array.from({ length: fixtureCount }, (_, index) =>
        participantStatement(database, index)),
      ...Array.from({ length: fixtureCount }, (_, index) =>
        assignmentStatement(database, index)),
      ...Array.from({ length: fixtureCount }, (_, index) =>
        groupStatement(database, index)),
      ...Array.from({ length: fixtureCount }, (_, index) =>
        moduleStatement(database, index)),
      ...Array.from({ length: fixtureCount }, (_, index) =>
        adminUserStatement(database, index)),
      ...Array.from({ length: fixtureCount }, (_, index) =>
        inviteStatement(database, index)),
    ]);

    return new Response(null, { status: 204 });
  };
}

/** @returns {object} One retained Module on the first seeded Course. */
function moduleStatement(database, index) {
  const suffix = fixtureSuffix(index);
  const startsAt = Date.parse(`2026-08-${String(index + 1).padStart(2, "0")}T08:00:00Z`);

  return database.prepare(
    `insert into modules
       (id, course_id, title, description, instructions,
        starts_at, ends_at, state)
     values (?, 'collection-course-00', ?, ?, ?, ?, ?, ?)`,
  ).bind(
    `collection-module-${suffix}`,
    `Collection Module ${suffix}`,
    index === 11 ? "Literal collection module description" : null,
    index === 10 ? "Collection module instructions" : null,
    startsAt,
    startsAt + 3_600_000,
    index === 11 ? "cancelled" : "scheduled",
  );
}

/** @returns {object} One Group on the first seeded Course. */
function groupStatement(database, index) {
  const suffix = fixtureSuffix(index);
  const name = `Collection Group ${suffix}`;

  return database.prepare(
    `insert into groups
       (id, course_id, name, normalized_name, details, state)
     values (?, 'collection-course-00', ?, ?, ?, ?)`,
  ).bind(
    `collection-group-${suffix}`,
    name,
    name.toLowerCase(),
    index === 11
      ? "Literal collection group details with enough text for bounded presentation"
      : null,
    index === 11 ? "archived" : "active",
  );
}

/** @returns {object} One retained Assignment on the first seeded Course. */
function assignmentStatement(database, index) {
  const suffix = fixtureSuffix(index);

  return database.prepare(
    `insert into course_assignments (id, participant_id, course_id, state)
     values (?, ?, 'collection-course-00', ?)`,
  ).bind(
    `collection-assignment-${suffix}`,
    `collection-participant-${suffix}`,
    index === 11 ? "revoked" : "active",
  );
}

/** Reset booking-domain data while retaining the fixed authenticated actor. */
async function removePreviousFixtures(database) {
  await database.batch([
    database.prepare("delete from module_selections"),
    database.prepare("delete from course_assignments"),
    database.prepare("delete from course_invites"),
    database.prepare("delete from modules"),
    database.prepare("delete from groups"),
    database.prepare("delete from participants"),
    database.prepare("delete from courses"),
    database.prepare("delete from admin_invites"),
    database.prepare(
      `delete from admin_users
        where external_principal_id <> 'fixture-first-admin'`,
    ),
  ]);
}

/** @returns {object} One deterministic Course insert. */
function courseStatement(database, index) {
  const suffix = fixtureSuffix(index);

  return database.prepare(
    `insert into courses
       (id, name, description, timezone, state, has_ever_had_module)
     values (?, ?, ?, ?, ?, ?)`,
  ).bind(
    `collection-course-${suffix}`,
    `Collection Course ${suffix}`,
    index === 11 ? "Literal collection destination" : null,
    index % 2 === 0 ? "Europe/Berlin" : "UTC",
    index === 11 ? "archived" : "active",
    index === 0 ? 1 : 0,
  );
}

/** @returns {object} One deterministic global Participant insert. */
function participantStatement(database, index) {
  const suffix = fixtureSuffix(index);
  const email = `collection-${suffix}@example.com`;

  return database.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  ).bind(
    `collection-participant-${suffix}`,
    `collection-principal-${suffix}`,
    `Collection Participant ${suffix}`,
    email,
    email,
    index === 11 ? "disabled" : "active",
  );
}

/** @returns {object} One deterministic current Admin User insert. */
function adminUserStatement(database, index) {
  const suffix = fixtureSuffix(index);

  return database.prepare(
    `insert into admin_users
       (id, external_principal_id, name, state, authority)
     values (?, ?, ?, ?, ?)`,
  ).bind(
    `collection-admin-${suffix}`,
    `collection-admin-principal-${suffix}`,
    `Collection Admin ${suffix}`,
    index === 11 ? "disabled" : "active",
    index === 10 ? "super-admin" : "admin",
  );
}

/** @returns {object} One deterministic non-secret Admin Invite insert. */
function inviteStatement(database, index) {
  const suffix = fixtureSuffix(index);
  const states = ["active", "claimed", "revoked"];

  return database.prepare(
    `insert into admin_invites
       (id, token_digest, created_by_admin_user_id, created_at, state)
     values (?, ?, null, ?, ?)`,
  ).bind(
    `collection-invite-${suffix}`,
    index.toString(16).padStart(64, "0"),
    1_800_000_000 + index,
    states[index % states.length],
  );
}

/** @returns {string} Two-digit stable fixture suffix. */
function fixtureSuffix(index) {
  return String(index).padStart(2, "0");
}
