import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("promotes real ordinary Admins and grants fresh Super authority", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize(desktopViewport);
  const firstSuper = await ensureFirstAdmin(page, "Befördernde Super Admina");
  const ordinaryA = await ensureOrdinaryAdmin(
    page,
    "admin-invite-a",
    "Beförderbare Admina",
  );
  const ordinaryB = await ensureOrdinaryAdmin(
    page,
    "admin-invite-b",
    "Zweiter ordentlicher Admin",
  );

  await establishFixture(page, "admin-invite-b");
  const ordinaryRefusal = await page.request.post(
    `/api/admin/users/${ordinaryA.id}/promotion`,
  );

  expect(ordinaryRefusal.status()).toBe(409);
  await expect(ordinaryRefusal.json()).resolves.toEqual({
    outcome: "admin-user-not-promotable",
  });

  await establishFixture(page, "admin-invite-a");
  const establishedOrdinaryCookies = await page.context().cookies();
  await establishFixture(page, "first-admin");
  await page.goto(`/admin/users?${new URLSearchParams({ q: "Admina" })}`);
  const table = page.getByRole("table", {
    name: "Verzeichnis der Administrationskonten",
  });
  const targetRow = adminRow(table, ordinaryA.name);

  await targetRow.getByRole("link", { name: "Namen bearbeiten" }).click();
  await expect(page).toHaveURL(`/admin/users/${ordinaryA.id}`);
  const opener = page.getByRole("button", {
    name: "Zum Super Admin befördern",
  });

  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Administrationskonto zum Super Admin befördern?",
  });

  await expect(dialog).toContainText("dauerhafte Berechtigungsänderung");
  await expect(dialog).toContainText("kann nicht rückgängig gemacht werden");
  await expect(dialog.getByText(ordinaryA.name)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.keyboard.press("Tab");
  const confirm = dialog.getByRole("button", { name: "Dauerhaft befördern" });

  await expect(confirm).toBeFocused();
  await page.keyboard.press("Enter");
  const success = page.getByRole("status").filter({
    hasText: `${ordinaryA.name} wurde dauerhaft zum Super Admin befördert`,
  });

  await expect(success).toBeFocused();
  await expect(page.getByRole("button", {
    name: "Zum Super Admin befördern",
  })).toHaveCount(0);
  await expectAccessibleLayout(page);

  await page.reload();
  await expect(page.getByRole("heading", { name: ordinaryA.name })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Zum Super Admin befördern",
  })).toHaveCount(0);
  await expect(page.getByText(/herabstufen/i)).toHaveCount(0);

  await page.context().addCookies(establishedOrdinaryCookies);
  const current = await page.request.get("/api/admin/me");

  expect(current.status()).toBe(200);
  await expect(current.json()).resolves.toMatchObject({
    id: ordinaryA.id,
    authority: "super-admin",
  });
  const secondPromotion = await page.request.post(
    `/api/admin/users/${ordinaryB.id}/promotion`,
  );

  expect(secondPromotion.status()).toBe(200);
  await expect(secondPromotion.json()).resolves.toMatchObject({
    id: ordinaryB.id,
    authority: "super-admin",
  });
  await page.goto(`/admin/users/${firstSuper.id}`);
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Zum Super Admin befördern",
  })).toHaveCount(0);
});

test("presents stale and Disabled promotion states accessibly at 360px", async ({
  page,
}) => {
  await page.setViewportSize(narrowViewport);
  await ensureFirstAdmin(page, "Promotion Contract Super");
  let staleWon = false;

  await page.route(
    "**/api/admin/users/stale-promotion/promotion",
    async (route) => {
      staleWon = true;
      await fulfillJson(route, 409, {
        outcome: "admin-user-not-promotable",
      });
    },
  );
  await page.route("**/api/admin/users/stale-promotion", async (route) => {
    await fulfillJson(route, 200, staleWon
      ? contractAdmin(
          "stale-promotion",
          "Parallel befördertes Konto",
          "active",
          "super-admin",
          true,
          false,
        )
      : contractAdmin(
          "stale-promotion",
          "Parallel befördertes Konto",
          "active",
          "admin",
          true,
          true,
        ));
  });
  await page.goto("/admin/users/stale-promotion");
  await page.getByRole("button", { name: "Zum Super Admin befördern" }).click();
  await page.getByRole("button", { name: "Dauerhaft befördern" }).click();
  const stale = page.getByRole("alert").filter({
    hasText: "geänderten Status oder einer geänderten Berechtigung",
  });

  await expect(stale).toBeFocused();
  await expect(page.getByRole("dialog")).toContainText(
    "Parallel befördertes Konto",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByText("Super Admin", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Zum Super Admin befördern",
  })).toHaveCount(0);

  const disabled = contractAdmin(
    "disabled-promotion",
    "Deaktiviertes Administrationskonto",
    "disabled",
    "admin",
    true,
    false,
  );

  await page.route("**/api/admin/users/disabled-promotion", (route) =>
    fulfillJson(route, 200, disabled));
  await page.goto("/admin/users/disabled-promotion");
  await expect(page.getByText("Deaktiviert", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Zum Super Admin befördern",
  })).toHaveCount(0);
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
  const current = await getCurrentAdmin(page);

  if (current.name === name) return current;
  const update = await page.request.put(`/api/admin/users/${current.id}`, {
    data: { name },
  });

  expect(update.status()).toBe(200);
  return update.json();
}

/** @returns {Promise<object>} Ensure one invited fixed ordinary Admin. */
async function ensureOrdinaryAdmin(page, fixtureName, name) {
  await establishFixture(page, fixtureName);
  const currentResponse = await page.request.get("/api/admin/me");

  if (currentResponse.status() === 200) {
    const current = await currentResponse.json();
    const update = await page.request.put(`/api/admin/users/${current.id}`, {
      data: { name },
    });

    expect(update.status()).toBe(200);
    return update.json();
  }

  await ensureFirstAdmin(page, "Befördernde Super Admina");
  const inviteResponse = await page.request.post("/api/admin/invites");

  expect(inviteResponse.status()).toBe(201);
  const invite = (await inviteResponse.json()).invite;
  const token = new URL(invite.url).hash.slice(1);
  const recognition = await page.request.post("/api/admin-invite/recognition", {
    data: { token },
  });

  expect(recognition.status()).toBe(200);
  await establishFixture(page, fixtureName);
  const claim = await page.request.post("/api/admin-invite/claim", {
    data: { name },
  });

  expect(claim.status()).toBe(201);
  return (await claim.json()).adminUser;
}

/** @returns {Promise<object>} Read the current successful Admin context. */
async function getCurrentAdmin(page) {
  const response = await page.request.get("/api/admin/me");

  expect(response.status()).toBe(200);
  return response.json();
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

/** @returns {object} One narrow intercepted Admin User representation. */
function contractAdmin(
  id,
  name,
  state,
  authority,
  isNameEditable,
  isPromotionAvailable,
) {
  return {
    id,
    name,
    state,
    authority,
    isNameEditable,
    isPromotionAvailable,
  };
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
