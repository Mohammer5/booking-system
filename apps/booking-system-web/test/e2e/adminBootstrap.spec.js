import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("bootstraps exactly one first Admin through the German browser flow", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/admin");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Erste Administration einrichten" }),
  ).toBeVisible();
  const googleButton = page.getByRole("button", { name: "Weiter mit Google" });

  await expect(googleButton).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
  await page.keyboard.press("Tab");
  await expectVisibleKeyboardFocus(googleButton);

  await page.route("**/api/auth/sign-in/social", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      provider: "google",
      callbackURL: "/admin",
      errorCallbackURL: "/api/auth/application-error",
    });
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "test initiation failure" }),
    });
  });
  await page.keyboard.press("Enter");
  const authenticationFailure = page.getByRole("alert").filter({
    hasText: "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
  });

  await expect(authenticationFailure).toBeVisible();
  await expect(authenticationFailure).toBeFocused();
  await expectNoAxeViolations(page);
  await page.unroute("**/api/auth/sign-in/social");

  const fixtureResponse = await page.request.post(
    "/api/_fixtures/session/first-admin",
  );

  expect(fixtureResponse.status()).toBe(204);

  await page.reload();

  const nameInput = page.getByLabel("Name");

  await expect(nameInput).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(nameInput).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Administration einrichten" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(nameInput).toBeFocused();
  await expect(nameInput).toHaveAttribute("aria-invalid", "true");
  await expectFieldErrorAssociation(
    nameInput,
    page,
    "Bitte geben Sie einen Namen ein.",
  );
  await expectNoAxeViolations(page);

  await page.keyboard.type("Jane Doe");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  const bootstrapSuccess = page.getByRole("status").filter({
    hasText: "Die erste Administration wurde erfolgreich eingerichtet.",
  });

  await expect(bootstrapSuccess).toBeVisible();
  await expect(bootstrapSuccess).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Administrationsbereich" }),
  ).toBeVisible();
  await expect(page.getByText("Jane Doe")).toBeVisible();
  await expect(page.getByText("Aktiv")).toBeVisible();
  await expect(page.getByText("Super Admin")).toBeVisible();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.setViewportSize(narrowViewport);
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
  await page.setViewportSize(desktopViewport);

  await page.keyboard.press("Tab");
  await expectVisibleKeyboardFocus(
    page.getByRole("button", { name: "Abmelden" }),
  );
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveCount(0);

  const signedOutCurrentAdmin = await page.request.get("/api/admin/me");

  expect(signedOutCurrentAdmin.status()).toBe(401);

  const returningFixtureResponse = await page.request.post(
    "/api/_fixtures/session/first-admin",
  );

  expect(returningFixtureResponse.status()).toBe(204);

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Administrationsbereich" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();

  const laterFixtureResponse = await page.request.post(
    "/api/_fixtures/session/later-admin",
  );
  const laterBootstrapResponse = await page.request.post(
    "/api/admin/bootstrap",
    { data: { name: "Later Admin" } },
  );

  expect(laterFixtureResponse.status()).toBe(204);
  expect(laterBootstrapResponse.status()).toBe(409);
  await expect(laterBootstrapResponse.json()).resolves.toEqual({
    outcome: "bootstrap-unavailable",
  });

  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Administration", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Für diese Anmeldung existiert kein Administrationskonto.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Erste Administration einrichten" }),
  ).toHaveCount(0);
  await expectNoAxeViolations(page);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
});

for (const [viewportName, viewport] of Object.entries({
  desktop: desktopViewport,
  narrow: narrowViewport,
})) {
  test(`presents every Admin state accessibly at the ${viewportName} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    let releaseEntry;
    const entryGate = new Promise((resolve) => {
      releaseEntry = resolve;
    });

    await page.route("**/api/admin/entry", async (route) => {
      await entryGate;
      await fulfillJson(route, 200, { mode: "register-admin" });
    });
    await page.route("**/api/admin/me", (route) =>
      fulfillJson(route, 401, { outcome: "unauthenticated" }),
    );
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Administration", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({
        hasText: "Administrationsstatus wird geladen …",
      }),
    ).toBeVisible();
    await expectStateAccessibility(page);
    releaseEntry();
    await expect(
      page.getByRole("heading", { name: "Erste Administration einrichten" }),
    ).toBeVisible();

    await showAdminState(page, {
      current: { status: 401, body: { outcome: "unauthenticated" } },
      entry: { mode: "register-admin" },
    });
    const freshGoogleButton = page.getByRole("button", {
      name: "Weiter mit Google",
    });

    await expect(freshGoogleButton).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(freshGoogleButton);
    await expectStateAccessibility(page);

    await showAdminState(page, {
      current: { status: 403, body: { outcome: "no-admin-user" } },
      entry: { mode: "register-admin" },
    });
    const formNameInput = page.getByLabel("Name");
    const bootstrapButton = page.getByRole("button", {
      name: "Administration einrichten",
    });

    await page.keyboard.press("Tab");
    await expect(formNameInput).toBeFocused();
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(bootstrapButton);
    await page.keyboard.press("Enter");
    await expect(formNameInput).toBeFocused();
    await expectFieldErrorAssociation(
      formNameInput,
      page,
      "Bitte geben Sie einen Namen ein.",
    );
    await page.route("**/api/admin/bootstrap", (route) =>
      fulfillJson(route, 422, { outcome: "invalid-name" }),
    );
    await formNameInput.fill("Jane");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const bootstrapFailure = page.getByRole("alert").filter({
      hasText: "Bitte geben Sie einen Namen ein.",
    });

    await expect(bootstrapFailure).toBeFocused();
    await expectStateAccessibility(page);

    await showAdminState(page, {
      current: { status: 401, body: { outcome: "unauthenticated" } },
      entry: { mode: "login" },
    });
    await expect(
      page.getByRole("heading", { name: "Administration", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(
      page.getByRole("button", { name: "Weiter mit Google" }),
    );
    await expectStateAccessibility(page);

    await showAdminState(page, {
      current: { status: 403, body: { outcome: "no-admin-user" } },
      entry: { mode: "login" },
    });
    await expect(
      page.getByRole("alert").filter({
        hasText: "Für diese Anmeldung existiert kein Administrationskonto.",
      }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(
      page.getByRole("button", { name: "Abmelden" }),
    );
    await expectStateAccessibility(page);

    await showAdminState(page, {
      current: { status: 403, body: { outcome: "disabled-admin" } },
      entry: { mode: "login" },
    });
    await expect(
      page.getByRole("alert").filter({
        hasText: "Dieses Administrationskonto ist deaktiviert.",
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Dieses Administrationskonto ist deaktiviert."),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(
      page.getByRole("button", { name: "Abmelden" }),
    );
    await expectStateAccessibility(page);

    await showAdminState(page, {
      current: {
        status: 200,
        body: {
          id: "admin-active",
          name: "Ada Admin",
          state: "active",
          authority: "super-admin",
        },
      },
      entry: { mode: "login" },
    });
    await expect(
      page.getByRole("heading", { name: "Administrationsbereich" }),
    ).toBeVisible();
    await expect(page.getByText("Ada Admin")).toBeVisible();
    await page.route("**/api/auth/sign-out", (route) =>
      fulfillJson(route, 500, { message: "test sign-out failure" }),
    );
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(
      page.getByRole("button", { name: "Abmelden" }),
    );
    await page.keyboard.press("Enter");
    const signOutFailure = page.getByRole("alert").filter({
      hasText: "Die Abmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    });

    await expect(signOutFailure).toBeFocused();
    await expectStateAccessibility(page);

    await showAdminState(page, {
      current: { status: 401, body: { outcome: "unauthenticated" } },
      entry: { mode: "login" },
      url: "/admin?authentication=failed",
    });
    const callbackFailure = page.getByRole("alert").filter({
      hasText: "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    });

    await expect(callbackFailure).toBeFocused();
    await expectStateAccessibility(page);

    await showAdminState(page, {
      current: { status: 500, body: { outcome: "technical-error" } },
      entry: { mode: "login" },
    });
    await expect(
      page.getByRole("alert").filter({
        hasText:
          "Der Administrationsstatus konnte nicht geladen werden. Bitte versuchen Sie es erneut.",
      }),
    ).toBeVisible();
    await expectStateAccessibility(page);
  });
}

/**
 * Present one deterministic Admin API state without inventing a product route.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {object} state Stubbed public entry and current-Admin state.
 * @returns {Promise<void>} Completion after the route is rendered.
 */
async function showAdminState(page, { current, entry, url = "/admin" }) {
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/admin/entry", (route) =>
    fulfillJson(route, entry.status ?? 200, entry.body ?? entry),
  );
  await page.route("**/api/admin/me", (route) =>
    fulfillJson(route, current.status, current.body),
  );
  await page.goto(url);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
 * Assert the rendered state has no automated accessibility violations or overflow.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after both assertions.
 */
async function expectStateAccessibility(page) {
  await expectNoHorizontalOverflow(page);
  await expectNoAxeViolations(page);
}

/**
 * Assert axe finds no violations in the current route state.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after the scan.
 */
async function expectNoAxeViolations(page) {
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
}

/**
 * Assert the current viewport has no horizontal document overflow.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after the layout assertion.
 */
async function expectNoHorizontalOverflow(page) {
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth >
      globalThis.document.documentElement.clientWidth,
  );

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

/**
 * Assert a field exposes its localized error through aria-describedby.
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
