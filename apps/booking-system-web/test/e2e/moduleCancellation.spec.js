import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("cancels a selected Module and retains Participant history", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Absage mit Auswahl");
  const group = await createGroup(page, course.id);
  const module = await createModule(page, course.id);

  await assignParticipant(page, course.id, participant.id);
  await establishFixture(page, "selection-participant");
  const selection = await page.request.put(
    `/api/participant/courses/${course.id}/modules/${module.id}/selection`,
    { data: { groupId: group.id } },
  );
  expect(selection.status()).toBe(201);

  await ensureActiveAdmin(page);
  await page.goto(`/admin/courses/${course.id}`);
  let card = moduleCard(page, module.id);
  const cancelAction = card.getByRole("button", { name: "Modul absagen" });

  await cancelAction.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", { name: "Modul endgültig absagen?" });
  const safeCancel = dialog.getByRole("button", { name: "Abbrechen" });

  await expect(safeCancel).toBeFocused();
  await expect(dialog).toContainText("Bestehende Modulauswahlen bleiben gespeichert");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(cancelAction);

  await cancelAction.click();
  dialog = page.getByRole("dialog", { name: "Modul endgültig absagen?" });
  await dialog.getByRole("button", { name: "Modul endgültig absagen" }).click();
  await expect(
    card.getByRole("status").filter({
      hasText: "Das Modul wurde abgesagt. Bestehende Modulauswahlen bleiben",
    }),
  ).toBeFocused();
  await expect(card.locator(".MuiChip-label")).toHaveText("Abgesagt");
  await expect(card).toContainText("Das Modul ist endgültig abgesagt");
  await expect(card.getByRole("button", { name: "Modul absagen" })).toHaveCount(0);
  await expect(card.getByLabel("Modultitel bearbeiten")).toBeEnabled();
  await expect(card.getByText(/Der Modulzeitraum ist gesperrt/)).toBeVisible();
  await expectAccessibleLayout(page);

  await page.reload();
  card = moduleCard(page, module.id);
  await expect(card.locator(".MuiChip-label")).toHaveText("Abgesagt");
  await expect(card).toContainText("Das Modul ist endgültig abgesagt");

  await establishFixture(page, "selection-participant");
  await page.goto(`/courses/${course.id}`);
  const participantModule = participantModuleItem(page, module.title);

  await expect(participantModule).toContainText("Abgesagt");
  await expect(participantModule).toContainText("Historische Teilnahme");
  await expect(participantModule).toContainText(group.name);
  await expect(participantModule).toContainText("Das Modul wurde abgesagt");
  await expect(
    participantModule.getByRole("button", { name: "Modulauswahl speichern" }),
  ).toHaveCount(0);
  await expect(
    participantModule.getByRole("button", { name: "Modulauswahl entfernen" }),
  ).toHaveCount(0);
  const replace = await page.request.put(
    `/api/participant/courses/${course.id}/modules/${module.id}/selection`,
    { data: { groupId: group.id } },
  );
  const remove = await page.request.delete(
    `/api/participant/courses/${course.id}/modules/${module.id}/selection`,
  );
  expect([replace.status(), remove.status()]).toEqual([409, 409]);
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("handles in-progress, exact-end, terminal, and technical states", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const persistedCourse = await createCourse(page, "Zeitstände der Absage");
  const course = boundedCourse(persistedCourse);
  let modules = course.modules;

  await page.route(`**/api/admin/courses/${course.id}**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === "GET" && path === `/api/admin/courses/${course.id}`) {
      await fulfillJson(route, 200, { ...course, modules });
      return;
    }

    if (request.method() === "POST" && path.endsWith("/in-progress/cancellation")) {
      expect(request.postData()).toBeNull();
      modules = modules.map((module) => module.id === "in-progress"
        ? { ...module, state: "cancelled", isCancellationAvailable: false }
        : module);
      await fulfillJson(route, 200, {
        outcome: "cancelled",
        module: modules.find((module) => module.id === "in-progress"),
      });
      return;
    }

    if (request.method() === "POST" && path.endsWith("/exact-end/cancellation")) {
      modules = modules.map((module) => module.id === "exact-end"
        ? { ...module, isCancellationAvailable: false }
        : module);
      await fulfillJson(route, 409, {
        outcome: "module-cancellation-deadline-reached",
      });
      return;
    }

    if (request.method() === "POST" && path.endsWith("/technical/cancellation")) {
      await fulfillJson(route, 500, { outcome: "technical-error" });
      return;
    }

    await route.continue();
  });
  await page.goto(`/admin/courses/${course.id}`);

  let inProgress = moduleCard(page, "in-progress");
  await inProgress.getByRole("button", { name: "Modul absagen" }).click();
  await page
    .getByRole("dialog", { name: "Modul endgültig absagen?" })
    .getByRole("button", { name: "Modul endgültig absagen" })
    .click();
  await expect(
    inProgress.getByRole("status").filter({ hasText: "Das Modul wurde abgesagt" }),
  ).toBeFocused();
  await expect(inProgress.locator(".MuiChip-label")).toHaveText("Abgesagt");

  const exactEnd = moduleCard(page, "exact-end");
  await exactEnd.getByRole("button", { name: "Modul absagen" }).click();
  let dialog = page.getByRole("dialog", { name: "Modul endgültig absagen?" });
  await dialog.getByRole("button", { name: "Modul endgültig absagen" }).click();
  await expect(
    dialog.getByRole("alert").filter({ hasText: "exaktes Ende erreicht" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(exactEnd).toContainText("Die Absagefrist ist abgelaufen");

  for (const moduleId of ["ended", "cancelled"]) {
    const card = moduleCard(page, moduleId);
    await expect(card.getByRole("button", { name: "Modul absagen" })).toHaveCount(0);
  }
  await expect(moduleCard(page, "cancelled")).toContainText(
    "Das Modul ist endgültig abgesagt",
  );

  const technical = moduleCard(page, "technical");
  const technicalAction = technical.getByRole("button", { name: "Modul absagen" });
  await technicalAction.focus();
  await page.keyboard.press("Enter");
  dialog = page.getByRole("dialog", { name: "Modul endgültig absagen?" });
  await dialog.getByRole("button", { name: "Modul endgültig absagen" }).click();
  await expect(
    dialog.getByRole("alert").filter({ hasText: "Kursdaten konnten nicht geladen" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expectVisibleKeyboardFocus(technicalAction);
  await expectAccessibleLayout(page);

  await page.reload();
  inProgress = moduleCard(page, "in-progress");
  await expect(inProgress.locator(".MuiChip-label")).toHaveText("Abgesagt");
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {import("@playwright/test").Locator} Stable Admin Module article. */
function moduleCard(page, moduleId) {
  return page.locator(`article[aria-labelledby="module-${moduleId}-title"]`);
}

/** @returns {import("@playwright/test").Locator} Participant Module item. */
function participantModuleItem(page, title) {
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
        name: "Cancellation Participant",
        email: "cancellation-participant@example.com",
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
    data: { name: "Cancellation Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Create one uniquely named Active Course. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name: `${name} ${crypto.randomUUID()}` },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one Active Group. */
async function createGroup(page, courseId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/groups`,
    { data: { name: "Absagegruppe", details: "Historische Gruppe" } },
  );

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one future Scheduled Module. */
async function createModule(page, courseId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/modules`,
    {
      data: {
        title: "Modul mit Absage",
        startsAtLocal: "2027-01-15T10:00",
        endsAtLocal: "2027-01-15T11:00",
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

/** @returns {object} Bounded server Course with all cancellation states. */
function boundedCourse(course) {
  const base = {
    courseId: course.id,
    description: null,
    instructions: null,
    isCancellationAvailable: false,
    isScheduleEditable: false,
    startsAt: "2026-08-28T09:00:00.000Z",
    endsAt: "2026-08-28T11:00:00.000Z",
    state: "scheduled",
  };

  return {
    ...course,
    description: null,
    state: "active",
    isTimezoneEditable: false,
    groups: [],
    modules: [
      boundedModule(base, "in-progress", "Laufende Absage", true),
      boundedModule(base, "exact-end", "Exaktes Ende", true),
      boundedModule(base, "ended", "Beendetes Modul"),
      { ...boundedModule(base, "cancelled", "Bereits abgesagt"), state: "cancelled" },
      boundedModule(base, "technical", "Technischer Fehler", true),
    ],
  };
}

/** @returns {object} One bounded Module representation. */
function boundedModule(base, id, title, isCancellationAvailable = false) {
  return { ...base, id, title, isCancellationAvailable };
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

/** @returns {Promise<void>} Assert visible focus styling. */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
}
