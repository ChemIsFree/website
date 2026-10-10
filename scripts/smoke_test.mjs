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

    // Exercise search, explicit open-source filtering, and a tool detail page.
    await page.getByRole("link", { name: /^explore$/i }).click();
    await page.waitForURL("**/tools.html");
    await page.waitForFunction(() => {
        const count = document.querySelector("#result-count");
        return count && !/loading catalogue/i.test(count.textContent);
    });

    // The catalogue opens in a curated view, while every entry remains one click away.
    await page.waitForFunction(() => document.querySelector("#applications-catalogue")?.dataset.viewMode === "featured");
    const featuredDomainCounts = await page.locator(".application-domain").evaluateAll(domains =>
        domains.map(domain => ({
            name: domain.querySelector("h2")?.textContent.trim() || "unknown",
            count: domain.querySelectorAll(".application-card").length
        }))
    );
    if (featuredDomainCounts.some(domain => domain.count > 20)) {
        throw new Error("A featured category exceeds 20 application cards: " + JSON.stringify(featuredDomainCounts));
    }
    const featuredCardCount = await page.locator(".application-card, .resource-card").count();
    if (!(await page.locator(".application-card h3").filter({ hasText: /^CataList$/i }).count())) {
        throw new Error("ChemIsFree-native CataList was not surfaced in the featured view.");
    }
    await page.locator("#catalogue-view-toggle").click();
    await page.waitForFunction(() => document.querySelector("#applications-catalogue")?.dataset.viewMode === "all");
    const fullCardCount = await page.locator(".application-card, .resource-card").count();
    if (fullCardCount <= featuredCardCount) {
        throw new Error("Full-index toggle did not reveal more records than the featured view.");
    }
    await page.locator("#catalogue-view-toggle").click();
    await page.waitForFunction(() => document.querySelector("#applications-catalogue")?.dataset.viewMode === "featured");

    // Searching automatically expands to the complete index, not only the shortlist.
    await page.locator("#search").fill("GNINA");
    await page.waitForFunction(() => {
        const cards = [...document.querySelectorAll(".application-card h3")];
        return cards.some(item => item.textContent.trim().toLowerCase() === "gnina");
    });
    await page.locator("#access-filter").selectOption("open-source");
    await page.waitForFunction(() => {
        return [...document.querySelectorAll(".application-card h3")]
            .some(item => item.textContent.trim().toLowerCase() === "gnina");
    });

    const gninaCard = page.locator(".application-card").filter({
        has: page.getByRole("heading", { name: "GNINA", exact: true })
    });
    await gninaCard.getByRole("link", { name: /view tool/i }).click();
    await page.waitForURL("**/tool.html?id=gnina");
    await page.waitForFunction(() => {
        const h1 = document.querySelector("#tool-hero-content h1");
        return h1 && h1.textContent.trim() === "GNINA";
    });
    const gninaAccess = await page.locator(".tool-info-card").first().innerText();
    if (!gninaAccess.includes("Free · Open Source")) {
        throw new Error("GNINA does not show its explicit licence correctly: " + gninaAccess);
    }

    // A free website without an explicit software licence must not pass the Open Source filter.
    await page.goto("http://127.0.0.1:4173/tools.html", { waitUntil: "networkidle" });
    await page.locator("#access-filter").selectOption("open-source");
    await page.locator("#search").fill("GPCRdb");
    await page.waitForFunction(() => {
        const count = document.querySelector("#result-count");
        return count && /^0 application/i.test(count.textContent.trim());
    });

    await page.goto("http://127.0.0.1:4173/workflow-planner.html", { waitUntil: "networkidle" });
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
    console.log("Featured view: curated category limits, CataList priority, and full-index toggle passed");
    console.log("Search and tool details: GNINA found; explicit open-source label checked");
    console.log("Access filter: free-web-only GPCRdb correctly excluded from open-source filter");
    console.log("Planner catalogue status: " + plannerCount);
    console.log("Default workflow: generated steps and tool recommendations");
    console.log("Custom workflow: task selection, reorder controls, and rebuild passed");
} finally {
    await browser.close();
}
