import { expect, test } from "@playwright/test";

test("bootstraps exactly one first Admin through the German browser flow", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Erste Administration einrichten" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();

  const fixtureResponse = await page.request.post(
    "/api/_fixtures/session/first-admin",
  );

  expect(fixtureResponse.status()).toBe(204);

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

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Administrationsbereich" }),
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
  await expect(
    page.getByRole("heading", { name: "Erste Administration einrichten" }),
  ).toHaveCount(0);
});
