import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("accepts only one of two competing fixed principals", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);
  await ensureFirstAdmin(page);
  const invite = await createInvite(page);
  const rawToken = new URL(invite.url).hash.slice(1);
  const contextC = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const contextD = await browser.newContext({
    viewport: { width: 360, height: 800 },
  });
  const pageC = await contextC.newPage();
  const pageD = await contextD.newPage();

  try {
    await pageC.goto(invite.url);
    await pageD.goto(invite.url);
    await expect(pageC).toHaveURL(/\/admin\/invite$/);
    await expect(pageD).toHaveURL(/\/admin\/invite$/);
    await establishFixture(pageC, "admin-invite-c");
    await establishFixture(pageD, "admin-invite-d");
    await pageC.reload();
    await pageD.reload();
    const nameC = pageC.getByLabel("Name");
    const nameD = pageD.getByLabel("Name");

    await expect(nameC).toBeFocused();
    await expect(nameD).toBeFocused();
    await nameC.fill("Früh gestartete Admina");
    await nameD.fill("Gleichzeitiger Admin");
    await Promise.all([
      pageC.getByRole("button", {
        name: "Administrationskonto erstellen",
      }).click(),
      pageD.getByRole("button", {
        name: "Administrationskonto erstellen",
      }).click(),
    ]);

    const successC = pageC.getByRole("status").filter({
      hasText: "Ihr Administrationskonto wurde erstellt",
    });
    const successD = pageD.getByRole("status").filter({
      hasText: "Ihr Administrationskonto wurde erstellt",
    });
    const staleC = pageC.getByRole("alert").filter({
      hasText: "inzwischen nicht mehr verfügbar",
    });
    const staleD = pageD.getByRole("alert").filter({
      hasText: "inzwischen nicht mehr verfügbar",
    });

    await expect.poll(async () =>
      Number(await successC.count()) + Number(await successD.count()),
    ).toBe(1);
    await expect.poll(async () =>
      Number(await staleC.count()) + Number(await staleD.count()),
    ).toBe(1);
    const focusedResult = await successC.count() === 1 ? successC : successD;
    const focusedRefusal = await staleC.count() === 1 ? staleC : staleD;

    await expect(focusedResult).toBeFocused();
    await expect(focusedRefusal).toBeFocused();
    const [adminC, adminD] = await Promise.all([
      pageC.request.get("/api/admin/me"),
      pageD.request.get("/api/admin/me"),
    ]);

    expect([adminC.status(), adminD.status()].sort()).toEqual([200, 403]);
    const winner = adminC.status() === 200 ? adminC : adminD;

    expect(await winner.json()).toMatchObject({
      state: "active",
      authority: "admin",
    });
    await expectInviteClaimed(page, invite.id);
    await expect(pageC.locator("body")).not.toContainText(rawToken);
    await expect(pageD.locator("body")).not.toContainText(rawToken);
    await expectAccessibleLayout(pageC);
    await expectAccessibleLayout(pageD);
  } finally {
    await contextC.close();
    await contextD.close();
  }
});

/** @returns {Promise<void>} Ensure the first fixed Active Super Admin. */
async function ensureFirstAdmin(page) {
  await establishFixture(page, "first-admin");
  const response = await page.request.post("/api/admin/bootstrap", {
    data: { name: "Competition Owner" },
  });

  expect([201, 409]).toContain(response.status());
}

/** @returns {Promise<object>} Create one independently Active Invite. */
async function createInvite(page) {
  const response = await page.request.post("/api/admin/invites");

  expect(response.status()).toBe(201);
  return (await response.json()).invite;
}

/** @returns {Promise<void>} Establish a fixed normal application session. */
async function establishFixture(page, name) {
  const response = await page.request.post(`/api/_fixtures/session/${name}`);

  expect(response.status()).toBe(204);
}

/** @returns {Promise<void>} Verify terminal state through non-secret list. */
async function expectInviteClaimed(page, inviteId) {
  const response = await page.request.get("/api/admin/invites");
  const body = await response.json();

  expect(response.status()).toBe(200);
  expect(body.invites.find(({ id }) => id === inviteId)).toMatchObject({
    state: "claimed",
  });
}

/** @returns {Promise<void>} Assert overflow and axe at current viewport. */
async function expectAccessibleLayout(page) {
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((body) => body.clientWidth),
  );
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
}
