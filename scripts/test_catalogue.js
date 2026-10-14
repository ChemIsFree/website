#!/usr/bin/env node
"use strict";

// Catalogue data and interface contract checks. Run after scripts/build_catalogue.py.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const html = read("tools.html");
const script = read("js/catalogue.js");
const builder = read("scripts/build_catalogue.py");
const css = read("css/style.css");
const tools = JSON.parse(read("data/tools.json"));

const categoryIds = [
    "target-identification",
    "protein-structures",
    "visualization",
    "binding-pockets",
    "structure-based",
    "molecular-dynamics",
    "cheminformatics",
    "de-novo-design",
    "ligand-based-qsar",
    "admet-prediction",
    "retrosynthesis",
    "nomenclature-format-conversion",
    "libraries-datasets",
    "organization"
];
const categoryLabels = [
    "Target Identification",
    "Protein Structures",
    "Visualization",
    "Binding Pockets",
    "Structure-Based",
    "Molecular Dynamics",
    "Cheminformatics",
    "De Novo Design",
    "Ligand-Based and QSAR",
    "ADMET Prediction",
    "Retrosynthesis",
    "Nomenclature and Format Conversion",
    "Libraries and Datasets",
    "Organization"
];

assert.ok(tools.length > 0, "The generated catalogue should contain tools.");
assert.equal(new Set(tools.map(tool => tool.id)).size, tools.length, "Catalogue entries should have unique IDs.");
assert.ok(tools.length > 100, "The full imported registry should be available, not only the hand-curated list.");
tools.forEach(tool => {
    assert.ok(Array.isArray(tool.domain) && tool.domain.length > 0, "Every record needs at least one category: " + tool.id);
    tool.domain.forEach(domain => {
        assert.ok(categoryIds.includes(domain), "Unmapped or legacy category '" + domain + "' remains on " + tool.id);
    });
});
assert.ok(tools.some(tool => tool.catalogue === "app"), "The catalogue needs primary tools.");
assert.ok(tools.some(tool => tool.catalogue === "resource"), "The catalogue needs supporting resources.");

categoryIds.forEach((id, index) => {
    assert.ok(script.includes('id: "' + id + '"'), "Missing category ID in the catalogue UI: " + id);
    assert.ok(script.includes('label: "' + categoryLabels[index] + '"'), "Missing category label in the catalogue UI: " + categoryLabels[index]);
});
assert.ok(html.includes('id="category-filters"'), "Computational category chips are required.");
assert.ok(html.includes('id="all-count"'), "The all-entry count is required.");
assert.ok(!html.includes('id="view-featured"') && !html.includes('id="view-all"'),
    "The catalogue should expose all entries while featured selection is pending.");
assert.ok(html.includes('id="catalogue-grid"'), "Cards should render in the category-aware results area.");
assert.ok(!html.includes('id="domain-filter"') && !html.includes('id="task-filter"'),
    "The old stacked select filters should remain removed.");
assert.ok(html.includes('js/catalogue.js?v=2'), "The page should load the new functional-category renderer.");
assert.ok(script.includes('renderCardSection("Tools"') && script.includes('renderCardSection("Libraries & datasets"'),
    "Tools must be displayed before the supporting library/dataset section.");
assert.ok(script.includes("getToolCategories") && script.includes("TASK_CATEGORY_MAP"),
    "The front-end should support category membership during migration from older links/data.");
assert.ok(builder.includes("normalize_tool_domains") && builder.includes("CATEGORY_PATTERNS"),
    "Imported registry entries should be normalized into the functional categories.");
assert.ok(script.includes('data-access') && script.includes("isOpenSource") && script.includes("isFreeWeb"),
    "Access/licence filters should remain available.");
assert.ok(css.includes(".catalogue-card-section") && css.includes(".catalogue-card-grid"),
    "Both tool and resource sections need compact responsive card styling.");

console.log("Catalogue tests passed: all entries are categorized, legacy taxonomy is normalized, all 14 category labels appear, and tools are separated from supporting resources.");
