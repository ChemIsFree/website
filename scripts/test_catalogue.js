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
const categoryCuration = read("../catalogue/data/category_curation.yaml");
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

const extraValidatedEntries = [
    ["FTMap", ["ftmap"], ["target-identification", "binding-pockets"]],
    ["DoGSiteScorer", ["dogsitescorer"], ["binding-pockets"]],
    ["CHAPERONg", ["chaperong"], ["molecular-dynamics"]],
    ["GenBench3D", ["genbench3d"], ["de-novo-design", "libraries-datasets"]],
    ["PocketFlow", ["pocketflow"], ["de-novo-design", "structure-based"]],
    ["OptiPharm", ["optipharm"], ["ligand-based-qsar"]],
    ["GAFF2 / Antechamber", ["gaff2antechamber"], ["molecular-dynamics"]],
    ["MMPBSA.py", ["mmpbsapy"], ["molecular-dynamics"]],
    ["cpptraj / pytraj", ["cpptrajpytraj"], ["molecular-dynamics"]],
    ["Virtual Screening Validation Resources", ["virtualscreeningvalidationresources"], ["ligand-based-qsar", "libraries-datasets"]]
];
for (const [label, aliases, domains] of extraValidatedEntries) {
    const record = tools.find(tool => matchesAlias(tool, aliases));
    assert.ok(record, "Recent catalogue addition is missing: " + label);
    domains.forEach(domain => assert.ok((record.domain || []).includes(domain),
        label + " is missing category " + domain + "; actual domains: " + JSON.stringify(record.domain)));
}


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
assert.match(categoryCuration, /names: \[OPERA\][\s\S]*?categories: \[admet-prediction, ligand-based-qsar\]/,
    "The source curation must preserve OPERA's dual ADMET and Ligand-Based/QSAR classification.");

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

const requiredCoverage = [
    ["HumanBase", ["humanbase"], ["target-identification"]],
    ["ToppGene Suite", ["toppgene"], ["target-identification"]],
    ["crosstalkr", ["crosstalkr"], ["target-identification"]],
    ["AlphaFold Server", ["alphafoldserver"], ["protein-structures"]],
    ["MODELLER", ["modeller"], ["protein-structures"]],
    ["OpenFold3", ["openfold3"], ["protein-structures", "structure-based"]],
    ["Protenix", ["protenix"], ["protein-structures", "structure-based"]],
    ["UCSF ChimeraX", ["chimerax"], ["visualization"]],
    ["VMD", ["vmd"], ["visualization"]],
    ["NCBI iCn3D", ["icn3d"], ["visualization"]],
    ["CavityPlus", ["cavityplus"], ["binding-pockets"]],
    ["DOCK 6", ["dock6"], ["structure-based"]],
    ["Dimorphite-DL", ["dimorphitedl"], ["cheminformatics"]],
    ["MolCRAFT", ["molcraft"], ["de-novo-design"]],
    ["DataSAIL", ["datasail"], ["ligand-based-qsar"]],
    ["admetSAR 3.0", ["admetsar3"], ["admet-prediction"]],
    ["BioTransformer 3.0", ["biotransformer"], ["admet-prediction"]],
    ["LocalRetro", ["localretro"], ["retrosynthesis"]],
    ["NCI/CADD Chemical Identifier Resolver", ["ncicaddchemicalidentifierresolver"], ["nomenclature-format-conversion"]],
    ["PDBbind", ["pdbbind"], ["libraries-datasets"]],
    ["QMugs", ["qmugs"], ["libraries-datasets"]],
    ["PLINDER", ["plinder"], ["libraries-datasets"]],
    ["DataLad", ["datalad"], ["organization"]],
    ["Apptainer", ["apptainer"], ["organization"]],
    ["conda-lock", ["condalock"], ["organization"]],
    ["Pixi", ["pixi"], ["organization"]]
];
for (const [label, aliases, domains] of requiredCoverage) {
    const record = label === "Protenix"
        ? tools.find(tool => normalizedName(tool.name) === "protenix" || normalizedName(tool.id) === "protenix")
        : tools.find(tool => matchesAlias(tool, aliases));
    assert.ok(record, "Expected catalogue addition is missing: " + label);
    domains.forEach(domain => assert.ok((record.domain || []).includes(domain),
        label + " is missing category " + domain + "; actual domains: " + JSON.stringify(record.domain)));
}

const protenix = tools.find(tool => normalizedName(tool.name) === "protenix" || normalizedName(tool.id) === "protenix");
assert.ok(protenix, "Protenix must remain in the catalogue.");
assert.ok(!((protenix.access || []).map(value => String(value).toLowerCase()).includes("open-source")),
    "Protenix's restricted v2 model weights must not trigger an overall open-source label.");
assert.match(String(protenix.license || ""), /weights.*(proprietary|restricted)/i,
    "Protenix's distinct model-weight terms must be recorded.");

const openfold3 = tools.find(tool => normalizedName(tool.name) === "openfold3");
assert.ok(openfold3 && (openfold3.access || []).includes("open-source"),
    "OpenFold3 should carry its explicit Apache-2.0 open-source classification.");

const genbench3d = tools.find(tool => normalizedName(tool.name) === "genbench3d");
assert.ok(genbench3d && (genbench3d.domain || []).includes("de-novo-design") &&
    (genbench3d.domain || []).includes("libraries-datasets"),
    "GenBench3D should be discoverable as both a generation-evaluation tool and benchmark resource.");
assert.match(String(genbench3d && genbench3d.license || ""), /MIT/i,
    "GenBench3D's verified MIT software licence should be recorded.");

const enamine = tools.find(tool => normalizedName(tool.name) === "enaminereal");
assert.ok(enamine && enamine.catalogue === "resource" &&
    (enamine.access || []).includes("commercial"),
    "Enamine REAL should be a commercial library, not free/open-source.");

for (const withheld of ["orbic", "flexautodock", "pdv", "open3dqsar"]) {
    assert.ok(!tools.some(tool => normalizedName(tool.id) === withheld),
        "Unlicensed starred candidate must remain withheld pending licence clarification: " + withheld);
}


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
assert.ok(!html.includes('id="view-featured"') && !html.includes('id="view-all"'),
    "The catalogue should expose all entries while featured selection is pending.");
assert.ok(html.includes('id="catalogue-grid"'), "Cards should render in the category-aware results area.");
assert.ok(!html.includes('id="domain-filter"') && !html.includes('id="task-filter"'),
    "The old stacked select filters should remain removed.");
assert.ok(html.includes('js/catalogue.js?v=4'), "The page should load the new functional-category renderer.");
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
