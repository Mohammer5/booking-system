import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("accesses zero, one, and multiple assigned Courses through the real Participant journey", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const courseRequestsBeforeParticipant = [];

  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;

    if (pathname.startsWith("/api/participant/courses")) {
      courseRequestsBeforeParticipant.push(pathname);
    }
  });
  const currentParticipantResponse = await page.request.get(
    "/api/participant/me",
  );

  await page.goto("/");

  if (currentParticipantResponse.status() === 403) {
    await expect(
      page.getByRole("heading", { name: "Teilnahmeprofil einrichten" }),
    ).toBeVisible();
    expect(courseRequestsBeforeParticipant).toEqual([]);
    await page.getByLabel("Name").fill("Assigned Course Participant");
    await page
      .getByLabel("E-Mail-Adresse")
      .fill("assigned-course-participant@example.com");
    await page
      .getByRole("button", { name: "Teilnahmeprofil erstellen" })
      .click();
  } else {
    expect(currentParticipantResponse.status()).toBe(200);
  }

  await expectZeroMembership(page);
  await expectAccessibleLayout(page);
  const participant = await currentParticipant(page);
  const alpha = await createCourse(page, "Alpha Teilnehmerkurs");
  const bravo = await createCourse(page, "Bravo Teilnehmerkurs");
  const cross = await createCourse(page, "Vertraulicher Fremdkurs");

  await createGroup(page, alpha.id, "Gruppe Nord", "Raum 4");
  await createModule(page, alpha.id);
  const crossParticipant = await ensureCrossParticipant(page);

  await establishFixture(page, "first-admin");
  await assignParticipant(page, cross.id, crossParticipant.id);
  await page.goto(`/courses/${cross.id}`);
  await expectUnavailable(page);
  await expect(page.getByText("Vertraulicher Fremdkurs")).toHaveCount(0);
  await page.goto("/courses/missing-private-course");
  await expectUnavailable(page);

  await assignParticipant(page, bravo.id, participant.id);
  await page.goto("/");
  const oneCourseList = page.getByRole("list", { name: "Zugeordnete Kurse" });

  await expect(oneCourseList.getByRole("listitem")).toHaveCount(1);
  await expect(oneCourseList).toContainText("Bravo Teilnehmerkurs");
  await assignParticipant(page, alpha.id, participant.id);
  await page.reload();
  const courseLinks = page
    .getByRole("list", { name: "Zugeordnete Kurse" })
    .getByRole("link");

  await expect(courseLinks).toHaveCount(2);
  await expect(courseLinks.nth(0)).toHaveText("Alpha Teilnehmerkurs");
  await expect(courseLinks.nth(1)).toHaveText("Bravo Teilnehmerkurs");
  await courseLinks.nth(0).focus();
  await expectVisibleKeyboardFocus(courseLinks.nth(0));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/courses/${alpha.id}`);
  await expectParticipantCourseDetail(page);
  await expectAccessibleLayout(page);
  const detailURL = page.url();

  await page.reload();
  await expect(page).toHaveURL(detailURL);
  await expectParticipantCourseDetail(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);

  await page.getByRole("link", { name: "Zurück zu meinen Kursen" }).click();
  await page.getByRole("link", { name: "Bravo Teilnehmerkurs" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Für diesen Kurs sind noch keine Module vorhanden.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText: "Für diesen Kurs sind keine aktiven Gruppen vorhanden.",
    }),
  ).toBeVisible();
  await expectAccessibleLayout(page);

  await page.setViewportSize(desktopViewport);
  await page.route(
    `**/api/participant/courses/${bravo.id}`,
    (route) => fulfillJson(route, 404, { outcome: "course-unavailable" }),
  );
  await page.reload();
  await expectUnavailable(page);
  await expect(page.getByText("Bravo Teilnehmerkurs")).toHaveCount(0);
  await page.unroute(`**/api/participant/courses/${bravo.id}`);
  await page.route(
    `**/api/participant/courses/${bravo.id}`,
    (route) => fulfillJson(route, 500, { outcome: "technical-error" }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Die Kursdaten konnten nicht geladen werden.",
    }),
  ).toBeFocused();

  await page.unrouteAll({ behavior: "wait" });
  await page.goto("/");
  const signOutButton = page.getByRole("button", { name: "Abmelden" });

  await signOutButton.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Jetzt abmelden" }).click();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeFocused();
});

test("gates direct Course navigation through every Participant context state", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const privateRequests = [];
  let releaseParticipant;
  const participantGate = new Promise((resolve) => {
    releaseParticipant = resolve;
  });

  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;

    if (pathname.startsWith("/api/participant/courses")) {
      privateRequests.push(pathname);
    }
  });
  await page.route("**/api/participant/me", async (route) => {
    await participantGate;
    await fulfillJson(route, 401, { outcome: "unauthenticated" });
  });
  await page.goto("/courses/private-course");
  await expect(
    page.getByRole("status").filter({
      hasText: "Teilnahmestatus wird geladen …",
    }),
  ).toBeVisible();
  expect(privateRequests).toEqual([]);
  releaseParticipant();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
  expect(privateRequests).toEqual([]);

  await showDirectContext(page, 403, { outcome: "no-participant" });
  await expect(
    page.getByRole("heading", { name: "Teilnahmeprofil einrichten" }),
  ).toBeVisible();
  expect(privateRequests).toEqual([]);
  await showDirectContext(page, 403, { outcome: "disabled-participant" });
  await expect(
    page.getByRole("alert").filter({
      hasText: "Dieses Teilnahmeprofil ist deaktiviert.",
    }),
  ).toBeVisible();
  expect(privateRequests).toEqual([]);

  await page.unrouteAll({ behavior: "wait" });
  let releaseCourses;
  const courseGate = new Promise((resolve) => {
    releaseCourses = resolve;
  });
  await page.route("**/api/participant/me", (route) =>
    fulfillJson(route, 200, {
      id: "participant-active",
      name: "Active Participant",
      email: "active@example.com",
      state: "active",
    }),
  );
  await page.route("**/api/participant/courses", async (route) => {
    await courseGate;
    await fulfillJson(route, 200, { courses: [] });
  });
  await page.goto("/");
  await expect(
    page.getByRole("status").filter({
      hasText: "Kurszuordnungen werden geladen …",
    }),
  ).toBeVisible();
  releaseCourses();
  await expectZeroMembership(page);
  await expectAccessibleLayout(page);

  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/participant/me", (route) =>
    fulfillJson(route, 200, {
      id: "participant-active",
      name: "Active Participant",
      email: "active@example.com",
      state: "active",
    }),
  );
  await page.route("**/api/participant/courses/private-course", (route) =>
    fulfillJson(route, 404, { outcome: "course-unavailable" }),
  );
  await page.goto("/courses/private-course");
  await expectUnavailable(page);
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Ensure the fixed first principal is an Active Admin. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Participant Course Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Read the current real Participant representation. */
async function currentParticipant(page) {
  const response = await page.request.get("/api/participant/me");

  expect(response.status()).toBe(200);
  return response.json();
}

/** @returns {Promise<object>} Ensure another fixed principal has a Participant. */
async function ensureCrossParticipant(page) {
  await establishFixture(page, "later-admin");
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Cross Course Participant",
        email: "cross-course-participant@example.com",
      },
    });
    expect(response.status()).toBe(201);
    return response.json();
  }

  expect(response.status()).toBe(200);
  return response.json();
}

/** @returns {Promise<object>} Create one Active Course through the real API. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name, description: `Beschreibung ${name}` },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<void>} Create one real Active Course-wide Group. */
async function createGroup(page, courseId, name, details) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/groups`,
    { data: { name, details } },
  );

  expect(response.status()).toBe(201);
}

/** @returns {Promise<void>} Create one real future Scheduled Module. */
async function createModule(page, courseId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/modules`,
    {
      data: {
        title: "Praxis-Modul",
        description: "Gemeinsame Übungen",
        instructions: "Bitte Unterlagen mitbringen",
        startsAtLocal: "2027-01-15T10:30",
        endsAtLocal: "2027-01-15T11:30",
      },
    },
  );

  expect(response.status()).toBe(201);
}

/** @returns {Promise<void>} Create one real direct Course Assignment. */
async function assignParticipant(page, courseId, participantId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/assignments`,
    { data: { participantId } },
  );

  expect([200, 201]).toContain(response.status());
}

/** @returns {Promise<void>} Establish one normal fixed application session. */
async function establishFixture(page, fixtureName) {
  const response = await page.request.post(
    `/api/_fixtures/session/${fixtureName}`,
  );

  expect(response.status()).toBe(204);
}

/** @returns {Promise<void>} Assert the successful zero-Assignment state. */
async function expectZeroMembership(page) {
  const empty = page.getByRole("status").filter({
    hasText: "Noch keinen Kursen zugeordnet",
  });

  await expect(empty).toBeVisible();
  await expect(empty).toContainText("kein öffentliches Kursverzeichnis");
}

/** @returns {Promise<void>} Assert populated private Participant detail. */
async function expectParticipantCourseDetail(page) {
  await expect(
    page.getByRole("heading", { level: 1, name: "Alpha Teilnehmerkurs" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Module" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Gruppen" })).toBeVisible();
  await expect(page.getByText("Praxis-Modul")).toBeVisible();
  await expect(page.getByText("Gemeinsame Übungen")).toBeVisible();
  await expect(page.getByText("Bitte Unterlagen mitbringen")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Gruppe Nord" }),
  ).toBeVisible();
  await expect(page.getByText("Raum 4")).toBeVisible();
  await expect(page.getByText("Keine Auswahl")).toBeVisible();
  await expect(
    page.getByText("Für dieses Modul ist keine Gruppe ausgewählt."),
  ).toBeVisible();
  await expect(page.getByText("Cross Course Participant")).toHaveCount(0);
  await expect(page.getByText("cross-course-participant@example.com")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Modulauswahl speichern" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /zuordnen|erstellen/i }),
  ).toHaveCount(0);
  await expect(page.getByRole("main")).toHaveCount(1);
}

/** @returns {Promise<void>} Assert the privacy-safe unavailable state and focus. */
async function expectUnavailable(page) {
  await expect(
    page.getByRole("alert").filter({
      hasText: "Dieser Kursbereich ist für Ihr aktuelles Teilnahmeprofil nicht verfügbar.",
    }),
  ).toBeFocused();
}

/** @returns {Promise<void>} Render one direct current-context refusal. */
async function showDirectContext(page, status, body) {
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/participant/me", (route) =>
    fulfillJson(route, status, body),
  );
  await page.goto("/courses/private-course");
}

/** @returns {Promise<void>} Fulfill one intercepted JSON response. */
async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert axe and absence of horizontal overflow. */
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

/** @returns {Promise<void>} Assert visible theme focus on a keyboard link. */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
}
