import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("refreshes, archives, and safely refuses a real Course Participant collection", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourse(page, "Leere Kursteilnahme");

  await page.goto(`/admin/courses/${course.id}/participants`);
  await expect(page).toHaveURL(`/admin/courses/${course.id}/participants`);
  await expect(page.getByRole("heading", { level: 1, name: "Teilnehmende" }))
    .toBeVisible();
  await expectEmptyParticipation(page);
  await expectAccessibleLayout(page);

  const stableURL = page.url();

  await page.reload();
  await expect(page).toHaveURL(stableURL);
  await expectEmptyParticipation(page);

  const path = new RegExp(
    `/api/admin/courses/${course.id}/assignments(?:\\?.*)?$`,
  );

  await page.route(path, (route) =>
    fulfillJson(route, 500, { outcome: "technical-error" }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Die Teilnahmedaten konnten nicht geladen oder gespeichert werden.",
    }),
  ).toBeFocused();

  await page.unroute(path);
  await page.route(path, (route) =>
    fulfillJson(route, 404, { outcome: "course-not-found" }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Die Teilnahmeverwaltung ist für dieses Administrationskonto",
    }),
  ).toBeFocused();
  await page.unroute(path);

  const archive = await page.request.post(
    `/api/admin/courses/${course.id}/archival`,
  );

  expect(archive.status()).toBe(200);
  await page.reload();
  await expect(page.getByText(/Der archivierte Kurs ist schreibgeschützt/))
    .toBeVisible();
  await expectEmptyParticipation(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);

  const participantProbe = await page.request.get("/api/participant/courses");
  const participantProbeBody = await participantProbe.text();

  expect(participantProbeBody).not.toContain("participations");
  expect(participantProbeBody).not.toContain("assignment");
  expect(participantProbeBody).not.toContain("admin");
});

test("manages a real assisted Selection across membership and lifecycle states", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureAssistedParticipant(page);

  await ensureActiveAdmin(page);
  const setup = await createAssistedBookingCourse(page);
  const crossCourse = await createCourse(page, "Fremder Auswahlkurs");
  const crossGroupResponse = await page.request.post(
    `/api/admin/courses/${crossCourse.id}/groups`,
    { data: { name: "Fremde Gruppe" } },
  );
  const crossGroup = await crossGroupResponse.json();
  const detailPath =
    `/admin/courses/${setup.course.id}/participants/${participant.id}`;
  const selectionApi =
    `/api/admin/courses/${setup.course.id}/participation/${participant.id}/modules/${setup.module.id}/selection`;

  const crossRefusal = await page.request.put(selectionApi, {
    data: { groupId: crossGroup.id },
  });
  expect(crossRefusal.status()).toBe(409);
  await expect(crossRefusal.json()).resolves.toEqual({
    outcome: "group-not-selectable",
  });
  const afterCrossRefusal = await (await page.request.get(
    `/api/admin/courses/${setup.course.id}/participation/${participant.id}`,
  )).json();
  expect(afterCrossRefusal.participation.assignment).toBeNull();
  expect(afterCrossRefusal.participation.selections).toEqual([]);

  await page.goto(`/admin/courses/${setup.course.id}/participants`);
  const manageButton = page.getByRole("button", {
    name: "Modulauswahl stellvertretend verwalten",
  });

  await manageButton.focus();
  await page.keyboard.press("Enter");
  const targetDialog = page.getByRole("dialog", {
    name: "Teilnahmeprofil für Modulauswahl öffnen",
  });
  const targetSearch = targetDialog.getByLabel(
    "Teilnahmeprofile nach Name oder E-Mail durchsuchen",
  );

  await expect(targetSearch).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(targetDialog).toBeHidden();
  await expectVisibleKeyboardFocus(manageButton);
  await manageButton.click();
  await targetDialog.getByRole("radio", {
    name: new RegExp(participant.name),
  }).check();
  await targetDialog.getByRole("button", {
    name: "Modulauswahlen öffnen",
  }).click();
  await expect(page).toHaveURL(detailPath);
  await expect(page.getByText("Kurszuordnung: Nicht vorhanden")).toBeVisible();

  let module = moduleItem(page, setup.module.title);
  await expect(module).toContainText(
    "Eine gewöhnliche aktive Kurszuordnung wird erstellt.",
  );
  await expect(module).toContainText(
    "Eine Kurszuordnung allein ist keine Modulteilnahme.",
  );
  await module.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(module.getByText("Bitte wählen Sie eine aktive Gruppe aus.")).toBeVisible();
  await module.getByRole("radio", { name: setup.groups[0].name }).check();
  await module.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(module.getByRole("status").filter({
    hasText: "Die Modulauswahl wurde angelegt.",
  })).toBeFocused();
  await expect(module).toContainText(`Ausgewählte Gruppe: ${setup.groups[0].name}`);

  module = moduleItem(page, setup.module.title);
  await module.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(module.getByRole("status").filter({
    hasText: "Diese Gruppe war bereits ausgewählt.",
  })).toBeFocused();
  await module.getByRole("radio", { name: setup.groups[1].name }).check();
  await module.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(module.getByRole("status").filter({
    hasText: "Die Modulauswahl wurde ersetzt.",
  })).toBeFocused();
  await expect(module).toContainText(`Ausgewählte Gruppe: ${setup.groups[1].name}`);

  await page.reload();
  module = moduleItem(page, setup.module.title);
  await expect(module).toContainText(`Ausgewählte Gruppe: ${setup.groups[1].name}`);
  const removeButton = module.getByRole("button", {
    name: "Modulauswahl entfernen",
  });

  await removeButton.focus();
  await page.keyboard.press("Enter");
  const removalDialog = page.getByRole("dialog", {
    name: "Modulauswahl entfernen?",
  });

  await expect(removalDialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expectVisibleKeyboardFocus(removeButton);
  await removeButton.click();
  await removalDialog.getByRole("button", {
    name: "Auswahl endgültig entfernen",
  }).click();
  await expect(module.getByRole("status").filter({
    hasText: "Die Modulauswahl wurde entfernt.",
  })).toBeFocused();

  const assignments = await (await page.request.get(
    `/api/admin/courses/${setup.course.id}/assignments`,
  )).json();
  const retainedAssignment = assignments.assignments.find(
    ({ participant: current }) => current.id === participant.id,
  );
  const revocation = await page.request.post(
    `/api/admin/courses/${setup.course.id}/assignments/${retainedAssignment.id}/revocation`,
  );
  expect(revocation.status()).toBe(200);
  await page.reload();
  module = moduleItem(page, setup.module.title);
  await expect(module).toContainText(
    "Die widerrufene gewöhnliche Kurszuordnung wird reaktiviert.",
  );
  await module.getByRole("radio", { name: setup.groups[0].name }).check();
  await module.getByRole("button", { name: "Modulauswahl speichern" }).click();
  await expect(module.getByRole("status").filter({
    hasText: "Die gewöhnliche Kurszuordnung wurde dabei reaktiviert.",
  })).toBeFocused();

  const cancellation = await page.request.post(
    `/api/admin/courses/${setup.course.id}/modules/${setup.module.id}/cancellation`,
  );
  expect(cancellation.status()).toBe(200);
  const cancelledRefusal = await page.request.put(selectionApi, {
    data: { groupId: setup.groups[1].id },
  });
  expect(cancelledRefusal.status()).toBe(409);
  await page.reload();
  module = moduleItem(page, setup.module.title);
  await expect(module).toContainText("Modulstatus: Abgesagt");
  await expect(module.getByRole("button", { name: "Modulauswahl speichern" })).toHaveCount(0);

  const disablement = await page.request.post(
    `/api/admin/participants/${participant.id}/disablement`,
  );
  expect(disablement.status()).toBe(200);
  const disabledRefusal = await page.request.put(selectionApi, {
    data: { groupId: setup.groups[1].id },
  });
  expect(disabledRefusal.status()).toBe(409);
  await page.reload();
  await expect(page.getByText("Teilnahmeprofil: Deaktiviert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Modulauswahl speichern" })).toHaveCount(0);

  const reenablement = await page.request.post(
    `/api/admin/participants/${participant.id}/reenablement`,
  );
  expect(reenablement.status()).toBe(200);
  const archival = await page.request.post(
    `/api/admin/courses/${setup.course.id}/archival`,
  );
  expect(archival.status()).toBe(200);
  const archivedRefusal = await page.request.put(selectionApi, {
    data: { groupId: setup.groups[1].id },
  });
  expect(archivedRefusal.status()).toBe(409);
  await page.reload();
  await expect(page.getByText(/Dieser Kurs ist archiviert/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Modulauswahl speichern" })).toHaveCount(0);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("presents exact-deadline locks and focused stale and technical refusals", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const detailApi =
    "**/api/admin/courses/course-assisted-bounded/participation/participant-assisted-bounded";
  const selectionApi = `${detailApi}/modules/module-assisted-future/selection`;
  const model = boundedAssistedDetailModel();
  let mutationOutcome = "selection-deadline-reached";
  let releaseMutation;
  let mutationGate = new Promise((resolve) => {
    releaseMutation = resolve;
  });

  await page.route(detailApi, (route) => fulfillJson(route, 200, model));
  await page.route(selectionApi, async (route) => {
    await mutationGate;
    await fulfillJson(
      route,
      mutationOutcome === "technical-error" ? 500 : 409,
      { outcome: mutationOutcome },
    );
  });
  await page.goto(
    "/admin/courses/course-assisted-bounded/participants/participant-assisted-bounded",
  );

  const exactModule = moduleItem(page, "Modul am exakten Beginn");
  const cancelledModule = moduleItem(page, "Abgesagtes Auswahlmodul");
  const futureModule = moduleItem(page, "Künftiges Auswahlmodul");

  await expect(exactModule).toContainText("nicht bearbeitbar");
  await expect(cancelledModule).toContainText("nicht bearbeitbar");
  await expect(exactModule.getByRole("button", {
    name: "Modulauswahl speichern",
  })).toHaveCount(0);
  await expect(futureModule.getByRole("radio", {
    name: "Archivierte Assistenzgruppe",
  })).toHaveCount(0);
  await futureModule.getByRole("button", {
    name: "Modulauswahl speichern",
  }).click();
  await expect(futureModule.getByText(
    "Bitte wählen Sie eine aktive Gruppe aus.",
  )).toBeVisible();
  await futureModule.getByRole("radio", {
    name: "Aktive Assistenzgruppe",
  }).check();
  await futureModule.getByRole("button", {
    name: "Modulauswahl speichern",
  }).click();
  await expect(futureModule.getByRole("button", {
    name: "Modulauswahl wird gespeichert …",
  })).toBeDisabled();
  releaseMutation();
  await expect(futureModule.getByRole("alert").filter({
    hasText: "Die Auswahl wurde nicht geändert",
  })).toBeFocused();
  await expect(futureModule).toContainText("Keine Auswahl");
  await expect(page.getByText("Kurszuordnung: Nicht vorhanden")).toBeVisible();

  mutationOutcome = "technical-error";
  mutationGate = Promise.resolve();
  await futureModule.getByRole("button", {
    name: "Modulauswahl speichern",
  }).click();
  await expect(futureModule.getByRole("alert").filter({
    hasText: "Die Modulauswahl konnte nicht gespeichert werden.",
  })).toBeFocused();
  await expectAccessibleLayout(page);

  await page.unroute(detailApi);
  await page.route(detailApi, (route) =>
    fulfillJson(route, 404, { outcome: "participation-unavailable" }),
  );
  await page.reload();
  await expect(page.getByRole("alert").filter({
    hasText: "Dieses Teilnahmeprofil gehört nicht zur verfügbaren Kursteilnahme.",
  })).toBeFocused();
});

test("presents every lifecycle in responsive overview and direct Participant detail", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const model = lifecycleModel();
  const collectionPath = new RegExp(
    `/api/admin/courses/${model.course.id}/assignments(?:\\?.*)?$`,
  );
  const detailApi = `**/api/admin/courses/${model.course.id}/participation`;
  let releaseRead;
  const readGate = new Promise((resolve) => {
    releaseRead = resolve;
  });
  let isFirstRead = true;

  await page.route(collectionPath, async (route) => {
    if (isFirstRead) {
      isFirstRead = false;
      await readGate;
    }
    await fulfillJson(route, 200, assignmentCollectionModel(model));
  });
  await page.route(`${detailApi}/*`, async (route) => {
    const participantId = new URL(route.request().url()).pathname.split("/").at(-1);
    const detail = participantDetailModel(model, participantId);

    await fulfillJson(
      route,
      detail === null ? 404 : 200,
      detail ?? { outcome: "participation-unavailable" },
    );
  });
  const navigation = page.goto(
    `/admin/courses/${model.course.id}/participants`,
  );
  await expect(
    page.getByRole("status").filter({
      hasText: "Teilnehmende des Kurses werden geladen",
    }),
  ).toBeVisible();
  releaseRead();
  await navigation;

  const table = page.getByRole("table", {
    name: "Teilnehmende und Kurszuordnungen dieses Kurses",
  });

  await expect(table).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect(table).toContainText("Teilnahmeprofil: Deaktiviert");
  await expect(table).toContainText("Kurszuordnung: Widerrufen");
  await expectAccessibleLayout(page);

  const activeRow = table.getByRole("row").filter({ hasText: "Aktive Person" });
  const detailLink = activeRow.getByRole("link", { name: "Teilnahme öffnen" });

  await detailLink.focus();
  await expectVisibleKeyboardFocus(detailLink);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    `/admin/courses/${model.course.id}/participants/participant-active`,
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
    `/admin/courses/${model.course.id}/participants/participant-disabled`,
  );
  await expect(page.getByText("Teilnahmeprofil: Deaktiviert")).toBeVisible();
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );
  await page.goto(
    `/admin/courses/${model.course.id}/participants/participant-revoked`,
  );
  await expect(page.getByText("Kurszuordnung: Widerrufen")).toBeVisible();
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );

  await page.setViewportSize(narrowViewport);
  await page.goto(`/admin/courses/${model.course.id}/participants`);
  await expect(page.getByRole("table", {
    name: "Teilnehmende und Kurszuordnungen dieses Kurses",
  })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Teilnehmende dieses Kurses" }))
    .toBeVisible();
  await expectAccessibleLayout(page);

  model.course.state = "archived";
  for (const participation of model.participations) {
    for (const selection of participation.selections) {
      selection.meaning = "historical";
      selection.phase = "historical";
    }
  }
  await page.goto(
    `/admin/courses/${model.course.id}/participants/participant-active`,
  );
  await expect(page.getByText(/Dieser Kurs ist archiviert/)).toBeVisible();
  await expect(moduleItem(page, "Laufendes Modul")).toContainText(
    "Auswahlstatus: Historische Teilnahme",
  );
  await expectAccessibleLayout(page);

  await page.goto(
    `/admin/courses/${model.course.id}/participants/participant-private`,
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

/** @returns {Promise<void>} Assert the successful empty Assignment collection. */
async function expectEmptyParticipation(page) {
  await expect(page.getByRole("status").filter({
    hasText: "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
  })).toBeVisible();
}

/** @returns {Promise<object>} Ensure one fixed Active assisted target. */
async function ensureAssistedParticipant(page) {
  const fixture = await page.request.post(
    "/api/_fixtures/session/selection-participant",
  );

  expect(fixture.status()).toBe(204);
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Stellvertretende Auswahlperson",
        email: "assisted-selection@example.com",
      },
    });
  }

  expect([200, 201]).toContain(response.status());
  return response.json();
}

/** @returns {Promise<object>} Create one future Module and two active Groups. */
async function createAssistedBookingCourse(page) {
  const course = await createCourse(page, "Stellvertretende Auswahl");
  const groups = [];

  for (const name of ["Assistierte Gruppe Alpha", "Assistierte Gruppe Beta"]) {
    const response = await page.request.post(
      `/api/admin/courses/${course.id}/groups`,
      { data: { name } },
    );

    expect(response.status()).toBe(201);
    groups.push(await response.json());
  }

  const moduleResponse = await page.request.post(
    `/api/admin/courses/${course.id}/modules`,
    {
      data: {
        title: "Assistiertes Zukunftsmodul",
        startsAtLocal: "2026-09-01T10:00",
        endsAtLocal: "2026-09-01T11:00",
      },
    },
  );

  expect(moduleResponse.status()).toBe(201);
  return { course, groups, module: await moduleResponse.json() };
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

/** @returns {object} Paginated Assignment join for the collection route. */
function assignmentCollectionModel(model) {
  return {
    course: model.course,
    assignments: model.participations.map(({ assignment, participant }) => ({
      ...assignment,
      participant,
    })),
    pagination: {
      page: 1,
      pageSize: 25,
      totalItems: model.participations.length,
      totalPages: 1,
    },
  };
}

/** @returns {object | null} One current target-detail response. */
function participantDetailModel(model, participantId) {
  const participationModel = model.participations.find(
    ({ participant }) => participant.id === participantId,
  );

  if (participationModel === undefined) return null;

  return {
    course: model.course,
    groups: model.groups,
    modules: model.modules.map((module) => ({
      ...module,
      selectionAvailability:
        model.course.state === "active" &&
        participationModel.participant.state === "active" &&
        module.state === "scheduled" &&
        Date.parse(module.startsAt) > Date.parse("2026-08-28T10:00:00.000Z")
          ? "open"
          : "closed",
    })),
    participation: participationModel,
  };
}

/** @returns {object} Target detail with exact, Cancelled, and open Modules. */
function boundedAssistedDetailModel() {
  return {
    course: {
      id: "course-assisted-bounded",
      name: "Begrenzte stellvertretende Auswahl",
      description: null,
      timezone: "Europe/Berlin",
      state: "active",
    },
    groups: [
      group("assisted-active", "Aktive Assistenzgruppe", null, "active"),
      group(
        "assisted-archived",
        "Archivierte Assistenzgruppe",
        null,
        "archived",
      ),
    ],
    modules: [
      {
        ...moduleData(
          "assisted-exact",
          "Modul am exakten Beginn",
          "2026-08-28T10:00:00.000Z",
          "2026-08-28T11:00:00.000Z",
        ),
        selectionAvailability: "closed",
      },
      {
        ...moduleData(
          "assisted-cancelled",
          "Abgesagtes Auswahlmodul",
          "2026-08-28T12:00:00.000Z",
          "2026-08-28T13:00:00.000Z",
          "cancelled",
        ),
        selectionAvailability: "closed",
      },
      {
        ...moduleData(
          "assisted-future",
          "Künftiges Auswahlmodul",
          "2026-08-28T14:00:00.000Z",
          "2026-08-28T15:00:00.000Z",
        ),
        selectionAvailability: "open",
      },
    ],
    participation: {
      participant: {
        id: "participant-assisted-bounded",
        name: "Begrenzte Auswahlperson",
        email: "bounded@example.com",
        state: "active",
      },
      assignment: null,
      selections: [],
    },
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
