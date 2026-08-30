import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const desktopViewport = { width: 1280, height: 900 };
const narrowViewport = { width: 360, height: 800 };
const adminInviteCollectionURL = /\/api\/admin\/invites(?:\?.*)?$/;

test("creates a one-time Admin Invite, loses its URL, and revokes it", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  await page.goto("/admin");
  const navigation = page.getByRole("link", {
    name: "Admin-Einladungen verwalten",
  });

  await navigation.click();
  await expect(page).toHaveURL(/\/admin\/invites$/);
  await expect(page.getByRole("heading", { name: "Admin-Einladungen" }))
    .toBeVisible();
  await expect(page.getByText("Es wurden noch keine Admin-Einladungen erstellt."))
    .toBeVisible();
  await expectAccessibleLayout(page);

  const create = page.getByRole("button", { name: "Admin-Einladung erstellen" });

  await create.focus();
  const createResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/admin/invites" &&
    response.request().method() === "POST",
  );
  await page.keyboard.press("Enter");
  const createResponse = await createResponsePromise;
  const createBody = await createResponse.json();
  const dialog = page.getByRole("dialog", { name: "Admin-Einladung erstellt" });
  const close = dialog.getByRole("button", {
    name: "Link verwerfen und schließen",
  });

  await expect(close).toBeFocused();
  await expect(dialog).toContainText("wird nur jetzt angezeigt");
  const firstURL = await dialog.locator("code").textContent();
  const firstToken = new URL(firstURL).hash.slice(1);

  expect(firstToken).toMatch(/^[0-9a-f]{64}$/);
  expect(createBody.invite.url).toBe(firstURL);
  await dialog.getByRole("button", { name: "Einladungslink kopieren" }).click();
  await expect(dialog.getByRole("status").filter({
    hasText: "Der Einladungslink wurde kopiert.",
  })).toBeFocused();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(firstURL);
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(firstURL)).toHaveCount(0);
  await expect(page.getByText("Status: Aktiv")).toBeVisible();

  const listResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/admin/invites" &&
    response.request().method() === "GET",
  );
  await page.reload();
  const listText = await (await listResponsePromise).text();

  expect(listText).not.toContain(firstToken);
  expect(listText).not.toContain("url");
  await expect(page.getByText(firstURL)).toHaveCount(0);
  const revoke = page.getByRole("button", {
    name: "Admin-Einladung widerrufen",
  });

  await revoke.focus();
  await page.keyboard.press("Enter");
  let revokeDialog = page.getByRole("dialog", {
    name: "Admin-Einladung widerrufen?",
  });

  await expect(revokeDialog.getByRole("button", { name: "Abbrechen" }))
    .toBeFocused();
  await expect(revokeDialog).toContainText("dauerhaft ungültig");
  await page.keyboard.press("Escape");
  await expectVisibleKeyboardFocus(revoke);
  await page.keyboard.press("Enter");
  revokeDialog = page.getByRole("dialog", {
    name: "Admin-Einladung widerrufen?",
  });
  await revokeDialog.getByRole("button", {
    name: "Einladung endgültig widerrufen",
  }).click();
  await expect(page.getByRole("status").filter({
    hasText: "Die Admin-Einladung wurde dauerhaft widerrufen.",
  })).toBeFocused();
  await expect(page.getByText("Status: Widerrufen")).toBeVisible();
  await expect(revoke).toHaveCount(0);

  await create.click();
  const secondURL = await page.getByRole("dialog", {
    name: "Admin-Einladung erstellt",
  }).locator("code").textContent();

  expect(secondURL).not.toBe(firstURL);
  await page.getByRole("button", { name: "Link verwerfen und schließen" }).click();
  await expect(page.getByText("Status: Aktiv")).toHaveCount(1);
  await expect(page.getByText("Status: Widerrufen")).toHaveCount(1);
  await page.reload();
  await expect(page.getByText(firstURL)).toHaveCount(0);
  await expect(page.getByText(secondURL)).toHaveCount(0);
  await page.setViewportSize(narrowViewport);
  await expectAccessibleLayout(page);
});

test("presents terminal, loading, stale, and technical states safely", async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  await ensureActiveAdmin(page);
  let releaseList;
  const listGate = new Promise((resolve) => {
    releaseList = resolve;
  });

  await page.route(adminInviteCollectionURL, async (route) => {
    if (route.request().method() === "GET") {
      await listGate;
      await fulfillJson(route, 200, {
        invites: [
          { id: "claimed", createdAt: 1_800_000_000, state: "claimed" },
          { id: "revoked", createdAt: 1_700_000_000, state: "revoked" },
        ],
        pagination: { page: 1, pageSize: 25, totalItems: 2, totalPages: 1 },
      });
      return;
    }

    await fulfillJson(route, 500, {
      outcome: "technical-error",
      privateDetail: "private-admin-invite-token",
    });
  });
  await page.goto("/admin/invites");
  await expect(page.getByRole("status").filter({
    hasText: "Admin-Einladungen werden geladen",
  })).toBeVisible();
  releaseList();
  await expect(page.getByText("Status: Eingelöst")).toBeVisible();
  await expect(page.getByText("Status: Widerrufen")).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Admin-Einladung widerrufen",
  })).toHaveCount(0);
  await page.getByRole("button", { name: "Admin-Einladung erstellen" }).click();
  await expect(page.getByRole("alert").filter({
    hasText: "konnten nicht geladen oder gespeichert werden",
  })).toBeFocused();
  await expect(page.getByText("private-admin-invite-token")).toHaveCount(0);
  await page.unroute(adminInviteCollectionURL);

  await page.route(adminInviteCollectionURL, (route) =>
    fulfillJson(route, 200, {
      invites: [{ id: "active", createdAt: 1_800_000_000, state: "active" }],
      pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
    }),
  );
  await page.route("**/api/admin/invites/active/revocation", (route) =>
    fulfillJson(route, 409, { outcome: "admin-invite-not-active" }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Admin-Einladung widerrufen" }).click();
  const revokeDialog = page.getByRole("dialog", {
    name: "Admin-Einladung widerrufen?",
  });

  await revokeDialog.getByRole("button", {
    name: "Einladung endgültig widerrufen",
  }).click();
  await expect(revokeDialog.getByRole("alert").filter({
    hasText: "hat sich geändert",
  })).toBeFocused();
  await expectAccessibleLayout(page);
});

/** @returns {Promise<void>} Ensure the first fixture is an Active Admin. */
async function ensureActiveAdmin(page) {
  const session = await page.request.post("/api/_fixtures/session/first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Admin Invite Admin" },
  });

  expect(session.status()).toBe(204);
  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<void>} Fulfill one bounded JSON response. */
function fulfillJson(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** @returns {Promise<void>} Assert responsive overflow and axe. */
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
