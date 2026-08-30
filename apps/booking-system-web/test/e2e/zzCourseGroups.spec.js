import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };
const courseId = "collection-course-00";

test.beforeEach(async ({ page }) => {
  const session = await page.request.post("/api/_fixtures/session/first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Course Group Admin" },
  });
  const seed = await page.request.post("/api/_fixtures/admin-collections");

  expect(session.status()).toBe(204);
  expect([201, 409]).toContain(bootstrap.status());
  expect(seed.status()).toBe(204);
});

test("owns Group list state and navigates create and detail resources", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const base = `/admin/courses/${courseId}/groups`;

  await page.goto(`${base}?page=2&pageSize=10`);
  const table = page.getByRole("table", {
    name: "Gruppensammlung dieses Kurses",
  });

  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table).toContainText("Collection Group 11");
  await page.reload();
  await expect(page).toHaveURL(`${base}?pageSize=10&page=2`);

  await page.goto(`${base}?page=bad&pageSize=20&sort=private.asc&unknown=x`);
  await expect(page).toHaveURL(base);
  await page.goto(
    `${base}?q=Collection+Group+11&state=archived&sort=state.desc&pageSize=10`,
  );
  await expect(table).toContainText("Collection Group 11");
  await expect(table).toContainText("Archiviert");
  await page.reload();
  await expect(page).toHaveURL(
    `${base}?q=Collection+Group+11&state=archived&sort=state.desc&pageSize=10`,
  );
  await page.goBack();
  await expect(page).toHaveURL(base);
  await page.goForward();
  await expect(page).toHaveURL(
    `${base}?q=Collection+Group+11&state=archived&sort=state.desc&pageSize=10`,
  );

  await page.getByLabel(
    "Gruppen dieses Kurses nach Name oder Details durchsuchen",
  ).fill("nicht vorhanden");
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  const filteredEmpty = page.getByRole("status").filter({
    hasText: "Für die gewählten Filter wurden keine Ergebnisse gefunden.",
  });

  await expect(filteredEmpty).toBeVisible();
  await filteredEmpty.getByRole("button", {
    name: "Filter zurücksetzen",
  }).click();
  await expect(page).toHaveURL(`${base}?sort=state.desc&pageSize=10`);

  const row = table.getByRole("row").filter({ hasText: "Collection Group 11" });

  await row.getByRole("link", { name: "Gruppe öffnen" }).click();
  await expect(page).toHaveURL(
    `${base}/collection-group-11`,
  );
  await expect(page.getByRole("navigation", {
    name: "Administrationsressourcen",
  }).getByRole("link", { name: "Kurse verwalten" }))
    .toHaveAttribute("aria-current", "page");
  const breadcrumbs = page.getByRole("navigation", { name: "Kurspfad" });

  await expect(breadcrumbs.getByRole("link", { name: "Gruppen" }))
    .toHaveAttribute("href", `${base}?sort=state.desc&pageSize=10`);
  await page.goBack();
  await expect(page).toHaveURL(`${base}?sort=state.desc&pageSize=10`);

  await page.getByRole("link", { name: "Gruppe anlegen" }).click();
  await expect(page).toHaveURL(`${base}/new`);
  const name = page.getByLabel("Gruppenname", { exact: true });

  await page.getByRole("button", { name: "Gruppe speichern" }).click();
  await expect(name).toBeFocused();
  await name.fill("Route Group");
  await page.getByLabel("Details", { exact: true }).fill("Complete route details");
  await page.getByRole("button", { name: "Gruppe speichern" }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/[^/?]+$`));
  await expect(page.getByRole("status").filter({
    hasText: "Die Gruppe wurde erfolgreich angelegt.",
  })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Route Group" })).toBeVisible();
  const detailURL = page.url();

  await page.goto(`${base}/new`);
  await page.getByLabel("Gruppenname", { exact: true }).fill(" ROUTE GROUP ");
  await page.getByRole("button", { name: "Gruppe speichern" }).click();
  await expect(page.getByLabel("Gruppenname", { exact: true })).toBeFocused();
  await expect(page.getByText(
    "Eine aktive Gruppe mit diesem Namen existiert bereits in diesem Kurs.",
  )).toBeVisible();
  await page.goto(detailURL);
  await page.reload();
  await expect(page.getByText("Complete route details")).toBeVisible();
  await expectAccessibleLayout(page);
});

test("keeps Archived Course Group routes visible and read-only", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  const base = `/admin/courses/${courseId}/groups`;
  const archived = await page.request.post(`/api/admin/courses/${courseId}/archival`);

  expect(archived.status()).toBe(200);
  await page.goto(base);
  await expect(page.getByText("Dieser Kurs ist archiviert.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Gruppe anlegen" })).toHaveCount(0);
  await page.goto(`${base}/collection-group-00`);
  await expect(page.getByRole("heading", { name: "Collection Group 00" }))
    .toBeVisible();
  await expect(page.getByRole("button", { name: /Gruppe (archivieren|löschen)/ }))
    .toHaveCount(0);
  await expect(page.getByLabel("Gruppenname bearbeiten")).toHaveCount(0);
  await page.goto(`${base}/new`);
  await expect(page.getByText("Dieser Kurs ist archiviert.")).toBeVisible();
  await expect(page.getByLabel("Gruppenname", { exact: true })).toHaveCount(0);
  await expectAccessibleLayout(page);
});

test("renders the Group collection as narrow cards without overflow", async ({ page }) => {
  await page.setViewportSize(narrowViewport);
  await page.goto(`/admin/courses/${courseId}/groups?pageSize=10`);

  await expect(page.getByRole("list", { name: "Gruppen des Kurses" }))
    .toContainText("Collection Group 00");
  await expect(page.getByRole("table", {
    name: "Gruppensammlung dieses Kurses",
  })).toHaveCount(0);
  await expectAccessibleLayout(page);
});

/** Assert axe accessibility and no horizontal page overflow. */
async function expectAccessibleLayout(page) {
  const results = await new AxeBuilder({ page }).analyze();
  const hasHorizontalOverflow = await page.evaluate(
    () => globalThis.document.documentElement.scrollWidth >
      globalThis.document.documentElement.clientWidth,
  );

  expect(results.violations).toEqual([]);
  expect(hasHorizontalOverflow).toBe(false);
}
