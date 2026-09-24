import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { user: null, csrf: "a".repeat(64) } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Vaelis Moonweaver" }),
  ).toBeVisible();
});

test("explores the sheet, spellbook, journal, and dice without pretending to save", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Spells", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your spellbook" }),
  ).toBeVisible();
  await page.getByLabel("Search spells").fill("magic missile");
  await page.getByText("Magic Missile", { exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Cast spell" })).toBeVisible();
  await page.getByRole("button", { name: "Cast spell" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("2 / 4 slots")).toBeVisible();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await expect(page.getByLabel("Backstory")).toContainText("The stars");
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "D20" }),
  ).toBeVisible();
});

test("renders a model and supports keyboard-accessible appearance changes", async ({
  page,
}) => {
  await expect(page.locator(".miniature canvas")).toBeVisible();
  await expect(page.getByText("Summoning your miniature…")).toHaveCount(0, {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Customize miniature", exact: true })
    .click();
  await page.getByLabel("Palette", { exact: true }).selectOption("ember");
  await page.getByLabel("Accessory", { exact: true }).selectOption("sword");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Rotate miniature left" }).click();
});

test("mobile sheet has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Vaelis Moonweaver" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tools of the journey" }),
  ).toBeVisible();
});

test("missing models have a visible fallback and the sheet remains usable", async ({
  page,
}) => {
  await page.route("**/models/**", (route) => route.abort());
  await page.reload();
  await expect(page.getByText("Portrait mode")).toBeVisible();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await expect(page.getByLabel("Adventure notes")).toBeVisible();
});

test("WebGL unavailable and reduced motion do not block the sheet", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.reload();
  await expect(page.getByText("Portrait mode")).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("preview damage and healing update the sheet without account requests", async ({
  page,
}) => {
  let commands = 0;
  await page.route("**/api/v1/characters/**", (route) => {
    commands++;
    return route.abort();
  });
  await page.getByLabel("Damage or healing amount").fill("4");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(page.locator(".hp-value strong")).toHaveText("16");
  await page.getByRole("button", { name: "Heal", exact: true }).click();
  await expect(page.locator(".hp-value strong")).toHaveText("20");
  expect(commands).toBe(0);
  await expect(
    page.getByText("Interactive preview · changes are temporary."),
  ).toBeVisible();
});

test("creates a temporary character through the guided flow", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Create your character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Character name").fill("Lyra Starfall");
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Create character", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lyra Starfall" }),
  ).toBeVisible();
  await expect(page.locator(".hp-value strong")).toHaveText("8");
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await expect(page.getByText("Quarterstaff", { exact: true })).toBeVisible();
  await expect(page.getByText("8 GP")).toBeVisible();
});

test("reading text scales with the viewport and stays readable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const small = await page
    .locator(".skill-row")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(small).toBeGreaterThanOrEqual(14);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const large = await page
    .locator(".skill-row")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(large).toBeGreaterThan(small);
});

test("tracks exhaustion and recorded death saves during manual play", async ({
  page,
}) => {
  await page.getByLabel("Exhaustion level").selectOption("2");
  await expect(page.getByLabel("Exhaustion level")).toHaveValue("2");
  await page.getByLabel("Damage or healing amount").fill("20");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(page.locator(".hp-value strong")).toHaveText("0");
  await page.getByLabel("Death save roll").fill("1");
  await page.getByRole("button", { name: "Record death save" }).click();
  await expect(page.getByText("0 successes · 2 failures")).toBeVisible();
  await page.getByLabel("Death save roll").fill("20");
  await page.getByRole("button", { name: "Record death save" }).click();
  await expect(page.locator(".hp-value strong")).toHaveText("1");
  await expect(page.getByLabel("Death save roll")).toHaveCount(0);
});

test("edits quantities and coin before saving inventory", async ({ page }) => {
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByLabel("Add equipment").selectOption({ label: "Longsword" });
  await page.getByLabel("Gold pieces").fill("42");
  await page.getByLabel("Longsword quantity").fill("2");
  await expect(page.getByText("Inventory has unsaved changes.")).toBeVisible();
  await page.getByRole("button", { name: "Save inventory" }).click();
  await expect(page.getByText("42 GP")).toBeVisible();
  await expect(page.getByLabel("Longsword quantity")).toHaveValue("2");
  await expect(page.getByText("Inventory has unsaved changes.")).toHaveCount(0);
});
