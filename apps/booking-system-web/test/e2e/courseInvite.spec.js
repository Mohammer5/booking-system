import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("manages one shared Invite and recognizes its exact lifecycle publicly", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Geteilte Einladung");

  await page.goto(`/admin/courses/${course.id}`);
  const section = inviteSection(page);

  await expect(section).toContainText(
    "Für diesen Kurs besteht noch keine geteilte Einladung.",
  );
  await section.getByRole("button", { name: "Kurseinladung erstellen" }).click();
  await expect(
    section.getByRole("status").filter({
      hasText: "Die Kurseinladung wurde erfolgreich erstellt",
    }),
  ).toBeFocused();
  const firstURL = await inviteURL(section);

  await page.reload();
  await expect(inviteSection(page).getByText(firstURL)).toBeVisible();
  const copy = inviteSection(page).getByRole("button", {
    name: "Einladungslink kopieren",
  });

  await copy.click();
  await expect(
    inviteSection(page).getByRole("status").filter({
      hasText: "Der Einladungslink wurde kopiert.",
    }),
  ).toBeFocused();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(firstURL);

  const disable = inviteSection(page).getByRole("button", {
    name: "Kurseinladung deaktivieren",
  });
  await disable.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", {
    name: "Kurseinladung deaktivieren?",
  });

  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText("kann aber nicht mehr für einen Beitritt");
  await page.keyboard.press("Escape");
  await expectVisibleKeyboardFocus(disable);
  await disable.click();
  dialog = page.getByRole("dialog", { name: "Kurseinladung deaktivieren?" });
  await dialog
    .getByRole("button", { name: "Kurseinladung deaktivieren", exact: true })
    .click();
  await expect(
    inviteSection(page).getByRole("status").filter({
      hasText: "Die Kurseinladung wurde deaktiviert.",
    }),
  ).toBeFocused();

  await page.goto(firstURL);
  await expect(page).toHaveURL(/\/invite$/);
  await expect(page.getByRole("heading", { name: course.name })).toBeVisible();
  await expect(page.getByText("Diese Kurseinladung ist nicht verfügbar."))
    .toBeVisible();
  await expectPublicPrivacy(page, course.name);
  await page.reload();
  await expect(page.getByRole("heading", { name: course.name })).toBeVisible();

  await page.goto(`/admin/courses/${course.id}`);
  await inviteSection(page)
    .getByRole("button", { name: "Kurseinladung wieder aktivieren" })
    .click();
  await expect(
    inviteSection(page).getByRole("status").filter({
      hasText: "Die Kurseinladung wurde wieder aktiviert.",
    }),
  ).toBeFocused();
  await page.goto(firstURL);
  await expect(page.getByText("Diese Kurseinladung ist verfügbar.")).toBeVisible();

  await page.goto(`/admin/courses/${course.id}`);
  const replace = inviteSection(page).getByRole("button", {
    name: "Kurseinladung dauerhaft ersetzen",
  });
  await replace.click();
  dialog = page.getByRole("dialog", {
    name: "Kurseinladung dauerhaft ersetzen?",
  });
  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText("dauerhaft ungültig");
  await dialog
    .getByRole("button", { name: "Kurseinladung endgültig ersetzen" })
    .click();
  await expect(
    inviteSection(page).getByRole("status").filter({
      hasText: "Die Kurseinladung wurde dauerhaft ersetzt.",
    }),
  ).toBeFocused();
  const replacementURL = await inviteURL(inviteSection(page));

  expect(replacementURL).not.toBe(firstURL);
  await page.goto(firstURL);
  await expect(page.getByText("Diese Kurseinladung ist nicht verfügbar."))
    .toBeVisible();
  await page.goto(replacementURL);
  await expect(page.getByText("Diese Kurseinladung ist verfügbar.")).toBeVisible();

  await ensureActiveAdmin(page);
  const archived = await page.request.post(
    `/api/admin/courses/${course.id}/archival`,
  );

  expect(archived.status()).toBe(200);
  await page.goto(replacementURL);
  await expect(page.getByRole("heading", { name: course.name })).toBeVisible();
  await expect(page.getByText("Diese Kurseinladung ist nicht verfügbar."))
    .toBeVisible();
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);

  await page.goto(`/admin/courses/${course.id}`);
  await expect(page.getByRole("heading", { name: "Geteilte Kurseinladung" }))
    .toHaveCount(0);
});

test("presents unknown, stale, and technical Invite states without private data", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/invite#not-a-valid-secret");

  await expect(page).toHaveURL(/\/invite$/);
  await expect(
    page.getByRole("alert").filter({
      hasText: "Diese Kurseinladung ist nicht verfügbar.",
    }),
  ).toBeFocused();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
  await expectAccessibleLayout(page);

  await page.route("**/api/course-invites/recognition", (route) =>
    fulfillJson(route, 500, {
      outcome: "technical-error",
      privateDetail: "must-not-render@example.com",
    }),
  );
  await page.goto(`/invite#${"f".repeat(64)}`);
  const publicError = page.getByRole("alert").filter({
    hasText: "Die Kurseinladung konnte nicht geprüft werden.",
  });

  await expect(publicError).toBeFocused();
  await expect(page.getByText("must-not-render@example.com")).toHaveCount(0);
  await page.unroute("**/api/course-invites/recognition");

  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Einladungsfehler");
  let mode = "stale";

  await page.route(
    `**/api/admin/courses/${course.id}/invites/current`,
    async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, 200, { invite: null });
        return;
      }

      await fulfillJson(route, mode === "stale" ? 409 : 500, {
        outcome: mode === "stale"
          ? "course-invite-already-exists"
          : "technical-error",
        privateDetail: "private persistence detail",
      });
    },
  );
  await page.goto(`/admin/courses/${course.id}`);
  const create = inviteSection(page).getByRole("button", {
    name: "Kurseinladung erstellen",
  });

  await create.click();
  await expect(
    inviteSection(page).getByRole("alert").filter({
      hasText: "wegen eines geänderten Administrations-",
    }),
  ).toBeFocused();
  mode = "technical";
  await create.click();
  await expect(
    inviteSection(page).getByRole("alert").filter({
      hasText: "Die Kurseinladung konnte nicht geladen oder gespeichert werden.",
    }),
  ).toBeFocused();
  await expect(page.getByText("private persistence detail")).toHaveCount(0);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  const session = await page.request.post("/api/_fixtures/session/first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Course Invite Admin" },
  });

  expect(session.status()).toBe(204);
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

/** @returns {import("@playwright/test").Locator} Admin Invite section. */
function inviteSection(page) {
  return page.getByRole("region", { name: "Geteilte Kurseinladung" });
}

/** @returns {Promise<string>} Current URL from the section's code element. */
async function inviteURL(section) {
  return section.locator("code").textContent();
}

/** @returns {Promise<void>} Assert only minimal public Course context. */
async function expectPublicPrivacy(page, courseName) {
  await expect(page.getByText(courseName)).toHaveCount(1);
  await expect(page.getByText("Private description")).toHaveCount(0);
  await expect(page.getByText(/@/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /beitreten/i })).toHaveCount(0);
}

/** @returns {Promise<void>} Fulfill one bounded JSON response. */
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
