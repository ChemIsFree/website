#!/usr/bin/env node
"use strict";

// Real Chromium smoke test for the static planner page. The default mode mocks
// public APIs so DOM/control regressions are deterministic. --live sends actual
// browser requests to ChEMBL, UniProt and RCSB PDB; CI runs that mode non-blocking.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = process.cwd();
const liveMode = process.argv.includes("--live");
const requestCounts = { chembl: 0, uniprot: 0, rcsb: 0 };
const pageErrors = [];

const mockUniProtEntries = [
    {
        primaryAccession: "P12345",
        uniProtkbId: "TARGET_A_HUMAN",
        entryType: "UniProtKB reviewed (Swiss-Prot)",
        proteinDescription: { recommendedName: { fullName: { value: "Example target A" } } },
        genes: [{ geneName: { value: "TESTA" } }],
        organism: { scientificName: "Homo sapiens" },
        sequence: { length: 420 },
        uniProtKBCrossReferences: []
    },
    {
        primaryAccession: "Q54321",
        uniProtkbId: "TARGET_B_HUMAN",
        entryType: "UniProtKB reviewed (Swiss-Prot)",
        proteinDescription: { recommendedName: { fullName: { value: "Example target A-related protein" } } },
        genes: [{ geneName: { value: "TESTB" } }],
        organism: { scientificName: "Homo sapiens" },
        sequence: { length: 510 },
        uniProtKBCrossReferences: []
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
            const address = server.address();
            resolve({
                server,
                url: "http://127.0.0.1:" + address.port + "/planner.html"
            });
        });
    });
}

async function installMockRoutes(page) {
    await page.route(/https:\/\/www\.ebi\.ac\.uk\/chembl\/api\/data\/target\/search\.json/, async (route) => {
        requestCounts.chembl += 1;
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                targets: [{
                    target_chembl_id: "CHEMBL123",
                    pref_name: "Example target A",
                    organism: "Homo sapiens",
                    target_type: "SINGLE PROTEIN"
                }]
            })
        });
    });

    await page.route(/https:\/\/rest\.uniprot\.org\/uniprotkb\/search/, async (route) => {
        requestCounts.uniprot += 1;
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ results: mockUniProtEntries })
        });
    });

    await page.route(/https:\/\/search\.rcsb\.org\/rcsbsearch\/v2\/query/, async (route) => {
        requestCounts.rcsb += 1;
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result_set: [], total_count: 0 })
        });
    });
}

async function selectTarget(page, targetText) {
    await page.locator("#question-target > summary").click();
    await page.locator('input[name="target-choice"][value="yes"]').check();
    await page.locator("#planner-target").fill(targetText);
    await page.locator(".planner-target-suggestion").first().waitFor({
        state: "visible",
        timeout: liveMode ? 30000 : 10000
    });

    const suggestions = page.locator(".planner-target-suggestion");
    const count = await suggestions.count();
    assert.ok(count > 0, "No target suggestion rendered.");

    if (liveMode) {
        let selected = -1;
        for (let index = 0; index < count; index += 1) {
            const label = await suggestions.nth(index).innerText();
            if (/Homo sapiens/i.test(label) && /GSK3B|glycogen synthase kinase.?3 beta/i.test(label)) {
                selected = index;
                break;
            }
        }
        if (selected < 0) {
            for (let index = 0; index < count; index += 1) {
                if (/Homo sapiens/i.test(await suggestions.nth(index).innerText())) {
                    selected = index;
                    break;
                }
            }
        }
        assert.notEqual(selected, -1, "ChEMBL returned no human target suggestion for GSK3B.");
        await suggestions.nth(selected).click();
    } else {
        await suggestions.first().click();
    }

    assert.match(await page.locator("#planner-target-chembl-id").inputValue(), /^CHEMBL\d+$/i);
    assert.ok((await page.locator("#planner-organism").inputValue()).length > 0,
        "Selecting a target should fill its organism where reported.");
}

async function runMockedBrowserTest(page) {
    await installMockRoutes(page);
    const response = await page.goto(page.context()._plannerUrl, { waitUntil: "domcontentloaded" });
    assert.ok(response && response.ok(), "Planner page did not load successfully.");

    const objectives = page.locator('input[name="objective"]');
    assert.equal(await objectives.count(), 10, "The rendered page should expose ten objectives.");
    assert.equal(await page.locator('input[name="objective"]:checked').count(), 10,
        "All ten objectives should be checked by default.");

    await selectTarget(page, "TESTA");
    await page.locator("#workflow-form button[type='submit']").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
        const button = document.querySelector("#workflow-form button[type='submit']");
        return button && !button.disabled;
    });
    await page.locator("#workflow-form button[type='submit']").click();

    const phaseCards = page.locator("#workflow-results details.planner-workflow-phase");
    await phaseCards.first().waitFor({ state: "visible" });
    assert.ok(await phaseCards.count() >= 3, "Generated workflow should be divided into phases.");
    assert.ok(await phaseCards.first().getAttribute("open") !== null,
        "The first phase should open by default.");

    // Two plausible UniProt records must pause PDB lookup until the user chooses.
    await page.locator("#uniprot-accession-choice").waitFor({ state: "visible" });
    assert.equal(requestCounts.rcsb, 0,
        "PDB lookup must not happen while UniProt target mapping is ambiguous.");
    await page.locator("#uniprot-accession-choice").selectOption("P12345");
    await page.locator("#search-selected-uniprot-structures").click();
    await page.locator("#live-target-evidence").getByText(/No experimental structures were returned/).waitFor({ timeout: 15000 });
    assert.ok(requestCounts.rcsb >= 1,
        "Selecting an accession should enable accession-scoped RCSB lookup.");

    await page.locator("#expand-workflow-phases").click();
    assert.equal(await page.locator("#workflow-results details.planner-workflow-phase:not([open])").count(), 0,
        "Expand-all should open every phase.");
    await page.locator("#collapse-workflow-phases").click();
    assert.equal(await page.locator("#workflow-results details.planner-workflow-phase[open]").count(), 0,
        "Collapse-all should close every phase.");

    await page.locator("#expand-workflow-instructions").click();
    assert.ok(await page.locator("#workflow-results details.planner-workflow-step-details[open]").count() > 0,
        "Expand instructions should open task details.");
    assert.equal(await page.locator("#workflow-results details.planner-workflow-step-details:not([open])").count(), 0,
        "Expand instructions should open every task-detail panel.");
    await page.locator("#collapse-workflow-instructions").click();
    assert.equal(await page.locator("#workflow-results details.planner-workflow-step-details[open]").count(), 0,
        "Collapse instructions should close task-detail panels.");

    console.log("Chromium planner smoke passed: target selection, generated phases, ambiguity stop, accession choice and phase controls.");
}

async function runLiveApiTest(page) {
    page.on("request", (request) => {
        const url = request.url();
        if (url.includes("ebi.ac.uk/chembl/api/data/target/search.json")) requestCounts.chembl += 1;
        if (url.includes("rest.uniprot.org/uniprotkb/search")) requestCounts.uniprot += 1;
        if (url.includes("search.rcsb.org/rcsbsearch/v2/query")) requestCounts.rcsb += 1;
    });

    const response = await page.goto(page.context()._plannerUrl, { waitUntil: "domcontentloaded" });
    assert.ok(response && response.ok(), "Planner page did not load successfully.");
    await selectTarget(page, "GSK3B");
    await page.locator("#workflow-form button[type='submit']").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
        const button = document.querySelector("#workflow-form button[type='submit']");
        return button && !button.disabled;
    });
    await page.locator("#workflow-form button[type='submit']").click();

    await page.waitForFunction(() => {
        const panel = document.querySelector("#live-target-evidence");
        return panel && !/Retrieving UniProt and RCSB records|Searching structures for/i.test(panel.textContent);
    }, { timeout: 45000 });

    const failure = page.locator("#live-target-evidence").getByText(/Live evidence lookup did not complete/);
    assert.equal(await failure.count(), 0,
        "Live UniProt lookup failed in the real browser: " + (await page.locator("#live-target-evidence").innerText()));

    const accessionSelector = page.locator("#uniprot-accession-choice");
    if (await accessionSelector.count()) {
        const available = await accessionSelector.locator("option").evaluateAll((options) =>
            options.map((option) => ({ value: option.value, label: option.textContent || "" }))
                .filter((option) => option.value)
        );
        assert.ok(available.length > 0, "UniProt returned an accession chooser with no selectable records.");
        const targetMatch = available.find((option) => /GSK3B|glycogen synthase kinase.?3 beta/i.test(option.label));
        await accessionSelector.selectOption((targetMatch || available[0]).value);
        await page.locator("#search-selected-uniprot-structures").click();
        await page.waitForFunction(() => {
            const panel = document.querySelector("#live-target-evidence");
            return panel && !/Searching structures for|Retrieving UniProt and RCSB records/i.test(panel.textContent);
        }, { timeout: 45000 });
    }

    assert.ok(requestCounts.chembl >= 1, "No live ChEMBL browser request was observed.");
    assert.ok(requestCounts.uniprot >= 1, "No live UniProt browser request was observed.");
    assert.ok(requestCounts.rcsb >= 1, "No live RCSB PDB browser request was observed.");
    assert.equal(await page.locator("#live-target-evidence").getByText(/Live evidence lookup did not complete/).count(), 0,
        "The live target/structure lookup ended in an error.");
    console.log("Live browser API smoke passed. Request counts: " + JSON.stringify(requestCounts));
    console.log("Live evidence panel: " + (await page.locator("#live-target-evidence").innerText()).slice(0, 1200));
}

(async () => {
    const { server, url } = await startStaticServer();
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        page.context()._plannerUrl = url;
        page.setDefaultTimeout(liveMode ? 30000 : 12000);
        page.on("pageerror", (error) => pageErrors.push(error.message));

        if (liveMode) {
            await runLiveApiTest(page);
        } else {
            await runMockedBrowserTest(page);
        }

        assert.deepEqual(pageErrors, [], "Browser page raised JavaScript errors.");
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error((liveMode ? "Live API browser smoke failed: " : "Browser smoke failed: ") + (error.stack || error));
    process.exitCode = 1;
});
