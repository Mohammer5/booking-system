import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("chooses overlapping Modules, changes Group, refreshes, and removes participation", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  const course = await createSelectionCourse(page, participant.id);

  await establishFixture(page, "selection-participant");
  await page.goto(`/courses/${course.id}`);
  const firstModule = moduleItem(page, "Auswahlmodul Eins");
  const secondModule = moduleItem(page, "Auswahlmodul Zwei");

  await firstModule.getByRole("radio", { name: "Gruppe Alpha" }).check();
  await firstModule.getByRole("button", { name: "Modulauswahl speichern" }).click();
  const created = firstModule.getByRole("status").filter({
    hasText: "Die Modulauswahl wurde erfolgreich gespeichert.",
  });
  await expect(created).toBeFocused();
  await expect(firstModule).toContainText("Ausgewählte Gruppe: Gruppe Alpha");

  await firstModule.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(
    firstModule.getByRole("status").filter({
      hasText: "Diese Gruppe war bereits ausgewählt und blieb unverändert.",
    }),
  ).toBeFocused();

  await secondModule.getByRole("radio", { name: "Gruppe Beta" }).check();
  await secondModule.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(secondModule).toContainText("Ausgewählte Gruppe: Gruppe Beta");
  await expect(firstModule).toContainText("Aktuelle Teilnahme");
  await expect(secondModule).toContainText("Aktuelle Teilnahme");

  await firstModule.getByRole("radio", { name: "Gruppe Beta" }).check();
  await firstModule.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(
    firstModule.getByRole("status").filter({
      hasText: "Die ausgewählte Gruppe wurde erfolgreich geändert.",
    }),
  ).toBeFocused();
  await expect(firstModule).toContainText("Ausgewählte Gruppe: Gruppe Beta");

  await page.reload();
  await expect(moduleItem(page, "Auswahlmodul Eins")).toContainText(
    "Ausgewählte Gruppe: Gruppe Beta",
  );
  const removeButton = moduleItem(page, "Auswahlmodul Eins").getByRole(
    "button",
    { name: "Modulauswahl entfernen" },
  );

  await removeButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Modulauswahl entfernen?" });

  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((element) =>
      element.contains(globalThis.document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(removeButton);

  await removeButton.click();
  await dialog
    .getByRole("button", { name: "Auswahl endgültig entfernen" })
    .click();
  const removed = moduleItem(page, "Auswahlmodul Eins").getByRole("status").filter({
    hasText: "Die Modulauswahl wurde erfolgreich entfernt.",
  });

  await expect(removed).toBeFocused();
  await expect(moduleItem(page, "Auswahlmodul Eins")).toContainText("Keine Auswahl");
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("keeps an explicit choice and announces a stale refusal without private leakage", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  const course = await createSelectionCourse(page, participant.id);

  await establishFixture(page, "selection-participant");
  await page.goto(`/courses/${course.id}`);
  const firstModule = moduleItem(page, "Auswahlmodul Eins");
  const firstRadio = firstModule.getByRole("radio", { name: "Gruppe Alpha" });

  await expect(firstRadio).not.toBeChecked();
  await firstModule.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(
    firstModule.getByText("Bitte wählen Sie ausdrücklich eine Gruppe aus."),
  ).toBeVisible();
  await page.route(
    `**/api/participant/courses/${course.id}/modules/${course.moduleIds[0]}/selection`,
    (route) =>
      fulfillJson(route, 409, { outcome: "selection-deadline-reached" }),
  );
  await firstRadio.check();
  await firstModule.getByRole("button", { name: "Modulauswahl speichern" }).click();
  const staleAlert = firstModule.getByRole("alert").filter({
    hasText:
      "Die Modulauswahl ist wegen eines geänderten Kurs-, Zuordnungs- oder Zeitstatus nicht mehr verfügbar.",
  });

  await expect(staleAlert).toBeFocused();
  await expect(firstModule).toContainText("Keine Auswahl");
  await expect(
    page.getByText("selection-participant@fixture.invalid"),
  ).toHaveCount(0);
  await expectAccessibleLayout(page);
});

/** @returns {object} One Module list item selected by its heading. */
function moduleItem(page, title) {
  return page
    .getByRole("list", { name: "Module dieses Kurses" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });
}

/** @returns {Promise<object>} Ensure the fixed Participant exists and return it. */
async function ensureParticipant(page) {
  await establishFixture(page, "selection-participant");
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Module Selection Participant",
        email: "module-selection-participant@example.com",
      },
    });
    expect(response.status()).toBe(201);
  }

  return response.json();
}

/** @returns {Promise<object>} Create Course structure and active membership. */
async function createSelectionCourse(page, participantId) {
  await ensureActiveAdmin(page);
  const courseResponse = await page.request.post("/api/admin/courses", {
    data: { name: `Selection Course ${crypto.randomUUID()}` },
  });
  const course = await courseResponse.json();
  const groupIds = [];

  for (const name of ["Gruppe Alpha", "Gruppe Beta"]) {
    const response = await page.request.post(
      `/api/admin/courses/${course.id}/groups`,
      { data: { name } },
    );
    groupIds.push((await response.json()).id);
  }

  const moduleIds = [];
  for (const title of ["Auswahlmodul Eins", "Auswahlmodul Zwei"]) {
    const response = await page.request.post(
      `/api/admin/courses/${course.id}/modules`,
      {
        data: {
          title,
          startsAtLocal: "2026-09-01T10:00",
          endsAtLocal: "2026-09-01T11:00",
        },
      },
    );
    moduleIds.push((await response.json()).id);
  }

  const assignmentResponse = await page.request.post(
    `/api/admin/courses/${course.id}/assignments`,
    { data: { participantId } },
  );
  expect([200, 201]).toContain(assignmentResponse.status());

  return { ...course, groupIds, moduleIds };
}

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Selection Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<void>} Establish one fixed normal application session. */
async function establishFixture(page, fixture) {
  const response = await page.request.post(
    `/api/_fixtures/session/${fixture}`,
  );

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

/** @returns {Promise<void>} Assert accessibility and responsive overflow. */
async function expectAccessibleLayout(page) {
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((body) => body.clientWidth),
  );
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
}

/** @returns {Promise<void>} Assert visible keyboard focus styling. */
async function expectVisibleKeyboardFocus(locator) {
  await expect(locator).toBeFocused();
  const outlineStyle = await locator.evaluate(
    (element) => globalThis.getComputedStyle(element).outlineStyle,
  );

  expect(outlineStyle).not.toBe("none");
}
