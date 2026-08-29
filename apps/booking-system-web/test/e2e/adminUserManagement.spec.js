import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("lists and edits real fixed Super and ordinary Admin identities", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize(desktopViewport);
  const superAdmin = await ensureFirstAdmin(page, "Verzeichnis Super Admin");
  const ordinaryA = await ensureOrdinaryAdmin(
    page,
    "admin-invite-a",
    "Ordentliche Admina A",
  );
  const ordinaryB = await ensureOrdinaryAdmin(
    page,
    "admin-invite-b",
    "Ordentlicher Admin B",
  );

  await establishFixture(page, "admin-invite-a");
  await page.goto("/admin/users");
  const table = page.getByRole("table", {
    name: "Verzeichnis der Administrationskonten",
  });

  await expect(table).toBeVisible();
  await expect(adminRow(table, ordinaryA.name)).toContainText("Admin");
  await expect(adminRow(table, ordinaryB.name)).toContainText("Aktiv");
  await expect(adminRow(table, superAdmin.name)).toContainText("Super Admin");
  await expect(
    adminRow(table, superAdmin.name).getByRole("link", {
      name: "Details anzeigen",
    }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("fixture-");
  await expectAccessibleLayout(page);

  await adminRow(table, ordinaryA.name)
    .getByRole("link", { name: "Namen bearbeiten" })
    .click();
  await expect(page).toHaveURL(`/admin/users/${ordinaryA.id}`);
  await expect(page.getByText("Anmeldeprofil übernommen")).toBeVisible();
  await submitInvalidName(page);
  await page.getByLabel("Name").fill("Ordentliche Admina Selbst");
  await submitNameWithKeyboard(page);
  await expect(nameSuccess(page)).toBeFocused();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Ordentliche Admina Selbst");
  await page.goto("/admin");
  await expect(page.getByText("Ordentliche Admina Selbst")).toBeVisible();

  await page.goto(`/admin/users/${ordinaryB.id}`);
  await page.getByLabel("Name").fill("Ordentlicher Admin durch Peer");
  await page.getByRole("button", { name: "Namen speichern" }).click();
  await expect(nameSuccess(page)).toBeFocused();
  await page.goto(`/admin/users/${superAdmin.id}`);
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await expect(page.getByText("Sie dürfen den Namen")).toBeVisible();

  await establishFixture(page, "first-admin");
  await page.goto(`/admin/users/${ordinaryB.id}`);
  await page.getByLabel("Name").fill("Ordentlicher Admin durch Super");
  await submitNameWithKeyboard(page);
  await expect(nameSuccess(page)).toBeFocused();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue(
    "Ordentlicher Admin durch Super",
  );
  await expectAccessibleLayout(page);

  await page.setViewportSize(narrowViewport);
  await page.goto("/admin/users");
  await expect(table).toBeHidden();
  const list = page.getByRole("list", {
    name: "Liste der Administrationskonten",
  });

  await expect(list).toBeVisible();
  await expect(list.getByText("Ordentliche Admina Selbst")).toBeVisible();
  await page.getByRole("main").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Zur Administration" }))
    .toBeFocused();
  await expectAccessibleLayout(page);
});

test("presents future lifecycle states and stale edit losses accessibly", async ({
  page,
}) => {
  await page.setViewportSize(narrowViewport);
  await ensureFirstAdmin(page, "Contract Super Admin");
  let secondSuper = contractAdmin(
    "contract-super",
    "Zweite Super Admina",
    "active",
    "super-admin",
    true,
  );

  await page.route("**/api/admin/users/contract-super", async (route) => {
    if (route.request().method() === "PUT") {
      secondSuper = { ...secondSuper, name: route.request().postDataJSON().name };
    }

    await fulfillJson(route, 200, secondSuper);
  });
  await page.goto("/admin/users/contract-super");
  await expect(page.getByText("Super Admin", { exact: true })).toBeVisible();
  await page.getByLabel("Name").fill("Zweite Super Admina bearbeitet");
  await submitNameWithKeyboard(page);
  await expect(nameSuccess(page)).toBeFocused();

  const disabledTarget = contractAdmin(
    "disabled-target",
    "Deaktiviertes Administrationskonto",
    "disabled",
    "admin",
    true,
  );

  await page.route("**/api/admin/users/disabled-target", (route) =>
    fulfillJson(route, 200, disabledTarget));
  await page.goto("/admin/users/disabled-target");
  await expect(page.getByText("Deaktiviert", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expectAccessibleLayout(page);

  await page.route("**/api/admin/users/stale-target", async (route) => {
    if (route.request().method() === "PUT") {
      await fulfillJson(route, 409, { outcome: "admin-user-not-editable" });
      return;
    }

    await fulfillJson(route, 200, contractAdmin(
      "stale-target",
      "Stales Administrationskonto",
      "active",
      "admin",
      true,
    ));
  });
  await page.goto("/admin/users/stale-target");
  await page.getByLabel("Name").fill("Verlorener Name");
  await page.getByRole("button", { name: "Namen speichern" }).click();
  const stale = page.getByRole("alert").filter({
    hasText: "geänderten Administrationsstatus",
  });

  await expect(stale).toBeFocused();
  await expect(page.getByLabel("Name")).toHaveValue("Verlorener Name");

  await page.route("**/api/admin/me", (route) =>
    fulfillJson(route, 403, { outcome: "disabled-admin" }));
  await page.reload();
  await expect(page.getByText("Dieses Administrationskonto ist deaktiviert."))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "Administrationskonto" }))
    .toHaveCount(0);
  await expectAccessibleLayout(page);
});

test("focuses loading, empty, error, and unavailable directory states", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureFirstAdmin(page, "State Super Admin");
  let releaseDirectory;
  const directoryGate = new Promise((resolve) => {
    releaseDirectory = resolve;
  });

  await page.route("**/api/admin/users", async (route) => {
    await directoryGate;
    await fulfillJson(route, 200, { adminUsers: [] });
  });
  await page.goto("/admin/users");
  await expect(page.getByRole("status").filter({
    hasText: "Administrationskonten werden geladen",
  })).toBeVisible();
  releaseDirectory();
  await expect(page.getByText("Es sind keine aktuellen Administrationskonten"))
    .toBeVisible();
  await page.unroute("**/api/admin/users");

  await page.route("**/api/admin/users", (route) =>
    fulfillJson(route, 500, { outcome: "technical-error" }));
  await page.reload();
  await expect(page.getByRole("alert")).toBeFocused();
  await page.unroute("**/api/admin/users");
  await page.route("**/api/admin/users/missing", (route) =>
    fulfillJson(route, 404, { outcome: "admin-user-not-found" }));
  await page.goto("/admin/users/missing");
  await expect(page.getByRole("alert").filter({
    hasText: "nicht mehr verfügbar",
  })).toBeFocused();
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

  await ensureFirstAdmin(page, "Verzeichnis Super Admin");
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

/** @returns {Promise<void>} Submit a blank local validation result. */
async function submitInvalidName(page) {
  const name = page.getByLabel("Name");

  await name.fill(" ");
  await page.getByRole("button", { name: "Namen speichern" }).click();
  await expect(name).toBeFocused();
  await expect(page.getByText("Bitte geben Sie einen Namen ein.")).toBeVisible();
}

/** @returns {Promise<void>} Submit the name form through keyboard navigation. */
async function submitNameWithKeyboard(page) {
  const submit = page.getByRole("button", { name: "Namen speichern" });

  await page.getByLabel("Name").focus();
  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");
}

/** @returns {object} Successful focused name result. */
function nameSuccess(page) {
  return page.getByRole("status").filter({
    hasText: "Name des Administrationskontos wurde gespeichert",
  });
}

/** @returns {object} One narrow intercepted Admin User representation. */
function contractAdmin(id, name, state, authority, isNameEditable) {
  return {
    id,
    name,
    state,
    authority,
    isNameEditable,
    isPromotionAvailable: false,
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
