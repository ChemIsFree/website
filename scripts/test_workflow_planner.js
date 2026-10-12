#!/usr/bin/env node
"use strict";

// Dependency-free integration checks for the Workflows & Tutorials planner.
// Run after scripts/build_catalogue.py so data/tools.json exists.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const html = read("planner.html");
const plannerSource = read("js/planner.js");
const protocolsSource = read("js/protocols.js");
const recipeSource = read("js/workflow-recipes.js");
const cataloguePath = path.join(root, "data/tools.json");

assert.ok(fs.existsSync(cataloguePath), "data/tools.json is absent; run scripts/build_catalogue.py first.");
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
assert.ok(Array.isArray(catalogue), "Generated catalogue must be an array.");

// Syntax checks.
new vm.Script(plannerSource, { filename: "js/planner.js" });
new vm.Script(protocolsSource, { filename: "js/protocols.js" });
new vm.Script(recipeSource, { filename: "js/workflow-recipes.js" });

// Minimal browser-shaped context: DOM-ready callbacks are recorded but not run.
const listeners = {};
const documentStub = {
    addEventListener: (name, handler) => { (listeners[name] ||= []).push(handler); },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({
        setAttribute() {}, appendChild() {}, addEventListener() {}, remove() {},
        replaceChildren() {}, style: {}, classList: { add() {}, remove() {} }
    }),
    body: { appendChild() {} }
};
const windowStub = {
    ChemIsFreeProtocols: {},
    addEventListener() {},
    setTimeout,
    clearTimeout
};
const context = vm.createContext({
    window: windowStub,
    document: documentStub,
    navigator: {},
    console,
    URL,
    URLSearchParams,
    Blob,
    setTimeout,
    clearTimeout,
    fetch: async () => { throw new Error("Unexpected network request in static tests."); },
    Date, Math, JSON, Promise, Set, Map, Array, Object, String, Number, Boolean, RegExp, Error
});

vm.runInContext(protocolsSource, context, { filename: "js/protocols.js" });
vm.runInContext(recipeSource, context, { filename: "js/workflow-recipes.js" });
vm.runInContext(plannerSource, context, { filename: "js/planner.js" });

const protocols = windowStub.ChemIsFreeProtocols;
assert.ok(protocols && typeof protocols === "object", "Protocol library did not load.");
assert.ok(Object.keys(protocols).length >= 10, "Expected the core protocol templates.");

const totalObjectives = (html.match(/name="objective" value=/g) || []).length;
const checkedObjectives = (html.match(/name="objective" value="[^"]+" checked/g) || []).length;
assert.equal(totalObjectives, 10, "Expected the ten requested workflow objectives.");
assert.equal(checkedObjectives, totalObjectives, "All objectives should be selected by default.");

for (const control of [
    "structure", "native-ligand", "known-actives", "decoys", "library", "activity-data",
    "compound-set", "protein-sequence", "prepared-ligands", "docking-box", "validated-docking",
    "interaction-fingerprints", "pharmacophore", "qsar-model", "generated-compounds",
    "admet-results", "synthesis-constraints"
]) {
    assert.ok(html.includes('name="asset" value="' + control + '"'), "Missing existing-asset choice: " + control);
}

assert.ok(plannerSource.includes("https://www.ebi.ac.uk/chembl/api/data/target/search.json?"),
    "Live ChEMBL target lookup URL is missing.");
assert.ok(plannerSource.includes("https://www.ebi.ac.uk/chembl/api/data/activity.json?"),
    "ChEMBL activity query URL is missing.");
assert.ok(plannerSource.includes("https://www.ebi.ac.uk/chembl/api/data/molecule.json?"),
    "ChEMBL molecule-structure lookup URL is missing.");
assert.ok(plannerSource.includes("if (!accessionOverride && matches.length > 1)"),
    "Ambiguous UniProt results must not silently use the first accession.");
assert.ok(plannerSource.includes("uniprot-accession-choice") &&
    plannerSource.includes("search-selected-uniprot-structures"),
    "The UI must let the user choose a UniProt accession before the PDB shortlist is generated.");
for (const endpoint of ["IC50", "Ki", "EC50"]) {
    assert.ok(html.includes('value="' + endpoint + '"'), "Missing endpoint option " + endpoint + ".");
}
assert.ok(plannerSource.includes('structures.canonical_smiles || ""'),
    "The canonical SMILES export must not silently substitute a different identifier.");
assert.ok(plannerSource.includes("structureLookupLimited"),
    "The activity export must disclose structure-lookup truncation.");
assert.ok(plannerSource.includes('guiOnly !== "yes"'),
    "GUI-only recommendation filtering is missing.");

// Every tool directly referenced by a protocol must exist in the published, generated catalogue.
const catalogueById = new Map(catalogue.map((tool) => [tool.id, tool]));
assert.equal(catalogueById.size, catalogue.length, "Generated tool catalogue contains duplicate IDs.");
const protocolToolIds = new Set();
for (const [protocolId, protocol] of Object.entries(protocols)) {
    assert.ok(Array.isArray(protocol.steps), "Protocol " + protocolId + " has no steps.");
    for (const step of protocol.steps) {
        for (const toolId of (step.tools || [])) protocolToolIds.add(toolId);
    }
}
const missingToolIds = [...protocolToolIds].filter((id) => !catalogueById.has(id));
assert.deepEqual(missingToolIds, [],
    "Protocol tool IDs missing from the generated catalogue: " + missingToolIds.join(", "));

// The ranker must respect task relevance and strict GUI-only filtering.
vm.runInContext(
    'workflowCatalogue.splice(0, workflowCatalogue.length,' +
    '{id:"gui-docking",name:"GUI docking",tasks:["molecular-docking"],domain:["structure-based-discovery"],interface:["gui"],type:"software",status:"active"},' +
    '{id:"cli-docking",name:"CLI docking",tasks:["molecular-docking"],domain:["structure-based-discovery"],interface:["cli"],type:"software",status:"active"},' +
    '{id:"unrelated-gui",name:"GUI visualization",tasks:["molecular-visualization"],domain:["visualization"],interface:["gui"],type:"software",status:"active"});',
    context
);
const guiOnly = Array.from(context.rankWorkflowTools(
    { tasks: ["molecular-docking"], domains: [], tools: [] },
    "visual-first",
    "yes"
), (tool) => tool.id);
assert.deepEqual(guiOnly, ["gui-docking"],
    "GUI-only mode should return relevant GUI tools, never CLI-only or unrelated entries.");

const allObjectives = [
    "target-context", "ligand-landscape", "hit-identification", "structure-based",
    "interactions", "qsar", "analogues", "de-novo", "admet", "synthesis"
];
const mixedSteps = context.composeProtocolSteps(allObjectives, "structure-based", "mixed");
const ligandSteps = context.composeProtocolSteps(allObjectives, "ligand-landscape", "ligand-based");
const stepIds = Array.from(mixedSteps, (step) => step.id);
assert.equal(new Set(stepIds).size, stepIds.length, "Combined workflow should not duplicate the same scientific phase.");
assert.ok(stepIds.indexOf("target.resolve") < stepIds.indexOf("structure.choose"));
assert.ok(stepIds.indexOf("structure.choose") < stepIds.indexOf("ligand.query"),
    "Structure-based/mixed workflow should start from target and structure selection.");
assert.ok(stepIds.indexOf("interactions.native") < stepIds.indexOf("structure.prepare"),
    "Native-complex interaction analysis should precede docking preparation.");
assert.ok(stepIds.indexOf("screen.validate") < stepIds.indexOf("screen.library"),
    "Docking enrichment validation must precede large-scale screening.");
assert.ok(ligandSteps.findIndex((step) => step.id === "ligand.query") <
    ligandSteps.findIndex((step) => step.id === "structure.choose"),
    "Ligand-based workflow should begin with activity/ligand evidence.");

assert.ok(plannerSource.includes('class="planner-workflow-step-details"'),
    "Generated scientific phases should be expandable.");
assert.ok(html.includes('src="js/workflow-recipes.js'),
    "Recipe helper script must be loaded by the page.");

const renderRecipe = windowStub.renderWorkflowRecipe;
assert.equal(typeof renderRecipe, "function", "Recipe renderer did not load.");
for (const item of [
    ["interactions.native", "PLIP"],
    ["screen.validate", "inactive/control set"],
    ["screen.library", "GNINA virtual-screening pilot"],
    ["ligand.series", "pharmacophore hypothesis"],
    ["design.enumerate", "Fragment growing"]
]) {
    assert.ok(renderRecipe(item[0]).includes(item[1]),
        "Expected recipe " + item[1] + " for phase " + item[0] + ".");
}

const ligandGuide = context.workflowApproachGuideHtml("ligand-based");
assert.ok(ligandGuide.includes("ChEMBL") && ligandGuide.includes("DataWarrior"),
    "Ligand-based route should prioritize ChEMBL and DataWarrior.");
assert.ok(!ligandGuide.includes("CAVIAR") && !ligandGuide.includes("SIGHTS"),
    "CAVIAR/SIGHTS should not be proposed in the ligand-based starting route.");

(async function testAmbiguousUniProtSelection() {
    const mockEntries = [
        {
            primaryAccession: "P12345",
            uniProtkbId: "TARGET_A_HUMAN",
            entryType: "UniProtKB reviewed (Swiss-Prot)",
            proteinDescription: { recommendedName: { fullName: { value: "Example target A" } } },
            genes: [{ geneName: { value: "TSTA" } }],
            organism: { scientificName: "Homo sapiens" },
            sequence: { length: 420 },
            uniProtKBCrossReferences: []
        },
        {
            primaryAccession: "Q54321",
            uniProtkbId: "TARGET_B_HUMAN",
            entryType: "UniProtKB reviewed (Swiss-Prot)",
            proteinDescription: { recommendedName: { fullName: { value: "Example target B" } } },
            genes: [{ geneName: { value: "TSTB" } }],
            organism: { scientificName: "Homo sapiens" },
            sequence: { length: 510 },
            uniProtKBCrossReferences: []
        }
    ];
    const requestedUrls = [];
    context.fetchJsonResource = async function(url) {
        requestedUrls.push(String(url));
        if (String(url).startsWith("https://rest.uniprot.org/uniprotkb/search?")) {
            return { results: mockEntries };
        }
        if (String(url).startsWith("https://search.rcsb.org/rcsbsearch/v2/query")) {
            return { result_set: [], total_count: 0 };
        }
        throw new Error("Unexpected URL in mocked target test: " + url);
    };

    requestedUrls.length = 0;
    const ambiguous = await context.retrieveLiveTargetEvidence("TEST", "Homo sapiens");
    assert.equal(ambiguous.requiresAccessionChoice, true,
        "Ambiguous UniProt matches must pause PDB lookup.");
    assert.equal(ambiguous.structures.length, 0);
    assert.equal(requestedUrls.filter((url) => url.includes("rcsbsearch")).length, 0,
        "Do not query PDB against the first UniProt hit without user confirmation.");
    const unresolvedHtml = context.targetEvidenceHtml(ambiguous);
    assert.ok(unresolvedHtml.includes("uniprot-accession-choice"));
    assert.ok(unresolvedHtml.includes("Choose the correct UniProt record first"));

    requestedUrls.length = 0;
    const selected = await context.retrieveLiveTargetEvidence("TEST", "Homo sapiens", "P12345");
    assert.equal(selected.selectedAccession, "P12345",
        "Explicit accession selection must scope the structure query.");
    assert.ok(requestedUrls.some((url) => url.includes("rcsbsearch")),
        "PDB lookup should resume after the user selects an accession.");
    console.log("Ambiguous UniProt selection test passed.");
    console.log("Workflow planner integration checks passed.");
    console.log("Protocols: " + Object.keys(protocols).length +
        "; steps: " + Object.values(protocols).reduce((n, p) => n + p.steps.length, 0) +
        "; catalogue entries: " + catalogue.length +
        "; protocol tool IDs: " + protocolToolIds.size + ".");
})().catch((error) => {
    console.error("Workflow planner integration test failed:", error);
    process.exitCode = 1;
});
