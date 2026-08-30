import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };
const courseId = "collection-course-00";

test("owns paginated Course Participants and server-searches picker targets", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await seedCollections(page);
  await page.goto(
    `/admin/courses/${courseId}/participants?page=2&pageSize=10`,
  );
  const table = page.getByRole("table", {
    name: "Teilnehmende und Kurszuordnungen dieses Kurses",
  });

  await expect(table).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table).toContainText("Collection Participant 10");
  await expect(table).toContainText("Kurszuordnung: Widerrufen");
  await page.reload();
  await expect(page).toHaveURL(
    `/admin/courses/${courseId}/participants?pageSize=10&page=2`,
  );
  await expect(table).toBeVisible();

  await page.goto(
    `/admin/courses/${courseId}/participants?page=wrong&sort=raw.sql&unknown=x`,
  );
  await expect(page).toHaveURL(`/admin/courses/${courseId}/participants`);
  await page.goto(
    `/admin/courses/${courseId}/participants?q=Collection+Participant+11&participantState=disabled&sort=email.desc&pageSize=10`,
  );
  await expect(table).toContainText("Collection Participant 11");
  await expect(table).toContainText("Teilnahmeprofil: Deaktiviert");
  await page.reload();
  await expect(page).toHaveURL(
    `/admin/courses/${courseId}/participants?q=Collection+Participant+11&participantState=disabled&sort=email.desc&pageSize=10`,
  );
  await page.goBack();
  await expect(page).toHaveURL(`/admin/courses/${courseId}/participants`);
  await page.goForward();
  await expect(page).toHaveURL(
    `/admin/courses/${courseId}/participants?q=Collection+Participant+11&participantState=disabled&sort=email.desc&pageSize=10`,
  );
  await page.getByLabel(
    "Teilnehmende dieses Kurses nach Name oder E-Mail durchsuchen",
  ).fill("nicht vorhanden");
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  const filteredEmpty = page.getByRole("status").filter({
    hasText: "Für die gewählten Filter wurden keine Ergebnisse gefunden.",
  });

  await expect(filteredEmpty).toBeVisible();
  await filteredEmpty.getByRole("button", {
    name: "Filter zurücksetzen",
  }).click();
  await expect(page).toHaveURL(
    `/admin/courses/${courseId}/participants?sort=email.desc&pageSize=10`,
  );
  await page.getByLabel("Zuordnungsstatus").click();
  await page.getByRole("option", { name: "Kurszuordnung: Widerrufen" }).click();
  await expect(page).toHaveURL(
    `/admin/courses/${courseId}/participants?assignmentState=revoked&sort=email.desc&pageSize=10`,
  );
  await expect(table).toContainText("Collection Participant 11");
  await expectAccessibleLayout(page);

  await page.getByRole("button", { name: "Teilnehmende zuordnen" }).click();
  const assignmentDialog = page.getByRole("dialog", {
    name: "Teilnehmende zum Kurs zuordnen",
  });
  const search = assignmentDialog.getByLabel(
    "Teilnahmeprofile nach Name oder E-Mail durchsuchen",
  );

  await expect(search).toBeFocused();
  await expect(assignmentDialog.getByText("Collection Participant 10"))
    .toHaveCount(0);
  await search.fill("collection-10@example.com");
  await search.press("Enter");
  const target = assignmentDialog.getByRole("radio", {
    name: /Collection Participant 10/,
  });

  await expect(target).toBeVisible();
  await target.focus();
  await page.keyboard.press("Space");
  await assignmentDialog.getByRole("button", {
    name: "Kurszuordnung speichern",
  }).click();
  await expect(page.getByRole("status").filter({
    hasText: "Die aktive Kurszuordnung bestand bereits",
  })).toBeFocused();

  await page.getByRole("button", {
    name: "Modulauswahl stellvertretend verwalten",
  }).click();
  const assistedDialog = page.getByRole("dialog", {
    name: "Teilnahmeprofil für Modulauswahl öffnen",
  });
  const assistedSearch = assistedDialog.getByLabel(
    "Teilnahmeprofile nach Name oder E-Mail durchsuchen",
  );

  await assistedSearch.fill("collection-10@example.com");
  await assistedSearch.press("Enter");
  await assistedDialog.getByRole("radio", {
    name: /Collection Participant 10/,
  }).check();
  await assistedDialog.getByRole("button", {
    name: "Modulauswahlen öffnen",
  }).click();
  await expect(page).toHaveURL(
    `/admin/courses/${courseId}/participants/collection-participant-10`,
  );
  await expect(page.getByRole("navigation", { name: "Kurspfad" }))
    .toContainText("Collection Participant 10");
  await expect(page.getByText("Kurszuordnung: Aktiv")).toBeVisible();
  await expectAccessibleLayout(page);
});

test("replaces compatibility URLs and renders the narrow collection cards", async ({
  page,
}) => {
  await page.setViewportSize(narrowViewport);
  await seedCollections(page);
  await page.goto("/admin/courses");
  await page.goto(`/admin/courses/${courseId}/participation`);
  await expect(page).toHaveURL(`/admin/courses/${courseId}/participants`);
  await expect(page.getByRole("list", {
    name: "Teilnehmende dieses Kurses",
  })).toBeVisible();
  await expect(page.getByRole("table", {
    name: "Teilnehmende und Kurszuordnungen dieses Kurses",
  })).toHaveCount(0);
  await expectAccessibleLayout(page);

  await page.goto(
    `/admin/courses/${courseId}/participation/collection-participant-00`,
  );
  await expect(page).toHaveURL(
    `/admin/courses/${courseId}/participants/collection-participant-00`,
  );
  await expect(page.getByRole("heading", {
    name: "Teilnahme von Collection Participant 00",
  })).toBeVisible();
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Active Admin plus deterministic multi-page data. */
async function seedCollections(page) {
  const session = await page.request.post("/api/_fixtures/session/first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Course Participant Admin" },
  });
  const seed = await page.request.post("/api/_fixtures/admin-collections");

  expect(session.status()).toBe(204);
  expect([201, 409]).toContain(bootstrap.status());
  expect(seed.status()).toBe(204);
}

/** @returns {Promise<void>} Assert axe and no horizontal page overflow. */
async function expectAccessibleLayout(page) {
  const results = await new AxeBuilder({ page }).analyze();
  const hasHorizontalOverflow = await page.evaluate(
    () => globalThis.document.documentElement.scrollWidth >
      globalThis.document.documentElement.clientWidth,
  );

  expect(results.violations).toEqual([]);
  expect(hasHorizontalOverflow).toBe(false);
}
