import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("edits Course fields and permanently locks timezone after scheduling", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Course before edit");

  await page.goto(`/admin/courses/${course.id}`);
  const nameInput = page.getByLabel("Kursname bearbeiten");
  const descriptionInput = page.getByLabel("Kursbeschreibung bearbeiten");
  const timezoneInput = page.getByLabel("Kurszeitzone bearbeiten (IANA)");
  const submit = page.getByRole("button", {
    name: "Kursänderungen speichern",
  });

  await nameInput.fill("  ");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(nameInput).toBeFocused();
  await expectFieldErrorAssociation(
    nameInput,
    page,
    "Bitte geben Sie einen Kursnamen ein.",
  );

  await nameInput.fill("Bearbeiteter Kurs");
  await descriptionInput.fill("Neue Kursbeschreibung");
  await timezoneInput.fill("+01:00");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(timezoneInput).toBeFocused();
  await expectFieldErrorAssociation(
    timezoneInput,
    page,
    "Bitte geben Sie eine gültige IANA-Zeitzone statt eines festen UTC-Offsets ein.",
  );

  await timezoneInput.fill("America/New_York");
  await submit.focus();
  await page.keyboard.press("Enter");
  const editSuccess = page.getByRole("status").filter({
    hasText: "Die Kursänderungen wurden gespeichert.",
  });

  await expect(editSuccess).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Bearbeiteter Kurs" }),
  ).toBeVisible();
  await expect(page.getByText("Neue Kursbeschreibung")).toBeVisible();
  await expect(
    page.getByText("America/New_York", { exact: true }),
  ).toBeVisible();
  await expectAccessibleLayout(page);

  await page.reload();
  await expect(timezoneInput).toHaveValue("America/New_York");
  await expect(nameInput).toHaveValue("Bearbeiteter Kurs");

  await page.getByLabel("Modultitel").fill("Timezone lock Module");
  await page.getByLabel("Beginn (lokale Kurszeit)").fill("2027-01-15T10:30");
  await page.getByLabel("Ende (lokale Kurszeit)").fill("2027-01-15T11:30");
  await page.getByRole("button", { name: "Modul speichern" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Das Modul wurde erfolgreich angelegt.",
    }),
  ).toBeFocused();
  const lockedCopy = page.getByText(/Kurszeitzone America\/New_York ist dauerhaft gesperrt/);

  await expect(lockedCopy).toBeVisible();
  await expect(timezoneInput).toHaveCount(0);

  await nameInput.fill("Name bleibt bearbeitbar");
  await descriptionInput.fill("Beschreibung bleibt bearbeitbar");
  await submit.click();
  await expect(editSuccess).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Name bleibt bearbeitbar" }),
  ).toBeVisible();

  await presentLockedCourseWithoutCurrentModules(page, course.id);
  await page.reload();
  await expect(
    page.getByRole("status").filter({
      hasText: "Für diesen Kurs wurden noch keine Module angelegt.",
    }),
  ).toBeVisible();
  await expect(lockedCopy).toBeVisible();
  await expect(timezoneInput).toHaveCount(0);
  await expectAccessibleLayout(page);

  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("announces a Module-race refusal and technical edit failure", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Concurrent Course");
  const editPath = `/api/admin/courses/${course.id}`;

  await page.goto(`/admin/courses/${course.id}`);
  const staleTimezoneInput = page.getByLabel(
    "Kurszeitzone bearbeiten (IANA)",
  );

  await expect(staleTimezoneInput).toBeVisible();
  const moduleResponse = await page.request.post(
    `/api/admin/courses/${course.id}/modules`,
    {
      data: {
        title: "Concurrent Module",
        startsAtLocal: "2027-01-15T10:30",
        endsAtLocal: "2027-01-15T11:30",
      },
    },
  );

  expect(moduleResponse.status()).toBe(201);

  await staleTimezoneInput.fill("Europe/London");
  await page.getByRole("button", { name: "Kursänderungen speichern" }).click();
  const stale = page.getByRole("alert").filter({
    hasText:
      "Der Kurs hat sich geändert oder kann nicht mehr bearbeitet werden.",
  });

  await expect(stale).toBeFocused();
  await expect(
    page.getByText(/Kurszeitzone Europe\/Berlin ist dauerhaft gesperrt/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Kurszeitzone bearbeiten (IANA)"),
  ).toHaveCount(0);

  const technicalHandler = async (route) => {
    const requestURL = new URL(route.request().url());

    if (
      requestURL.pathname === editPath &&
      route.request().method() === "PUT"
    ) {
      await fulfillJson(route, 500, { outcome: "technical-error" });
      return;
    }

    await route.continue();
  };

  await page.route("**/api/admin/courses/**", technicalHandler);
  await page.getByLabel("Kursname bearbeiten").fill("Nicht gespeichert");
  await page.getByRole("button", { name: "Kursänderungen speichern" }).click();
  const technical = page.getByRole("alert").filter({
    hasText:
      "Die Kursdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
  });

  await expect(technical).toBeFocused();
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);

  await page.unroute("**/api/admin/courses/**", technicalHandler);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Concurrent Course" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Kurszeitzone Europe\/Berlin ist dauerhaft gesperrt/),
  ).toBeVisible();
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Establish and bootstrap the fixed Active Admin. */
async function ensureActiveAdmin(page) {
  const fixture = await page.request.post("/api/_fixtures/session/first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Course Editing Admin" },
  });

  expect(fixture.status()).toBe(204);
  expect([201, 409]).toContain(bootstrap.status());
}

/** @returns {Promise<object>} Create one Course through normal application HTTP. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/**
 * Present the future post-deletion state without implementing Module deletion.
 *
 * @returns {Promise<void>} Completion after installing one bounded GET route.
 */
async function presentLockedCourseWithoutCurrentModules(page, courseId) {
  await page.route(new RegExp(`/api/admin/courses/${courseId}$`), async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    const body = await response.json();

    await route.fulfill({
      response,
      json: { ...body, isTimezoneEditable: false, modules: [] },
    });
  });
}

/** @returns {Promise<void>} Fulfill one intercepted response as JSON. */
async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert axe and horizontal layout evidence. */
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

/** @returns {Promise<void>} Assert a field exposes its localized error. */
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
