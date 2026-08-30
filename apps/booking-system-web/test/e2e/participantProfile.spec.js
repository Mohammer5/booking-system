import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };

test("self-edits then Admin-edits one stable profile without changing Admin identity", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const peer = await ensureParticipant(page, "selection-participant", {
    name: "Private Profile Peer",
    email: "private-profile-peer@example.com",
  });
  const { admin, participant } = await ensureFirstAdminParticipant(page);

  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Teilnahmeprofil bearbeiten" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue(participant.name);
  await expect(page.getByLabel("E-Mail-Adresse")).toHaveValue(participant.email);
  await expect(page.getByText(peer.email)).toHaveCount(0);

  await page.getByLabel("Name").fill(" ");
  await page.getByLabel("E-Mail-Adresse").fill("invalid");
  await submitProfileWithKeyboard(page);
  await expect(page.getByLabel("Name")).toBeFocused();
  await expectFieldErrorAssociation(
    page.getByLabel("Name"),
    page,
    "Bitte geben Sie einen Namen ein.",
  );
  await page.getByLabel("Name").fill("Self Profile Updated");
  await submitProfileWithKeyboard(page);
  await expect(page.getByLabel("E-Mail-Adresse")).toBeFocused();
  await expectFieldErrorAssociation(
    page.getByLabel("E-Mail-Adresse"),
    page,
    "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  );

  await page.getByLabel("E-Mail-Adresse").fill(" Self.Profile+Tag@Example.COM ");
  await submitProfileWithKeyboard(page);
  await expect(profileSuccess(page)).toBeFocused();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Self Profile Updated");
  await expect(page.getByLabel("E-Mail-Adresse")).toHaveValue(
    "Self.Profile+Tag@Example.COM",
  );

  const adminAfterSelfEdit = await getJson(page, "/api/admin/me");
  expect(adminAfterSelfEdit.name).toBe(admin.name);
  await page.goto(
    `/admin/participants?${new URLSearchParams({ q: "Self Profile Updated" })}`,
  );
  const targetRow = page
    .getByRole("table", { name: "Globale Teilnehmendensammlung" })
    .getByRole("row")
    .filter({ hasText: "Self Profile Updated" });
  await targetRow
    .getByRole("link", { name: "Teilnahmeprofil öffnen und bearbeiten" })
    .click();
  await expect(page).toHaveURL(`/admin/participants/${participant.id}`);
  await expect(page.getByText(peer.email)).toHaveCount(0);
  await page.getByLabel("Name").fill("Admin Profile Updated");
  await page
    .getByLabel("E-Mail-Adresse")
    .fill("admin.profile.updated@example.com");
  await submitProfileWithKeyboard(page);
  await expect(profileSuccess(page)).toBeFocused();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Admin Profile Updated");
  await expect(page.getByText("Teilnahmeprofil: Aktiv")).toBeVisible();
  expect((await getJson(page, "/api/admin/me")).name).toBe(admin.name);
  await expectAccessibleLayout(page);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("announces duplicate and stale profile refusals without changing stored data", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const peer = await ensureParticipant(page, "selection-participant", {
    name: "Duplicate Owner",
    email: "duplicate.profile+tag@example.com",
  });
  const { participant } = await ensureFirstAdminParticipant(page);

  await page.goto("/profile");
  await page.getByLabel("Name").fill("Duplicate Attempt");
  await page.getByLabel("E-Mail-Adresse").fill(peer.email.toUpperCase());
  await page.getByRole("button", { name: "Teilnahmeprofil speichern" }).click();
  const duplicate = page.getByRole("alert").filter({
    hasText:
      "Diese E-Mail-Adresse wird bereits für ein anderes Teilnahmeprofil verwendet.",
  });

  await expect(duplicate).toBeFocused();
  const stored = await getJson(page, "/api/participant/me");
  expect(stored.name).toBe(participant.name);
  expect(stored.email).toBe(participant.email);

  await page.route("**/api/participant/me", async (route) => {
    if (route.request().method() === "PUT") {
      await fulfillJson(route, 403, { outcome: "participant-not-active" });
    } else {
      await route.continue();
    }
  });
  await page.getByLabel("Name").fill("Stale Self Attempt");
  await page.getByLabel("E-Mail-Adresse").fill("stale.self@example.com");
  await page.getByRole("button", { name: "Teilnahmeprofil speichern" }).click();
  await expect(
    page.getByRole("alert").filter({
      hasText:
        "Ihr Teilnahmeprofil kann im aktuellen Zugriffsstatus nicht bearbeitet werden.",
    }),
  ).toBeFocused();

  await page.goto(`/admin/participants/${participant.id}`);
  await page.route(
    `**/api/admin/participants/${participant.id}`,
    async (route) => {
      if (route.request().method() === "PUT") {
        await fulfillJson(route, 404, { outcome: "participant-not-found" });
      } else {
        await route.continue();
      }
    },
  );
  await page.getByLabel("Name").fill("Stale Admin Attempt");
  await page.getByRole("button", { name: "Teilnahmeprofil speichern" }).click();
  await expect(
    page.getByRole("alert").filter({
      hasText:
        "Dieses Teilnahmeprofil kann im aktuellen Administrationsstatus nicht bearbeitet werden.",
    }),
  ).toBeFocused();
  await expectAccessibleLayout(page);
});

test("Admin edits a Disabled profile on a direct narrow route", async ({ page }) => {
  await page.setViewportSize(narrowViewport);
  await ensureActiveAdmin(page);
  let participant = {
    id: "disabled-ui",
    name: "Disabled Profile",
    email: "disabled.profile@example.com",
    state: "disabled",
  };

  await page.route("**/api/admin/participants/disabled-ui", async (route) => {
    if (route.request().method() === "PUT") {
      const input = route.request().postDataJSON();
      participant = { ...participant, name: input.name, email: input.email };
    }

    await fulfillJson(route, 200, participant);
  });
  await page.goto("/admin/participants/disabled-ui");
  await expect(page.getByText("Teilnahmeprofil: Deaktiviert")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Disabled Profile");
  await page.getByLabel("Name").fill("Disabled Profile Updated");
  await page
    .getByLabel("E-Mail-Adresse")
    .fill("disabled.profile.updated@example.com");
  await submitProfileWithKeyboard(page);
  await expect(profileSuccess(page)).toBeFocused();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Disabled Profile Updated");
  await expect(page.getByText("Teilnahmeprofil: Deaktiviert")).toBeVisible();
  await expectAccessibleLayout(page);
});

/** @returns {Promise<object>} Ensure first Admin and same-principal Participant. */
async function ensureFirstAdminParticipant(page) {
  const admin = await ensureActiveAdmin(page);
  const participant = await ensureParticipant(page, "first-admin", {
    name: "Profile Self Original",
    email: "profile.self.original@example.com",
  });

  return { admin, participant };
}

/** @returns {Promise<object>} Establish the fixed first Active Admin. */
async function ensureActiveAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Profile Admin" },
  });

  expect([201, 409]).toContain(response.status());
  return getJson(page, "/api/admin/me");
}

/** @returns {Promise<object>} Ensure a fixed principal has one Participant. */
async function ensureParticipant(page, fixture, profile) {
  await establishFixture(page, fixture);
  let response = await page.request.get("/api/participant/me");

  if (response.status() === 403) {
    response = await page.request.post("/api/participant/onboarding", {
      data: profile,
    });
    expect(response.status()).toBe(201);
  }

  expect([200, 201]).toContain(response.status());
  return response.json();
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

/** @returns {Promise<void>} Submit the profile form through keyboard input. */
async function submitProfileWithKeyboard(page) {
  const submit = page.getByRole("button", { name: "Teilnahmeprofil speichern" });

  await page.getByLabel("E-Mail-Adresse").focus();
  await page.keyboard.press("Tab");
  await expectVisibleKeyboardFocus(submit);
  await page.keyboard.press("Enter");
}

/** @returns {object} Successful profile announcement. */
function profileSuccess(page) {
  return page.getByRole("status").filter({
    hasText: "Das Teilnahmeprofil wurde erfolgreich aktualisiert.",
  });
}

/** @returns {Promise<void>} Assert field-to-error accessibility association. */
async function expectFieldErrorAssociation(field, page, message) {
  const error = page.getByText(message, { exact: true });

  await expect(error).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  const describedBy = await field.getAttribute("aria-describedby");
  expect(describedBy).toContain(await error.getAttribute("id"));
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

/** @returns {Promise<void>} Fulfill one intercepted JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}
