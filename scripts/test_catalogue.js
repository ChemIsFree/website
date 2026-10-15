#!/usr/bin/env node
"use strict";

// Catalogue data and interface contract checks. Run after scripts/build_catalogue.py.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const html = read("tools.html");
const homepage = read("index.html");
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

const requiredNewRecords = [
    ["pdv", "visualization", "app"],
    ["leview", "visualization", "app"],
    ["flexaid", "structure-based", "app"],
    ["shafts", "ligand-based-qsar", "app"],
    ["open3dqsar", "ligand-based-qsar", "app"],
    ["plethem", "admet-prediction", "app"],
    ["merlin-expo", "admet-prediction", "app"],
    ["br-sascore", "retrosynthesis", "app"],
    ["bigbind", "libraries-datasets", "resource"],
    ["lbs-comparison", "binding-pockets", "resource"],
    ["dubs", "structure-based", "app"],
    ["uspto-reaction-dataset", "retrosynthesis", "resource"],
    ["awesome-chemistry-datasets", "libraries-datasets", "resource"],
    ["awesome-cheminformatics", "libraries-datasets", "resource"],
    ["jupyterlab", "organization", "app"],
    ["conda", "organization", "app"],
    ["docker-engine", "organization", "app"],
    ["pymol-open-source-build", "visualization", "app"],
    ["admetboost", "admet-prediction", "app"],
    ["pred-herg", "admet-prediction", "app"],
    ["tdc-admet-benchmark-group", "libraries-datasets", "resource"]
];
for (const [id, category, expectedType] of requiredNewRecords) {
    const record = tools.find(tool => tool.id === id);
    assert.ok(record, "Missing newly added catalogue record: " + id);
    assert.equal(record.catalogue, expectedType, id + " is in the wrong Tools/Resources section.");
    assert.ok((record.domain || []).includes(category), id + " is missing category " + category + ".");
}

const vega = tools.find(tool => tool.id === "vega");
assert.equal(vega.license, "GPL-3.0", "VEGA QSAR should reflect the declared GPL-3.0 software licence.");
assert.ok((vega.access || []).includes("open-source"));
const hmdb = tools.find(tool => tool.id === "hmdb");
assert.match(hmdb.license || "", /CC BY-NC 4\.0/i, "HMDB's non-commercial data terms should be explicit.");
assert.ok(!(hmdb.access || []).includes("open-source"), "HMDB data must not be labelled open-source.");
const alphafoldDb = tools.find(tool => tool.id === "alphafold-protein-structure-database");
assert.deepEqual(alphafoldDb.domain, ["protein-structures", "libraries-datasets"],
    "AlphaFold DB should be a protein-structure database, not a pocket-prediction tool.");
const inchi = tools.find(tool => tool.id === "inchi-software");
assert.match(inchi.license || "", /IUPAC\/InChI Trust InChI Licence 1\.0/i);

const pdv = tools.find(tool => tool.id === "pdv");
assert.ok(!(pdv.access || []).includes("open-source") && pdv.source_available !== true,
    "PDV's PolyForm Noncommercial licence must not be labelled open-source.");
const shafts = tools.find(tool => tool.id === "shafts");
assert.ok(!(shafts.access || []).includes("open-source") && shafts.source_available !== true,
    "SHAFTS has a custom EULA rather than an open-source licence.");
const open3dqsar = tools.find(tool => tool.id === "open3dqsar");
assert.equal(open3dqsar.license, "GPL-3.0");
const flexaid = tools.find(tool => tool.id === "flexaid");
assert.equal(flexaid.license, "Apache-2.0");


function normalizedName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function matchesAlias(tool, aliases) {
    const values = [normalizedName(tool.name), normalizedName(tool.id)];
    return aliases.some(alias => {
        const expected = normalizedName(alias);
        return values.some(value => value === expected ||
            (expected.length >= 5 && value.includes(expected)) ||
            (value.startsWith("assayer") && value.endsWith(expected)));
    });
}

const requiredTargetEntries = [
    ["canSAR", ["cansar"]],
    ["ChEMBL multitask model", ["chemblmultitask"]],
    ["CTD", ["ctd", "comparativetoxicogenomicsdatabase"]],
    ["DAPredict", ["dapredict"]],
    ["DataWarrior", ["datawarrior"]],
    ["DeepCDR", ["deepcdr"]],
    ["DGIdb", ["dgidb"]],
    ["DynaMut2", ["dynamut2"]],
    ["FTMap", ["ftmap"]],
    ["GeneMANIA", ["genemania"]],
    ["Open Targets", ["opentargets"]],
    ["GPCRdb", ["gpcrdb"]],
    ["KLIFS", ["klifs"]],
    ["LigTMap", ["ligtmap"]],
    ["OmniPath", ["omnipath"]],
    ["PatentChem", ["patentchem"]],
    ["PDBe-KB", ["pdbekb"]],
    ["PLATO", ["plato"]],
    ["PPB2", ["ppb2"]],
    ["ProteinsPlus / DogSiteScorer", ["dogsitescorer", "proteinsplus"]],
    ["Reactome", ["reactome"]],
    ["SEA", ["similarityensembleapproach", "sea"]],
    ["SSM-DTA", ["ssmdta"]],
    ["SwissTargetPrediction", ["swisstargetprediction"]],
    ["TargetNet", ["targetnet"]],
    ["TransformerCPI", ["transformercpi"]],
    ["ZINClick", ["zinclick"]],
    ["PharmMapper", ["pharmmapper"]],
    ["SuperPred", ["superpred"]],
    ["MolTarPred", ["moltarpred"]],
    ["FastTargetPred", ["fasttargetpred"]],
    ["Therapeutic Target Database", ["therapeutictargetdatabase"]],
    ["UniProt annotation", ["uniprot"]],
    ["DrugBank", ["drugbank"]],
    ["GtoPdb", ["gtopdb", "guidetopharmacology"]]
];
for (const [label, aliases] of requiredTargetEntries) {
    const record = tools.find(tool => matchesAlias(tool, aliases));
    assert.ok(record, "Required Target Identification entry is missing from the merged catalogue: " + label);
    assert.ok((record.domain || []).includes("target-identification"),
        label + " must be assigned to Target Identification. Actual record: " +
        JSON.stringify({ id: record.id, name: record.name, domain: record.domain, catalogue: record.catalogue }));
}

const requiredTargetDatabases = [
    ["GPCRdb", ["gpcrdb"]],
    ["ZINClick", ["zinclick"]],
    ["Therapeutic Target Database", ["therapeutictargetdatabase"]],
    ["UniProt", ["uniprot"]],
    ["DrugBank", ["drugbank"]],
    ["GtoPdb", ["gtopdb", "guidetopharmacology"]]
];
for (const [label, aliases] of requiredTargetDatabases) {
    const record = tools.find(tool => matchesAlias(tool, aliases));
    assert.ok(record, label + " must exist as a target-related database.");
    assert.equal(record.catalogue, "resource", label + " should be shown in Libraries & Datasets.");
    assert.equal(record.resource_type, "database", label + " must have database resource metadata.");
}

const opera = tools.find(tool => normalizedName(tool.name) === "opera" || normalizedName(tool.id) === "opera");
if (opera) {
    assert.ok(opera.domain.includes("admet-prediction"), "OPERA belongs in ADMET Prediction.");
    assert.ok(opera.domain.includes("ligand-based-qsar"), "OPERA belongs in Ligand-Based and QSAR.");
    assert.ok(!opera.domain.includes("target-identification"), "OPERA must not remain in Target Identification.");
}
const breeze = tools.find(tool => matchesAlias(tool, ["breeze"]));
if (breeze) assert.ok(breeze.domain.includes("visualization"), "BREEZE belongs in Visualization.");
const fastTargetPred = tools.find(tool => matchesAlias(tool, ["fasttargetpred"]));
if (fastTargetPred) assert.equal(fastTargetPred.catalogue, "app", "FastTargetPred must be presented as a tool.");
for (const [label, aliases] of [
    ["PharmMapper", ["pharmmapper"]],
    ["SuperPred", ["superpred"]],
    ["MolTarPred", ["moltarpred"]]
]) {
    const entry = tools.find(tool => matchesAlias(tool, aliases));
    assert.ok(entry, label + " must have a catalogue record.");
    assert.equal(entry.catalogue, "app", label + " must be classified as a tool.");
    assert.ok(/^https?:\/\//i.test(String(entry.website || "")),
        label + " should have a website link.");
}
const oddt = tools.find(tool => matchesAlias(tool, ["oddt", "opendrugdiscoverytoolkit"]));
if (oddt) assert.equal(oddt.catalogue, "app", "ODDT must be presented as a tool, not a library card.");


assert.ok(
    script.includes("const categoryTools = state.domain") &&
    script.includes('getToolCategories(tool).includes(state.domain)') &&
    script.includes("getFeaturedIds(state.domain)") && script.includes("featuredTotal"),
    "Featured and all-listed count badges should reflect the selected category, while ignoring search/access filters."
);
categoryIds.forEach((id, index) => {
    assert.ok(script.includes('id: "' + id + '"'), "Missing category ID in the catalogue UI: " + id);
    assert.ok(script.includes('label: "' + categoryLabels[index] + '"'), "Missing category label in the catalogue UI: " + categoryLabels[index]);
});
assert.equal((homepage.match(/class="category-card(?: category-card-large)?"/g) || []).length, 14,
    "The homepage should link to each of the 14 categories.");
categoryIds.forEach(id => {
    assert.ok(homepage.includes('tools.html?domain=' + id), "Homepage category link is missing: " + id);
});
assert.ok(html.includes('id="category-filters"'), "Computational category chips are required.");
assert.ok(html.includes('id="all-count"'), "The all-entry count is required.");
assert.ok(html.includes('data-view="featured"') && html.includes('data-view="all"'),
    "The catalogue should offer Featured selection and All listed tools views.");
assert.ok(html.includes('id="featured-count"'),
    "The featured-entry count is required.");
assert.ok(script.includes('data/featured_tools.json') && script.includes("getFeaturedIds") && script.includes('view: "featured"'),
    "The catalogue should load the editorial shortlist and default to Featured selection.");
assert.ok(html.includes('id="catalogue-grid"'), "Cards should render in the category-aware results area.");
assert.ok(!html.includes('id="domain-filter"') && !html.includes('id="task-filter"'),
    "The old stacked select filters should remain removed.");
assert.ok(html.includes('js/catalogue.js?v=5'), "The page should load the updated featured-aware catalogue renderer.");
assert.ok(script.includes('renderCardSection("Tools"') && script.includes('renderCardSection("Libraries & datasets"'),
    "Tools must be displayed before the supporting library/dataset section.");
assert.ok(script.includes("getToolCategories") && script.includes("TASK_CATEGORY_MAP"),
    "The front-end should support category membership during migration from older links/data.");
assert.ok(builder.includes("normalize_tool_domains") && builder.includes("CATEGORY_PATTERNS"),
    "Imported registry entries should be normalized into the functional categories.");
assert.ok(script.includes('data-access') && script.includes("isOpenSource") && script.includes("isFreeWeb"),
    "Access/licence filters should remain available.");
assert.ok(script.includes("getCardOutboundUrl") && script.includes("catalogue-card-status-link"),
    "Open source and Free web badges should link directly to the official site or repository.");
assert.ok(script.includes("isResourceInCurrentView") && script.includes("isGtoPdb"),
    "GtoPdb should be visible with tools in Target Identification and as a resource in Libraries & Datasets.");
const detailScript = read("js/tool.js");
assert.ok(detailScript.includes("tool-detail-link-citation-row"), "Tool details need the horizontal links/citation row.");
assert.ok(detailScript.includes("tool-info-availability-grid"), "Tool details need consolidated information/availability.");
assert.ok(!detailScript.includes("What it helps you do") && !detailScript.includes("<h2>About</h2>"),
    "Duplicate task and About sections should be removed from tool details.");
assert.ok(detailScript.includes("tool-detail-full-description"), "The complete description should be rendered in the detail hero.");

assert.ok(css.includes(".catalogue-card-section") && css.includes(".catalogue-card-grid"),
    "Both tool and resource sections need compact responsive card styling.");

console.log("Catalogue tests passed: all entries are categorized, legacy taxonomy is normalized, all 14 category labels appear, and tools are separated from supporting resources.");
