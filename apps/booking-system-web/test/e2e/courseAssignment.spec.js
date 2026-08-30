import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("discovers and assigns a zero-membership Participant through the German Admin journey", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await establishFixture(page, "later-admin");
  await page.goto("/");
  await page.getByLabel("Name").fill("Zero Membership Participant");
  await page.getByLabel("E-Mail-Adresse").fill("zero-membership@example.com");
  await page
    .getByRole("button", { name: "Teilnahmeprofil erstellen" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Ihr Teilnahmeprofil wurde erfolgreich eingerichtet.",
    }),
  ).toBeFocused();
  await expect(
    page.getByRole("status").filter({
      hasText: "Noch keinen Kursen zugeordnet",
    }),
  ).toBeVisible();

  await page.context().clearCookies();
  await ensureActiveAdmin(page);
  const course = await createCourseThroughApi(page, "Assignment Browser Course");

  await page.goto("/admin");
  await page
    .getByRole("link", { name: "Teilnehmende verwalten" })
    .click();
  await expect(page).toHaveURL("/admin/participants");
  await expect(page.getByRole("heading", { name: "Teilnehmende" })).toBeVisible();
  const participantEntry = page
    .getByRole("table", { name: "Globale Teilnehmendensammlung" })
    .getByRole("row")
    .filter({ hasText: "Zero Membership Participant" });

  await expect(participantEntry).toContainText("zero-membership@example.com");
  await expect(participantEntry).toContainText("Teilnahmeprofil: Aktiv");
  await expectAccessibleLayout(page);
  await page.reload();
  await expect(participantEntry).toBeVisible();

  await page.goto(`/admin/courses/${course.id}/participants`);
  await expect(
    page.getByRole("status").filter({
      hasText: "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
    }),
  ).toBeVisible();
  const assignButton = page.getByRole("button", {
    name: "Teilnehmende zuordnen",
  });

  await assignButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Teilnehmende zum Kurs zuordnen",
  });
  const participantRadio = dialog.getByRole("radio", {
    name: /Zero Membership Participant/,
  });
  const search = dialog.getByLabel(
    "Teilnahmeprofile nach Name oder E-Mail durchsuchen",
  );
  const submitButton = dialog.getByRole("button", {
    name: "Kurszuordnung speichern",
  });

  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();
  await expectAccessibleLayout(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(assignButton);

  await page.keyboard.press("Enter");
  await expect(search).toBeFocused();
  await search.fill("zero-membership@example.com");
  await search.press("Enter");
  await expect(participantRadio).toBeVisible();
  await submitButton.focus();
  await page.keyboard.press("Enter");
  await expect(participantRadio).toBeFocused();
  await expectRadioErrorAssociation(
    dialog.getByRole("radiogroup", { name: "Teilnahmeprofil auswählen" }),
    page,
    "Bitte wählen Sie ein verfügbares Teilnahmeprofil aus.",
  );
  await participantRadio.focus();
  await page.keyboard.press("Space");
  await submitButton.focus();
  await page.keyboard.press("Enter");

  const createdStatus = page.getByRole("status").filter({
    hasText: "Die Kurszuordnung wurde erfolgreich angelegt.",
  });
  const membershipTable = page.getByRole("table", {
    name: "Teilnehmende und Kurszuordnungen dieses Kurses",
  });

  await expect(createdStatus).toBeFocused();
  await expect(membershipTable).toContainText("Zero Membership Participant");
  await expect(membershipTable).toContainText("Teilnahmeprofil: Aktiv");
  await expect(membershipTable).toContainText("Kurszuordnung: Aktiv");

  await assignButton.click();
  await participantRadio.check();
  await submitButton.click();
  await expect(
    page.getByRole("status").filter({
      hasText:
        "Die aktive Kurszuordnung bestand bereits und blieb unverändert.",
    }),
  ).toBeFocused();
  await expect(membershipTable.getByRole("row")).toHaveCount(2);

  const courseURL = page.url();

  await page.reload();
  await expect(page).toHaveURL(courseURL);
  await expect(membershipTable).toContainText("Zero Membership Participant");
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expect(page.getByRole("list", {
    name: "Teilnehmende dieses Kurses",
  })).toContainText("Zero Membership Participant");
  await expectAccessibleLayout(page);
});

test("presents Disabled assignment plus stale and technical refusals predictably", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  const course = await createCourseThroughApi(page, "Assignment Refusal Course");
  const disabledParticipant = {
    id: "participant-disabled-contract",
    name: "Disabled Target",
    email: "disabled-target@example.com",
    state: "disabled",
  };
  const disabledAssignment = {
    id: "assignment-disabled-contract",
    state: "active",
    participant: disabledParticipant,
  };
  let assignments = [];
  let assignmentMode = "created";

  await page.route(
    new RegExp(`/api/admin/courses/${course.id}/participant-options(?:\\?.*)?$`),
    (route) =>
      fulfillJson(route, 200, {
        course,
        participants: [{ ...disabledParticipant, assignmentState: null }],
      }),
  );
  await page.route(
    new RegExp(`/api/admin/courses/${course.id}/assignments(?:\\?.*)?$`),
    async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, 200, {
          assignments,
          course,
          pagination: {
            page: 1,
            pageSize: 25,
            totalItems: assignments.length,
            totalPages: assignments.length === 0 ? 0 : 1,
          },
        });
        return;
      }

      expect(route.request().postDataJSON()).toEqual({
        participantId: disabledParticipant.id,
      });

      if (assignmentMode === "created") {
        assignments = [disabledAssignment];
        await fulfillJson(route, 201, {
          outcome: "created",
          assignment: disabledAssignment,
        });
        return;
      }

      await fulfillJson(
        route,
        assignmentMode === "stale" ? 409 : 500,
        {
          outcome:
            assignmentMode === "stale"
              ? "course-not-active"
              : "technical-error",
        },
      );
    },
  );

  await page.goto(`/admin/courses/${course.id}/participants`);
  const assignButton = page.getByRole("button", {
    name: "Teilnehmende zuordnen",
  });

  await assignButton.click();
  const dialog = page.getByRole("dialog", {
    name: "Teilnehmende zum Kurs zuordnen",
  });
  const disabledRadio = dialog.getByRole("radio", {
    name: /Disabled Target/,
  });

  await expect(dialog).toContainText("Teilnahmeprofil: Deaktiviert");
  await disabledRadio.check();
  await dialog
    .getByRole("button", { name: "Kurszuordnung speichern" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Die Kurszuordnung wurde erfolgreich angelegt.",
    }),
  ).toBeFocused();
  await expect(
    page.getByRole("table", {
      name: "Teilnehmende und Kurszuordnungen dieses Kurses",
    }),
  ).toContainText("Teilnahmeprofil: Deaktiviert");

  assignmentMode = "stale";
  await assignButton.click();
  await disabledRadio.check();
  const submitButton = dialog.getByRole("button", {
    name: "Kurszuordnung speichern",
  });

  await submitButton.click();
  const staleAlert = dialog.getByRole("alert").filter({
    hasText:
      "Die Kurszuordnung kann wegen eines geänderten Administrations-, Kurs- oder Zuordnungsstatus nicht bearbeitet werden.",
  });

  await expect(staleAlert).toBeFocused();
  assignmentMode = "technical";
  await submitButton.click();
  const technicalAlert = dialog.getByRole("alert").filter({
    hasText:
      "Die Teilnahmedaten konnten nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.",
  });

  await expect(technicalAlert).toBeFocused();
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expectVisibleKeyboardFocus(assignButton);
});

for (const [viewportName, viewport] of Object.entries({
  desktop: desktopViewport,
  narrow: narrowViewport,
})) {
  test(`presents Assignment read states and privacy at the ${viewportName} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await ensureActiveAdmin(page);
    const course = await createCourseThroughApi(
      page,
      `Assignment State Course ${viewportName}`,
    );
    let releaseDirectory;
    const directoryGate = new Promise((resolve) => {
      releaseDirectory = resolve;
    });
    const participantCollectionURL = /\/api\/admin\/participants(?:\?.*)?$/;

    await page.route(participantCollectionURL, async (route) => {
      await directoryGate;
      await fulfillJson(route, 200, {
        participants: [],
        pagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
      });
    });
    await page.goto("/admin/participants");
    await expect(
      page.getByRole("status").filter({
        hasText: "Teilnehmende werden geladen …",
      }),
    ).toBeVisible();
    releaseDirectory();
    await expect(
      page.getByRole("status").filter({
        hasText: "Es wurden noch keine Teilnahmeprofile registriert.",
      }),
    ).toBeVisible();
    await expectAccessibleLayout(page);

    await page.unroute(participantCollectionURL);
    await page.route(participantCollectionURL, (route) =>
      fulfillJson(route, 403, { outcome: "disabled-admin" }),
    );
    await page.reload();
    await expect(
      page.getByRole("alert").filter({
        hasText:
          "Die Teilnahmeverwaltung ist für dieses Administrationskonto oder diesen Kurs nicht verfügbar.",
      }),
    ).toBeFocused();

    await page.unroute(participantCollectionURL);
    await page.route(participantCollectionURL, (route) =>
      fulfillJson(route, 500, { outcome: "technical-error" }),
    );
    await page.reload();
    await expect(
      page.getByRole("alert").filter({
        hasText:
          "Die Teilnahmedaten konnten nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.",
      }),
    ).toBeFocused();
    await expectAccessibleLayout(page);
    await page.unroute(participantCollectionURL);

    let releaseMembership;
    const membershipGate = new Promise((resolve) => {
      releaseMembership = resolve;
    });
    const membershipPath = new RegExp(
      `/api/admin/courses/${course.id}/assignments(?:\\?.*)?$`,
    );

    await page.route(membershipPath, async (route) => {
      await membershipGate;
      await fulfillJson(route, 200, {
        assignments: [],
        course,
        pagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
      });
    });
    await page.goto(`/admin/courses/${course.id}/participants`);
    await expect(
      page.getByRole("status").filter({
        hasText: "Teilnehmende des Kurses werden geladen …",
      }),
    ).toBeVisible();
    releaseMembership();
    await expect(
      page.getByRole("status").filter({
        hasText: "Diesem Kurs wurden noch keine Teilnehmenden zugeordnet.",
      }),
    ).toBeVisible();

    await page.unroute(membershipPath);
    await page.route(membershipPath, (route) =>
      fulfillJson(route, 404, { outcome: "course-not-found" }),
    );
    await page.reload();
    await expect(
      page.getByRole("alert").filter({
        hasText:
          "Die Teilnahmeverwaltung ist für dieses Administrationskonto oder diesen Kurs nicht verfügbar.",
      }),
    ).toBeFocused();

    await page.unroute(membershipPath);
    await page.route(membershipPath, (route) =>
      fulfillJson(route, 500, { outcome: "technical-error" }),
    );
    await page.reload();
    await expect(
      page.getByRole("alert").filter({
        hasText:
          "Die Teilnahmedaten konnten nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.",
      }),
    ).toBeFocused();
    await expectAccessibleLayout(page);

    await page.unrouteAll({ behavior: "wait" });
    await page.context().clearCookies();
    await establishFixture(page, "later-admin");
    const privateRequests = [];

    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;

      if (
        pathname === "/api/admin/participants" ||
        pathname.endsWith("/assignments")
      ) {
        privateRequests.push(pathname);
      }
    });
    await page.goto("/admin/participants");
    await expect(
      page.getByText(
        "Für diese Anmeldung existiert kein Administrationskonto.",
      ),
    ).toBeVisible();
    await page.goto(`/admin/courses/${course.id}/participants`);
    await expect(
      page.getByText(
        "Für diese Anmeldung existiert kein Administrationskonto.",
      ),
    ).toBeVisible();
    expect(privateRequests).toEqual([]);
    await expectAccessibleLayout(page);
  });
}

/**
 * Establish the first fixture and ensure its current Active Admin exists.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after session and Admin setup.
 */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const bootstrap = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Course Assignment Admin" },
  });

  expect([201, 409]).toContain(bootstrap.status());
}

/**
 * Create one Active Course through the authenticated application API.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {string} name Course name.
 * @returns {Promise<object>} Created Course response.
 */
async function createCourseThroughApi(page, name) {
  const response = await page.request.post("/api/admin/courses", {
    data: { name },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

/**
 * Establish one fixed normal non-production application session.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {"first-admin" | "later-admin"} fixtureName Fixed fixture name.
 * @returns {Promise<void>} Completion after session establishment.
 */
async function establishFixture(page, fixtureName) {
  const response = await page.request.post(
    `/api/_fixtures/session/${fixtureName}`,
  );

  expect(response.status()).toBe(204);
}

/**
 * Fulfill one intercepted application response as JSON.
 *
 * @param {import("@playwright/test").Route} route Intercepted request.
 * @param {number} status HTTP status.
 * @param {object} body JSON body.
 * @returns {Promise<void>} Completion after fulfillment.
 */
async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Assert axe accessibility and absence of horizontal overflow.
 *
 * @param {import("@playwright/test").Page} page Browser page.
 * @returns {Promise<void>} Completion after both assertions.
 */
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

/**
 * Assert a keyboard-focused control has the visible theme outline.
 *
 * @param {import("@playwright/test").Locator} control Focused control.
 * @returns {Promise<void>} Completion after focus and style assertions.
 */
async function expectVisibleKeyboardFocus(control) {
  await expect(control).toBeFocused();
  await expect(control).toHaveCSS("outline-style", "solid");
}

/**
 * Assert a radio group programmatically exposes its localized validation error.
 *
 * @param {import("@playwright/test").Locator} radioGroup Participant choices.
 * @param {import("@playwright/test").Page} page Browser page.
 * @param {string} message Expected localized validation message.
 * @returns {Promise<void>} Completion after association assertion.
 */
async function expectRadioErrorAssociation(radioGroup, page, message) {
  const descriptionId = await radioGroup.getAttribute("aria-describedby");

  expect(descriptionId).toBeTruthy();
  await expect(page.locator(`#${descriptionId}`)).toContainText(message);
  await expect(radioGroup).toHaveAttribute("aria-invalid", "true");
}
