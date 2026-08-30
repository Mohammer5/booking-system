import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };
const courseId = "collection-course-00";
const detailPath = `/admin/courses/${courseId}`;

test.beforeEach(async ({ page }) => {
  const session = await page.request.post("/api/_fixtures/session/first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Focused Course Admin" },
  });
  const seed = await page.request.post("/api/_fixtures/admin-collections");

  expect(session.status()).toBe(204);
  expect([201, 409]).toContain(bootstrap.status());
  expect(seed.status()).toBe(204);
});

test("keeps Course detail focused and links equal retained totals", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  const detail = await readFocusedDetail(page);

  expect(detail.counts).toEqual({ participants: 12, groups: 12, modules: 12 });
  expect(detail).not.toHaveProperty("groups");
  expect(detail).not.toHaveProperty("modules");
  expect(detail).not.toHaveProperty("assignments");
  await expectCollectionTotals(page, detail);

  await page.goto(detailPath);
  await expect(page.getByRole("heading", { name: "Collection Course 00" }))
    .toBeVisible();
  const breadcrumbs = page.getByRole("navigation", { name: "Kurspfad" });

  await expect(breadcrumbs.getByRole("link", { name: "Kurse" }))
    .toHaveAttribute("href", "/admin/courses");
  await expect(breadcrumbs.getByText("Collection Course 00")).toBeVisible();
  await expectNoEmbeddedCollections(page);

  for (const [label, resource] of [
    ["12 Teilnehmende", "participants"],
    ["12 Gruppen", "groups"],
    ["12 Module", "modules"],
  ]) {
    await page.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(`${detailPath}/${resource}`);
    await expect(page.getByText("1–12 von 12")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(detailPath);
  }

  await page.reload();
  await expect(page.getByRole("link", { name: "12 Module" })).toBeVisible();
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("retains all linked totals on an Archived read-only Course", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  const archived = await page.request.post(`/api/admin/courses/${courseId}/archival`);

  expect(archived.status()).toBe(200);
  const detail = await readFocusedDetail(page);

  expect(detail.state).toBe("archived");
  expect(detail.counts).toEqual({ participants: 12, groups: 12, modules: 12 });
  await expectCollectionTotals(page, detail);
  await page.goto(detailPath);
  await expect(page.getByText(/Dieser Kurs ist endgültig archiviert/)).toBeVisible();
  await expect(page.getByRole("link", { name: "12 Teilnehmende" })).toBeVisible();
  await expect(page.getByRole("link", { name: "12 Gruppen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "12 Module" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kurs bearbeiten" }))
    .toHaveCount(0);
  await expectNoEmbeddedCollections(page);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<object>} One narrow Course detail response. */
async function readFocusedDetail(page) {
  const response = await page.request.get(`/api/admin/courses/${courseId}`);

  expect(response.status()).toBe(200);
  return response.json();
}

/** Assert the three unfiltered nested totals equal focused Course counts. */
async function expectCollectionTotals(page, detail) {
  for (const [resource, countKey] of [
    ["assignments", "participants"],
    ["groups", "groups"],
    ["modules", "modules"],
  ]) {
    const response = await page.request.get(
      `/api/admin/courses/${courseId}/${resource}`,
    );
    const collection = await response.json();

    expect(response.status()).toBe(200);
    expect(collection.pagination.totalItems).toBe(detail.counts[countKey]);
  }
}

/** Assert the parent detail does not duplicate child discovery/management. */
async function expectNoEmbeddedCollections(page) {
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Gruppen des Kurses" }))
    .toHaveCount(0);
  await expect(page.getByRole("list", { name: "Module des Kurses" }))
    .toHaveCount(0);
  await expect(page.getByLabel("Gruppenname", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Modultitel", { exact: true })).toHaveCount(0);
}

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
