import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("opens, refreshes, archives, and safely refuses a real Course participation view", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Leere Kursteilnahme");

  await page.goto(`/admin/courses/${course.id}`);
  const open = page.getByRole("link", { name: "Kursteilnahme ansehen" });

  await open.focus();
  await expectVisibleKeyboardFocus(open);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/admin/courses/${course.id}/participation`);
  await expect(page.getByRole("heading", { level: 1, name: course.name })).toBeVisible();
  await expectEmptyParticipation(page);
  await expectAccessibleLayout(page);

  const stableURL = page.url();

  await page.reload();
  await expect(page).toHaveURL(stableURL);
  await expectEmptyParticipation(page);

  const path = `**/api/admin/courses/${course.id}/participation`;

  await page.route(path, (route) =>
    fulfillJson(route, 500, { outcome: "technical-error" }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Die Kursteilnahme konnte nicht geladen werden.",
    }),
  ).toBeFocused();
  await expect(page.getByRole("link", { name: "Zurück zum Kurs" })).toBeVisible();

  await page.unroute(path);
  await page.route(path, (route) =>
    fulfillJson(route, 404, { outcome: "participation-unavailable" }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Die Kursteilnahme ist für dieses Administrationskonto",
    }),
  ).toBeFocused();
  await page.unroute(path);

  const archive = await page.request.post(
    `/api/admin/courses/${course.id}/archival`,
  );

  expect(archive.status()).toBe(200);
  await page.reload();
  await expect(page.getByText(/Dieser Kurs ist archiviert/)).toBeVisible();
  await expect(page.getByText("Archiviert", { exact: true })).toBeVisible();
  await expectEmptyParticipation(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);

  const participantProbe = await page.request.get("/api/participant/courses");
  const participantProbeBody = await participantProbe.text();

  expect(participantProbeBody).not.toContain("participations");
  expect(participantProbeBody).not.toContain("assignment");
  expect(participantProbeBody).not.toContain("admin");
});

test("presents every lifecycle in responsive overview and direct Participant detail", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const model = lifecycleModel();
  const path = `**/api/admin/courses/${model.course.id}/participation`;
  let releaseRead;
  const readGate = new Promise((resolve) => {
    releaseRead = resolve;
  });
  let isFirstRead = true;

  await page.route(path, async (route) => {
    if (isFirstRead) {
      isFirstRead = false;
      await readGate;
    }
    await fulfillJson(route, 200, model);
  });
  const navigation = page.goto(
    `/admin/courses/${model.course.id}/participation`,
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Kursteilnahme wird geladen" }),
  ).toBeVisible();
  releaseRead();
  await navigation;

  const table = page.getByRole("table", {
    name: "Kursteilnahme dieses Kurses",
  });

  await expect(table).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect(table).toContainText("Teilnahmeprofil: Deaktiviert");
  await expect(table).toContainText("Kurszuordnung: Widerrufen");
  await expect(page.getByRole("heading", { name: "Aktive Gruppe" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Archivierte Gruppe" })).toBeVisible();
  await expect(page.getByText("Gruppenstatus: Archiviert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Abgesagtes Modul" })).toBeVisible();
  await expect(page.getByText("Modulstatus: Abgesagt")).toBeVisible();
  await expect(page.getByRole("button", { name: /zuordnen|auswahl speichern/i })).toHaveCount(0);
  await expectAccessibleLayout(page);

  const activeRow = table.getByRole("row").filter({ hasText: "Aktive Person" });
  const detailLink = activeRow.getByRole("link", { name: "Teilnahme ansehen" });

  await detailLink.focus();
  await expectVisibleKeyboardFocus(detailLink);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    `/admin/courses/${model.course.id}/participation/participant-active`,
  );
  await expect(page.getByRole("heading", { name: "Teilnahme von Aktive Person" })).toBeVisible();
  await expect(moduleItem(page, "Beendetes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Auswahlstatus: Aktuelle Teilnahme",
  );
  await expect(moduleItem(page, "Laufendes Modul")).toContainText("Phase: Laufend");
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Ausgewählte Gruppe: Archivierte Gruppe",
  );
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Historische Gruppendetails",
  );
  await expect(moduleItem(page, "Abgesagtes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );
  await expect(moduleItem(page, "Künftiges Modul")).toContainText(
    "Phase: Bevorstehend",
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Teilnahme von Aktive Person" })).toBeVisible();

  await page.goto(
    `/admin/courses/${model.course.id}/participation/participant-disabled`,
  );
  await expect(page.getByText("Teilnahmeprofil: Deaktiviert")).toBeVisible();
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );
  await page.goto(
    `/admin/courses/${model.course.id}/participation/participant-revoked`,
  );
  await expect(page.getByText("Kurszuordnung: Widerrufen")).toBeVisible();
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );

  await page.setViewportSize(narrowViewport);
  await page.goto(`/admin/courses/${model.course.id}/participation`);
  await expect(page.getByRole("table", { name: "Kursteilnahme dieses Kurses" })).toBeHidden();
  await expect(page.getByRole("list", { name: "Kursteilnahme dieses Kurses" })).toBeVisible();
  await expectAccessibleLayout(page);

  model.course.state = "archived";
  for (const participation of model.participations) {
    for (const selection of participation.selections) {
      selection.meaning = "historical";
      selection.phase = "historical";
    }
  }
  await page.goto(
    `/admin/courses/${model.course.id}/participation/participant-active`,
  );
  await expect(page.getByText(/Dieser Kurs ist archiviert/)).toBeVisible();
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );
  await expectAccessibleLayout(page);

  await page.goto(
    `/admin/courses/${model.course.id}/participation/participant-private`,
  );
  await expect(
    page.getByRole("alert").filter({
      hasText: "Dieses Teilnahmeprofil gehört nicht zur verfügbaren Kursteilnahme.",
    }),
  ).toBeFocused();
  await expect(page.getByText("active@example.com")).toHaveCount(0);
});

/** @returns {import("@playwright/test").Locator} One detail Module item. */
function moduleItem(page, title) {
  return page
    .getByRole("list", { name: /Modulauswahlen von/ })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });
}

/** @returns {Promise<void>} Assert all three successful empty regions. */
async function expectEmptyParticipation(page) {
  for (const copy of [
    "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
    "Für diesen Kurs sind keine Module vorhanden.",
    "Für diesen Kurs sind keine Gruppen vorhanden.",
  ]) {
    await expect(page.getByRole("status").filter({ hasText: copy })).toBeVisible();
  }
}

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  const fixture = await page.request.post("/api/_fixtures/session/first-admin");

  expect(fixture.status()).toBe(204);
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Participation Admin" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Create one uniquely named real Course. */
async function createCourse(page, prefix) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name: `${prefix} ${crypto.randomUUID()}` },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {object} Complete Admin participation browser representation. */
function lifecycleModel() {
  const modules = [
    moduleData("ended", "Beendetes Modul", "2026-08-28T09:00:00.000Z", "2026-08-28T10:00:00.000Z"),
    moduleData("current", "Laufendes Modul", "2026-08-28T09:30:00.000Z", "2026-08-28T10:30:00.000Z"),
    moduleData("cancelled", "Abgesagtes Modul", "2026-08-28T11:00:00.000Z", "2026-08-28T12:00:00.000Z", "cancelled"),
    moduleData("future", "Künftiges Modul", "2026-08-28T13:00:00.000Z", "2026-08-28T14:00:00.000Z"),
  ];
  const activeSelections = [
    selection("ended", "active", "historical", "historical"),
    selection("current", "archived", "live", "in-progress"),
    selection("cancelled", "active", "historical", "historical"),
    selection("future", "active", "live", "upcoming"),
  ];

  return {
    course: {
      id: "course-participation",
      name: "Vollständige Kursteilnahme",
      description: "Alle Lebenszyklen",
      timezone: "Europe/Berlin",
      state: "active",
    },
    groups: [
      group("active", "Aktive Gruppe", "Aktive Gruppendetails", "active"),
      group("archived", "Archivierte Gruppe", "Historische Gruppendetails", "archived"),
    ],
    modules,
    participations: [
      participation("active", "Aktive Person", "active", "active", activeSelections),
      participation("disabled", "Deaktivierte Person", "disabled", "active", [
        selection("current", "active", "historical", "historical", "disabled"),
      ]),
      participation("revoked", "Widerrufene Person", "active", "revoked", [
        selection("current", "active", "historical", "historical", "revoked"),
      ]),
    ],
  };
}

/** @returns {object} One Module response. */
function moduleData(suffix, title, startsAt, endsAt, state = "scheduled") {
  return {
    id: `module-${suffix}`,
    title,
    description: `Beschreibung ${suffix}`,
    instructions: `Hinweise ${suffix}`,
    startsAt,
    endsAt,
    state,
  };
}

/** @returns {object} One Group response. */
function group(suffix, name, details, state) {
  return { id: `group-${suffix}`, name, details, state };
}

/** @returns {object} One Participant/Assignment response. */
function participation(suffix, name, participantState, assignmentState, selections) {
  return {
    participant: {
      id: `participant-${suffix}`,
      name,
      email: `${suffix}@example.com`,
      state: participantState,
    },
    assignment: { id: `assignment-${suffix}`, state: assignmentState },
    selections,
  };
}

/** @returns {object} One derived Selection response. */
function selection(module, groupSuffix, meaning, phase, suffix = module) {
  const isArchived = groupSuffix === "archived";

  return {
    id: `selection-${suffix}`,
    moduleId: `module-${module}`,
    meaning,
    phase,
    group: group(
      groupSuffix,
      isArchived ? "Archivierte Gruppe" : "Aktive Gruppe",
      isArchived ? "Historische Gruppendetails" : "Aktive Gruppendetails",
      isArchived ? "archived" : "active",
    ),
  };
}

/** @returns {Promise<void>} Fulfill one intercepted JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert axe and no horizontal overflow. */
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

/** @returns {Promise<void>} Assert visible keyboard focus styling. */
async function expectVisibleKeyboardFocus(locator) {
  await expect(locator).toBeFocused();
  await expect(locator).toHaveCSS("outline-style", "solid");
}
