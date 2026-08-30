import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test.beforeEach(async ({ page }) => {
  const session = await page.request.post("/api/_fixtures/session/first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Collection Super Admin" },
  });
  const seed = await page.request.post("/api/_fixtures/admin-collections");

  expect(session.status()).toBe(204);
  expect([201, 409]).toContain(bootstrap.status());
  expect(seed.status()).toBe(204);
});

test("owns Course search, filter, sort, pagination, repair, and history in the URL", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await page.goto(
    "/admin/courses?page=0&pageSize=20&sort=private.asc&state=deleted&q=%20%20&unknown=x",
  );
  await expect(page).toHaveURL("/admin/courses");
  await expect(page.getByRole("table", { name: "Kurssammlung" })).toBeVisible();

  await page.goto("/admin/courses?q=Collection&pageSize=10");
  const table = page.getByRole("table", { name: "Kurssammlung" });

  await expect(table.getByRole("row")).toHaveCount(11);
  await expect(page.getByText("1–10 von 12")).toBeVisible();
  await page.getByRole("button", { name: "Zur nächsten Seite" }).click();
  await expect(page).toHaveURL(
    "/admin/courses?q=Collection&pageSize=10&page=2",
  );
  await expect(table).toContainText("Collection Course 11");
  await page.reload();
  await expect(page).toHaveURL(
    "/admin/courses?q=Collection&pageSize=10&page=2",
  );
  await expect(table).toContainText("Collection Course 10");
  await page.goBack();
  await expect(page).toHaveURL("/admin/courses?q=Collection&pageSize=10");
  await page.goForward();
  await expect(page).toHaveURL(
    "/admin/courses?q=Collection&pageSize=10&page=2",
  );

  const nameSort = table.getByRole("button", { name: /Name/ });

  await nameSort.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    "/admin/courses?q=Collection&sort=name.desc&pageSize=10",
  );
  await expect(nameSort).toBeFocused();
  await chooseOption(page, "Kursstatus", "Archiviert");
  await expect(page).toHaveURL(
    "/admin/courses?q=Collection&state=archived&sort=name.desc&pageSize=10",
  );
  await expect(table).toContainText("Collection Course 11");

  await page.getByLabel("Kurse durchsuchen").fill("nicht vorhanden");
  await page.getByRole("button", { name: "Suchen" }).click();
  const filteredEmpty = page.getByRole("status").filter({
    hasText: "Für die gewählten Filter wurden keine Ergebnisse gefunden.",
  });

  await expect(filteredEmpty).toBeVisible();
  await filteredEmpty.getByRole("button", { name: "Filter zurücksetzen" }).click();
  await expect(page).toHaveURL("/admin/courses?sort=name.desc&pageSize=10");
  await expect(page.getByLabel("Kurse durchsuchen")).toHaveValue("");
  await expectAccessibleLayout(page);
});

test("restores Participant, Admin User, and Invite collection bookmarks", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await page.goto(
    "/admin/participants?q=Collection+Participant+11&state=disabled&sort=email.desc&pageSize=10",
  );
  const participants = page.getByRole("table", {
    name: "Globale Teilnehmendensammlung",
  });

  await expect(participants).toContainText("Collection Participant 11");
  await expect(participants).toContainText("collection-11@example.com");
  await page.reload();
  await expect(page).toHaveURL(
    "/admin/participants?q=Collection+Participant+11&state=disabled&sort=email.desc&pageSize=10",
  );
  await expect(page.getByRole("link", { name: "Teilnahmeprofil öffnen und bearbeiten" }))
    .toBeVisible();
  await expect(page.getByRole("button", { name: /Teilnehmende anlegen/i }))
    .toHaveCount(0);

  await page.goto(
    "/admin/users?q=Collection+Admin+11&state=disabled&authority=admin&sort=authority.desc",
  );
  const adminUsers = page.getByRole("table", {
    name: "Verzeichnis der Administrationskonten",
  });

  await expect(adminUsers).toContainText("Collection Admin 11");
  await expect(page.getByRole("button", { name: "Deaktivieren" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Zum Super Admin befördern" }))
    .toHaveCount(0);
  await expect(adminUsers.getByRole("link", { name: "Namen bearbeiten" }))
    .toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(
    "/admin/users?q=Collection+Admin+11&state=disabled&authority=admin&sort=authority.desc",
  );

  await page.goto("/admin/invites?state=claimed&sort=state.asc");
  const invites = page.getByRole("table", {
    name: "Sammlung der Admin-Einladungen",
  });

  await expect(invites.getByRole("row")).toHaveCount(5);
  await expect(invites).toContainText("Status: Eingelöst");
  await expect(page.getByRole("button", { name: "Admin-Einladung widerrufen" }))
    .toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL("/admin/invites?state=claimed&sort=state.asc");
  await expectAccessibleLayout(page);
});

for (const collection of [
  {
    path: "/admin/courses?q=Collection",
    list: "Kursliste",
    item: "Collection Course 00",
  },
  {
    path: "/admin/participants?q=Collection",
    list: "Verzeichnis der Teilnehmenden",
    item: "Collection Participant 00",
  },
  {
    path: "/admin/users?q=Collection",
    list: "Liste der Administrationskonten",
    item: "Collection Admin 00",
  },
  {
    path: "/admin/invites",
    list: "Liste der Admin-Einladungen",
    item: "Admin-Einladung",
  },
]) {
  test(`renders ${collection.path} as the narrow card equivalent`, async ({ page }) => {
    await page.setViewportSize(narrowViewport);
    await page.goto(collection.path);

    await expect(page.getByRole("table")).toBeHidden();
    const list = page.getByRole("list", { name: collection.list });

    await expect(list).toBeVisible();
    await expect(list.getByText(collection.item).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Sortierung" })).toBeVisible();
    await expect(page.getByText(/1–12 von 12|1–13 von 13/)).toBeVisible();
    await expectAccessibleLayout(page);
  });
}

/** Select one MUI collection option by accessible names. */
async function chooseOption(page, label, option) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Assert axe accessibility and absence of horizontal page overflow. */
async function expectAccessibleLayout(page) {
  const results = await new AxeBuilder({ page }).analyze();
  const hasHorizontalOverflow = await page.evaluate(
    () => globalThis.document.documentElement.scrollWidth >
      globalThis.document.documentElement.clientWidth,
  );

  expect(results.violations).toEqual([]);
  expect(hasHorizontalOverflow).toBe(false);
}
