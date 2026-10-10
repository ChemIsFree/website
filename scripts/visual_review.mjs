import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("visual-review", "screenshots");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1
});
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));

const save = async (name, target = page, fullPage = false) => {
    await target.screenshot({
        path: path.join(OUT, name),
        fullPage,
        animations: "disabled"
    });
};

try {
    await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
        const count = document.querySelector("#catalogue-count-stat");
        return count && /^[\d,]{4,}$/.test(count.textContent.trim());
    });
    await save("01-homepage-desktop.png", page, true);

    await page.goto("http://127.0.0.1:4173/tools.html", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#applications-catalogue")?.dataset.viewMode === "featured");
    await save("02-featured-catalogue-desktop.png");

    const categories = [
        ["chemical-structures", "03-category-chemical-structures.png"],
        ["ligand-based-discovery", "04-category-ligand-based-discovery.png"],
        ["structure-based-discovery", "05-category-structure-based-discovery.png"],
        ["molecular-properties-admet", "06-category-molecular-properties-admet.png"],
        ["synthesis-reaction-design", "07-category-synthesis-reaction-design.png"],
        ["data-analysis", "08-category-data-analysis.png"],
        ["visualization", "09-category-visualization.png"],
        ["laboratory-workflows", "10-category-laboratory-workflows.png"]
    ];
    for (const [domain, filename] of categories) {
        const section = page.locator(`.application-domain[data-domain="${domain}"]`);
        if (await section.count()) {
            await section.scrollIntoViewIfNeeded();
            await page.waitForTimeout(120);
            await save(filename);
        }
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("#catalogue-view-toggle").click();
    await page.waitForFunction(() => document.querySelector("#applications-catalogue")?.dataset.viewMode === "all");
    await save("11-full-index-desktop.png");

    await page.locator("#search").fill("GNINA");
    await page.waitForFunction(() => [...document.querySelectorAll(".application-card h3")]
        .some(node => node.textContent.trim().toLowerCase() === "gnina"));
    await save("12-search-results-desktop.png");

    await page.goto("http://127.0.0.1:4173/tool.html?id=catalist", { waitUntil: "networkidle" });
    await page.waitForSelector("#tool-hero-content h1");
    await save("13-catalist-tool-detail-desktop.png");

    await page.goto("http://127.0.0.1:4173/workflow-planner.html", { waitUntil: "networkidle" });
    await page.waitForSelector("#planner-catalogue-status");
    await save("14-workflow-planner-desktop.png");
    await page.getByRole("button", { name: /build my workflow/i }).click();
    await page.waitForSelector(".planner-stage");
    const results = page.locator(".planner-results-header");
    if (await results.count()) await results.scrollIntoViewIfNeeded();
    await save("15-workflow-planner-results-desktop.png");

    const mobile = await browser.newPage({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true
    });
    mobile.on("pageerror", error => pageErrors.push("mobile: " + error.message));

    await mobile.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
    await save("16-homepage-mobile.png", mobile);
    await mobile.goto("http://127.0.0.1:4173/tools.html", { waitUntil: "networkidle" });
    await mobile.waitForFunction(() => document.querySelector("#applications-catalogue")?.dataset.viewMode === "featured");
    await save("17-featured-catalogue-mobile.png", mobile);
    const mobileCategory = mobile.locator('.application-domain[data-domain="chemical-structures"]');
    if (await mobileCategory.count()) {
        await mobileCategory.scrollIntoViewIfNeeded();
        await save("18-category-mobile.png", mobile);
    }
    await mobile.goto("http://127.0.0.1:4173/workflow-planner.html", { waitUntil: "networkidle" });
    await save("19-workflow-planner-mobile.png", mobile);
    await mobile.close();

    if (pageErrors.length) {
        throw new Error("Browser page errors during visual review: " + pageErrors.join(" | "));
    }

    const readme = `ChemIsFree pre-launch visual review

This is a non-deploying preview of the pre-launch branch.
The screenshots show the homepage, featured category views, the full index,
search, CataList details, and the workflow planner on desktop and mobile.

To browse the complete static preview locally:
1. Extract chemisfree-prelaunch-preview.zip into a folder.
2. Open a terminal in that folder.
3. Run: py -m http.server 4173
   (If "py" is unavailable, try: python -m http.server 4173)
4. Open http://127.0.0.1:4173/index.html in a browser.
5. Stop the local server with Ctrl+C when finished.

No production deployment or merge to main is performed by this workflow.
`;
    await writeFile(path.resolve("visual-review", "README.txt"), readme, "utf8");
    console.log("VISUAL REVIEW CAPTURE PASSED");
    console.log("Screenshots: " + categories.length + " featured category views, catalogue, details, planner, desktop and mobile.");
} finally {
    await browser.close();
}
