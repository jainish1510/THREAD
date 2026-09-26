// End-to-end smoke test against a running stack (web + API).
//   BASE_URL=http://localhost:3000 npm run e2e
import { chromium } from "playwright-core";
const S = process.env.SCREENSHOT_DIR ?? "/tmp";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failures = 0;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror " + e));
page.on("console", (m) => m.type() === "error" && !m.text().includes("401") && errors.push(m.text()));
const step = async (name, fn) => { try { await fn(); console.log("OK  ", name); } catch (e) { failures++; console.log("FAIL", name, String(e).split("\n")[0]); await page.screenshot({ path: `${S}/fail-${name.replace(/\W/g,"_")}.png` }); } };

await step("pdp loads", async () => { await page.goto(`${base}/products/everyday-tee?color=black`); await page.getByRole("heading", { name: "Everyday Tee" }).waitFor(); });
await step("add without size shows error", async () => { await page.getByRole("button", { name: "Add to bag" }).first().click(); await page.getByText("Please select a size.").waitFor(); });
await step("select size shows live stock", async () => { await page.locator("label", { hasText: /^M$/ }).first().click(); await page.getByText(/available/).first().waitFor(); });
await step("add to bag opens drawer", async () => { await page.getByRole("button", { name: "Add to bag" }).first().click(); await page.getByRole("dialog", { name: "Your bag" }).waitFor(); await page.getByText(/away from free shipping/).waitFor(); await page.screenshot({ path: `${S}/drawer.png` }); });
await step("passport", async () => { await page.keyboard.press("Escape"); await page.getByRole("button", { name: /Digital passport/ }).click(); await page.getByRole("dialog").getByText("Production batch").waitFor(); await page.waitForTimeout(900); await page.screenshot({ path: `${S}/passport.png` }); await page.keyboard.press("Escape"); });
await step("fit finder", async () => { await page.getByRole("button", { name: "Find your size" }).click(); await page.getByLabel("Height", { exact: true }).fill("178"); await page.getByLabel("Weight", { exact: true }).fill("75"); await page.getByLabel(/^Chest/).fill("98"); await page.getByRole("button", { name: "Find my size" }).click(); await page.getByText("Confidence").waitFor(); await page.waitForTimeout(800); await page.screenshot({ path: `${S}/fit.png` }); await page.keyboard.press("Escape"); });
await step("checkout info", async () => {
  await page.goto(`${base}/checkout`);
  await page.getByRole("button", { name: "Continue to shipping" }).click();
  await page.getByText("Enter your email address.").waitFor();
  await page.getByLabel("Email", { exact: true }).fill("e2e@example.com");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Address", { exact: true }).fill("1 Main Street");
  await page.getByLabel("City", { exact: true }).fill("Chicago");
  await page.getByLabel("State").fill("IL");
  await page.getByLabel("ZIP code").fill("60601");
  await page.screenshot({ path: `${S}/checkout1.png` });
  await page.getByRole("button", { name: "Continue to shipping" }).click();
  await page.getByRole("heading", { name: "Shipping" }).waitFor();
});
await step("checkout shipping→payment", async () => { await page.getByRole("button", { name: "Continue to payment" }).click(); await page.getByText(/reserved for/).waitFor(); });
await step("declined card", async () => {
  await page.getByLabel("Card number").fill("4000000000000002"); await page.getByLabel("Expiry").fill("1230"); await page.getByLabel("Security code").fill("123"); await page.getByLabel("Name on card").fill("Ada");
  await page.getByRole("button", { name: "Review order" }).click(); await page.getByRole("button", { name: /Place order/ }).click();
  await page.getByText(/declined/).waitFor();
});
await step("good card", async () => {
  await page.getByLabel("Card number").fill("4242424242424242");
  await page.getByRole("button", { name: "Review order" }).click(); await page.screenshot({ path: `${S}/review.png` }); await page.getByRole("button", { name: /Place order/ }).click();
  await page.getByText(/on its way/).waitFor();
});
let trackUrl;
await step("tracking", async () => { await page.getByRole("link", { name: "Track order" }).click(); await page.getByText("Order confirmed").first().waitFor(); trackUrl = page.url(); await page.waitForTimeout(1500); await page.screenshot({ path: `${S}/tracking.png`, fullPage: true }); });

// Admin in a second context advances the order; customer page should update live.
const admin = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await step("admin login", async () => { await admin.goto(`${base}/login`); await admin.getByLabel("Email", { exact: true }).fill("admin@example.com"); await admin.getByLabel("Password", { exact: true }).fill("thread-admin-2026"); await admin.getByRole("button", { name: "Sign in" }).click(); await admin.waitForURL(/\/admin/); await admin.getByText("Revenue per day").waitFor(); await admin.waitForTimeout(1500); await admin.screenshot({ path: `${S}/admin.png`, fullPage: true }); });
const number = trackUrl?.match(/orders\/([^?]+)/)?.[1];
await step("admin advance → live tracking", async () => {
  await admin.goto(`${base}/admin/orders`); await admin.getByPlaceholder("Order number or email").fill(number);
  await admin.getByRole("button", { name: "Prepare" }).first().click(); await admin.waitForTimeout(800);
  await admin.getByRole("button", { name: "Ship" }).first().click();
  await page.getByRole("heading", { name: "Shipped" }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${S}/tracking-live.png` });
});
await step("admin inventory", async () => { await admin.goto(`${base}/admin/inventory`); await admin.getByText("THR-TEE-001-BLK-M", { exact: true }).first().waitFor(); await admin.screenshot({ path: `${S}/admin-inv.png` }); });
console.log("errors:", errors.slice(0, 10));
await browser.close();
process.exit(failures ? 1 : 0);
