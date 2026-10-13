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
        await page.locator('input[name="approach"][value="structure-based"]').check();
        await page.locator('input[name="gui-only"][value="not-necessarily"]').check();
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
        assert.match(await page.locator("#pymol-interactions-code").innerText(), /distance hbonds/);
        assert.match(await page.locator("#pymol-interactions-code").innerText(), /dash_color, orange/);
        assert.deepEqual(pageErrors, [], "No JavaScript errors should occur while using the planner.");

        await page.locator("#edit-workflow-answers").click();
        await page.locator("#reset-workflow").click();
        assert.equal(await page.locator("#workflow-results").isVisible(), false,
            "Reset should clear generated results.");
        assert.equal(await page.locator('input[name="target-choice"]:checked').count(), 0,
            "Reset should clear answers.");

        console.log("Chromium smoke test passed: compact intake, explicit ChEMBL lookup, human-first ranking, multi-endpoint CSV export, three tabs, PDB shortlist, and PyMOL visualisation.");
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
