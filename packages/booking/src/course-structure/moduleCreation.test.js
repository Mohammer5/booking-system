import { describe, expect, it, vi } from "vitest";

import { createCreateModule } from "./createCreateModule.js";

const fixedNow = "2027-01-15T09:30:00.000Z";

describe("Module creation", () => {
  it.each([undefined, null, { id: "admin-1", state: "disabled" }])(
    "refuses non-Active Admin input %j before identity or persistence",
    async (adminUser) => {
      const capabilities = createCapabilities();
      const createModule = createCreateModule(capabilities);

      await expect(
        createModule(validInput({ adminUser })),
      ).resolves.toEqual({ outcome: "admin-not-active" });
      expect(capabilities.createModuleId).not.toHaveBeenCalled();
      expect(capabilities.createModuleForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, { id: "course-1", state: "archived" }])(
    "refuses non-Active Course input %j before identity or persistence",
    async (course) => {
      const capabilities = createCapabilities();
      const createModule = createCreateModule(capabilities);

      await expect(createModule(validInput({ course }))).resolves.toEqual({
        outcome: "course-not-active",
      });
      expect(capabilities.createModuleId).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ title: "  " }, "invalid-title"],
    [{ description: 12 }, "invalid-description"],
    [{ instructions: false }, "invalid-instructions"],
  ])("refuses invalid descriptive input %j", async (override, outcome) => {
    const capabilities = createCapabilities();
    const createModule = createCreateModule(capabilities);

    await expect(createModule(validInput(override))).resolves.toEqual({ outcome });
    expect(capabilities.createModuleForActiveAdmin).not.toHaveBeenCalled();
  });

  it.each([
    [{ startsAtLocal: "bad" }, "invalid-starts-at"],
    [{ endsAtLocal: "bad" }, "invalid-ends-at"],
    [
      { startsAtLocal: "2027-03-28T02:30" },
      "nonexistent-starts-at",
    ],
    [
      {
        startsAtLocal: "2027-03-28T01:30",
        endsAtLocal: "2027-03-28T02:30",
      },
      "nonexistent-ends-at",
    ],
  ])("refuses invalid local schedule %j", async (override, outcome) => {
    const capabilities = createCapabilities();
    const createModule = createCreateModule(capabilities);

    await expect(createModule(validInput(override))).resolves.toEqual({ outcome });
    expect(capabilities.createModuleForActiveAdmin).not.toHaveBeenCalled();
  });

  it("returns definite overlap candidates without creating a Module", async () => {
    const capabilities = createCapabilities();
    const createModule = createCreateModule(capabilities);

    await expect(
      createModule(
        validInput({
          startsAtLocal: "2027-10-31T02:30",
          endsAtLocal: "2027-10-31T03:30",
        }),
      ),
    ).resolves.toEqual({
      outcome: "schedule-disambiguation-required",
      schedule: {
        startsAt: {
          outcome: "disambiguation-required",
          candidates: [
            {
              occurrence: "earlier",
              instant: "2027-10-31T00:30:00.000Z",
              offsetMinutes: 120,
            },
            {
              occurrence: "later",
              instant: "2027-10-31T01:30:00.000Z",
              offsetMinutes: 60,
            },
          ],
        },
        endsAt: {
          outcome: "resolved",
          occurrence: "only",
          instant: "2027-10-31T02:30:00.000Z",
          offsetMinutes: 60,
        },
      },
    });
    expect(capabilities.createModuleId).not.toHaveBeenCalled();
    expect(capabilities.createModuleForActiveAdmin).not.toHaveBeenCalled();
  });

  it.each([
    ["2027-01-15T10:29", "start-not-in-future"],
    ["2027-01-15T10:30", "start-not-in-future"],
  ])("refuses start %s at or before now", async (startsAtLocal, outcome) => {
    const capabilities = createCapabilities();
    const createModule = createCreateModule(capabilities);

    await expect(
      createModule(validInput({ startsAtLocal })),
    ).resolves.toEqual({ outcome });
    expect(capabilities.createModuleForActiveAdmin).not.toHaveBeenCalled();
  });

  it.each(["2027-01-15T11:00", "2027-01-15T10:59"])(
    "refuses end %s when it is not after start",
    async (endsAtLocal) => {
      const capabilities = createCapabilities();
      const createModule = createCreateModule(capabilities);

      await expect(
        createModule(
          validInput({ startsAtLocal: "2027-01-15T11:00", endsAtLocal }),
        ),
      ).resolves.toEqual({ outcome: "end-not-after-start" });
      expect(capabilities.createModuleForActiveAdmin).not.toHaveBeenCalled();
    },
  );

  it("creates one future Scheduled Module with definite instants and no Selection", async () => {
    const capabilities = createCapabilities();
    const createModule = createCreateModule(capabilities);

    await expect(
      createModule(
        validInput({
          title: "  Modul Eins  ",
          description: "  Beschreibung  ",
          instructions: "  Hinweise  ",
          startsAtLocal: "2027-10-31T02:30",
          startsAtOccurrence: "later",
          endsAtLocal: "2027-10-31T03:30",
        }),
      ),
    ).resolves.toEqual({
      outcome: "created",
      module: {
        id: "module-1",
        courseId: "course-1",
        title: "  Modul Eins  ",
        description: "  Beschreibung  ",
        instructions: "  Hinweise  ",
        startsAt: "2027-10-31T01:30:00.000Z",
        endsAt: "2027-10-31T02:30:00.000Z",
        state: "scheduled",
      },
    });
    expect(capabilities.createModuleForActiveAdmin).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      courseTimezone: "Europe/Berlin",
      module: expect.not.objectContaining({ selection: expect.anything() }),
    });
  });

  it.each([undefined, null])(
    "stores omitted optional Module text %j as null",
    async (value) => {
      const createModule = createCreateModule(createCapabilities());

      await expect(
        createModule(validInput({ description: value, instructions: value })),
      ).resolves.toMatchObject({
        module: { description: null, instructions: null },
      });
    },
  );

  it.each([
    "admin-not-active",
    "course-not-active",
    "course-timezone-changed",
  ])(
    "returns persistence refusal %s without a created Module",
    async (outcome) => {
      const capabilities = createCapabilities();
      capabilities.createModuleForActiveAdmin.mockResolvedValue(outcome);
      const createModule = createCreateModule(capabilities);

      await expect(createModule(validInput())).resolves.toEqual({ outcome });
    },
  );
});

/**
 * Create one complete valid Module input with selected overrides.
 *
 * @param {object} [override] Input overrides.
 * @returns {object} Valid Module creation input.
 */
function validInput(override = {}) {
  return {
    adminUser: { id: "admin-1", state: "active" },
    course: {
      id: "course-1",
      state: "active",
      timezone: "Europe/Berlin",
    },
    title: "Module",
    description: null,
    instructions: null,
    startsAtLocal: "2027-01-15T11:00",
    endsAtLocal: "2027-01-15T12:00",
    ...override,
  };
}

/**
 * Create deterministic clock, identity, and persistence capabilities.
 *
 * @returns {object} Module creation capabilities.
 */
function createCapabilities() {
  return {
    createModuleId: vi.fn(() => "module-1"),
    createModuleForActiveAdmin: vi.fn(async () => "created"),
    now: vi.fn(() => fixedNow),
  };
}
