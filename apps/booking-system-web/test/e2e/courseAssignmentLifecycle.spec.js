import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("revokes and reactivates one Course without restoring its future Selection", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureParticipant(page);
  const setup = await createLifecycleCourses(page, participant.id);

  await establishFixture(page, "later-admin");
  await page.goto(`/courses/${setup.courseA.id}`);
  const moduleCard = moduleItem(page, setup.module.title);

  await moduleCard.getByRole("radio", { name: setup.group.name }).check();
  await moduleCard.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(moduleCard).toContainText(`Ausgewählte Gruppe: ${setup.group.name}`);

  await page.context().clearCookies();
  await ensureActiveAdmin(page);
  await page.goto(`/admin/courses/${setup.courseA.id}`);
  let memberCard = membershipCard(page, participant.name);
  const revokeButton = memberCard.getByRole("button", {
    name: "Kurszuordnung widerrufen",
  });

  await revokeButton.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", { name: "Kurszuordnung widerrufen?" });

  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText("Der Kurszugriff endet sofort.");
  await expect(dialog).toContainText(
    "bereits begonnene oder abgesagte Modulauswahlen bleiben als Historie erhalten",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(revokeButton);

  await revokeButton.click();
  await dialog
    .getByRole("button", { name: "Zuordnung endgültig widerrufen" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Die Kurszuordnung wurde widerrufen und der Kurszugriff entfernt.",
    }),
  ).toBeFocused();
  memberCard = membershipCard(page, participant.name);
  await expect(memberCard).toContainText("Kurszuordnung: Widerrufen");

  const repeated = await page.request.post(
    `/api/admin/courses/${setup.courseA.id}/assignments/${setup.assignmentA.id}/revocation`,
  );

  expect(repeated.status()).toBe(200);
  await expect(repeated.json()).resolves.toMatchObject({
    outcome: "already-revoked",
    removedSelectionCount: 0,
  });

  await page.context().clearCookies();
  await establishFixture(page, "later-admin");
  await page.goto("/");
  await expect(courseListItem(page, setup.courseB.name)).toBeVisible();
  await expect(courseListItem(page, setup.courseA.name)).toHaveCount(0);
  await page.goto(`/courses/${setup.courseA.id}`);
  await expect(
    page.getByRole("alert").filter({
      hasText: "Dieser Kursbereich ist für Ihr aktuelles Teilnahmeprofil nicht verfügbar.",
    }),
  ).toBeFocused();
  await expect(page.getByText(setup.courseA.name)).toHaveCount(0);

  await page.context().clearCookies();
  await ensureActiveAdmin(page);
  await page.goto(`/admin/courses/${setup.courseA.id}`);
  memberCard = membershipCard(page, participant.name);
  const reactivateButton = memberCard.getByRole("button", {
    name: "Kurszuordnung reaktivieren",
  });

  await reactivateButton.click();
  dialog = page.getByRole("dialog", { name: "Kurszuordnung reaktivieren?" });
  await expect(dialog).toContainText(
    "Beim Widerruf entfernte künftige Modulauswahlen kehren nicht zurück.",
  );
  await dialog.getByRole("button", { name: "Zuordnung reaktivieren" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Die bestehende Kurszuordnung wurde reaktiviert.",
    }),
  ).toBeFocused();

  await page.context().clearCookies();
  await establishFixture(page, "later-admin");
  await page.goto(`/courses/${setup.courseA.id}`);
  await expect(moduleItem(page, setup.module.title)).toContainText("Keine Auswahl");

  const currentDetailResponse = await page.request.get(
    `/api/participant/courses/${setup.courseA.id}`,
  );
  expect(currentDetailResponse.status()).toBe(200);
  const currentDetail = await currentDetailResponse.json();
  const retainedCancelledModule = {
    ...setup.module,
    id: "module-retained-cancelled-lifecycle",
    title: "Lifecycle Retained Cancelled Module",
    state: "cancelled",
    selectionAvailability: "closed",
    selection: {
      id: "selection-retained-cancelled-lifecycle",
      meaning: "historical",
      phase: "cancelled",
      group: setup.group,
    },
  };

  await page.route(`**/api/participant/courses/${setup.courseA.id}`, (route) =>
    fulfillJson(route, 200, {
      ...currentDetail,
      modules: [...currentDetail.modules, retainedCancelledModule],
    }),
  );
  await page.reload();
  const retainedCard = moduleItem(page, retainedCancelledModule.title);
  await expect(retainedCard).toContainText(
    `Ausgewählte Gruppe: ${setup.group.name}`,
  );
  await expect(retainedCard).toContainText("Historische Teilnahme");
  await page.goto(`/courses/${setup.courseB.id}`);
  await expect(page.getByRole("heading", { name: setup.courseB.name })).toBeVisible();
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("presents Archived, repeated, stale, and technical lifecycle states safely", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, `Archived Lifecycle ${crypto.randomUUID()}`);
  const participant = {
    id: "participant-archived-lifecycle",
    name: "Archived Lifecycle Participant",
    email: "archived-lifecycle@example.com",
    state: "active",
  };
  let assignment = {
    id: "assignment-archived-lifecycle",
    state: "active",
    participant,
  };
  let mutationMode = "stale";

  await page.route(`**/api/admin/courses/${course.id}`, (route) =>
    fulfillJson(route, 200, {
      ...course,
      state: "archived",
      groups: [],
      modules: [],
    }),
  );
  await page.route(
    `**/api/admin/courses/${course.id}/assignments`,
    (route) => fulfillJson(route, 200, { assignments: [assignment] }),
  );
  await page.route(
    `**/api/admin/courses/${course.id}/assignments/${assignment.id}/revocation`,
    async (route) => {
      if (mutationMode === "stale") {
        await fulfillJson(route, 409, { outcome: "assignment-not-revoked" });
        return;
      }

      if (mutationMode === "technical") {
        await fulfillJson(route, 500, { outcome: "technical-error" });
        return;
      }

      assignment = { ...assignment, state: "revoked" };
      await fulfillJson(route, 200, {
        outcome: "already-revoked",
        assignment: { id: assignment.id, state: "revoked" },
        removedSelectionCount: 0,
      });
    },
  );

  await page.goto(`/admin/courses/${course.id}`);
  const card = membershipCard(page, participant.name);

  await expect(page.getByRole("button", { name: "Teilnehmende zuordnen" })).toBeDisabled();
  await card.getByRole("button", { name: "Kurszuordnung widerrufen" }).click();
  const dialog = page.getByRole("dialog", { name: "Kurszuordnung widerrufen?" });
  const confirm = dialog.getByRole("button", {
    name: "Zuordnung endgültig widerrufen",
  });

  await confirm.click();
  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Die Kurszuordnung kann wegen eines geänderten",
    }),
  ).toBeFocused();
  mutationMode = "technical";
  await confirm.click();
  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Die Teilnahmedaten konnten nicht geladen oder gespeichert werden.",
    }),
  ).toBeFocused();
  mutationMode = "repeat";
  await confirm.click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Die Kurszuordnung war bereits widerrufen",
    }),
  ).toBeFocused();
  await expect(membershipCard(page, participant.name)).toContainText(
    "Eine widerrufene Zuordnung kann in einem archivierten Kurs nicht reaktiviert werden.",
  );
  await expect(
    membershipCard(page, participant.name).getByRole("button", {
      name: "Kurszuordnung reaktivieren",
    }),
  ).toHaveCount(0);
  await page.reload();
  await expect(membershipCard(page, participant.name)).toContainText(
    "Kurszuordnung: Widerrufen",
  );
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<object>} Ensure the reused fixture Participant exists. */
async function ensureParticipant(page) {
  await establishFixture(page, "later-admin");
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Assignment Lifecycle Participant",
        email: "assignment-lifecycle@example.com",
      },
    });
  }

  expect([200, 201]).toContain(response.status());
  return response.json();
}

/** @returns {Promise<object>} Create two Courses, future structure, and membership. */
async function createLifecycleCourses(page, participantId) {
  await ensureActiveAdmin(page);
  const suffix = crypto.randomUUID();
  const courseA = await createCourse(page, `Lifecycle Course A ${suffix}`);
  const courseB = await createCourse(page, `Lifecycle Course B ${suffix}`);
  const groupResponse = await page.request.post(
    `/api/admin/courses/${courseA.id}/groups`,
    { data: { name: "Lifecycle Group" } },
  );
  const group = await groupResponse.json();
  const moduleResponse = await page.request.post(
    `/api/admin/courses/${courseA.id}/modules`,
    {
      data: {
        title: "Lifecycle Future Module",
        startsAtLocal: "2026-09-01T10:00",
        endsAtLocal: "2026-09-01T11:00",
      },
    },
  );
  const module = await moduleResponse.json();
  const assignmentA = await assign(page, courseA.id, participantId);
  const assignmentB = await assign(page, courseB.id, participantId);

  return { courseA, courseB, group, module, assignmentA, assignmentB };
}

/** @returns {Promise<object>} Create one Active Course through real HTTP. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Directly assign and return the stable resource. */
async function assign(page, courseId, participantId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/assignments`,
    { data: { participantId } },
  );
  const body = await response.json();

  expect([200, 201]).toContain(response.status());
  return body.assignment;
}

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Lifecycle Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<void>} Establish one fixed normal application session. */
async function establishFixture(page, fixture) {
  const response = await page.request.post(`/api/_fixtures/session/${fixture}`);

  expect(response.status()).toBe(204);
}

/** @returns {object} One Admin membership card by Participant heading. */
function membershipCard(page, participantName) {
  return page
    .getByRole("list", { name: "Teilnehmende dieses Kurses" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: participantName }) });
}

/** @returns {object} One Participant Course list item. */
function courseListItem(page, courseName) {
  return page
    .getByRole("list", { name: "Zugeordnete Kurse" })
    .getByRole("link", { name: courseName });
}

/** @returns {object} One Participant Module list item. */
function moduleItem(page, title) {
  return page
    .getByRole("list", { name: "Module dieses Kurses" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });
}

/** @returns {Promise<void>} Fulfill one intercepted JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert accessibility and responsive overflow. */
async function expectAccessibleLayout(page) {
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((body) => body.clientWidth),
  );
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
}

/** @returns {Promise<void>} Assert visible keyboard focus styling. */
async function expectVisibleKeyboardFocus(locator) {
  await expect(locator).toBeFocused();
  const outlineStyle = await locator.evaluate(
    (element) => globalThis.getComputedStyle(element).outlineStyle,
  );

  expect(outlineStyle).not.toBe("none");
}
