import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("edits Module details and reschedules an overlap explicitly", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Modulbearbeitung");
  const module = await createModule(page, course.id);

  await page.goto(`/admin/courses/${course.id}/modules/${module.id}`);
  let card = moduleCard(page, module.id);
  const title = card.getByLabel("Modultitel bearbeiten");
  const saveDetails = card.getByRole("button", {
    name: "Modulinhalt speichern",
  });

  await title.fill("  ");
  await saveDetails.focus();
  await page.keyboard.press("Enter");
  await expect(title).toBeFocused();
  await expectFieldErrorAssociation(
    title,
    page,
    "Bitte geben Sie einen Modultitel ein.",
  );

  await title.fill("Bearbeitetes Modul");
  await card.getByLabel("Modulbeschreibung bearbeiten").fill("Neue Beschreibung");
  await card.getByLabel("Modulhinweise bearbeiten").fill("Neue Hinweise");
  await saveDetails.focus();
  await page.keyboard.press("Enter");
  await expect(
    card.getByRole("status").filter({
      hasText: "Der Modulinhalt wurde gespeichert.",
    }),
  ).toBeFocused();
  await expect(card.getByRole("heading", { name: "Bearbeitetes Modul" })).toBeVisible();

  const startsAt = card.getByLabel("Neuer Beginn (lokale Kurszeit)");
  const endsAt = card.getByLabel("Neues Ende (lokale Kurszeit)");
  const saveSchedule = card.getByRole("button", {
    name: "Modulzeitraum speichern",
  });

  await startsAt.fill("2026-01-15T10:00");
  await endsAt.fill("2026-01-15T11:00");
  await saveSchedule.click();
  await expect(startsAt).toBeFocused();
  await expectFieldErrorAssociation(
    startsAt,
    page,
    "Der Beginn muss in der Zukunft liegen.",
  );

  await startsAt.fill("2027-03-28T02:30");
  await endsAt.fill("2027-03-28T04:00");
  await saveSchedule.click();
  await expectFieldErrorAssociation(
    startsAt,
    page,
    "Dieser Beginn existiert wegen der Zeitumstellung in der Kurszeitzone nicht.",
  );

  await startsAt.fill("2027-10-31T02:30");
  await endsAt.fill("2027-10-31T03:30");
  await saveSchedule.click();
  const occurrence = card.getByRole("radiogroup", {
    name: "Beginn: beabsichtigtes Vorkommen",
  });

  await expect(occurrence.getByRole("radio", { name: /Erstes Vorkommen/ })).toBeFocused();
  await occurrence.getByRole("radio", { name: /Zweites Vorkommen/ }).check();
  await saveSchedule.focus();
  await page.keyboard.press("Enter");
  await expect(
    card.getByRole("status").filter({
      hasText: "Der Modulzeitraum wurde gespeichert.",
    }),
  ).toBeFocused();
  await expect(card).toContainText("2027-10-31T01:30:00.000Z");
  await expectAccessibleLayout(page);

  await page.reload();
  card = moduleCard(page, module.id);
  await expect(card.getByLabel("Modultitel bearbeiten")).toHaveValue(
    "Bearbeitetes Modul",
  );
  await expect(card.getByLabel("Neuer Beginn (lokale Kurszeit)")).toHaveValue(
    "2027-10-31T02:30",
  );
  await expect(card).toContainText("Neue Beschreibung");
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("keeps details editable while locking elapsed and Cancelled schedules", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = boundedCourse();
  let modules = course.modules;

  await page.route(`**/api/admin/courses/${course.id}**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === "GET" && path.includes("/modules/")) {
      const moduleId = path.split("/").at(-1);
      await fulfillJson(route, 200, {
        course,
        module: modules.find((item) => item.id === moduleId),
      });
      return;
    }

    const moduleId = path.split("/").at(-1);
    if (request.method() === "PUT" && moduleId === "cancelled-module") {
      const body = request.postDataJSON();
      expect(Object.keys(body).sort()).toEqual([
        "description",
        "instructions",
        "title",
      ]);
      const current = modules.find((item) => item.id === moduleId);
      const updated = { ...current, ...body };
      modules = modules.map((item) => item.id === moduleId ? updated : item);
      await fulfillJson(route, 200, updated);
      return;
    }

    if (request.method() === "PUT" && path.endsWith("/upcoming-module/schedule")) {
      await fulfillJson(route, 409, { outcome: "module-schedule-changed" });
      return;
    }

    await route.continue();
  });
  for (const moduleId of [
    "exact-module",
    "in-progress-module",
    "ended-module",
    "cancelled-module",
  ]) {
    await page.goto(`/admin/courses/${course.id}/modules/${moduleId}`);
    const card = moduleCard(page, moduleId);

    await expect(card.getByText(/Der Modulzeitraum ist gesperrt/)).toBeVisible();
    await expect(card.getByLabel("Modultitel bearbeiten")).toBeEnabled();
    await expect(card.getByLabel("Neuer Beginn (lokale Kurszeit)")).toHaveCount(0);
  }

  let cancelled = moduleCard(page, "cancelled-module");
  await expect(cancelled.locator(".MuiChip-label")).toHaveText("Abgesagt");
  await cancelled.getByLabel("Modultitel bearbeiten").fill("Abgesagt und bearbeitet");
  await cancelled.getByLabel("Modulbeschreibung bearbeiten").fill("Historischer Inhalt");
  await cancelled.getByRole("button", { name: "Modulinhalt speichern" }).click();
  await expect(
    cancelled.getByRole("status").filter({
      hasText: "Der Modulinhalt wurde gespeichert.",
    }),
  ).toBeFocused();
  await expect(cancelled.getByRole("heading", { name: "Abgesagt und bearbeitet" })).toBeVisible();

  await page.goto(`/admin/courses/${course.id}/modules/upcoming-module`);
  const upcoming = moduleCard(page, "upcoming-module");
  await upcoming.getByLabel("Neuer Beginn (lokale Kurszeit)").fill("2027-12-01T10:00");
  await upcoming.getByLabel("Neues Ende (lokale Kurszeit)").fill("2027-12-01T11:00");
  await upcoming.getByRole("button", { name: "Modulzeitraum speichern" }).click();
  await expect(
    upcoming.getByRole("alert").filter({
      hasText: "Der Modulzeitraum hat sich geändert",
    }),
  ).toBeFocused();
  await expect(upcoming).not.toContainText("private-module-version");
  await expectAccessibleLayout(page);

  await page.goto(`/admin/courses/${course.id}/modules/cancelled-module`);
  await page.reload();
  cancelled = moduleCard(page, "cancelled-module");
  await expect(cancelled.getByLabel("Modultitel bearbeiten")).toHaveValue(
    "Abgesagt und bearbeitet",
  );
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {import("@playwright/test").Locator} Stable Module article. */
function moduleCard(page, moduleId) {
  return page.locator(`article[aria-labelledby="module-${moduleId}-title"]`);
}

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Module Editing Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Create one uniquely named Course. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name: `${name} ${crypto.randomUUID()}` },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one future Scheduled Module. */
async function createModule(page, courseId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/modules`,
    {
      data: {
        title: "Modul vor Bearbeitung",
        description: "Alte Beschreibung",
        instructions: "Alte Hinweise",
        startsAtLocal: "2027-01-15T10:00",
        endsAtLocal: "2027-01-15T11:00",
      },
    },
  );

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {object} Bounded server representation for temporal UI states. */
function boundedCourse() {
  const base = {
    courseId: "bounded-module-course",
    description: null,
    instructions: null,
    isScheduleEditable: false,
    state: "scheduled",
  };
  const modules = [
    boundedModule(base, "upcoming-module", "Zukünftig", true),
    boundedModule(base, "exact-module", "Exakter Beginn"),
    boundedModule(base, "in-progress-module", "Laufend"),
    boundedModule(base, "ended-module", "Beendet"),
    { ...boundedModule(base, "cancelled-module", "Abgesagt"), state: "cancelled" },
  ];

  return {
    id: base.courseId,
    name: "Zeitstände eines Moduls",
    description: null,
    timezone: "Europe/Berlin",
    state: "active",
    isTimezoneEditable: false,
    groups: [],
    modules,
  };
}

/** @returns {object} One bounded Module response. */
function boundedModule(base, id, title, isScheduleEditable = false) {
  return {
    ...base,
    id,
    title,
    startsAt: "2027-01-15T09:00:00.000Z",
    endsAt: "2027-01-15T10:00:00.000Z",
    isScheduleEditable,
  };
}

/** @returns {Promise<void>} Establish one fixed normal application session. */
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

/** @returns {Promise<void>} Assert field association with localized error. */
async function expectFieldErrorAssociation(field, page, message) {
  const descriptionIds = await field.getAttribute("aria-describedby");

  expect(descriptionIds).toBeTruthy();
  await expect(
    page.locator(descriptionIds.split(" ").map((id) => `#${id}`).join(",")),
  ).toContainText(message);
}
