import { expect, test } from "@playwright/test";

test("bootstraps exactly one first Admin through the German browser flow", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Erste Administration einrichten" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveCount(0);

  await page.route("**/api/auth/sign-in/social", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      provider: "google",
      callbackURL: "/admin",
      errorCallbackURL: "/api/auth/application-error",
    });
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "test initiation failure" }),
    });
  });
  await page.getByRole("button", { name: "Weiter mit Google" }).click();
  await expect(
    page.getByText(
      "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    ),
  ).toBeVisible();
  await page.unroute("**/api/auth/sign-in/social");

  const fixtureResponse = await page.request.post(
    "/api/_fixtures/session/first-admin",
  );

  expect(fixtureResponse.status()).toBe(204);

  await page.reload();

  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toHaveCount(0);

  await page.getByLabel("Name").fill("Jane Doe");
  await page
    .getByRole("button", { name: "Administration einrichten" })
    .click();

  await expect(
    page.getByText(
      "Die erste Administration wurde erfolgreich eingerichtet.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Administrationsbereich" }),
  ).toBeVisible();
  await expect(page.getByText("Jane Doe")).toBeVisible();
  await expect(page.getByText("Aktiv")).toBeVisible();
  await expect(page.getByText("Super Admin")).toBeVisible();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();

  await page.getByRole("button", { name: "Abmelden" }).click();

  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveCount(0);

  const signedOutCurrentAdmin = await page.request.get("/api/admin/me");

  expect(signedOutCurrentAdmin.status()).toBe(401);

  const returningFixtureResponse = await page.request.post(
    "/api/_fixtures/session/first-admin",
  );

  expect(returningFixtureResponse.status()).toBe(204);

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Administrationsbereich" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();

  const laterFixtureResponse = await page.request.post(
    "/api/_fixtures/session/later-admin",
  );
  const laterBootstrapResponse = await page.request.post(
    "/api/admin/bootstrap",
    { data: { name: "Later Admin" } },
  );

  expect(laterFixtureResponse.status()).toBe(204);
  expect(laterBootstrapResponse.status()).toBe(409);
  await expect(laterBootstrapResponse.json()).resolves.toEqual({
    outcome: "bootstrap-unavailable",
  });

  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Administration", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Für diese Anmeldung existiert kein Administrationskonto.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Erste Administration einrichten" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(
    page.getByRole("button", { name: "Weiter mit Google" }),
  ).toBeVisible();
});
