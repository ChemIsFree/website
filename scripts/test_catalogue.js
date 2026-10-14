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
const tools = JSON.parse(read("data/tools.json"));
const taxonomy = JSON.parse(read("data/taxonomy.json"));
const featured = JSON.parse(read("data/featured_tools.json"));

const ids = tools.map(tool => tool.id);
assert.ok(tools.length > 0, "The generated catalogue should contain tools.");
assert.equal(new Set(ids).size, ids.length, "Catalogue entries should have unique IDs.");
assert.ok(Object.keys(taxonomy.domains || {}).length >= 5, "The catalogue should expose computational areas.");

const featuredIds = new Set();
Object.values(featured.domains || {}).forEach(group => {
    (group.tools || []).forEach(id => featuredIds.add(id));
});
const matchedFeatured = tools.filter(tool => featuredIds.has(tool.id));
assert.ok(matchedFeatured.length > 0, "At least one featured ID must resolve to a catalogue record.");
assert.ok(matchedFeatured.length < tools.length, "Featured view should be a meaningful subset of all listed tools.");

assert.ok(html.includes('id="category-filters"'), "Computational area chips are required.");
assert.ok(html.includes('id="view-featured"') && html.includes('id="view-all"'),
    "Featured and All listed views are required.");
assert.ok(html.includes('data-access="open-source"') && html.includes('data-access="free-web"') &&
    html.includes('data-access="commercial"'), "Access and licence filters are required.");
assert.ok(html.includes('id="catalogue-grid"'), "Cards should render in one deduplicated grid.");
assert.ok(!html.includes('id="domain-filter"') && !html.includes('id="task-filter"'),
    "The old stacked select filters should be removed.");
assert.ok(html.includes('js/catalogue.js'), "The catalogue page should load its dedicated script.");
assert.ok(!html.includes('id="resources-catalogue"'), "Separate oversized resource lists should be removed.");

["buildFeaturedIndex", "populateCategoryFilters", "populateAccessFilters", "isOpenSource",
 "isFreeWeb", "isCommercial", "createCard", "matchesAccess"].forEach(name => {
    assert.ok(script.includes(name), "Missing catalogue behaviour: " + name);
});
assert.ok(script.includes("aria-pressed"), "Filter buttons should expose their active state to assistive technology.");
assert.ok(script.includes("line-clamp: 3") || read("css/style.css").includes("-webkit-line-clamp: 3"),
    "Card descriptions should be kept short.");
assert.ok(script.includes("deduplicateTools"), "A tool appearing in multiple categories should be displayed only once.");

console.log("Catalogue tests passed: unique data, featured subset, category/view/access filters, concise single-grid cards, and accessible filter state.");
