import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("continues without consuming and creates one ordinary Admin", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize(desktopViewport);
  await ensureFirstAdmin(page);
  const invite = await createInvite(page);
  const rawToken = new URL(invite.url).hash.slice(1);

  await context.clearCookies();
  await page.goto(invite.url);
  await expect(page).toHaveURL(/\/admin\/invite$/);
  await expect(page.getByRole("heading", { name: "Admin-Einladung" }))
    .toBeVisible();
  const google = page.getByRole("button", { name: "Weiter mit Google" });

  await expect(google).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    sessionStorage.getItem("booking-system.admin-invite-token"),
  )).toBeNull();
  await expect(page.locator("body")).not.toContainText(rawToken);
  await expectAccessibleLayout(page);

  await page.reload();
  await expect(google).toBeVisible();
  const abandonedContinuation = await page.request.get(
    "/api/admin-invite/continuation",
  );

  expect(abandonedContinuation.status()).toBe(200);
  expect(await abandonedContinuation.json()).toEqual({ outcome: "available" });

  await page.route("**/api/auth/sign-in/social", async (route) => {
    const body = route.request().postDataJSON();

    expect(body).toEqual({
      provider: "google",
      callbackURL: "/admin/invite",
      errorCallbackURL: "/api/auth/admin-invite-error",
    });
    expect(JSON.stringify(body)).not.toContain(rawToken);
    await fulfillJson(route, 503, { message: "test initiation failure" });
  });
  await google.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert").filter({
    hasText: "Die Anmeldung ist fehlgeschlagen.",
  })).toBeFocused();
  await page.unroute("**/api/auth/sign-in/social");

  await establishFixture(page, "admin-invite-a");
  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Administrationskonto einrichten",
  })).toBeVisible();
  const name = page.getByLabel("Name");
  const submit = page.getByRole("button", {
    name: "Administrationskonto erstellen",
  });

  await name.fill(" ");
  await submit.click();
  await expect(page.getByText("Geben Sie einen Namen ein.")).toBeVisible();
  const invalidContinuation = await page.request.get(
    "/api/admin-invite/continuation",
  );

  expect(invalidContinuation.status()).toBe(200);
  await page.reload();
  await expect(name).toBeVisible();

  await name.fill("Eingeladene Admina");
  const claimResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/admin-invite/claim" &&
    response.request().method() === "POST",
  );
  await submit.click();
  const claimResponse = await claimResponsePromise;
  const claimBody = await claimResponse.json();

  expect(claimResponse.status()).toBe(201);
  expect(claimBody.adminUser).toMatchObject({
    name: "Eingeladene Admina",
    state: "active",
    authority: "admin",
  });
  const success = page.getByRole("status").filter({
    hasText: "Ihr Administrationskonto wurde erstellt",
  });

  await expect(success).toBeFocused();
  await expect(page.getByRole("link", { name: "Zur Administration" }))
    .toBeVisible();
  const participant = await page.request.get("/api/participant/me");

  expect(participant.status()).toBe(403);
  await expectInviteState(page, invite.id, "claimed", rawToken);
  await page.reload();
  await expect(page.getByText("Diese Admin-Einladung ist nicht verfügbar."))
    .toBeVisible();
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("keeps existing, terminal, unknown, and returning states private", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize(desktopViewport);
  await ensureFirstAdmin(page);
  const existingInvite = await createInvite(page);
  let claimRequests = 0;

  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/admin-invite/claim") {
      claimRequests += 1;
    }
  });
  await page.goto(existingInvite.url);
  const existing = page.getByRole("alert").filter({
    hasText: "besteht bereits ein Administrationskonto",
  });

  await expect(existing).toBeFocused();
  expect(claimRequests).toBe(0);
  await expectInviteState(page, existingInvite.id, "active");

  await context.clearCookies();
  await establishFixture(page, "admin-invite-b");
  await page.goto(existingInvite.url);
  await page.getByLabel("Name").fill("Zweite Admina");
  await page.getByRole("button", {
    name: "Administrationskonto erstellen",
  }).click();
  await expect(page.getByRole("status").filter({
    hasText: "Ihr Administrationskonto wurde erstellt",
  })).toBeFocused();

  await context.clearCookies();
  await page.goto(existingInvite.url);
  const unavailable = page.getByRole("alert").filter({
    hasText: "Diese Admin-Einladung ist nicht verfügbar.",
  });

  await expect(unavailable).toBeFocused();
  await page.goto(`/admin/invite#${"f".repeat(64)}`);
  await expect(unavailable).toBeFocused();
  await expect(page.locator("body")).not.toContainText("claimed");

  await ensureFirstAdmin(page);
  const revokedInvite = await createInvite(page);
  const revoked = await page.request.post(
    `/api/admin/invites/${revokedInvite.id}/revocation`,
  );

  expect(revoked.status()).toBe(200);
  await context.clearCookies();
  await page.goto(revokedInvite.url);
  await expect(unavailable).toBeFocused();

  await ensureFirstAdmin(page);
  const returningInvite = await createInvite(page);

  await context.clearCookies();
  await establishFixture(page, "returning-admin");
  await page.goto(returningInvite.url);
  await page.getByLabel("Name").fill("Zurückgekehrte Admina");
  await page.getByRole("button", {
    name: "Administrationskonto erstellen",
  }).click();
  await expect(page.getByRole("status").filter({
    hasText: "Ihr Administrationskonto wurde erstellt",
  })).toBeFocused();

  await ensureFirstAdmin(page);
  const disabledInvite = await createInvite(page);
  const claimsBeforeDisabled = claimRequests;

  await context.clearCookies();
  await page.route("**/api/admin/me", (route) =>
    fulfillJson(route, 403, { outcome: "disabled-admin" }),
  );
  await page.goto(disabledInvite.url);
  await expect(existing).toBeFocused();
  expect(claimRequests).toBe(claimsBeforeDisabled);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Ensure the fixed first Super Admin exists. */
async function ensureFirstAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Admin Invite Owner" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Create one real Admin Invite. */
async function createInvite(page) {
  const response = await page.request.post("/api/admin/invites");

  expect(response.status()).toBe(201);
  return (await response.json()).invite;
}

/** @returns {Promise<void>} Establish one fixed normal session. */
async function establishFixture(page, name) {
  const response = await page.request.post(`/api/_fixtures/session/${name}`);

  expect(response.status()).toBe(204);
}

/** @returns {Promise<void>} Assert one Invite through its non-secret Admin list. */
async function expectInviteState(page, inviteId, state, secret) {
  const response = await page.request.get("/api/admin/invites");
  const text = await response.text();
  const body = JSON.parse(text);

  expect(response.status()).toBe(200);
  if (secret !== undefined) expect(text).not.toContain(secret);
  expect(body.invites.find(({ id }) => id === inviteId)).toMatchObject({ state });
}

/** @returns {Promise<void>} Fulfill one bounded JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert responsive overflow and axe. */
async function expectAccessibleLayout(page) {
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((body) => body.clientWidth),
  );
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
}
