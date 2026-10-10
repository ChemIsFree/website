import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));

try {
    await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
    const homeCount = (await page.locator("#catalogue-count-stat").innerText()).trim();
    if (!/^[\d,]{4,}$/.test(homeCount)) {
        throw new Error("Homepage catalogue count did not update: " + homeCount);
    }

    await page.getByRole("link", { name: /open the workflow planner/i }).click();
    await page.waitForURL("**/workflow-planner.html");
    await page.waitForFunction(() => {
        const status = document.querySelector("#planner-catalogue-status");
        return status && /free catalogue records/i.test(status.textContent);
    });

    const plannerCount = (await page.locator("#planner-catalogue-status").innerText()).trim();
    if (!/1,2\d{2}|1,3\d{2}/.test(plannerCount)) {
        throw new Error("Unexpected catalogue size on planner: " + plannerCount);
    }

    await page.getByRole("button", { name: /build my workflow/i }).click();
    await page.waitForSelector(".planner-stage");
    if (!(await page.locator(".planner-stage").count())) {
        throw new Error("Default workflow did not produce stages.");
    }
    if (!(await page.locator(".planner-tool-card").count())) {
        throw new Error("Default workflow did not recommend any tools.");
    }

    await page.locator("#planner-goal").selectOption("custom");
    const checkboxes = page.locator("[data-custom-task]");
    await checkboxes.first().check();
    await checkboxes.nth(1).check();
    if (await page.locator("#custom-task-order li").count() !== 2) {
        throw new Error("Custom task picker did not create two ordered steps.");
    }
    const before = await page.locator("#custom-task-order li").allInnerTexts();
    await page.locator('#custom-task-order [data-order-move="up"]:not(:disabled)').last().click();
    const after = await page.locator("#custom-task-order li").allInnerTexts();
    if (before[0] === after[0]) {
        throw new Error("Custom task reordering did not change the order.");
    }

    await page.getByRole("button", { name: /build my workflow/i }).click();
    await page.waitForSelector(".planner-results-header");
    const title = await page.locator(".planner-results-header h2").innerText();
    if (!title.includes("Custom")) throw new Error("Custom workflow title was not rendered.");

    if (pageErrors.length) throw new Error("Browser page errors: " + pageErrors.join(" | "));
    console.log("BROWSER SMOKE TEST PASSED");
    console.log("Homepage catalogue count: " + homeCount);
    console.log("Planner catalogue status: " + plannerCount);
    console.log("Default workflow: generated steps and tool recommendations");
    console.log("Custom workflow: task selection, reorder controls, and rebuild passed");
} finally {
    await browser.close();
}
