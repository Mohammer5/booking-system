import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("deletes a Group after its Selection was removed", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Löschbarer Gruppenkurs");
  const target = await createGroup(page, course.id, "Gruppe Entfernen");
  await createGroup(page, course.id, "Gruppe Behalten");
  const module = await createFutureModule(page, course.id, "Auswahl entfernen");

  await assignParticipant(page, course.id, participant.id);
  await establishFixture(page, "selection-participant");
  const selectionPath =
    `/api/participant/courses/${course.id}/modules/${module.id}/selection`;
  const selected = await page.request.put(selectionPath, {
    data: { groupId: target.id },
  });
  expect(selected.status()).toBe(201);
  const removed = await page.request.delete(selectionPath);
  expect(removed.status()).toBe(200);

  await ensureActiveAdmin(page);
  await page.goto(`/admin/courses/${course.id}/groups/${target.id}`);
  let targetCard = groupCard(page, target.id);
  const deleteAction = targetCard.getByRole("button", {
    name: "Gruppe löschen",
  });

  await deleteAction.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", {
    name: "Gruppe endgültig löschen?",
  });

  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText("Gruppe Entfernen");
  await expect(dialog).toContainText("nicht rückgängig gemacht");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(deleteAction);

  await deleteAction.click();
  dialog = page.getByRole("dialog", { name: "Gruppe endgültig löschen?" });
  await dialog
    .getByRole("button", { name: "Gruppe endgültig löschen" })
    .click();
  const success = page.getByRole("status").filter({
    hasText: "Die Gruppe „Gruppe Entfernen“ wurde endgültig gelöscht.",
  });

  await expect(success).toBeFocused();
  await expect(targetCard).toBeHidden();
  const collectionTable = page.getByRole("table", {
    name: "Gruppensammlung dieses Kurses",
  });

  await expect(collectionTable).toContainText("Gruppe Behalten");
  await expect(collectionTable).not.toContainText("Gruppe Entfernen");
  await expectAccessibleLayout(page);

  await page.reload();
  targetCard = groupCard(page, target.id);
  await expect(targetCard).toHaveCount(0);
  await expect(collectionTable).toContainText("Gruppe Behalten");
  await page.setViewportSize(narrowViewport);
  await expect(page.getByRole("list", { name: "Gruppen des Kurses" }))
    .toContainText("Gruppe Behalten");
  await expectAccessibleLayout(page);
});

test("explains retained historical and Cancelled reference blockers privately", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Gruppenreferenzen");
  const historical = await createGroup(
    page,
    course.id,
    "Gruppe mit historischer Auswahl",
  );
  const cancelled = await createGroup(
    page,
    course.id,
    "Gruppe mit abgesagter Auswahl",
  );

  for (const group of [historical, cancelled]) {
    await page.route(`**${groupPath(course.id, group.id)}`, async (route) => {
      if (route.request().method() === "DELETE") {
        await fulfillJson(route, 409, { outcome: "group-deletion-blocked" });
        return;
      }
      await route.continue();
    });
  }

  for (const group of [historical, cancelled]) {
    await page.goto(`/admin/courses/${course.id}/groups/${group.id}`);
    const card = groupCard(page, group.id);
    const deleteAction = card.getByRole("button", { name: "Gruppe löschen" });

    await deleteAction.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Gruppe endgültig löschen?",
    });
    await dialog
      .getByRole("button", { name: "Gruppe endgültig löschen" })
      .click();
    const blocker = dialog.getByRole("alert").filter({
      hasText: "mindestens eine aktuelle Teilnahmeauswahl",
    });

    await expect(blocker).toBeFocused();
    await expect(dialog).not.toContainText("private@example.com");
    await expect(dialog).not.toContainText("Private Person");
    await expect(card).toBeVisible();
    await page.keyboard.press("Escape");
    await expectVisibleKeyboardFocus(deleteAction);
  }

  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {import("@playwright/test").Locator} Stable Group article. */
function groupCard(page, groupId) {
  return page.locator(`article[aria-labelledby="group-${groupId}-title"]`);
}

/** @returns {string} Stable nested Group path. */
function groupPath(courseId, groupId) {
  return `/api/admin/courses/${courseId}/groups/${groupId}`;
}

/** @returns {Promise<object>} Ensure the fixed Participant exists. */
async function ensureParticipant(page) {
  await establishFixture(page, "selection-participant");
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Group Deletion Participant",
        email: "group-deletion-participant@example.com",
      },
    });
    expect(response.status()).toBe(201);
  }

  return response.json();
}

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Group Deletion Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Create one Active Course. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name: `${name} ${crypto.randomUUID()}` },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one Course-owned Group. */
async function createGroup(page, courseId, name) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/groups`,
    { data: { name } },
  );

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create one future Scheduled Module. */
async function createFutureModule(page, courseId, title) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/modules`,
    {
      data: {
        title,
        startsAtLocal: "2027-09-01T10:00",
        endsAtLocal: "2027-09-01T11:00",
      },
    },
  );

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<void>} Add one current Participant Course assignment. */
async function assignParticipant(page, courseId, participantId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/assignments`,
    { data: { participantId } },
  );

  expect([200, 201]).toContain(response.status());
}

/** @returns {Promise<void>} Establish one fixed application session. */
async function establishFixture(page, fixture) {
  const response = await page.request.post(`/api/_fixtures/session/${fixture}`);

  expect(response.status()).toBe(204);
}

/** @returns {Promise<void>} Fulfill one intercepted JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert axe accessibility and responsive overflow. */
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

/** @returns {Promise<void>} Assert visible focus styling. */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
}
