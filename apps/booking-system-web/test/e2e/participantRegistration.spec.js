import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("registers and returns as a Participant through the German browser journey", async ({
  page,
}) => {
  const privateCourseRequests = [];

  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;

    if (pathname.includes("courses")) {
      privateCourseRequests.push(pathname);
    }
  });
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  const googleButton = page.getByRole("button", { name: "Weiter mit Google" });

  await expect(googleButton).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await expectAccessibleLayout(page);
  await page.getByRole("main").focus();
  await page.keyboard.press("Tab");
  await expectVisibleKeyboardFocus(googleButton);

  await page.route("**/api/auth/sign-in/social", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/api/auth/participant-error",
    });
    await fulfillJson(route, 503, { message: "test initiation failure" });
  });
  await page.keyboard.press("Enter");
  const authenticationFailure = page.getByRole("alert").filter({
    hasText: "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
  });

  await expect(authenticationFailure).toBeFocused();
  await expectAccessibleLayout(page);
  await page.unroute("**/api/auth/sign-in/social");
  await establishFixture(page, "participant-a");
  await page.reload();

  const nameInput = page.getByLabel("Name");
  const emailInput = page.getByLabel("E-Mail-Adresse");
  const submitButton = page.getByRole("button", {
    name: "Teilnahmeprofil erstellen",
  });

  await expect(
    page.getByRole("heading", { name: "Teilnahmeprofil einrichten" }),
  ).toBeVisible();
  await expect(nameInput).toHaveAttribute("autocomplete", "name");
  await expect(emailInput).toHaveAttribute("autocomplete", "email");
  await expect(emailInput).toHaveAttribute("type", "email");
  await page.reload();
  await expect(nameInput).toBeVisible();
  expect((await page.request.get("/api/participant/me")).status()).toBe(403);

  await nameInput.fill("  ");
  await emailInput.fill("alice");
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await expect(nameInput).toBeFocused();
  await expectFieldErrorAssociation(
    nameInput,
    page,
    "Bitte geben Sie einen Namen ein.",
  );

  await nameInput.fill("Alice Participant");
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await expect(emailInput).toBeFocused();
  await expectFieldErrorAssociation(
    emailInput,
    page,
    "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  );
  await expectAccessibleLayout(page);

  await emailInput.fill(" Alice.Registration@Example.COM ");
  await submitButton.focus();
  await page.keyboard.press("Enter");
  const registrationSuccess = page.getByRole("status").filter({
    hasText: "Ihr Teilnahmeprofil wurde erfolgreich eingerichtet.",
  });

  await expect(registrationSuccess).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Teilnahmebereich" }),
  ).toBeVisible();
  await expect(page.getByText("Alice Participant")).toBeVisible();
  await expect(
    page.getByText("Alice.Registration@Example.COM"),
  ).toBeVisible();
  await expect(page.getByText("Aktiv", { exact: true })).toBeVisible();
  await expectZeroMembership(page);
  expect(privateCourseRequests).toEqual([]);
  await expectAccessibleLayout(page);

  await page.reload();
  await expect(page.getByText("Alice Participant")).toBeVisible();
  await expectZeroMembership(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
  await page.setViewportSize(desktopViewport);

  const signOutButton = page.getByRole("button", { name: "Abmelden" });

  await signOutButton.focus();
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
  await expect(googleButton).toBeFocused();
  expect((await page.request.get("/api/participant/me")).status()).toBe(401);
  await expectAccessibleLayout(page);

  await establishFixture(page, "participant-a");
  await page.reload();
  await expect(page.getByText("Alice Participant")).toBeVisible();
  await expectZeroMembership(page);
  expect(privateCourseRequests).toEqual([]);
});

test("refuses a duplicate Participant email without creating a profile", async ({
  page,
}) => {
  await page.setViewportSize(narrowViewport);
  await establishFixture(page, "participant-b");
  await page.goto("/");

  await page.getByLabel("Name").fill("Bob Participant");
  await page.getByLabel("E-Mail-Adresse").fill(
    "alice.registration@example.com",
  );
  await page
    .getByRole("button", { name: "Teilnahmeprofil erstellen" })
    .click();
  const conflict = page.getByRole("alert").filter({
    hasText:
      "Diese E-Mail-Adresse wird bereits für ein anderes Teilnahmeprofil verwendet.",
  });

  await expect(conflict).toBeFocused();
  await expect(page.getByLabel("Name")).toHaveValue("Bob Participant");
  await expect(
    page.getByRole("heading", { name: "Teilnahmeprofil einrichten" }),
  ).toBeVisible();
  expect((await page.request.get("/api/participant/me")).status()).toBe(403);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Teilnahmeprofil einrichten" }),
  ).toBeVisible();
  await expectAccessibleLayout(page);
});

for (const [viewportName, viewport] of Object.entries({
  desktop: desktopViewport,
  narrow: narrowViewport,
})) {
  test(`presents every Participant state accessibly at the ${viewportName} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    let releaseParticipant;
    const participantGate = new Promise((resolve) => {
      releaseParticipant = resolve;
    });

    await page.route("**/api/participant/me", async (route) => {
      await participantGate;
      await fulfillJson(route, 401, { outcome: "unauthenticated" });
    });
    await page.goto("/");
    await expect(
      page.getByRole("status").filter({
        hasText: "Teilnahmestatus wird geladen …",
      }),
    ).toBeVisible();
    await expectAccessibleLayout(page);
    releaseParticipant();
    await expect(
      page.getByRole("button", { name: "Weiter mit Google" }),
    ).toBeVisible();

    await showParticipantState(page, {
      status: 401,
      body: { outcome: "unauthenticated" },
      url: "/?authentication=failed",
    });
    const callbackFailure = page.getByRole("alert").filter({
      hasText:
        "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    });

    await expect(callbackFailure).toBeFocused();
    await expectAccessibleLayout(page);

    await showParticipantState(page, {
      status: 403,
      body: { outcome: "no-participant" },
    });
    const nameInput = page.getByLabel("Name");
    const emailInput = page.getByLabel("E-Mail-Adresse");
    const submitButton = page.getByRole("button", {
      name: "Teilnahmeprofil erstellen",
    });

    await page.route("**/api/participant/onboarding", (route) =>
      fulfillJson(route, 422, { outcome: "invalid-name" }),
    );
    await nameInput.fill("Server Name");
    await emailInput.fill("server@example.com");
    await submitButton.click();
    await expect(nameInput).toBeFocused();
    await expectFieldErrorAssociation(
      nameInput,
      page,
      "Bitte geben Sie einen Namen ein.",
    );

    await page.unroute("**/api/participant/onboarding");
    await page.route("**/api/participant/onboarding", (route) =>
      fulfillJson(route, 422, { outcome: "invalid-email" }),
    );
    await nameInput.fill("Server Name");
    await emailInput.fill("server@example.com");
    await submitButton.click();
    await expect(emailInput).toBeFocused();
    await expectFieldErrorAssociation(
      emailInput,
      page,
      "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    );

    await page.unroute("**/api/participant/onboarding");
    await page.route("**/api/participant/onboarding", (route) =>
      fulfillJson(route, 409, { outcome: "participant-already-exists" }),
    );
    await nameInput.fill("Stale Name");
    await emailInput.fill("stale@example.com");
    await submitButton.click();
    await expect(
      page.getByRole("alert").filter({
        hasText: "Der aktuelle Status wird neu geladen.",
      }),
    ).toBeFocused();
    await expectAccessibleLayout(page);

    await showParticipantState(page, {
      status: 403,
      body: { outcome: "disabled-participant" },
    });
    await expect(
      page.getByRole("alert").filter({
        hasText: "Dieses Teilnahmeprofil ist deaktiviert.",
      }),
    ).toBeVisible();
    await expectAccessibleLayout(page);

    await showParticipantState(page, {
      status: 200,
      body: {
        id: "participant-active",
        name: "Ada Participant",
        email: "ada@example.com",
        state: "active",
      },
    });
    await expect(page.getByText("Ada Participant")).toBeVisible();
    await expectZeroMembership(page);
    await page.route("**/api/auth/sign-out", (route) =>
      fulfillJson(route, 500, { message: "test sign-out failure" }),
    );
    await page.getByRole("button", { name: "Abmelden" }).click();
    await page.getByRole("button", { name: "Jetzt abmelden" }).click();
    const signOutFailure = page.getByRole("alert").filter({
      hasText:
        "Die Abmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    });

    await expect(signOutFailure).toBeFocused();
    await expectAccessibleLayout(page);

    await showParticipantState(page, {
      status: 500,
      body: { outcome: "technical-error" },
    });
    await expect(
      page.getByRole("alert").filter({
        hasText: "Der Teilnahmestatus konnte nicht geladen werden.",
      }),
    ).toBeVisible();
    await expectAccessibleLayout(page);
  });
}

/**
 * Present one deterministic current-Participant state.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {object} state Stubbed response and optional destination.
 * @returns {Promise<void>} Completion after the route is rendered.
 */
async function showParticipantState(page, { status, body, url = "/" }) {
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/participant/me", (route) =>
    fulfillJson(route, status, body),
  );
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/**
 * Establish one fixed normal non-production application session.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {"participant-a" | "participant-b"} fixtureName Fixed fixture name.
 * @returns {Promise<void>} Completion after session establishment.
 */
async function establishFixture(page, fixtureName) {
  const response = await page.request.post(
    `/api/_fixtures/session/${fixtureName}`,
  );

  expect(response.status()).toBe(204);
}

/**
 * Assert the truthful no-Assignment Participant home state.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after empty-state assertions.
 */
async function expectZeroMembership(page) {
  const emptyState = page.getByRole("status").filter({
    hasText: "Noch keinen Kursen zugeordnet",
  });

  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText("kein öffentliches Kursverzeichnis");
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
 * Assert a keyboard-focused control has the visible theme outline.
 *
 * @param {import("@playwright/test").Locator} control Focused control.
 * @returns {Promise<void>} Completion after focus and style assertions.
 */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
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
