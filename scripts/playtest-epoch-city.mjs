import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:8080";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);

const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(base, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Sitizen" }).waitFor();
await page.getByRole("button", { name: /^Hard/ }).click();
await page.getByRole("button", { name: "Enter Epoch City" }).click();
await page.getByText(/Computers already committed/i).first().waitFor();
await page.getByText(/Founders Square/i).first().waitFor();
await page.getByText(/Ops \$480/i).first().waitFor();
await page.getByText(/Community \$320/i).first().waitFor();
await page.getByText(/Marks · 0/i).first().waitFor();
await page.getByRole("button", { name: /Prepay bail/i }).waitFor();
await page.getByRole("button", { name: /Gilt pawn/i }).waitFor();
await page.getByRole("button", { name: "Roll dice" }).first().click();
await page.getByText(/Founders Square · 2/).first().waitFor();
await page.getByText(/e1 gini/i).first().waitFor();
await page.getByRole("button", { name: "Ivory Lane", exact: true }).click();
await page.getByText(/SZ-01/i).waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-epoch-desktop.png" });

await page.evaluate(() => window.dispatchEvent(new CustomEvent("gc-table-band", { detail: 1 })));
await page.getByText(/Lantern Square/i).first().waitFor();
await page.getByText(/this board holds Founders \+ Lantern/i).first().waitFor();
await page.getByRole("button", { name: "Amber Wharf", exact: true }).waitFor();
await page.getByRole("button", { name: "Jail", exact: true }).waitFor();
await page.getByRole("button", { name: "Crown Point", exact: true }).waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-epoch-lantern.png" });

await page.evaluate(() => window.dispatchEvent(new CustomEvent("gc-table-band", { detail: 2 })));
await page.getByText(/Iris Square/i).first().waitFor();
await page.getByText(/this board holds Founders \+ Lantern \+ Iris/i).first().waitFor();
await page.getByRole("button", { name: "Iris Dock", exact: true }).waitFor();
await page.getByRole("button", { name: "Amber Wharf", exact: true }).waitFor();
await page.getByRole("button", { name: "Jail", exact: true }).waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-epoch-iris.png" });

await page.getByRole("button", { name: "Leave" }).click();
await page.getByRole("button", { name: /Table Circuit/i }).click();
await page.getByRole("button", { name: "Start game" }).waitFor();
await page.getByRole("button", { name: "Start game" }).click();
await page.getByRole("button", { name: "Roll dice" }).waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-table-desktop.png" });
await page.getByRole("button", { name: "Leave" }).click();

await page.goto(`${base}/litepaper`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Sitizen" }).waitFor();
await page.getByRole("heading", { name: /Land as an NFT/i }).waitFor();
await page.getByText(/houses are traits on the land NFT/i).waitFor();
await page.getByRole("heading", { name: /Treasury, Marks, tax/i }).waitFor();
await page.getByText(/tagged 60% ops/i).first().waitFor();
await page.getByText(/Every 20 epochs/i).first().waitFor();
await page.getByText(/bail bond/i).first().waitFor();
await page.getByText(/ops pays 30%/i).first().waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-litepaper-desktop.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Enter Epoch City" }).click();
await page.getByRole("button", { name: "Roll dice" }).first().waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-epoch-mobile.png" });

await page.evaluate(() => window.dispatchEvent(new CustomEvent("gc-table-band", { detail: 1 })));
await page.getByText(/Lantern Square/i).first().waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-epoch-lantern-mobile.png" });

await page.goto(`${base}/litepaper`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: /Houses on the deed/i }).waitFor();
await page.screenshot({ path: "/workspace/screenshots/play-litepaper-mobile.png" });

await browser.close();

if (errors.length) {
  console.error("CONSOLE", errors);
  process.exit(1);
}
console.log("EPOCH_PLAYTEST_OK");
