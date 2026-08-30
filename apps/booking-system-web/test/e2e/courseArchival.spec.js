import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("archives after cancellation and preserves private history until revocation", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Archivierung mit Historie");
  const group = await createGroup(page, course.id);
  const module = await createModule(page, course.id);

  await assignParticipant(page, course.id, participant.id);
  await establishFixture(page, "selection-participant");
  const selectionPath =
    `/api/participant/courses/${course.id}/modules/${module.id}/selection`;
  const selection = await page.request.put(selectionPath, {
    data: { groupId: group.id },
  });
  expect(selection.status()).toBe(201);

  await ensureActiveAdmin(page);
  await page.goto(`/admin/courses/${course.id}`);
  const archiveAction = page.getByRole("button", { name: "Kurs archivieren" });

  await archiveAction.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", {
    name: "Kurs endgültig archivieren?",
  });
  const safeCancel = dialog.getByRole("button", { name: "Abbrechen" });
  const confirm = dialog.getByRole("button", {
    name: "Kurs endgültig archivieren",
  });

  await expect(safeCancel).toBeFocused();
  await expect(dialog).toContainText(course.name);
  await expect(dialog).toContainText("sein exaktes Ende noch nicht erreicht");
  await expect(confirm).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(archiveAction);

  const cancellation = await page.request.post(
    `/api/admin/courses/${course.id}/modules/${module.id}/cancellation`,
  );
  expect(cancellation.status()).toBe(200);
  await page.goto(`/admin/courses/${course.id}/modules/${module.id}`);
  await expect(moduleCard(page, module.id)).toContainText("Abgesagt");
  await page.goto(`/admin/courses/${course.id}`);

  await page.getByRole("button", { name: "Kurs archivieren" }).click();
  dialog = page.getByRole("dialog", { name: "Kurs endgültig archivieren?" });
  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText("kann nicht reaktiviert werden");
  await dialog
    .getByRole("button", { name: "Kurs endgültig archivieren" })
    .click();

  await expect(
    page.getByRole("status").filter({
      hasText: "Der Kurs wurde endgültig archiviert",
    }),
  ).toBeFocused();
  await expect(page.getByText("Archiviert", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Dieser Kurs ist endgültig archiviert/)).toBeVisible();
  await expectArchivedAdminActions(page);

  const staleCourseEdit = await page.request.put(
    `/api/admin/courses/${course.id}`,
    {
      data: {
        name: "Verbotene Änderung",
        description: null,
        timezone: course.timezone,
      },
    },
  );
  expect(staleCourseEdit.status()).toBe(409);
  await expect(staleCourseEdit.json()).resolves.toEqual({
    outcome: "course-not-active",
  });
  await expectAccessibleLayout(page);

  await page.goto("/admin/courses");
  const adminListItem = courseListItem(page, course.name);
  await expect(adminListItem).toContainText("Archiviert");
  await page.reload();
  await expect(courseListItem(page, course.name)).toContainText("Archiviert");

  await establishFixture(page, "selection-participant");
  await page.goto("/");
  const participantListItem = courseListItem(page, course.name);
  await expect(participantListItem).toContainText("Archiviert");
  await participantListItem.getByRole("link", { name: course.name }).click();
  const participantModule = participantModuleItem(page, module.title);

  await expect(page.getByText(/Dieser Kurs ist archiviert/).first()).toBeVisible();
  await expect(participantModule).toContainText("Historische Teilnahme");
  await expect(participantModule).toContainText(group.name);
  await expect(participantModule).toContainText("Der Kurs ist archiviert");
  await expect(
    participantModule.getByRole("button", { name: "Modulauswahl speichern" }),
  ).toHaveCount(0);
  await expect(
    participantModule.getByRole("button", { name: "Modulauswahl entfernen" }),
  ).toHaveCount(0);
  const replace = await page.request.put(selectionPath, {
    data: { groupId: group.id },
  });
  const remove = await page.request.delete(selectionPath);
  expect([replace.status(), remove.status()]).toEqual([409, 409]);
  await page.reload();
  await expect(participantModuleItem(page, module.title)).toContainText(
    "Historische Teilnahme",
  );
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);

  await page.context().clearCookies();
  await ensureActiveAdmin(page);
  await page.goto(`/admin/courses/${course.id}/participants/${participant.id}`);
  await page.getByRole("button", { name: "Kurszuordnung widerrufen" }).click();
  await page
    .getByRole("dialog", { name: "Kurszuordnung widerrufen?" })
    .getByRole("button", { name: "Zuordnung endgültig widerrufen" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Die Kurszuordnung wurde widerrufen",
    }),
  ).toBeFocused();
  await expect(page.getByText(
    "Diese Kurszuordnung ist im archivierten Kurs schreibgeschützt.",
  )).toBeVisible();

  await page.context().clearCookies();
  await establishFixture(page, "selection-participant");
  await page.goto("/");
  await expect(courseListItem(page, course.name)).toHaveCount(0);
  await page.goto(`/courses/${course.id}`);
  await expect(
    page.getByRole("alert").filter({
      hasText: "Dieser Kursbereich ist für Ihr aktuelles Teilnahmeprofil nicht verfügbar.",
    }),
  ).toBeFocused();
  await expect(page.getByText(course.name)).toHaveCount(0);
});

test("presents exact-end eligibility plus stale and technical archive refusals", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const persistedCourse = await createCourse(page, "Archivierungsgrenzen");
  const course = boundedCourse(persistedCourse);
  let mutationMode = "stale";

  await page.route(`**/api/admin/courses/${course.id}**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === "GET" && path === `/api/admin/courses/${course.id}`) {
      await fulfillJson(route, 200, course);
      return;
    }

    if (request.method() === "POST" && path.endsWith("/archival")) {
      expect(request.postData()).toBeNull();
      await fulfillJson(
        route,
        mutationMode === "technical" ? 500 : 409,
        {
          outcome:
            mutationMode === "technical"
              ? "technical-error"
              : "course-archival-blocked",
        },
      );
      return;
    }

    await route.continue();
  });
  await page.goto(`/admin/courses/${course.id}`);

  let action = page.getByRole("button", { name: "Kurs archivieren" });

  await action.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", {
    name: "Kurs endgültig archivieren?",
  });
  await dialog
    .getByRole("button", { name: "Kurs endgültig archivieren" })
    .click();
  let alert = dialog.getByRole("alert").filter({
    hasText: "sein exaktes Ende noch nicht erreicht",
  });

  await expect(alert).toBeFocused();
  await expect(dialog).not.toContainText("private@example.com");
  await page.keyboard.press("Escape");
  await expectVisibleKeyboardFocus(action);

  mutationMode = "technical";
  await action.click();
  dialog = page.getByRole("dialog", { name: "Kurs endgültig archivieren?" });
  await dialog
    .getByRole("button", { name: "Kurs endgültig archivieren" })
    .click();
  alert = dialog.getByRole("alert").filter({
    hasText: "Kursdaten konnten nicht geladen",
  });
  await expect(alert).toBeFocused();
  await page.keyboard.press("Escape");
  await expectVisibleKeyboardFocus(action);
  await expectAccessibleLayout(page);

  await page.reload();
  action = page.getByRole("button", { name: "Kurs archivieren" });
  await expect(action).toBeVisible();
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Assert only Archived Admin actions remain. */
async function expectArchivedAdminActions(page) {
  await expect(page.getByRole("heading", { name: "Kurs bearbeiten" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kurs archivieren" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Gruppe anlegen" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Gruppe bearbeiten" })).toHaveCount(0);
  await expect(page.getByRole("button", {
    name: /Gruppe (archivieren|reaktivieren|löschen)/,
  })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Modul anlegen" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Modulinhalt bearbeiten" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Modulzeitraum bearbeiten" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Modul (absagen|löschen)/ })).toHaveCount(0);
}

/** @returns {import("@playwright/test").Locator} One Course list item. */
function courseListItem(page, courseName) {
  return page.locator("tr, main li").filter({ hasText: courseName });
}

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
        name: "Course Archival Participant",
        email: "course-archival-participant@example.com",
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
    data: { name: "Course Archival Admin" },
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

/** @returns {Promise<object>} Create one Course-wide Group. */
async function createGroup(page, courseId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/groups`,
    { data: { name: "Archivierungsgruppe", details: "Historische Details" } },
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
        title: "Archivierungsmodul",
        startsAtLocal: "2027-11-15T10:00",
        endsAtLocal: "2027-11-15T11:00",
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

/** @returns {object} Bounded eligible Course with exact temporal states. */
function boundedCourse(course) {
  const base = {
    courseId: course.id,
    description: null,
    instructions: null,
    isCancellationAvailable: false,
    isScheduleEditable: false,
    startsAt: "2026-08-28T09:00:00.000Z",
    endsAt: "2026-08-28T10:00:00.000Z",
    state: "scheduled",
  };

  return {
    ...course,
    state: "active",
    isArchivalAvailable: true,
    isTimezoneEditable: false,
    counts: { participants: 0, groups: 0, modules: 2 },
    groups: [],
    modules: [
      { ...base, id: "exact-end", title: "Exaktes Ende" },
      {
        ...base,
        id: "cancelled-future",
        title: "Künftig abgesagt",
        startsAt: "2027-01-01T09:00:00.000Z",
        endsAt: "2027-01-01T10:00:00.000Z",
        state: "cancelled",
      },
    ],
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

/** @returns {Promise<void>} Assert visible keyboard focus styling. */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
}
