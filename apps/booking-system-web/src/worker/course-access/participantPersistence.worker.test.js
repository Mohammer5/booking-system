import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createParticipantPersistence } from "./createParticipantPersistence.js";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.prepare("delete from participants").run();
});

describe("Participant schema constraints", () => {
  it("rejects blank names, untrimmed email, invalid state, and uppercase comparison keys", async () => {
    const invalidCandidates = [
      { ...candidate("blank"), name: "  " },
      { ...candidate("untrimmed"), email: " user@example.com " },
      { ...candidate("state"), state: "pending" },
      { ...candidate("normalized"), normalizedEmail: "User@example.com" },
    ];

    for (const invalidCandidate of invalidCandidates) {
      await expect(insertDirect(invalidCandidate)).rejects.toThrow();
    }

    await expect(countParticipants()).resolves.toBe(0);
  });
});

describe("atomic Participant registration", () => {
  it("creates one stable Active Participant and resolves its fresh state", async () => {
    const persistence = createParticipantPersistence(env.DB);

    await expect(persistence.registerParticipant(candidate("alice"))).resolves.toBe(
      "created",
    );
    await expect(
      persistence.findParticipantByExternalPrincipalId("principal-alice"),
    ).resolves.toEqual({
      id: "participant-alice",
      externalPrincipalId: "principal-alice",
      name: "Participant alice",
      email: "alice@example.com",
      state: "active",
    });

    await env.DB.prepare(
      "update participants set state = 'disabled' where id = ?",
    )
      .bind("participant-alice")
      .run();
    await expect(
      persistence.findParticipantByExternalPrincipalId("principal-alice"),
    ).resolves.toMatchObject({ state: "disabled" });
  });

  it("refuses repeated and concurrent registration for one principal without profile changes", async () => {
    const persistence = createParticipantPersistence(env.DB);

    await expect(persistence.registerParticipant(candidate("original"))).resolves.toBe(
      "created",
    );
    const staleCandidate = {
      ...candidate("stale"),
      externalPrincipalId: "principal-original",
    };

    await expect(persistence.registerParticipant(staleCandidate)).resolves.toBe(
      "participant-already-exists",
    );
    const outcomes = await Promise.all([
      persistence.registerParticipant(candidate("race", "race-a@example.com")),
      persistence.registerParticipant({
        ...candidate("race-b", "race-b@example.com"),
        externalPrincipalId: "principal-race",
      }),
    ]);
    const storedOriginal = await persistence.findParticipantByExternalPrincipalId(
      "principal-original",
    );

    expect(outcomes.sort()).toEqual(["created", "participant-already-exists"]);
    expect(storedOriginal).toMatchObject({
      name: "Participant original",
      email: "original@example.com",
    });
    await expect(countParticipants()).resolves.toBe(2);
  });

  it("enforces complete-address case-insensitive email uniqueness concurrently", async () => {
    const persistence = createParticipantPersistence(env.DB);
    const outcomes = await Promise.all([
      persistence.registerParticipant(candidate("alice", "Alice@Example.com")),
      persistence.registerParticipant(candidate("bob", "alice@example.com")),
    ]);

    expect(outcomes.sort()).toEqual(["created", "email-already-exists"]);
    await expect(countParticipants()).resolves.toBe(1);
  });

  it("keeps provider-specific aliases and dotted local parts distinct", async () => {
    const persistence = createParticipantPersistence(env.DB);
    const candidates = [
      candidate("plain", "alice@example.com"),
      candidate("tagged", "alice+course@example.com"),
      candidate("dotted", "first.last@gmail.com"),
      candidate("undotted", "firstlast@gmail.com"),
    ];

    for (const participant of candidates) {
      await expect(persistence.registerParticipant(participant)).resolves.toBe(
        "created",
      );
    }

    await expect(countParticipants()).resolves.toBe(4);
  });
});

/**
 * Create deterministic valid persistence input.
 *
 * @param {string} suffix Unique suffix.
 * @param {string} [email] Optional retained email.
 * @returns {object} Valid Participant candidate.
 */
function candidate(suffix, email = `${suffix}@example.com`) {
  return {
    id: `participant-${suffix}`,
    externalPrincipalId: `principal-${suffix}`,
    name: `Participant ${suffix}`,
    email,
    normalizedEmail: email.toLowerCase(),
    state: "active",
  };
}

/**
 * Insert a candidate without domain validation to exercise D1 constraints.
 *
 * @param {object} participant Persistence candidate.
 * @returns {Promise<object>} D1 mutation result.
 */
function insertDirect(participant) {
  return env.DB.prepare(
    `insert into participants
       (id, external_principal_id, name, email, normalized_email, state)
     values (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      participant.id,
      participant.externalPrincipalId,
      participant.name,
      participant.email,
      participant.normalizedEmail,
      participant.state,
    )
    .run();
}

/**
 * Count current Participants.
 *
 * @returns {Promise<number>} Current Participant row count.
 */
async function countParticipants() {
  const row = await env.DB.prepare(
    "select count(*) as count from participants",
  ).first();

  return row.count;
}
