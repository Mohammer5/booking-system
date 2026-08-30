import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("deletes future and Cancelled Modules while preserving timezone history", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Modullöschung");
  const group = await createGroup(page, course.id);
  const future = await createModule(page, course.id, "Künftiges Löschmodul");
  const cancelled = await createModule(page, course.id, "Abgesagtes Löschmodul");

  await assignParticipant(page, course.id, participant.id);
  await establishFixture(page, "selection-participant");
  const selectionPath =
    `/api/participant/courses/${course.id}/modules/${future.id}/selection`;
  const selected = await page.request.put(selectionPath, {
    data: { groupId: group.id },
  });
  expect(selected.status()).toBe(201);
  const removed = await page.request.delete(selectionPath);
  expect(removed.status()).toBe(200);

  await ensureActiveAdmin(page);
  const cancellation = await page.request.post(
    `/api/admin/courses/${course.id}/modules/${cancelled.id}/cancellation`,
  );
  expect(cancellation.status()).toBe(200);
  await page.goto(`/admin/courses/${course.id}/modules/${future.id}`);

  let card = moduleCard(page, future.id);
  const futureDelete = card.getByRole("button", { name: "Modul löschen" });
  await futureDelete.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", { name: "Modul endgültig löschen?" });

  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText(future.title);
  await expect(dialog).toContainText("nicht rückgängig gemacht");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(futureDelete);

  await futureDelete.click();
  dialog = page.getByRole("dialog", { name: "Modul endgültig löschen?" });
  await dialog.getByRole("button", { name: "Modul endgültig löschen" }).click();
  await expect(deletionSuccess(page, future.title)).toBeFocused();
  await expect(card).toBeHidden();

  await page.goto(`/admin/courses/${course.id}/modules/${cancelled.id}`);
  card = moduleCard(page, cancelled.id);
  await expect(card).toContainText("Abgesagt");
  await card.getByRole("button", { name: "Modul löschen" }).click();
  dialog = page.getByRole("dialog", { name: "Modul endgültig löschen?" });
  await dialog.getByRole("button", { name: "Modul endgültig löschen" }).click();
  await expect(deletionSuccess(page, cancelled.title)).toBeFocused();
  await expect(card).toBeHidden();
  await expect(
    page.getByRole("status").filter({
      hasText: "Für diesen Kurs wurden noch keine Module angelegt.",
    }),
  ).toBeVisible();
  await page.goto(`/admin/courses/${course.id}`);
  await expect(
    page.getByText(/Kurszeitzone Europe\/Berlin ist dauerhaft gesperrt/),
  ).toBeVisible();
  await expect(page.getByLabel("Kurszeitzone bearbeiten (IANA)")).toHaveCount(0);

  const timezoneEdit = await page.request.put(`/api/admin/courses/${course.id}`, {
    data: {
      name: course.name,
      description: course.description,
      timezone: "Europe/London",
    },
  });
  expect(timezoneEdit.status()).toBe(409);
  await expect(timezoneEdit.json()).resolves.toEqual({
    outcome: "course-timezone-locked",
  });
  await expectAccessibleLayout(page);

  await page.reload();
  await expect(moduleCard(page, future.id)).toHaveCount(0);
  await expect(moduleCard(page, cancelled.id)).toHaveCount(0);
  await expect(page.getByLabel("Kurszeitzone bearbeiten (IANA)")).toHaveCount(0);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("handles ended eligibility and private blocker, stale, and error states", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const persistedCourse = await createCourse(page, "Zeitstände der Modullöschung");
  const course = boundedCourse(persistedCourse);
  let modules = course.modules;

  await page.route(`**/api/admin/courses/${course.id}**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === "GET" && path.includes("/modules/")) {
      const moduleId = path.split("/").at(-1);
      const module = modules.find((item) => item.id === moduleId);

      if (module === undefined) {
        await fulfillJson(route, 404, { outcome: "module-not-found" });
        return;
      }
      await fulfillJson(route, 200, {
        course,
        module,
      });
      return;
    }

    if (request.method() !== "DELETE") {
      await route.continue();
      return;
    }

    const moduleId = path.split("/").at(-1);
    if (moduleId === "ended") {
      const module = modules.find(({ id }) => id === moduleId);
      modules = modules.filter(({ id }) => id !== moduleId);
      await fulfillJson(route, 200, { outcome: "deleted", module });
      return;
    }

    if (new Set(["historical", "cancelled-reference"]).has(moduleId)) {
      await fulfillJson(route, 409, { outcome: "module-deletion-blocked" });
      return;
    }

    if (moduleId === "stale") {
      await fulfillJson(route, 409, { outcome: "course-not-active" });
      return;
    }

    await fulfillJson(route, 500, { outcome: "technical-error" });
  });
  await page.goto(`/admin/courses/${course.id}/modules/ended`);

  const ended = moduleCard(page, "ended");
  await expect(ended).toContainText("Der Modulzeitraum ist gesperrt");
  await ended.getByRole("button", { name: "Modul löschen" }).click();
  let dialog = page.getByRole("dialog", { name: "Modul endgültig löschen?" });
  await dialog.getByRole("button", { name: "Modul endgültig löschen" }).click();
  await expect(deletionSuccess(page, "Beendetes Modul")).toBeFocused();
  await expect(ended).toBeHidden();

  for (const moduleId of ["historical", "cancelled-reference"]) {
    await page.goto(`/admin/courses/${course.id}/modules/${moduleId}`);
    const blocked = moduleCard(page, moduleId);
    const action = blocked.getByRole("button", { name: "Modul löschen" });
    await action.focus();
    await page.keyboard.press("Enter");
    dialog = page.getByRole("dialog", { name: "Modul endgültig löschen?" });
    await dialog.getByRole("button", { name: "Modul endgültig löschen" }).click();
    const alert = dialog.getByRole("alert").filter({
      hasText: "mindestens eine aktuelle oder historische Modulauswahl",
    });

    await expect(alert).toBeFocused();
    await expect(dialog).not.toContainText("private@example.com");
    await expect(blocked).toBeVisible();
    await page.keyboard.press("Escape");
    await expectVisibleKeyboardFocus(action);
  }

  await assertDeletionFailure(page, course.id, "stale", "aktuellen Kursstatus");
  await assertDeletionFailure(
    page,
    course.id,
    "technical",
    "Kursdaten konnten nicht geladen",
  );
  await expectAccessibleLayout(page);
  await page.reload();
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Confirm and assert one focused deletion failure. */
async function assertDeletionFailure(page, courseId, moduleId, message) {
  await page.goto(`/admin/courses/${courseId}/modules/${moduleId}`);
  const card = moduleCard(page, moduleId);
  await card.getByRole("button", { name: "Modul löschen" }).click();
  const dialog = page.getByRole("dialog", { name: "Modul endgültig löschen?" });
  await dialog.getByRole("button", { name: "Modul endgültig löschen" }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: message })).toBeFocused();
  await page.keyboard.press("Escape");
}

/** @returns {import("@playwright/test").Locator} Stable Admin Module article. */
function moduleCard(page, moduleId) {
  return page.locator(`article[aria-labelledby="module-${moduleId}-title"]`);
}

/** @returns {import("@playwright/test").Locator} Parent deletion success. */
function deletionSuccess(page, title) {
  return page.getByRole("status").filter({
    hasText: `Das Modul „${title}“ wurde endgültig gelöscht.`,
  });
}

/** @returns {Promise<object>} Ensure the fixed Participant exists. */
async function ensureParticipant(page) {
  await establishFixture(page, "selection-participant");
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Module Deletion Participant",
        email: "module-deletion-participant@example.com",
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
    data: { name: "Module Deletion Admin" },
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

/** @returns {Promise<object>} Create one Course-wide Group. */
async function createGroup(page, courseId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/groups`,
    { data: { name: "Modullöschgruppe" } },
  );

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one future Scheduled Module. */
async function createModule(page, courseId, title) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/modules`,
    {
      data: {
        title,
        startsAtLocal: "2027-11-01T10:00",
        endsAtLocal: "2027-11-01T11:00",
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

/** @returns {Promise<void>} Establish one fixed application session. */
async function establishFixture(page, fixture) {
  const response = await page.request.post(`/api/_fixtures/session/${fixture}`);

  expect(response.status()).toBe(204);
}

/** @returns {object} Bounded Course with every relevant deletion state. */
function boundedCourse(course) {
  const base = {
    courseId: course.id,
    description: null,
    instructions: null,
    isCancellationAvailable: false,
    isScheduleEditable: false,
    startsAt: "2026-08-28T08:00:00.000Z",
    endsAt: "2026-08-28T09:00:00.000Z",
    state: "scheduled",
  };

  return {
    ...course,
    groups: [],
    isTimezoneEditable: false,
    modules: [
      { ...base, id: "ended", title: "Beendetes Modul" },
      { ...base, id: "historical", title: "Historisch referenziert" },
      {
        ...base,
        id: "cancelled-reference",
        title: "Abgesagt referenziert",
        state: "cancelled",
      },
      { ...base, id: "stale", title: "Veralteter Kursstand" },
      { ...base, id: "technical", title: "Technischer Fehler" },
    ],
  };
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

/** @returns {Promise<void>} Assert keyboard-visible focus styling. */
async function expectVisibleKeyboardFocus(locator) {
  await expect(locator).toBeFocused();
  await expect(locator).toHaveCSS("outline-style", "solid");
}
