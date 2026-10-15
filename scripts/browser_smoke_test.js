#!/usr/bin/env node
"use strict";

// Chromium test for the streamlined workflow. ChEMBL responses are mocked to
// test species/type/count ordering and CSV export without depending on API uptime.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = process.cwd();
const pageErrors = [];
const apiRequests = [];
const countByTarget = {
    CHEMBL123: 10,
    CHEMBL124: 450,
    CHEMBL125: 10000,
    CHEMBL126: 900
};
const activities = [
    {
        activity_id: 101, target_chembl_id: "CHEMBL124", target_organism: "Homo sapiens",
        molecule_chembl_id: "CHEMBL0001", standard_type: "IC50", standard_relation: "=",
        standard_value: "35", standard_units: "nM", pchembl_value: "7.46",
        assay_chembl_id: "CHEMBLASSAY1", assay_type: "B", assay_description: "Biochemical inhibition",
        data_validity_comment: null, potential_duplicate: false, document_chembl_id: "CHEMBL112233"
    },
    {
        activity_id: 102, target_chembl_id: "CHEMBL124", target_organism: "Homo sapiens",
        molecule_chembl_id: "CHEMBL0002", standard_type: "Ki", standard_relation: "=",
        standard_value: "80", standard_units: "nM", pchembl_value: "7.10",
        assay_chembl_id: "CHEMBLASSAY2", assay_type: "B", assay_description: "Binding inhibition",
        data_validity_comment: null, potential_duplicate: false, document_chembl_id: "CHEMBL112234"
    },
    {
        activity_id: 103, target_chembl_id: "CHEMBL124", target_organism: "Homo sapiens",
        molecule_chembl_id: "CHEMBL0003", standard_type: "EC50", standard_relation: "<",
        standard_value: "100", standard_units: "nM", pchembl_value: "7.00",
        assay_chembl_id: "CHEMBLASSAY3", assay_type: "F", assay_description: "Cellular response",
        data_validity_comment: "Potential transcription error", potential_duplicate: false,
        document_chembl_id: "CHEMBL112235"
    }
];

const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
};

function startStaticServer() {
    const server = http.createServer((request, response) => {
        let pathname;
        try {
            pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
        } catch {
            response.writeHead(400).end("Bad URL");
            return;
        }
        if (pathname === "/") pathname = "/planner.html";
        const filePath = path.resolve(root, "." + pathname);
        if (filePath !== root && !filePath.startsWith(root + path.sep)) {
            response.writeHead(403).end("Forbidden");
            return;
        }
        fs.readFile(filePath, (error, contents) => {
            if (error) {
                response.writeHead(404).end("Not found");
                return;
            }
            response.writeHead(200, {
                "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
                "Cache-Control": "no-store"
            });
            response.end(contents);
        });
    });
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            resolve({ server, url: "http://127.0.0.1:" + server.address().port + "/planner.html" });
        });
    });
}

async function installMockRoutes(page) {
    await page.route(/https:\/\/www\.ebi\.ac\.uk\/chembl\/api\/data\/target\/search\.json/, async (route) => {
        apiRequests.push(route.request().url());
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                targets: [
                    { target_chembl_id: "CHEMBL123", pref_name: "GSK3 beta (human candidate A)", organism: "Homo sapiens", target_type: "SINGLE PROTEIN" },
                    { target_chembl_id: "CHEMBL124", pref_name: "GSK3 beta (human candidate B)", organism: "Homo sapiens", target_type: "SINGLE PROTEIN" },
                    { target_chembl_id: "CHEMBL125", pref_name: "GSK3 beta (mouse)", organism: "Mus musculus", target_type: "SINGLE PROTEIN" },
                    { target_chembl_id: "CHEMBL126", pref_name: "GSK3 beta-containing complex", organism: "Homo sapiens", target_type: "PROTEIN COMPLEX" }
                ]
            })
        });
    });

    await page.route(/https:\/\/www\.ebi\.ac\.uk\/chembl\/api\/data\/activity\.json/, async (route) => {
        apiRequests.push(route.request().url());
        const url = new URL(route.request().url());
        const targetId = url.searchParams.get("target_chembl_id");
        const limit = url.searchParams.get("limit");
        if (limit === "1") {
            const count = countByTarget[targetId] || 0;
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    page_meta: { limit: 1, offset: 0, total_count: count },
                    activities: count ? [{ activity_id: 1 }] : []
                })
            });
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                page_meta: { limit: 1000, offset: 0, total_count: activities.length },
                activities
            })
        });
    });
}

(async () => {
    const { server, url } = await startStaticServer();
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();
        await page.setViewportSize({ width: 1440, height: 1000 });
        page.setDefaultTimeout(15000);
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await installMockRoutes(page);

        const response = await page.goto(url, { waitUntil: "domcontentloaded" });
        assert.ok(response && response.ok(), "The planner page should load.");
        assert.equal(await page.locator(".planner-question").count(), 4,
            "Only the four intake questions should be shown.");
        assert.equal(await page.locator("#question-assets").count(), 0,
            "Optional project details must be absent.");
        assert.equal(await page.locator("script[src*='workflow-recipes.js'],script[src*='protocols.js']").count(), 0,
            "Legacy recipe/protocol engines must not load.");
        assert.equal(await page.locator("#workflow-results").isVisible(), false,
            "Results should stay hidden until the form is submitted.");

        const artifactDirectory = path.join(root, "artifacts");
        await fs.promises.mkdir(artifactDirectory, { recursive: true });
        await page.screenshot({
            path: path.join(artifactDirectory, "planner-preview-intake.png"),
            fullPage: true,
            animations: "disabled"
        });

        await page.locator("#workflow-form button[type='submit']").click();
        assert.match(await page.locator("#workflow-intake-feedback").innerText(), /Please answer Question 1/);
        assert.notEqual(await page.locator("#question-target").getAttribute("open"), null,
            "The first unanswered question should open.");

        await page.locator('input[name="target-choice"][value="yes"]').check();
        await page.locator("#planner-target").fill("GSK3B");
        await page.locator("#question-approach > summary").click();
        await page.locator('input[name="approach"][value="structure-based"]').check();
        await page.locator("#question-interface > summary").click();
        await page.locator('input[name="gui-only"][value="not-necessarily"]').check();
        await page.locator("#question-objectives > summary").click();
        await page.locator('input[name="objective"][value="interactions"]').check();
        assert.equal(apiRequests.length, 0,
            "Typing a target should not automatically trigger slow requests.");
        await page.locator("#workflow-form button[type='submit']").click();

        assert.equal(await page.locator("#workflow-results").isVisible(), true,
            "Submitting complete answers should generate the guide.");
        assert.equal(await page.locator("[data-step-tab]").count(), 3,
            "The guide should have exactly three tabs.");
        assert.match(await page.locator(".workflow-summary").innerText(), /GSK3B/);
        assert.match(await page.locator("#workflow-panel-1").innerText(), /Databases → Search ChEMBL database/);
        assert.match(await page.locator("#workflow-panel-1").innerText(), /Homo sapiens/);
        assert.match(await page.locator("#workflow-panel-1").innerText(), /IC₅₀.*Kᵢ.*EC₅₀/s);
        assert.match(await page.locator("#workflow-panel-1 a").first().getAttribute("href"), /openmolecules\.org/);

        await page.locator("#workflow-results").scrollIntoViewIfNeeded();
        await page.screenshot({
            path: path.join(artifactDirectory, "planner-preview-generated-workflow.png"),
            fullPage: false,
            animations: "disabled"
        });

        await page.locator("#chembl-target-search").click();
        await page.waitForFunction(() => {
            const status = document.querySelector("#chembl-finder-status");
            return status && status.textContent.startsWith("Showing the top ");
        });
        assert.equal(await page.locator(".chembl-target-card").count(), 4,
            "The target selector should present the matching candidate records.");
        const firstCandidate = await page.locator(".chembl-target-card").first().innerText();
        assert.match(firstCandidate, /CHEMBL124/);
        assert.match(firstCandidate, /450 IC₅₀\/Kᵢ\/EC₅₀ records/);
        assert.ok(firstCandidate.indexOf("Homo sapiens") !== -1,
            "Human target records must rank above the mouse record.");
        assert.ok(apiRequests.some((item) => item.includes("target/search.json")),
            "The explicit search button should retrieve target candidates.");

        await page.locator(".chembl-target-card").first().locator(".chembl-use-target").click();
        assert.match(await page.locator("#chembl-selected-target").innerText(), /CHEMBL124/);
        assert.equal(await page.locator('input[name="chembl-endpoint"]:checked').count(), 3,
            "IC50, Ki and EC50 should all be selectable and selected by default.");

        const downloadPromise = page.waitForEvent("download");
        await page.locator("#download-chembl-activities").click();
        const download = await downloadPromise;
        const csvPath = path.join(artifactDirectory, "test-activity-export.csv");
        await download.saveAs(csvPath);
        const csv = await fs.promises.readFile(csvPath, "utf8");
        assert.match(csv, /"standard_type"/);
        assert.match(csv, /"IC50"/);
        assert.match(csv, /"Ki"/);
        assert.match(csv, /"EC50"/);
        assert.match(csv, /"CHEMBLASSAY1"/);
        assert.match(csv, /"CHEMBL112235"/);
        assert.match(await page.locator("#chembl-download-status").innerText(), /Downloaded 3 activity observations/);

        await page.locator("#workflow-tab-2").click();
        assert.equal(await page.locator("#workflow-panel-2").isVisible(), true);
        assert.equal(await page.locator("#workflow-panel-1").isVisible(), false);
        assert.match(await page.locator("#workflow-panel-2").innerText(), /Download 10 candidate structures/);
        assert.match(await page.locator("#workflow-panel-2 a").first().getAttribute("href"), /rcsb\.org/);
        await page.locator("#next-workflow-step").click();

        assert.equal(await page.locator("#workflow-panel-3").isVisible(), true);
        const visualCode = await page.locator("#pymol-overview-code").innerText();
        assert.match(visualCode, /cartoon_transparency, 0\.35/);
        assert.match(visualCode, /color cyan/);
        assert.match(visualCode, /color salmon/);
        assert.match(visualCode, /zoom ligand, 8/);
        assert.equal(await page.locator("[data-copy]").count(), 3,
            "The generated guide should provide copy actions for its code blocks.");
        await page.locator("#workflow-panel-3 details.workflow-more").nth(1).locator("summary").click();
        assert.match(await page.locator("#pymol-interactions-code").innerText(), /distance hbonds/);
        assert.match(await page.locator("#pymol-interactions-code").innerText(), /dash_color, orange/);
        assert.deepEqual(pageErrors, [], "No JavaScript errors should occur while using the planner.");

        await page.locator("#edit-workflow-answers").click();
        await page.locator("#reset-workflow").click();
        assert.equal(await page.locator("#workflow-results").isVisible(), false,
            "Reset should clear generated results.");
        assert.equal(await page.locator('input[name="target-choice"]:checked').count(), 0,
            "Reset should clear answers.");

        // Catalogue smoke test: categories, all entries, and separate resource sections.
        const catalogueResponse = await page.goto(new URL("/tools.html", url).toString(), { waitUntil: "domcontentloaded" });
        assert.ok(catalogueResponse && catalogueResponse.ok(), "The catalogue page should load.");
        await page.locator(".catalogue-tool-card").first().waitFor();
        const directBadge = page.locator(".catalogue-card-status-link").first();
        assert.ok(await directBadge.count() > 0, "At least one access badge should link directly to a provider.");
        const directBadgeUrl = await directBadge.getAttribute("href");
        assert.match(directBadgeUrl || "", /^https?:\/\//i, "An access badge should open a provider URL.");
        assert.equal(await directBadge.getAttribute("target"), "_blank");
        assert.ok(!String(directBadgeUrl).includes("tool.html?id="),
            "Access badges should open the provider, not the internal detail page.");
        const allListed = Number((await page.locator("#all-count").innerText()).replace(/,/g, ""));
        assert.ok(allListed > 0, "The full catalogue count should be available.");
        assert.equal(await page.locator('[data-view="featured"], [data-view="all"]').count(), 2,
            "The catalogue should offer Featured selection and All listed tools.");
        assert.equal(await page.locator('[data-view="featured"]').getAttribute("aria-pressed"), "true",
            "Featured selection should be the default view.");
        const featuredCount = Number((await page.locator("#featured-count").innerText()).replace(/,/g, ""));
        assert.ok(featuredCount > 0, "The curated featured count should be available.");
        assert.equal(await page.locator("#category-filters [data-domain]").count(), 15,
            "The category row should expose All categories and exactly 14 functional categories.");
        const expectedCategories = [
            "Target Identification", "Protein Structures", "Visualization", "Binding Pockets",
            "Structure-Based", "Molecular Dynamics", "Cheminformatics", "De Novo Design",
            "Ligand-Based and QSAR", "ADMET Prediction", "Retrosynthesis",
            "Nomenclature and Format Conversion", "Libraries and Datasets", "Organization"
        ];
        const visibleCategories = await page.locator("#category-filters [data-domain]:not([data-domain=''])").allInnerTexts();
        expectedCategories.forEach(label => {
            assert.ok(visibleCategories.some(item => item.startsWith(label)),
                "Missing functional category: " + label);
        });
        assert.ok(await page.locator("#access-filters [data-access='open-source']").isVisible());
        assert.ok(await page.locator("#access-filters [data-access='free']").isVisible());

        const totalCards = await page.locator(".catalogue-tool-card").count();
        assert.equal(totalCards, featuredCount,
            "The default view should show the curated featured selection.");
        await page.locator('[data-view="all"]').click();
        assert.equal(await page.locator(".catalogue-tool-card").count(), allListed,
            "The All listed tools view should expose the full registry.");
        await page.locator('[data-view="featured"]').click();
        assert.equal(await page.locator(".catalogue-tool-card").count(), featuredCount,
            "Switching back should restore the featured shortlist.");
        const cardLinks = await page.locator(".catalogue-tool-card h3 a").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
        assert.equal(new Set(cardLinks).size, cardLinks.length, "Each entry should appear only once in the All categories view.");

        const sectionTitles = await page.locator("#catalogue-grid .catalogue-card-section-heading h3").allInnerTexts();
        assert.ok(sectionTitles.length >= 2, "The catalogue should have separate tool and resource sections.");
        assert.equal(sectionTitles[0], "Tools", "Applications must be shown first.");
        assert.equal(sectionTitles[sectionTitles.length - 1], "Libraries & datasets",
            "Libraries, databases, and datasets must be shown after tools.");

        await page.evaluate(() => window.scrollTo(0, 700));
        await page.screenshot({
            path: path.join(artifactDirectory, "planner-preview-catalogue.png"),
            fullPage: false,
            animations: "disabled"
        });

        await page.locator('#category-filters [data-domain="structure-based"]').click();
        assert.ok(await page.locator(".catalogue-tool-card").count() > 0,
            "Choosing a new functional category should filter the cards.");
        assert.match(await page.locator("#active-filter-summary").innerText(), /STRUCTURE-BASED/);
        const selectedTitles = await page.locator("#catalogue-grid .catalogue-card-section-heading h3").allInnerTexts();
        assert.equal(selectedTitles[0], "Tools", "Filtered tools should stay in the upper section.");
        await page.locator('#category-filters [data-domain=""]').click();

        await page.locator('#access-filters [data-access="free"]').click();
        assert.ok(await page.locator(".catalogue-tool-card").count() > 0,
            "Free-access filtering should return matching entries.");
        await page.locator('#access-filters [data-access="open-source"]').click();
        assert.ok(await page.locator(".catalogue-tool-card").count() > 0,
            "Open-source filtering should return matching entries.");
        await page.locator("#search").fill("GNINA");
        assert.ok(await page.locator(".catalogue-tool-card").count() > 0,
            "Search should work together with access filters.");
        const searchedNames = await page.locator(".catalogue-tool-card h3").allInnerTexts();
        assert.ok(searchedNames.some(name => /GNINA/i.test(name)),
            "The target tool should appear among name/description search matches.");
        await page.locator("#clear-filters").click();
        assert.equal(await page.locator("#search").inputValue(), "");
        assert.equal(await page.locator(".catalogue-tool-card").count(), featuredCount,
            "Reset should clear filters and return to Featured selection.");

        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator(".catalogue-tool-card").first().waitFor();
        const firstCard = await page.locator(".catalogue-tool-card").first().boundingBox();
        assert.ok(firstCard && firstCard.width > 130 && firstCard.width < 390,
            "Catalogue cards should reflow to a compact mobile grid.");

        const homepageResponse = await page.goto(new URL("/index.html", url).toString(), { waitUntil: "domcontentloaded" });
        assert.ok(homepageResponse && homepageResponse.ok(), "The homepage should load.");
        assert.equal(await page.locator(".category-card").count(), 14,
            "The homepage should link to all 14 functional categories.");
        assert.ok(await page.locator('a.category-card[href="tools.html?domain=target-identification"]').isVisible());
        assert.ok(await page.locator('a.category-card[href="tools.html?domain=libraries-datasets"]').isVisible());

        // Detail page: complete description, horizontal Resources/Citation, then unified metadata.
        await page.setViewportSize({ width: 1280, height: 900 });
        const detailResponse = await page.goto(new URL("/tool.html?id=datawarrior", url).toString(), { waitUntil: "domcontentloaded" });
        assert.ok(detailResponse && detailResponse.ok(), "The tool detail page should load.");
        await page.locator(".tool-detail-full-description").waitFor();
        assert.equal(await page.locator(".tool-detail-link-citation-row .tool-detail-resource-panel").count(), 1,
            "The resource links panel should appear directly below the description.");
        assert.equal(await page.locator(".tool-detail-link-citation-row .tool-detail-citation-panel").count(), 1,
            "The citation panel should sit beside the resources panel.");
        assert.equal(await page.locator(".tool-info-availability").count(), 1,
            "Information and availability should be consolidated into one section.");
        assert.equal(await page.locator(".tool-detail-main").count(), 0,
            "The old long two-column detail layout should be removed.");
        assert.equal(await page.locator(".tool-section h2").filter({ hasText: /^About$/ }).count(), 0,
            "The duplicate About section should be removed.");
        assert.equal(await page.locator(".tool-section h2").filter({ hasText: /What it helps you do/i }).count(), 0,
            "The duplicate task-heading section should be removed.");
        const descriptionStyle = await page.locator(".tool-detail-full-description").evaluate(node => {
            const style = getComputedStyle(node);
            return { display: style.display, overflow: style.overflow, clamp: style.webkitLineClamp };
        });
        assert.notEqual(descriptionStyle.display, "-webkit-box", "Long descriptions must not use line-clamp display.");
        assert.notEqual(descriptionStyle.overflow, "hidden", "Long descriptions must not be clipped.");
        const resourceBox = await page.locator(".tool-detail-resource-panel").boundingBox();
        const citationBox = await page.locator(".tool-detail-citation-panel").boundingBox();
        assert.ok(resourceBox && citationBox && resourceBox.x < citationBox.x,
            "Resources and citation should be arranged horizontally on desktop.");
        const metadataBox = await page.locator(".tool-info-availability").boundingBox();
        assert.ok(metadataBox && resourceBox && citationBox &&
            metadataBox.y >= Math.max(resourceBox.y + resourceBox.height, citationBox.y + citationBox.height),
            "Information/availability should sit below the Resources/Citation row.");
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
            path: path.join(artifactDirectory, "planner-preview-tool-detail.png"),
            fullPage: true,
            animations: "disabled"
        });

        assert.deepEqual(pageErrors, [], "No JavaScript errors should occur across planner, catalogue, homepage and detail pages.");

        console.log("Chromium smoke test passed: guided planner, 14 categories, clickable access badges, featured-first catalogue with full-registry toggle, separate resource sections, compact detail pages, and mobile layout.");
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
