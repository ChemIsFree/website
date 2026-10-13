#!/usr/bin/env node
"use strict";

// Real Chromium smoke test for the rendered, compact workflow planner.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = process.cwd();
const pageErrors = [];
const apiRequests = [];
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

(async () => {
    const { server, url } = await startStaticServer();
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        page.setDefaultTimeout(12000);
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("request", (request) => {
            if (/chembl\/api|rest\.uniprot\.org|search\.rcsb\.org/i.test(request.url())) {
                apiRequests.push(request.url());
            }
        });

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

        assert.deepEqual(apiRequests, [],
            "The planner must not call the unreliable live ChEMBL, UniProt or PDB lookup APIs.");
        assert.deepEqual(pageErrors, [], "No JavaScript errors should occur while using the planner.");

        await page.locator("#edit-workflow-answers").click();
        await page.locator("#reset-workflow").click();
        assert.equal(await page.locator("#workflow-results").isVisible(), false,
            "Reset should clear generated results.");
        assert.equal(await page.locator('input[name="target-choice"]:checked').count(), 0,
            "Reset should clear answers.");

        console.log("Chromium smoke test passed: compact intake, validation, three tabs, target-specific links, endpoint and structure guidance, PyMOL code, and reset.");
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
