import { chromium } from "playwright";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = "/workspace/screenshots";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function run(name, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (err) => errors.push(`${name} page: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${name} console: ${msg.text()}`);
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Sitizen" }).waitFor();
  await page.getByRole("button", { name: "How to play" }).click();
  await page.getByText("Passing GO pays $200").waitFor();
  await page.getByLabel("Your name").fill("Oak");
  await page.getByRole("button", { name: "Start game" }).click();
  await page.getByRole("button", { name: "Roll dice" }).waitFor({ timeout: 5000 });
  await page.screenshot({ path: `${outDir}/${name}-board.png`, fullPage: true });

  for (let turn = 0; turn < 8; turn++) {
    const roll = page.getByRole("button", { name: "Roll dice" });
    if (await roll.isVisible().catch(() => false) && await roll.isEnabled().catch(() => false)) {
      await roll.click();
    }
    const buy = page.getByRole("button", { name: /Buy \$/ });
    const pass = page.getByRole("button", { name: "Pass" });
    const cont = page.getByRole("button", { name: "Continue" });
    const pay = page.getByRole("button", { name: /Pay \$/ });
    const jailRoll = page.getByRole("button", { name: /^Roll$/ });
    for (let i = 0; i < 20; i++) {
      if (await buy.isVisible().catch(() => false) && await buy.isEnabled().catch(() => false)) {
        await buy.click();
        break;
      }
      if (await pass.isVisible().catch(() => false) && await pass.isEnabled().catch(() => false)) {
        await pass.click();
        break;
      }
      if (await cont.isVisible().catch(() => false) && await cont.isEnabled().catch(() => false)) {
        await cont.click();
        break;
      }
      if (await pay.isVisible().catch(() => false) && await pay.isEnabled().catch(() => false)) {
        await pay.click();
        break;
      }
      if (await jailRoll.isVisible().catch(() => false) && await jailRoll.isEnabled().catch(() => false)) {
        await jailRoll.click();
        break;
      }
      if (await roll.isVisible().catch(() => false) && await roll.isEnabled().catch(() => false)) {
        break;
      }
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: `${outDir}/${name}-midgame.png`, fullPage: true });
  const ivory = page.getByRole("button", { name: "Ivory Lane" });
  if (await ivory.isVisible().catch(() => false)) await ivory.click();
  await page.screenshot({ path: `${outDir}/${name}-inspect.png`, fullPage: true });

  await page.goto(url + "login", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Sign in" }).waitFor();
  await page.screenshot({ path: `${outDir}/${name}-login.png` });
  await page.close();
}

async function testAuthSave() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (err) => errors.push(`auth page: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`auth console: ${msg.text()}`);
  });
  const email = `oak.${Date.now()}@example.com`;
  await page.goto(url + "login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Need an account/ }).click();
  await page.getByLabel("Name").fill("Oak");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("circuit-ok-12");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Sitizen" }).waitFor({ timeout: 20000 });
  await page.getByLabel("Your name").fill("Oak");
  await page.getByRole("button", { name: "Start game" }).click();
  await page.getByRole("button", { name: "Roll dice" }).waitFor({ timeout: 8000 });
  const roll = page.getByRole("button", { name: "Roll dice" });
  if (await roll.isEnabled().catch(() => false)) await roll.click();
  await page.waitForTimeout(2800);
  await page.getByRole("button", { name: "Leave" }).click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Continue saved game" }).waitFor({ timeout: 12000 });
  await page.getByRole("button", { name: "Continue saved game" }).click();
  await page.getByRole("button", { name: "Leave" }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${outDir}/play-auth-resume.png`, fullPage: true });
  await page.close();
}

await run("play-desktop", { width: 1280, height: 800 });
await run("play-mobile", { width: 390, height: 844 });
await testAuthSave();
await browser.close();

if (errors.length) {
  console.error("ERRORS\n" + errors.join("\n"));
  process.exit(1);
}
console.log("PLAYTEST_OK");
