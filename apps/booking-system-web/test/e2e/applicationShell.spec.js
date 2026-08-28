import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

for (const [viewportName, viewport] of Object.entries({
  desktop: desktopViewport,
  narrow: narrowViewport,
})) {
  test(`serves the Participant entry shell at the ${viewportName} viewport`, async ({
    page,
  }) => {
    const apiRequests = [];

    await page.route("**/api/participant/me", (route) =>
      fulfillJson(route, 401, { outcome: "unauthenticated" }),
    );

    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) {
        apiRequests.push(request.url());
      }
    });

    await page.setViewportSize(viewport);
    await page.goto("/");
    await expectParticipantEntry(page);

    if (viewportName === "desktop") {
      await expectCurrentNavigation(page, "Teilnahme");
    } else {
      await exerciseNavigationDrawer(page);
    }

    await expectAccessibleLayout(page);
    await page.reload();
    await expectParticipantEntry(page);
    await expectAccessibleLayout(page);
    expect(apiRequests.length).toBeGreaterThanOrEqual(2);
    expect(
      apiRequests.every(
        (requestURL) =>
          new URL(requestURL).pathname === "/api/participant/me",
      ),
    ).toBe(true);
  });

  test(`serves the Admin shell directly at the ${viewportName} viewport`, async ({
    page,
  }) => {
    await page.route("**/api/admin/entry", (route) =>
      fulfillJson(route, 200, { mode: "login" }),
    );
    await page.route("**/api/admin/me", (route) =>
      fulfillJson(route, 401, { outcome: "unauthenticated" }),
    );
    await page.setViewportSize(viewport);
    await page.goto("/admin");
    await expectAdminEntry(page);

    if (viewportName === "desktop") {
      await expectCurrentNavigation(page, "Administration");
    } else {
      await expect(
        page.getByRole("button", { name: "Menü öffnen" }),
      ).toBeVisible();
    }

    await expectAccessibleLayout(page);
    await page.reload();
    await expectAdminEntry(page);
    await expectAccessibleLayout(page);
  });
}

test("reuses one session across contexts and restores focus around sign-out", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const fixtureResponse = await page.request.post(
    "/api/_fixtures/session/first-admin",
  );
  const bootstrapResponse = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Jane Doe" },
  });
  const participantResponse = await page.request.post(
    "/api/participant/onboarding",
    {
      data: {
        name: "Jane Participant",
        email: "jane.shell.participant@example.com",
      },
    },
  );

  expect(fixtureResponse.status()).toBe(204);
  expect([201, 409]).toContain(bootstrapResponse.status());
  expect([201, 409]).toContain(participantResponse.status());

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Administrationsbereich" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Teilnahme" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Teilnahmebereich" }),
  ).toBeVisible();
  await expect(page.getByText("Jane Participant")).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText: "Noch keinen Kursen zugeordnet",
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Administration", exact: true })
    .click();
  await expect(page).toHaveURL("/admin");
  await expect(
    page.getByRole("heading", { name: "Administrationsbereich" }),
  ).toBeVisible();

  const signOutButton = page.getByRole("button", { name: "Abmelden" });

  await page.getByRole("main").focus();
  await page.keyboard.press("Tab");
  await expectVisibleKeyboardFocus(signOutButton);
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Abmeldung bestätigen" });
  const cancelButton = page.getByRole("button", { name: "Abbrechen" });
  const confirmButton = page.getByRole("button", { name: "Jetzt abmelden" });

  await expect(dialog).toBeVisible();
  await expect(cancelButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expectVisibleKeyboardFocus(confirmButton);
  await page.keyboard.press("Tab");
  await expectVisibleKeyboardFocus(cancelButton);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(signOutButton);

  await page.keyboard.press("Enter");
  await expect(cancelButton).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({
      hasText: "Sie wurden erfolgreich abgemeldet.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeFocused();

  const currentAdminResponse = await page.request.get("/api/admin/me");

  expect(currentAdminResponse.status()).toBe(401);
  await expectAccessibleLayout(page);
});

/**
 * Assert the unauthenticated Participant context entry.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after the route assertions.
 */
async function expectParticipantEntry(page) {
  await expect(page).toHaveTitle("Teilnahme | Booking System");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Teilnahmebereich" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
}

/**
 * Assert the direct Admin route without depending on provider UI.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after the route assertions.
 */
async function expectAdminEntry(page) {
  await expect(page).toHaveTitle("Administration | Booking System");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Administration", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
}

/**
 * Assert the desktop navigation names and current-page semantics.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {string} currentName Current context label.
 * @returns {Promise<void>} Completion after navigation assertions.
 */
async function expectCurrentNavigation(page, currentName) {
  const navigation = page.getByRole("navigation", { name: "Hauptnavigation" });

  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: currentName }),
  ).toHaveAttribute("aria-current", "page");
}

/**
 * Exercise the narrow modal navigation and its focus lifecycle.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after dismissing the drawer.
 */
async function exerciseNavigationDrawer(page) {
  const menuButton = page.getByRole("button", { name: "Menü öffnen" });

  await menuButton.focus();
  await page.keyboard.press("Enter");
  const closeButton = page.getByRole("button", { name: "Menü schließen" });
  const navigation = page.getByRole("navigation", { name: "Hauptnavigation" });

  await expect(closeButton).toBeFocused();
  await expectCurrentNavigation(page, "Teilnahme");
  await page.keyboard.press("Shift+Tab");
  await expect(
    navigation.getByRole("link", { name: "Administration" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expectVisibleKeyboardFocus(menuButton);
}

/**
 * Fulfill one intercepted application response as JSON.
 *
 * @param {import("@playwright/test").Route} route Intercepted route.
 * @param {number} status HTTP response status.
 * @param {object} body JSON response body.
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
 * Assert the current route has no axe violations or horizontal overflow.
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
 * Assert a keyboard-focused control has a visible theme outline.
 *
 * @param {import("@playwright/test").Locator} control Focused control.
 * @returns {Promise<void>} Completion after focus and style assertions.
 */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
}
