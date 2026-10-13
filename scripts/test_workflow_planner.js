#!/usr/bin/env node
"use strict";

// Dependency-free checks for the compact, three-step workflow planner.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("planner.html");
const js = read("js/planner.js");
const css = read("css/style.css");

assert.equal((html.match(/class="planner-question"/g) || []).length, 4,
    "The questionnaire should contain exactly four required questions.");
assert.ok(!html.includes('id="question-assets"'),
    "The optional files/assets question must be removed.");
assert.ok(!html.includes("planner-activity-box") && !html.includes("target-suggestions"),
    "The planner should not use the previous slow built-in ChEMBL lookup.");
assert.ok(!html.includes("workflow-recipes.js") && !html.includes("protocols.js"),
    "The old recipe/protocol engines must not be loaded by the planner.");
assert.ok(html.includes("Build my workflow"), "The intake form needs a clear build action.");
assert.ok(html.includes("Databases → Search ChEMBL database"),
    "Step 1 must give the DataWarrior ChEMBL menu path.");
assert.ok(html.includes("Homo sapiens") && html.includes("usable activity records"),
    "Step 1 must guide manual species-aware target selection.");
assert.ok(html.includes("IC₅₀") && html.includes("Kᵢ") && html.includes("EC₅₀"),
    "Step 1 must support IC50, Ki and EC50.");
assert.ok(html.includes("Download 10 candidate structures") && html.includes("RCSB PDB"),
    "Step 2 must guide a PDB shortlist.");
assert.ok(html.includes("semi-transparent cyan cartoon") && html.includes("PyMOL"),
    "Step 3 must describe PyMOL visualisation.");

assert.ok(js.includes("firstValidationIssue"), "Required intake answers must be validated.");
assert.ok(js.includes("target-specific ChEMBL shortcut"), "Target lookup should be a generated link, not an in-page API lookup.");
assert.ok(js.includes("workflow-step-tab") && js.includes("aria-selected"),
    "Generated steps must use accessible tabs.");
assert.ok(js.includes("navigator.clipboard.writeText"), "Code blocks should have a copy action.");
assert.ok(js.includes("cartoon_transparency, 0.35"), "PyMOL code should make the protein cartoon semi-transparent.");
assert.ok(js.includes("color cyan") && js.includes("color salmon") && js.includes("util.cbag ligand"),
    "PyMOL code should use the requested protein and ligand colours.");
assert.ok(js.includes("distance hbonds") && js.includes("dash_color, orange"),
    "Optional interaction code should distinguish candidate contact types.");
assert.ok(!js.includes("fetch(") && !js.includes("XMLHttpRequest"),
    "Planner generation should not make slow external API requests.");
assert.ok(css.includes(".workflow-stepper") && css.includes(".workflow-tab-panel[hidden]"),
    "Tabbed results should have dedicated responsive styles and hide inactive panels.");

console.log("Workflow planner tests passed: four intake questions, no optional details or live lookup, three concise tabs, endpoint guidance, PDB workflow, PyMOL scripts, and tab accessibility.");
