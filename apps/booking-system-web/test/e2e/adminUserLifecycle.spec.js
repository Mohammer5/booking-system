import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("manages real Admin lifecycles without cascading shared identity", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize(desktopViewport);
  const firstSuper = await ensureFirstAdmin(page, "Lifecycle Super Admin");
  const ordinaryActor = await ensureOrdinaryAdmin(
    page,
    "admin-invite-a",
    "Lifecycle Admina",
  );
  const ordinaryTarget = await ensureOrdinaryAdmin(
    page,
    "admin-invite-b",
    "Lifecycle Zielkonto",
  );
  await establishFixture(page, "admin-invite-b");
  const participant = await ensureParticipant(page);
  const targetCookies = await page.context().cookies();

  await establishFixture(page, "admin-invite-a");
  const protectedResponse = await page.request.delete(
    `/api/admin/users/${firstSuper.id}`,
  );

  expect(protectedResponse.status()).toBe(409);
  await expect(protectedResponse.json()).resolves.toEqual({
    outcome: "admin-user-not-manageable",
  });
  await page.goto(`/admin/users/${firstSuper.id}`);
  await expect(page.getByText("Nur ein aktiver Super Admin darf"))
    .toBeVisible();
  await expect(page.getByRole("button", { name: "Deaktivieren" }))
    .toHaveCount(0);
  await expect(page.getByRole("button", { name: "Löschen" }))
    .toHaveCount(0);

  await page.goto("/admin/users");
  const table = page.getByRole("table", {
    name: "Verzeichnis der Administrationskonten",
  });
  const targetRow = adminRow(table, ordinaryTarget.name);
  const disableOpener = targetRow.getByRole("button", {
    name: "Deaktivieren",
  });

  await disableOpener.click();
  const disableDialog = page.getByRole("dialog", {
    name: "Administrationskonto deaktivieren?",
  });

  await expect(disableDialog).toContainText("verliert sofort");
  await expect(disableDialog).toContainText("bleiben unverändert");
  await expect(disableDialog).toContainText("Teilnehmendenprofil");
  await expect(disableDialog.getByRole("button", { name: "Abbrechen" }))
    .toBeFocused();
  await page.keyboard.press("Escape");
  await expect(disableDialog).toHaveCount(0);
  await expect(disableOpener).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(disableDialog.getByRole("button", { name: "Abbrechen" }))
    .toBeFocused();
  await page.keyboard.press("Tab");
  await expect(disableDialog.getByRole("button", {
    name: "Administrationskonto deaktivieren",
  })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({
    hasText: `${ordinaryTarget.name} wurde deaktiviert`,
  })).toBeFocused();
  await expect(targetRow).toContainText("Deaktiviert");
  await expect(targetRow.getByRole("button", { name: "Wieder aktivieren" }))
    .toBeVisible();

  await page.context().addCookies(targetCookies);
  await expectOutcome(await page.request.get("/api/admin/me"), 403,
    "disabled-admin");
  const participantWhileDisabled = await page.request.get(
    "/api/participant/me",
  );

  expect(participantWhileDisabled.status()).toBe(200);
  await expect(participantWhileDisabled.json()).resolves.toMatchObject({
    id: participant.id,
    state: "active",
  });

  await establishFixture(page, "admin-invite-a");
  await targetRow.getByRole("button", { name: "Wieder aktivieren" }).click();
  const reenableDialog = page.getByRole("dialog", {
    name: "Administrationskonto wieder aktivieren?",
  });

  await expect(reenableDialog).toContainText("dieselbe Identität");
  await reenableDialog.getByRole("button", {
    name: "Administrationskonto wieder aktivieren",
  }).click();
  await expect(page.getByRole("status").filter({
    hasText: "unveränderter Berechtigung wieder aktiviert",
  })).toBeFocused();

  await page.context().addCookies(targetCookies);
  const restored = await page.request.get("/api/admin/me");

  expect(restored.status()).toBe(200);
  await expect(restored.json()).resolves.toMatchObject({
    id: ordinaryTarget.id,
    authority: ordinaryTarget.authority,
  });

  await establishFixture(page, "admin-invite-a");
  await targetRow.getByRole("button", { name: "Löschen" }).click();
  const deleteDialog = page.getByRole("dialog", {
    name: "Administrationskonto dauerhaft löschen?",
  });

  await expect(deleteDialog).toContainText("neuen Admin-Einladung");
  await expect(deleteDialog).toContainText("neue gewöhnliche Admin-Identität");
  await expect(deleteDialog).toContainText("bleiben unverändert");
  await deleteDialog.getByRole("button", {
    name: "Administrationskonto dauerhaft löschen",
  }).click();
  await expect(page.getByRole("status").filter({
    hasText: `${ordinaryTarget.name} wurde als Administrationskonto gelöscht`,
  })).toBeFocused();
  await expect(adminRow(table, ordinaryTarget.name)).toHaveCount(0);

  await page.context().addCookies(targetCookies);
  await expectOutcome(await page.request.get("/api/admin/me"), 403,
    "no-admin-user");
  await expect((await page.request.get("/api/participant/me")).json())
    .resolves.toMatchObject({ id: participant.id, state: "active" });
  const returned = await returnThroughNewInvite(
    page,
    "admin-invite-b",
    "Neu eingeladene Admina",
  );

  expect(returned.id).not.toBe(ordinaryTarget.id);
  expect(returned).toMatchObject({
    name: "Neu eingeladene Admina",
    state: "active",
    authority: "admin",
  });

  await establishFixture(page, "first-admin");
  expect((await page.request.post(
    `/api/admin/users/${ordinaryActor.id}/promotion`,
  )).status()).toBe(200);
  await page.goto("/admin/users");
  const promotedRow = adminRow(table, ordinaryActor.name);

  await expect(promotedRow).toContainText("Super Admin");
  await expect(promotedRow.getByRole("button", { name: "Deaktivieren" }))
    .toBeVisible();
  await expect(promotedRow.getByRole("button", { name: "Löschen" }))
    .toBeVisible();
  await expectAccessibleLayout(page);

  expect((await page.request.delete(
    `/api/admin/users/${ordinaryActor.id}`,
  )).status()).toBe(200);
  const returnedActor = await returnThroughNewInvite(
    page,
    "admin-invite-a",
    "Lifecycle Admina zurückgekehrt",
  );

  expect(returnedActor.authority).toBe("admin");
  expect(returnedActor.id).not.toBe(ordinaryActor.id);
});

test("presents narrow stale, final-Super, and self protection accessibly", async ({
  page,
}) => {
  await page.setViewportSize(narrowViewport);
  await ensureFirstAdmin(page, "Lifecycle Contract Super");
  let refreshed = false;

  await page.route("**/api/admin/users/stale-lifecycle/disablement", (route) =>
    fulfillJson(route, 409, { outcome: "admin-user-last-active-super" }));
  await page.route("**/api/admin/users/stale-lifecycle", async (route) => {
    refreshed = true;
    await fulfillJson(route, 200, contractAdmin({
      id: "stale-lifecycle",
      name: "Parallel geschütztes Super-Konto",
      authority: "super-admin",
      isDisableAvailable: true,
      isDeleteAvailable: true,
    }));
  });
  await page.goto("/admin/users/stale-lifecycle");
  const opener = page.getByRole("button", { name: "Deaktivieren" });

  await opener.click();
  await page.getByRole("button", {
    name: "Administrationskonto deaktivieren",
  }).click();
  const invariant = page.getByRole("alert").filter({
    hasText: "mindestens ein aktiver Super Admin erhalten bleiben",
  });

  await expect(invariant).toBeFocused();
  expect(refreshed).toBe(true);
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await expectAccessibleLayout(page);

  await page.unroute("**/api/admin/users/stale-lifecycle/disablement");
  await page.unroute("**/api/admin/users/stale-lifecycle");
  await page.route("**/api/admin/users/self-lifecycle", (route) =>
    fulfillJson(route, 200, contractAdmin({
      id: "self-lifecycle",
      name: "Eigenes Super-Konto",
      authority: "super-admin",
      lifecycleRestriction: "self-protected",
    })));
  await page.goto("/admin/users/self-lifecycle");
  await expect(page.getByText("Das eigene Administrationskonto kann nicht"))
    .toBeVisible();
  await expect(page.getByText("mindestens ein aktiver Super Admin geschützt"))
    .toBeVisible();
  await expect(page.getByRole("button", { name: "Deaktivieren" }))
    .toHaveCount(0);
  await expect(page.getByRole("button", { name: "Löschen" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("fixture-");
  await expectAccessibleLayout(page);

  await page.route("**/api/admin/me", (route) =>
    fulfillJson(route, 403, { outcome: "disabled-admin" }));
  await page.reload();
  await expect(page.getByText("Dieses Administrationskonto ist deaktiviert."))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "Administrationskonto" }))
    .toHaveCount(0);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<object>} Ensure the fixed first Super Admin. */
async function ensureFirstAdmin(page, name) {
  await establishFixture(page, "first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name },
  });

  expect([201, 409]).toContain(bootstrap.status());
  const current = await page.request.get("/api/admin/me");

  expect(current.status()).toBe(200);
  const adminUser = await current.json();

  if (adminUser.name === name) return adminUser;
  const update = await page.request.put(`/api/admin/users/${adminUser.id}`, {
    data: { name },
  });

  expect(update.status()).toBe(200);
  return update.json();
}

/** @returns {Promise<object>} Ensure one fixed ordinary Admin. */
async function ensureOrdinaryAdmin(page, fixtureName, name) {
  await establishFixture(page, fixtureName);
  const current = await page.request.get("/api/admin/me");

  if (current.status() === 200) {
    const adminUser = await current.json();
    const update = await page.request.put(`/api/admin/users/${adminUser.id}`, {
      data: { name },
    });

    expect(update.status()).toBe(200);
    return update.json();
  }

  await ensureFirstAdmin(page, "Lifecycle Super Admin");
  const invite = await createInvite(page);

  await recognizeInvite(page, invite);
  await establishFixture(page, fixtureName);
  const claim = await page.request.post("/api/admin-invite/claim", {
    data: { name },
  });

  expect(claim.status()).toBe(201);
  return (await claim.json()).adminUser;
}

/** @returns {Promise<object>} Ensure the target's independent Participant. */
async function ensureParticipant(page) {
  const current = await page.request.get("/api/participant/me");

  if (current.status() === 200) return current.json();
  const created = await page.request.post("/api/participant/onboarding", {
    data: {
      name: "Eigenständige Teilnehmerin",
      email: "lifecycle-participant@example.com",
    },
  });

  expect(created.status()).toBe(201);
  return created.json();
}

/** @returns {Promise<object>} Return one deleted principal through a new Invite. */
async function returnThroughNewInvite(page, fixtureName, name) {
  await establishFixture(page, "first-admin");
  const invite = await createInvite(page);

  await recognizeInvite(page, invite);
  await establishFixture(page, fixtureName);
  const claim = await page.request.post("/api/admin-invite/claim", {
    data: { name },
  });

  expect(claim.status()).toBe(201);
  return (await claim.json()).adminUser;
}

/** @returns {Promise<object>} Create one real Admin Invite. */
async function createInvite(page) {
  const response = await page.request.post("/api/admin/invites");

  expect(response.status()).toBe(201);
  return (await response.json()).invite;
}

/** @returns {Promise<void>} Recognize one real Invite continuation. */
async function recognizeInvite(page, invite) {
  const token = new URL(invite.url).hash.slice(1);
  const response = await page.request.post("/api/admin-invite/recognition", {
    data: { token },
  });

  expect(response.status()).toBe(200);
}

/** @returns {object} One bounded intercepted Admin representation. */
function contractAdmin(overrides) {
  return {
    id: "contract-admin",
    name: "Contract Admin",
    state: "active",
    authority: "admin",
    isNameEditable: true,
    isPromotionAvailable: false,
    isDisableAvailable: false,
    isReenableAvailable: false,
    isDeleteAvailable: false,
    lifecycleRestriction: null,
    ...overrides,
  };
}

/** @returns {Promise<void>} Establish one fixed normal application session. */
async function establishFixture(page, fixtureName) {
  const response = await page.request.post(
    `/api/_fixtures/session/${fixtureName}`,
  );

  expect(response.status()).toBe(204);
}

/** @returns {object} Find one semantic desktop row by visible name. */
function adminRow(table, name) {
  return table.getByRole("row").filter({ hasText: name });
}

/** @returns {Promise<void>} Fulfill one bounded JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert one exact response outcome. */
async function expectOutcome(response, status, outcome) {
  expect(response.status()).toBe(status);
  await expect(response.json()).resolves.toEqual({ outcome });
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
