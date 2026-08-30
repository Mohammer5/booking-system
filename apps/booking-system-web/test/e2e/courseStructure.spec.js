import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("creates and revisits a Course through the German Admin journey", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  await page.route(
    /\/api\/admin\/courses(?:\?.*)?$/,
    (route) => fulfillJson(route, 200, {
      courses: [],
      pagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
    }),
    { times: 1 },
  );
  await page.goto("/admin");
  await page.getByRole("link", { name: "Kurse verwalten" }).click();

  await expect(page).toHaveURL("/admin/courses");
  await expect(page.getByRole("heading", { name: "Kurse" })).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText: "Es wurden noch keine Kurse angelegt.",
    }),
  ).toBeVisible();
  await expectAccessibleLayout(page);

  const createLink = page.getByRole("link", { name: "Kurs anlegen" });

  await createLink.focus();
  await expect(createLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/admin/courses/new");

  const nameInput = page.getByLabel("Kursname");
  const timezoneInput = page.getByLabel("Zeitzone (IANA)");
  const submitButton = page.getByRole("button", { name: "Kurs speichern" });

  await submitButton.focus();
  await page.keyboard.press("Enter");
  await expect(nameInput).toBeFocused();
  await expectFieldErrorAssociation(
    nameInput,
    page,
    "Bitte geben Sie einen Kursnamen ein.",
  );

  await nameInput.fill("Kurs Alpha");
  await timezoneInput.fill("+01:00");
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await expect(timezoneInput).toBeFocused();
  await expectFieldErrorAssociation(
    timezoneInput,
    page,
    "Bitte geben Sie eine gültige IANA-Zeitzone statt eines festen UTC-Offsets ein.",
  );

  await page.getByLabel("Beschreibung").fill("Ein vollständiger Testkurs");
  await timezoneInput.fill("Europe/Berlin");
  await submitButton.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/admin\/courses\/[0-9a-f-]+$/);
  const detailHeading = page.getByRole("heading", { name: "Kurs Alpha" });

  await expect(detailHeading).toBeVisible();
  await expect(detailHeading).toBeFocused();
  await expect(
    page.getByRole("status").filter({
      hasText: "Der Kurs wurde erfolgreich angelegt.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Ein vollständiger Testkurs")).toBeVisible();
  await expect(page.getByText("Europe/Berlin", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "Aktiv" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "0 Gruppen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "0 Module" })).toBeVisible();

  await page.getByRole("link", { name: "0 Gruppen" }).click();
  await expect(page.getByRole("status").filter({
    hasText: "Für diesen Kurs wurden noch keine Gruppen angelegt.",
  })).toBeVisible();
  await page.getByRole("link", { name: "Gruppe anlegen" }).click();

  const groupNameInput = page.getByLabel("Gruppenname", { exact: true });
  const groupSubmit = page.getByRole("button", { name: "Gruppe speichern" });

  await groupNameInput.fill("Gruppe Alpha");
  await page.getByLabel("Details").fill("Raum A");
  await groupSubmit.focus();
  await page.keyboard.press("Enter");
  const groupSuccess = page.getByRole("status").filter({
    hasText: "Die Gruppe wurde erfolgreich angelegt.",
  });

  await expect(groupSuccess).toBeFocused();
  await expect(page.getByRole("heading", { name: "Gruppe Alpha" })).toBeVisible();
  await page.getByRole("navigation", { name: "Kurspfad" })
    .getByRole("link", { name: "Kurs Alpha" }).click();
  await expect(page.getByRole("link", { name: "1 Gruppen" })).toBeVisible();
  await page.getByRole("link", { name: "0 Module" }).click();
  await expect(page.getByRole("status").filter({
    hasText: "Für diesen Kurs wurden noch keine Module angelegt.",
  })).toBeVisible();
  await page.getByRole("link", { name: "Modul anlegen" }).click();

  const moduleTitleInput = page.getByLabel("Modultitel");
  const moduleSubmit = page.getByRole("button", { name: "Modul speichern" });

  await moduleTitleInput.fill("Modul Eins");
  await page.getByLabel("Beschreibung", { exact: true }).last().fill("Ein Modul");
  await page.getByLabel("Hinweise").fill("Bitte pünktlich sein");
  await page.getByLabel("Beginn (lokale Kurszeit)").fill("2027-01-15T10:30");
  await page.getByLabel("Ende (lokale Kurszeit)").fill("2027-01-15T11:30");
  await moduleSubmit.focus();
  await page.keyboard.press("Enter");
  const moduleSuccess = page.getByRole("status").filter({
    hasText: "Das Modul wurde erfolgreich angelegt.",
  });

  await expect(moduleSuccess).toBeFocused();
  await expect(page.getByRole("heading", { name: "Modul Eins" })).toBeVisible();
  await expect(page.getByText("2027-01-15T09:30:00.000Z")).toBeVisible();
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);

  const moduleDetailURL = page.url();

  await page.reload();
  await expect(page).toHaveURL(moduleDetailURL);
  await expect(page.getByRole("heading", { name: "Modul Eins" })).toBeVisible();
  await expectAccessibleLayout(page);
  await page.getByRole("navigation", { name: "Kurspfad" })
    .getByRole("link", { name: "Kurs Alpha" }).click();
  await expect(detailHeading).toBeVisible();
  await expect(page.getByRole("link", { name: "1 Gruppen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "1 Module" })).toBeVisible();
  await page.getByRole("navigation", { name: "Kurspfad" })
    .getByRole("link", { name: "Kurse" }).click();
  await expect(page.getByRole("list", { name: "Kursliste" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kurs Alpha" })).toBeVisible();
  await expectAccessibleLayout(page);
});

test("rejects DST gaps and requires an explicit overlap occurrence", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourseThroughApi(page, "DST Course");

  await page.goto(`/admin/courses/${course.id}/modules/new`);
  const titleInput = page.getByLabel("Modultitel");
  const startsAtInput = page.getByLabel("Beginn (lokale Kurszeit)");
  const endsAtInput = page.getByLabel("Ende (lokale Kurszeit)");
  const submitButton = page.getByRole("button", { name: "Modul speichern" });

  await titleInput.fill("DST Modul");
  await startsAtInput.fill("2027-03-28T02:30");
  await endsAtInput.fill("2027-03-28T04:00");
  await submitButton.click();
  await expect(startsAtInput).toBeFocused();
  await expectFieldErrorAssociation(
    startsAtInput,
    page,
    "Dieser Beginn existiert wegen der Zeitumstellung in der Kurszeitzone nicht.",
  );
  await page.setViewportSize(narrowViewport);
  await startsAtInput.fill("2027-10-31T02:30");
  await endsAtInput.fill("2027-10-31T03:30");
  await submitButton.click();

  const occurrenceGroup = page.getByRole("radiogroup", {
    name: "Beginn: beabsichtigtes Vorkommen",
  });
  const earlier = occurrenceGroup.getByRole("radio", {
    name: /Erstes Vorkommen/,
  });
  const later = occurrenceGroup.getByRole("radio", {
    name: /Zweites Vorkommen/,
  });

  await expect(earlier).toBeFocused();
  await expect(submitButton).toBeDisabled();
  await expect(occurrenceGroup).toContainText("2027-10-31T00:30:00.000Z");
  await expect(occurrenceGroup).toContainText("2027-10-31T01:30:00.000Z");
  await later.check();
  await expect(submitButton).toBeEnabled();
  await submitButton.focus();
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("status").filter({
      hasText: "Das Modul wurde erfolgreich angelegt.",
    }),
  ).toBeFocused();
  await expect(page.getByRole("heading", { name: "DST Modul" })).toBeVisible();
  await expect(page.getByText("2027-10-31T01:30:00.000Z")).toBeVisible();
  await expectAccessibleLayout(page);

  await page.reload();
  await expect(page.getByRole("heading", { name: "DST Modul" })).toBeVisible();
  await expectAccessibleLayout(page);
});

test("presents stale Group and technical Module refusals predictably", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourseThroughApi(page, "Refusal Course");

  await page.route(`**/api/admin/courses/${course.id}/groups`, (route) =>
    fulfillJson(route, 409, { outcome: "course-not-active" }),
  );
  await page.goto(`/admin/courses/${course.id}/groups/new`);
  await page.getByLabel("Gruppenname").fill("Nicht gespeichert");
  await page.getByRole("button", { name: "Gruppe speichern" }).click();
  const groupRefusal = page.getByRole("alert").filter({
    hasText:
      "Die Kursverwaltung ist für dieses Administrationskonto nicht verfügbar.",
  });

  await expect(groupRefusal).toBeFocused();
  await expectAccessibleLayout(page);

  await page.setViewportSize(narrowViewport);
  await page.route(`**/api/admin/courses/${course.id}/modules`, (route) =>
    fulfillJson(route, 500, { outcome: "technical-error" }),
  );
  await page.goto(`/admin/courses/${course.id}/modules/new`);
  await page.getByLabel("Modultitel").fill("Nicht gespeichert");
  await page.getByLabel("Beginn (lokale Kurszeit)").fill("2027-01-15T10:30");
  await page.getByLabel("Ende (lokale Kurszeit)").fill("2027-01-15T11:30");
  await page.getByRole("button", { name: "Modul speichern" }).click();
  const moduleFailure = page.getByRole("alert").filter({
    hasText:
      "Die Kursdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
  });

  await expect(moduleFailure).toBeFocused();
  await expectAccessibleLayout(page);
});

for (const [viewportName, viewport] of Object.entries({
  desktop: desktopViewport,
  narrow: narrowViewport,
})) {
  test(`presents Course states safely at the ${viewportName} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await ensureActiveAdmin(page);

    let releaseCourses;
    const courseGate = new Promise((resolve) => {
      releaseCourses = resolve;
    });
    const courseCollectionPattern = /\/api\/admin\/courses(?:\?.*)?$/;
    const loadingHandler = async (route) => {
      await courseGate;
      await fulfillJson(route, 200, {
        courses: [],
        pagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
      });
    };

    await page.route(courseCollectionPattern, loadingHandler);
    await page.goto("/admin/courses");
    await expect(
      page.getByRole("status").filter({ hasText: "Kurse werden geladen …" }),
    ).toBeVisible();
    await expectAccessibleLayout(page);
    releaseCourses();
    await expect(
      page.getByRole("status").filter({
        hasText: "Es wurden noch keine Kurse angelegt.",
      }),
    ).toBeVisible();
    await expectAccessibleLayout(page);

    await page.unroute(courseCollectionPattern, loadingHandler);
    await page.route(courseCollectionPattern, (route) =>
      fulfillJson(route, 500, { outcome: "technical-error" }),
    );
    await page.reload();
    const indexError = page.getByRole("alert").filter({
      hasText:
        "Die Kursdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    });

    await expect(indexError).toBeFocused();
    await expectAccessibleLayout(page);

    await page.unroute(courseCollectionPattern);
    await page.route("**/api/admin/courses/missing", (route) =>
      fulfillJson(route, 404, { outcome: "course-not-found" }),
    );
    await page.goto("/admin/courses/missing");
    const missingError = page.getByRole("alert").filter({
      hasText: "Der angeforderte Kurs wurde nicht gefunden.",
    });

    await expect(missingError).toBeFocused();
    await expectAccessibleLayout(page);

    await page.unroute("**/api/admin/courses/missing");
    await page.route("**/api/admin/courses", async (route) => {
      if (route.request().method() === "POST") {
        await fulfillJson(route, 403, { outcome: "disabled-admin" });
        return;
      }

      await route.continue();
    });
    await page.goto("/admin/courses/new");
    await page.getByLabel("Kursname").fill("Refused Course");
    await page.getByRole("button", { name: "Kurs speichern" }).click();
    const refusal = page.getByRole("alert").filter({
      hasText:
        "Die Kursverwaltung ist für dieses Administrationskonto nicht verfügbar.",
    });

    await expect(refusal).toBeFocused();
    await expectAccessibleLayout(page);

    await page.unroute("**/api/admin/courses");
    await page.context().clearCookies();
    await establishFixture(page, "later-admin");
    const privateCourseRequests = [];

    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/admin/courses")) {
        privateCourseRequests.push(request.url());
      }
    });
    await page.goto("/admin/courses");
    await expect(
      page.getByText(
        "Für diese Anmeldung existiert kein Administrationskonto.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Kurse" }),
    ).toHaveCount(0);
    expect(privateCourseRequests).toEqual([]);
    await expectAccessibleLayout(page);
  });
}

/**
 * Establish the deterministic first fixture and ensure its Active Admin exists.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after normal session/bootstrap setup.
 */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Course Admin" },
  });

  expect([201, 409]).toContain(bootstrap.status());
}

/**
 * Create one Course through the authenticated application API for a focused view.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {string} name Course name.
 * @returns {Promise<object>} Created Course response.
 */
async function createCourseThroughApi(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/**
 * Establish one fixed normal non-production application session.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {"first-admin" | "later-admin"} fixtureName Fixed fixture name.
 * @returns {Promise<void>} Completion after session establishment.
 */
async function establishFixture(page, fixtureName) {
  const response = await page.request.post(
    `/api/_fixtures/session/${fixtureName}`,
  );

  expect(response.status()).toBe(204);
}

/**
 * Fulfill one intercepted application response as JSON.
 *
 * @param {import("@playwright/test").Route} route Intercepted request.
 * @param {number} status HTTP status.
 * @param {object} body JSON body.
 * @returns {Promise<void>} Completion after fulfillment.
 */
async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Assert axe accessibility and absence of horizontal overflow.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after both assertions.
 */
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

/**
 * Assert a form field programmatically exposes its localized error.
 *
 * @param {import("@playwright/test").Locator} field Form field.
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {string} message Expected localized error.
 * @returns {Promise<void>} Completion after association assertion.
 */
async function expectFieldErrorAssociation(field, page, message) {
  const descriptionIds = await field.getAttribute("aria-describedby");

  expect(descriptionIds).toBeTruthy();
  await expect(
    page.locator(
      descriptionIds
        .split(" ")
        .map((id) => `#${id}`)
        .join(","),
    ),
  ).toContainText(message);
}
