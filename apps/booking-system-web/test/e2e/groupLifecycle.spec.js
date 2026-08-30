import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("edits, archives, and reactivates one retained Group identity", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Gruppen-Lebenszyklus");
  const group = await createGroup(page, course.id, {
    name: "Gruppe Bestand",
    details: "Raum Bestand",
  });

  await page.goto(`/admin/courses/${course.id}/groups/${group.id}`);
  let card = groupCard(page, group.id);
  const nameInput = card.getByLabel("Gruppenname bearbeiten");
  const save = card.getByRole("button", { name: "Gruppenänderungen speichern" });

  await nameInput.fill(" ");
  await save.click();
  await expect(nameInput).toBeFocused();
  await expectFieldErrorAssociation(
    nameInput,
    page,
    "Bitte geben Sie einen Gruppennamen ein.",
  );

  await nameInput.fill("Gruppe Archiv");
  await card.getByLabel("Gruppendetails bearbeiten").fill("Historischer Raum");
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(
    card.getByRole("status").filter({
      hasText: "Die Gruppenänderungen wurden gespeichert.",
    }),
  ).toBeFocused();
  await expect(card).toContainText("Historischer Raum");

  const archive = card.getByRole("button", { name: "Gruppe archivieren" });

  await archive.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", { name: "Gruppe archivieren?" });

  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText("Bestehende Auswahlen werden weder entfernt noch geändert.");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(archive);

  await archive.click();
  dialog = page.getByRole("dialog", { name: "Gruppe archivieren?" });
  await dialog
    .getByRole("button", { name: "Gruppe endgültig archivieren" })
    .click();
  await expect(
    card.getByRole("status").filter({
      hasText: "Die Gruppe wurde archiviert.",
    }),
  ).toBeFocused();
  await expect(card.getByText("Archiviert", { exact: true })).toBeVisible();
  await expect(card).toContainText("Historischer Raum");

  await page.reload();
  card = groupCard(page, group.id);
  await expect(card.getByText("Archiviert", { exact: true })).toBeVisible();
  await expect(card).toContainText("Historischer Raum");

  await createGroup(page, course.id, { name: " GRUPPE ARCHIV " });
  await page.reload();
  card = groupCard(page, group.id);
  await card.getByRole("button", { name: "Gruppe reaktivieren" }).click();
  dialog = page.getByRole("dialog", { name: "Gruppe reaktivieren?" });
  await dialog.getByRole("button", { name: "Gruppe reaktivieren" }).click();
  await expect(card.getByLabel("Gruppenname bearbeiten")).toBeFocused();
  await expectFieldErrorAssociation(
    card.getByLabel("Gruppenname bearbeiten"),
    page,
    "Eine aktive Gruppe mit diesem Namen existiert bereits in diesem Kurs.",
  );

  await card.getByLabel("Gruppenname bearbeiten").fill("Gruppe Reaktiviert");
  await card
    .getByRole("button", { name: "Gruppenänderungen speichern" })
    .click();
  await expect(
    card.getByRole("status").filter({
      hasText: "Die Gruppenänderungen wurden gespeichert.",
    }),
  ).toBeFocused();
  await card.getByRole("button", { name: "Gruppe reaktivieren" }).click();
  await page
    .getByRole("dialog", { name: "Gruppe reaktivieren?" })
    .getByRole("button", { name: "Gruppe reaktivieren" })
    .click();
  await expect(
    card.getByRole("status").filter({
      hasText: "Die Gruppe wurde reaktiviert.",
    }),
  ).toBeFocused();
  await expect(card.getByText("Aktiv", { exact: true })).toBeVisible();
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("explains an exact archival blocker and retains historical Group details", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Gruppen-Historie");
  const group = await createGroup(page, course.id, {
    name: "Gruppe mit Auswahl",
    details: "Unveränderte Zugangsdaten",
  });
  const module = await createFutureModule(page, course.id);

  await assignParticipant(page, course.id, participant.id);
  await establishFixture(page, "selection-participant");
  const selection = await page.request.put(
    `/api/participant/courses/${course.id}/modules/${module.id}/selection`,
    { data: { groupId: group.id } },
  );
  expect(selection.status()).toBe(201);

  await ensureActiveAdmin(page);
  await page.goto(`/admin/courses/${course.id}/groups/${group.id}`);
  const card = groupCard(page, group.id);
  await card.getByRole("button", { name: "Gruppe archivieren" }).click();
  let dialog = page.getByRole("dialog", { name: "Gruppe archivieren?" });
  await dialog
    .getByRole("button", { name: "Gruppe endgültig archivieren" })
    .click();
  const blocked = dialog.getByRole("alert").filter({
    hasText: "mindestens ein noch nicht begonnenes geplantes Modul",
  });

  await expect(blocked).toBeFocused();
  await expect(card.getByText("Aktiv", { exact: true })).toBeVisible();
  await expect(card).toContainText("Unveränderte Zugangsdaten");
  await dialog.getByRole("button", { name: "Abbrechen" }).click();

  await page.route(
    `**/api/admin/courses/${course.id}/groups/${group.id}/archival`,
    (route) => fulfillJson(route, 500, { outcome: "technical-error" }),
  );
  await card.getByRole("button", { name: "Gruppe archivieren" }).click();
  dialog = page.getByRole("dialog", { name: "Gruppe archivieren?" });
  await dialog
    .getByRole("button", { name: "Gruppe endgültig archivieren" })
    .click();
  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Die Kursdaten konnten nicht geladen werden.",
    }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();

  await page.route(
    `**/api/admin/courses/${course.id}/groups/${group.id}`,
    (route) => route.request().method() === "PUT"
      ? fulfillJson(route, 409, { outcome: "course-not-active" })
      : route.continue(),
  );
  await card.getByLabel("Gruppendetails bearbeiten").fill("Nicht gespeichert");
  await card
    .getByRole("button", { name: "Gruppenänderungen speichern" })
    .click();
  await expect(
    card.getByRole("alert").filter({
      hasText: "Die Gruppe hat sich geändert oder kann nicht mehr bearbeitet werden.",
    }),
  ).toBeFocused();

  await establishFixture(page, "selection-participant");
  await page.route(`**/api/participant/courses/${course.id}`, (route) =>
    fulfillJson(route, 200, historicalCourse(course, group, module)),
  );
  await page.goto(`/courses/${course.id}`);
  await expect(
    page.getByRole("status").filter({
      hasText: "Für diesen Kurs sind keine aktiven Gruppen vorhanden.",
    }),
  ).toBeVisible();
  const historicalModule = moduleItem(page, module.title);

  await expect(historicalModule).toContainText("Gruppe mit Auswahl");
  await expect(historicalModule).toContainText("Unveränderte Zugangsdaten");
  await expect(historicalModule).toContainText("Gruppenstatus: Archiviert");
  await expect(historicalModule).toContainText("Historische Teilnahme");
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {import("@playwright/test").Locator} Stable Group article by identity. */
function groupCard(page, groupId) {
  return page.locator(`article[aria-labelledby="group-${groupId}-title"]`);
}

/** @returns {import("@playwright/test").Locator} Module item by heading. */
function moduleItem(page, title) {
  return page
    .getByRole("list", { name: "Module dieses Kurses" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });
}

/** @returns {Promise<object>} Ensure the fixed Participant exists. */
async function ensureParticipant(page) {
  await establishFixture(page, "selection-participant");
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Group Lifecycle Participant",
        email: "group-lifecycle-participant@example.com",
      },
    });
    expect(response.status()).toBe(201);
  }

  return response.json();
}

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Group Lifecycle Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Create one Active Course. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name: `${name} ${crypto.randomUUID()}` },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one Course-owned Group. */
async function createGroup(page, courseId, fields) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/groups`,
    { data: fields },
  );

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one future Scheduled Module. */
async function createFutureModule(page, courseId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/modules`,
    {
      data: {
        title: "Noch nicht begonnenes Modul",
        startsAtLocal: "2027-09-01T10:00",
        endsAtLocal: "2027-09-01T11:00",
      },
    },
  );

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<void>} Add one current Participant Course assignment. */
async function assignParticipant(page, courseId, participantId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/assignments`,
    { data: { participantId } },
  );

  expect([200, 201]).toContain(response.status());
}

/** @returns {object} Bounded historical Participant Course representation. */
function historicalCourse(course, group, module) {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    timezone: course.timezone,
    state: "active",
    groups: [],
    modules: [{
      ...module,
      state: "scheduled",
      selectionAvailability: "closed",
      selection: {
        id: "historical-selection",
        meaning: "historical",
        phase: "ended",
        group: { ...group, state: "archived" },
      },
    }],
  };
}

/** @returns {Promise<void>} Establish one fixed application session. */
async function establishFixture(page, fixture) {
  const response = await page.request.post(`/api/_fixtures/session/${fixture}`);

  expect(response.status()).toBe(204);
}

/** @returns {Promise<void>} Fulfill one intercepted JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert axe accessibility and responsive overflow. */
async function expectAccessibleLayout(page) {
  const results = await new AxeBuilder({ page }).analyze();
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth >
      globalThis.document.documentElement.clientWidth,
  );

  expect(results.violations).toEqual([]);
  expect(hasHorizontalOverflow).toBe(false);
}

/** @returns {Promise<void>} Assert visible focus styling. */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
}

/** @returns {Promise<void>} Assert field association with localized error. */
async function expectFieldErrorAssociation(field, page, message) {
  const descriptionIds = await field.getAttribute("aria-describedby");

  expect(descriptionIds).toBeTruthy();
  await expect(
    page.locator(descriptionIds.split(" ").map((id) => `#${id}`).join(",")),
  ).toContainText(message);
}
