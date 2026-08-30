import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };
const courseId = "collection-course-00";

test.beforeEach(async ({ page }) => {
  const session = await page.request.post("/api/_fixtures/session/first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Course Module Admin" },
  });
  const seed = await page.request.post("/api/_fixtures/admin-collections");

  expect(session.status()).toBe(204);
  expect([201, 409]).toContain(bootstrap.status());
  expect(seed.status()).toBe(204);
});

test("owns Module list state and preserves Course-local semantic instants", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const base = `/admin/courses/${courseId}/modules`;

  await page.goto(`${base}?page=2&pageSize=10`);
  const table = page.getByRole("table", {
    name: "Modulsammlung dieses Kurses",
  });

  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table).toContainText("Collection Module 11");
  await expect(table.locator("time")).toHaveCount(4);
  await expect(table.locator("time").first())
    .toHaveAttribute("datetime", /2026-08-11T08:00:00\.000Z/);
  await expect(table).toContainText("Europe/Berlin");
  await page.reload();
  await expect(page).toHaveURL(`${base}?pageSize=10&page=2`);

  await page.goto(`${base}?page=bad&pageSize=20&sort=private.asc&unknown=x`);
  await expect(page).toHaveURL(base);
  await page.goto(
    `${base}?q=Collection+Module+11&state=cancelled&sort=state.desc&pageSize=10`,
  );
  await expect(table).toContainText("Collection Module 11");
  await expect(table).toContainText("Abgesagt");
  await page.reload();
  await expect(page).toHaveURL(
    `${base}?q=Collection+Module+11&state=cancelled&sort=state.desc&pageSize=10`,
  );
  await page.goBack();
  await expect(page).toHaveURL(base);
  await page.goForward();
  await expect(page).toHaveURL(
    `${base}?q=Collection+Module+11&state=cancelled&sort=state.desc&pageSize=10`,
  );

  await page.getByLabel(
    "Module dieses Kurses nach Titel, Beschreibung oder Hinweisen durchsuchen",
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

  const row = table.getByRole("row").filter({
    hasText: "Collection Module 00",
  });

  await row.getByRole("link", { name: "Modul öffnen" }).click();
  await expect(page).toHaveURL(`${base}/collection-module-00`);
  await expect(page.getByRole("navigation", {
    name: "Administrationsressourcen",
  }).getByRole("link", { name: "Kurse verwalten" }))
    .toHaveAttribute("aria-current", "page");
  const breadcrumbs = page.getByRole("navigation", { name: "Kurspfad" });

  await expect(breadcrumbs.getByRole("link", { name: "Module" }))
    .toHaveAttribute("href", `${base}?sort=state.desc&pageSize=10`);
  await page.goBack();
  await expect(page).toHaveURL(`${base}?sort=state.desc&pageSize=10`);
  await expectAccessibleLayout(page);
});

test("creates, edits, reschedules, cancels, and deletes on stable Module routes", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const base = `/admin/courses/${courseId}/modules`;

  await page.goto(`${base}/new`);
  const title = page.getByLabel("Modultitel");
  const startsAt = page.getByLabel("Beginn (lokale Kurszeit)");
  const endsAt = page.getByLabel("Ende (lokale Kurszeit)");
  const submit = page.getByRole("button", { name: "Modul speichern" });

  await title.fill("Route Module");
  await startsAt.fill("2027-03-28T02:30");
  await endsAt.fill("2027-03-28T04:00");
  await submit.click();
  await expect(startsAt).toBeFocused();
  await expect(page.getByText(
    "Dieser Beginn existiert wegen der Zeitumstellung in der Kurszeitzone nicht.",
  )).toBeVisible();

  await startsAt.fill("2027-10-31T02:30");
  await endsAt.fill("2027-10-31T03:30");
  await submit.click();
  const occurrences = page.getByRole("radiogroup", {
    name: "Beginn: beabsichtigtes Vorkommen",
  });
  const later = occurrences.getByRole("radio", { name: /Zweites Vorkommen/ });

  await expect(occurrences.getByRole("radio", { name: /Erstes Vorkommen/ }))
    .toBeFocused();
  await expect(submit).toBeDisabled();
  await later.check();
  await submit.click();
  await expect(page).toHaveURL(new RegExp(`${base}/[^/?]+$`));
  await expect(page.getByRole("status").filter({
    hasText: "Das Modul wurde erfolgreich angelegt.",
  })).toBeFocused();
  const detailUrl = page.url();
  const card = page.locator("article");

  await expect(card.getByRole("heading", { name: "Route Module" })).toBeVisible();
  await expect(card.getByText("2027-10-31T01:30:00.000Z")).toBeVisible();
  await card.getByLabel("Modultitel bearbeiten").fill("Route Module geändert");
  await card.getByLabel("Modulbeschreibung bearbeiten").fill("Neue Beschreibung");
  await card.getByRole("button", { name: "Modulinhalt speichern" }).click();
  await expect(card.getByRole("status").filter({
    hasText: "Der Modulinhalt wurde gespeichert.",
  })).toBeFocused();

  await card.getByLabel("Neuer Beginn (lokale Kurszeit)")
    .fill("2027-12-01T10:00");
  await card.getByLabel("Neues Ende (lokale Kurszeit)")
    .fill("2027-12-01T11:00");
  await card.getByRole("button", { name: "Modulzeitraum speichern" }).click();
  await expect(card.getByRole("status").filter({
    hasText: "Der Modulzeitraum wurde gespeichert.",
  })).toBeFocused();
  await expect(card.getByText("2027-12-01T09:00:00.000Z")).toBeVisible();

  const cancel = card.getByRole("button", { name: "Modul absagen" });

  await cancel.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", { name: "Modul endgültig absagen?" });

  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(cancel).toBeFocused();
  await cancel.click();
  dialog = page.getByRole("dialog", { name: "Modul endgültig absagen?" });
  await dialog.getByRole("button", { name: "Modul endgültig absagen" }).click();
  await expect(card.getByRole("status").filter({
    hasText: "Das Modul wurde abgesagt.",
  })).toBeFocused();
  await expect(card).toContainText("Das Modul ist endgültig abgesagt");

  await card.getByRole("button", { name: "Modul löschen" }).click();
  dialog = page.getByRole("dialog", { name: "Modul endgültig löschen?" });
  await dialog.getByRole("button", { name: "Modul endgültig löschen" }).click();
  await expect(page).toHaveURL(base);
  await expect(page.getByRole("status").filter({
    hasText: "Das Modul „Route Module geändert“ wurde endgültig gelöscht.",
  })).toBeFocused();
  await page.goto(detailUrl);
  await expect(page.getByRole("alert").filter({
    hasText: "Das angeforderte Modul wurde nicht gefunden.",
  }))
    .toBeFocused();
  await expectAccessibleLayout(page);
});

test("keeps Archived Course Module routes visible and read-only", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  const base = `/admin/courses/${courseId}/modules`;
  const archived = await page.request.post(`/api/admin/courses/${courseId}/archival`);

  expect(archived.status()).toBe(200);
  await page.goto(base);
  await expect(page.getByText("Dieser Kurs ist archiviert.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Modul anlegen" })).toHaveCount(0);
  await page.goto(`${base}/collection-module-00`);
  await expect(page.getByRole("heading", { name: "Collection Module 00" }))
    .toBeVisible();
  await expect(page.getByRole("button", { name: /Modul (absagen|löschen)/ }))
    .toHaveCount(0);
  await expect(page.getByLabel("Modultitel bearbeiten")).toHaveCount(0);
  await expect(page.locator("time")).toHaveCount(2);
  await page.goto(`${base}/new`);
  await expect(page.getByText("Dieser Kurs ist archiviert.")).toBeVisible();
  await expect(page.getByLabel("Modultitel", { exact: true })).toHaveCount(0);
  await expectAccessibleLayout(page);
});

test("renders the Module collection as narrow cards without overflow", async ({ page }) => {
  await page.setViewportSize(narrowViewport);
  await page.goto(`/admin/courses/${courseId}/modules?pageSize=10`);

  await expect(page.getByRole("list", { name: "Module des Kurses" }))
    .toContainText("Collection Module 00");
  await expect(page.getByRole("table", {
    name: "Modulsammlung dieses Kurses",
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
