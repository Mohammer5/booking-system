import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("Disables globally and Re-enables without restoring future participation", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const participant = await ensureFirstAdminParticipant(page);
  const setup = await createLifecycleCourses(page, participant.id);

  await page.goto(`/admin/participants/${participant.id}`);
  const disableButton = page.getByRole("button", {
    name: "Teilnahmeprofil deaktivieren",
  });

  await disableButton.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", {
    name: "Teilnahmeprofil deaktivieren?",
  });

  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await expect(dialog).toContainText(
    "Künftige Auswahlen für noch nicht begonnene geplante Module werden entfernt.",
  );
  await expect(dialog).toContainText(
    "Kurszuordnungen sowie bereits begonnene, beendete oder abgesagte Teilnahmehistorie bleiben erhalten.",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(disableButton);

  await disableButton.click();
  dialog = page.getByRole("dialog", {
    name: "Teilnahmeprofil deaktivieren?",
  });
  await dialog
    .getByRole("button", { name: "Teilnahmeprofil endgültig deaktivieren" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Das Teilnahmeprofil wurde deaktiviert. Entfernte künftige Modulauswahlen: 1.",
    }),
  ).toBeFocused();
  await expect(page.getByText("Teilnahmeprofil: Deaktiviert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Teilnahmeprofil wieder aktivieren" }),
  ).toBeVisible();
  expect((await getJson(page, "/api/admin/me")).state).toBe("active");

  await page.goto("/");
  const disabledAlert = page.getByRole("alert").filter({
    hasText:
      "Dieses Teilnahmeprofil ist deaktiviert. Der Teilnahmebereich ist nicht verfügbar.",
  });

  await expect(disabledAlert).toBeFocused();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
  await expectAccessibleLayout(page);
  await page.goto("/profile");
  await expect(disabledAlert).toBeFocused();
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await page.goto(`/courses/${setup.courseA.id}`);
  await expect(disabledAlert).toBeFocused();
  await expect(page.getByText(setup.courseA.name)).toHaveCount(0);

  await page.getByRole("button", { name: "Abmelden" }).click();
  await page.getByRole("button", { name: "Jetzt abmelden" }).click();
  await expect(page.getByRole("button", { name: "Weiter mit Google" })).toBeVisible();

  await establishFixture(page, "first-admin");
  await page.goto(`/admin/participants/${participant.id}`);
  const reenableButton = page.getByRole("button", {
    name: "Teilnahmeprofil wieder aktivieren",
  });

  await reenableButton.click();
  dialog = page.getByRole("dialog", {
    name: "Teilnahmeprofil wieder aktivieren?",
  });
  await expect(dialog).toContainText(
    "soweit eine aktive Kurszuordnung ihn erlaubt",
  );
  await expect(dialog).toContainText(
    "Zuvor entfernte künftige Modulauswahlen kehren nicht zurück.",
  );
  await dialog
    .getByRole("button", { name: "Teilnahmeprofil wieder aktivieren" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Das Teilnahmeprofil wurde wieder aktiviert.",
    }),
  ).toBeFocused();

  await page.goto("/");
  await expect(courseListItem(page, setup.courseA.name)).toBeVisible();
  await expect(courseListItem(page, setup.courseB.name)).toBeVisible();
  await page.goto(`/courses/${setup.courseA.id}`);
  await expect(moduleItem(page, setup.module.title)).toContainText("Keine Auswahl");

  const currentDetailResponse = await page.request.get(
    `/api/participant/courses/${setup.courseA.id}`,
  );
  expect(currentDetailResponse.status()).toBe(200);
  const currentDetail = await currentDetailResponse.json();
  const retainedModules = participantLifecyclePresentationModules(setup);

  await page.route(`**/api/participant/courses/${setup.courseA.id}`, (route) =>
    fulfillJson(route, 200, {
      ...currentDetail,
      modules: [...currentDetail.modules, ...retainedModules],
    }),
  );
  await page.reload();
  await expect(moduleItem(page, retainedModules[0].title)).toContainText(
    "Historische Teilnahme",
  );
  await expect(moduleItem(page, retainedModules[1].title)).toContainText(
    "Aktuelle Teilnahme",
  );
  await page.goto(`/courses/${setup.courseB.id}`);
  await expect(page.getByRole("heading", { name: setup.courseB.name })).toBeVisible();
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("announces stale and technical Participant lifecycle outcomes safely", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  let participant = {
    id: "participant-lifecycle-ui",
    name: "Participant Lifecycle UI",
    email: "participant-lifecycle-ui@example.com",
    state: "active",
  };
  let mutationMode = "stale";

  await page.route(
    "**/api/admin/participants/participant-lifecycle-ui",
    (route) => fulfillJson(route, 200, participant),
  );
  await page.route(
    "**/api/admin/participants/participant-lifecycle-ui/*",
    async (route) => {
      if (mutationMode === "stale") {
        await fulfillJson(route, 409, { outcome: "participant-not-active" });
        return;
      }

      if (mutationMode === "technical") {
        await fulfillJson(route, 500, { outcome: "technical-error" });
        return;
      }

      const isDisable = route.request().url().endsWith("/disablement");
      participant = {
        ...participant,
        state: isDisable ? "disabled" : "active",
      };
      await fulfillJson(route, 200, {
        outcome: isDisable ? "disabled" : "re-enabled",
        participant,
        ...(isDisable ? { removedSelectionCount: 0 } : {}),
      });
    },
  );

  await page.goto("/admin/participants/participant-lifecycle-ui");
  await page.getByRole("button", { name: "Teilnahmeprofil deaktivieren" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Teilnahmeprofil deaktivieren?",
  });
  const confirm = dialog.getByRole("button", {
    name: "Teilnahmeprofil endgültig deaktivieren",
  });

  await confirm.click();
  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Der Teilnahmestatus kann wegen eines geänderten",
    }),
  ).toBeFocused();
  mutationMode = "technical";
  await confirm.click();
  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Die Teilnahmedaten konnten nicht geladen oder gespeichert werden.",
    }),
  ).toBeFocused();
  mutationMode = "success";
  await confirm.click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Das Teilnahmeprofil wurde deaktiviert.",
    }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Teilnahmeprofil wieder aktivieren" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText("Teilnahmeprofil: Deaktiviert")).toBeVisible();
  await page.getByRole("button", { name: "Teilnahmeprofil wieder aktivieren" }).click();
  await page
    .getByRole("dialog", { name: "Teilnahmeprofil wieder aktivieren?" })
    .getByRole("button", { name: "Teilnahmeprofil wieder aktivieren" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Das Teilnahmeprofil wurde wieder aktiviert.",
    }),
  ).toBeFocused();
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

/** @returns {Promise<object>} Ensure same-principal Active Admin and Participant. */
async function ensureFirstAdminParticipant(page) {
  await ensureActiveAdmin(page);
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: {
        name: "Participant Lifecycle Target",
        email: "participant-lifecycle-target@example.com",
      },
    });
  }

  expect([200, 201]).toContain(response.status());
  return response.json();
}

/** @returns {Promise<object>} Ensure the fixed first Admin is active. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Participant Lifecycle Admin" },
  });

  expect([201, 409]).toContain(response.status());
  return getJson(page, "/api/admin/me");
}

/** @returns {Promise<object>} Create two Active Courses and one future choice. */
async function createLifecycleCourses(page, participantId) {
  const suffix = crypto.randomUUID();
  const courseA = await createCourse(page, `Participant Lifecycle A ${suffix}`);
  const courseB = await createCourse(page, `Participant Lifecycle B ${suffix}`);
  const groupResponse = await page.request.post(
    `/api/admin/courses/${courseA.id}/groups`,
    { data: { name: "Participant Lifecycle Group" } },
  );
  const group = await groupResponse.json();
  const moduleResponse = await page.request.post(
    `/api/admin/courses/${courseA.id}/modules`,
    {
      data: {
        title: "Participant Lifecycle Future Module",
        startsAtLocal: "2026-09-01T10:00",
        endsAtLocal: "2026-09-01T11:00",
      },
    },
  );
  const module = await moduleResponse.json();

  await assign(page, courseA.id, participantId);
  await assign(page, courseB.id, participantId);
  const selection = await page.request.put(
    `/api/participant/courses/${courseA.id}/modules/${module.id}/selection`,
    { data: { groupId: group.id } },
  );
  expect(selection.status()).toBe(201);
  return { courseA, courseB, group, module };
}

/** @returns {Array<object>} Bounded retained historical/live presentation data. */
function participantLifecyclePresentationModules(setup) {
  return [
    {
      ...setup.module,
      id: "module-participant-lifecycle-cancelled",
      title: "Retained Cancelled Participation",
      state: "cancelled",
      selectionAvailability: "closed",
      selection: {
        id: "selection-participant-lifecycle-cancelled",
        meaning: "historical",
        phase: "historical",
        group: setup.group,
      },
    },
    {
      ...setup.module,
      id: "module-participant-lifecycle-in-progress",
      title: "Retained In-progress Participation",
      startsAt: "2026-08-28T09:00:00.000Z",
      endsAt: "2026-08-28T11:00:00.000Z",
      state: "scheduled",
      selectionAvailability: "closed",
      selection: {
        id: "selection-participant-lifecycle-in-progress",
        meaning: "live",
        phase: "in-progress",
        group: setup.group,
      },
    },
  ];
}

/** @returns {Promise<object>} Create one Active Course through real HTTP. */
async function createCourse(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/** @returns {Promise<object>} Create or retain one Active Assignment. */
async function assign(page, courseId, participantId) {
  const response = await page.request.post(
    `/api/admin/courses/${courseId}/assignments`,
    { data: { participantId } },
  );
  const body = await response.json();

  expect([200, 201]).toContain(response.status());
  return body.assignment;
}

/** @returns {Promise<void>} Establish one fixed normal application session. */
async function establishFixture(page, fixture) {
  const response = await page.request.post(`/api/_fixtures/session/${fixture}`);

  expect(response.status()).toBe(204);
}

/** @returns {Promise<object>} Read one successful JSON resource. */
async function getJson(page, path) {
  const response = await page.request.get(path);

  expect(response.status()).toBe(200);
  return response.json();
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
