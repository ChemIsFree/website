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
    if (!(await page.locator("#question-target").evaluate((section) => section.open))) {
        await page.locator("#question-target > summary").click();
    }
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
        const labels = [];
        for (let index = 0; index < count; index += 1) {
            const suggestion = suggestions.nth(index);
            const targetName = (await suggestion.locator("strong").textContent() || "").trim();
            const targetId = (await suggestion.locator("code").textContent() || "").trim();
            const metadata = (await suggestion.locator("small").textContent() || "").trim();
            labels.push([targetName, metadata, targetId].filter(Boolean).join(" / "));
            const normalizedName = targetName.replace(/\\s*\\(human\\)\\s*$/i, "").trim();
            if (targetId.toUpperCase() === "CHEMBL262" &&
                /^glycogen synthase kinase[- ]?3 beta$/i.test(normalizedName)) {
                selected = index;
                break;
            }
        }
        assert.notEqual(selected, -1,
            "ChEMBL did not return the exact CHEMBL262 human GSK3B target name; refusing to use a related/interacting protein. Suggestions: " + labels.join(" | "));
        await suggestions.nth(selected).click();
    } else {
        await suggestions.first().click();
    }

    assert.match(await page.locator("#planner-target-chembl-id").inputValue(), /^CHEMBL\d+$/i);
    assert.ok((await page.locator("#planner-organism").inputValue()).length > 0,
        "Selecting a target should fill its organism where reported.");
}

async function openQuestion(page, questionId) {
    const section = page.locator("#" + questionId);
    if (!(await section.evaluate((element) => element.open))) {
        await section.locator("> summary").click();
    }
}

async function answerRequiredQuestions(page) {
    await openQuestion(page, "question-approach");
    await page.locator('input[name="approach"][value="structure-based"]').check();
    await openQuestion(page, "question-interface");
    await page.locator('input[name="gui-only"][value="not-necessarily"]').check();
    await openQuestion(page, "question-objectives");
    for (const objective of ["target-context", "hit-identification", "structure-based", "interactions"]) {
        await page.locator('input[name="objective"][value="' + objective + '"]').check();
    }
}

async function runMockedBrowserTest(page) {
    await installMockRoutes(page);
    const response = await page.goto(page.context()._plannerUrl, { waitUntil: "domcontentloaded" });
    assert.ok(response && response.ok(), "Planner page did not load successfully.");

    // Save a full-page intake image so a reviewer can inspect the actual rendered
    // page before merging, without changing the production GitHub Pages deployment.
    const artifactDirectory = path.join(root, "artifacts");
    await fs.promises.mkdir(artifactDirectory, { recursive: true });
    await page.screenshot({
        path: path.join(artifactDirectory, "planner-preview-intake.png"),
        fullPage: true,
        animations: "disabled"
    });

    const objectives = page.locator('input[name="objective"]');
    assert.equal(await objectives.count(), 10, "The rendered page should expose ten objectives.");
    assert.equal(await page.locator('input[name="objective"]:checked').count(), 0,
        "Objectives should start unselected so the user defines the scope.");

    await page.locator("#workflow-form button[type='submit']").waitFor({ state: "visible" });
    await page.waitForFunction(() => {
        const button = document.querySelector("#workflow-form button[type='submit']");
        return button && !button.disabled;
    });
    await page.locator("#workflow-form button[type='submit']").click();
    assert.match(await page.locator("#workflow-intake-feedback").innerText(), /Please answer Question 1/);
    assert.notEqual(await page.locator("#question-target").getAttribute("open"), null,
        "The first unanswered question should open automatically.");

    await selectTarget(page, "TESTA");
    await answerRequiredQuestions(page);
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

    // Capture the generated workflow as the user sees it in the browser.
    await page.locator("#workflow-results").scrollIntoViewIfNeeded();
    await page.screenshot({
        path: path.join(root, "artifacts", "planner-preview-generated-workflow.png"),
        fullPage: false,
        animations: "disabled"
    });

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
    await selectTarget(page, "CHEMBL262");
    await answerRequiredQuestions(page);
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
    const hasGsk3bRecord = async () => page.locator("#live-target-evidence .live-evidence-table tbody tr").evaluateAll((rows) =>
        rows.some((row) => {
            const accession = (row.querySelector("td:first-child")?.innerText || "").trim();
            const gene = (row.querySelector("td:nth-child(2) small")?.innerText || "").trim();
            return accession === "P49841" || gene === "GSK3B";
        })
    );
    assert.ok(await hasGsk3bRecord(),
        "The live UniProt results did not contain the GSK3B kinase itself (P49841 / gene GSK3B).");

    if (await accessionSelector.count()) {
        const available = await accessionSelector.locator("option").evaluateAll((options) =>
            options.map((option) => ({ value: option.value, label: option.textContent || "" }))
                .filter((option) => option.value)
        );
        assert.ok(available.length > 0, "UniProt returned an accession chooser with no selectable records.");
        const targetMatch = available.find((option) =>
            option.value === "P49841" || /\\(GSK3B\\)/i.test(option.label)
        );
        assert.ok(targetMatch,
            "Ambiguous UniProt results offered no exact GSK3B accession; refusing to choose a related protein.");
        await accessionSelector.selectOption(targetMatch.value);
        await page.locator("#search-selected-uniprot-structures").click();
        await page.waitForFunction(() => {
            const panel = document.querySelector("#live-target-evidence");
            return panel && !/Searching structures for|Retrieving UniProt and RCSB records/i.test(panel.textContent);
        }, { timeout: 45000 });
        assert.ok(await hasGsk3bRecord(),
            "Accession-scoped results did not retain the GSK3B kinase record.");
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
        await page.setViewportSize({ width: 1440, height: 1000 });
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
