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
const styleSource = read("css/style.css");
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
assert.ok(plannerSource.includes("function isCandidateLigandComponent") &&
    plannerSource.includes("/ligand-validation/"),
    "PDB shortlist should flag ligand-sized components and link RCSB ligand validation.");
assert.ok(plannerSource.includes("Inspect chain / mutations"),
    "The PDB shortlist must link to manual chain/mutation review.");

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
const mixedPhases = Array.from(context.groupWorkflowStepsByPhase(mixedSteps, "mixed"));
const ligandPhases = Array.from(context.groupWorkflowStepsByPhase(ligandSteps, "ligand-based"));
assert.ok(mixedPhases.length > 1 && mixedPhases.length < mixedSteps.length,
    "The combined mixed workflow should be grouped into a smaller number of phases.");
assert.ok(ligandPhases.length > 1 && ligandPhases.length < ligandSteps.length,
    "The ligand-first workflow should be grouped into a smaller number of phases.");
assert.deepEqual(
    Array.from(mixedPhases.flatMap((phase) => Array.from(phase.steps, (step) => step.id))),
    stepIds,
    "Grouped mixed workflow must preserve the exact generated step order."
);
assert.deepEqual(
    Array.from(ligandPhases.flatMap((phase) => Array.from(phase.steps, (step) => step.id))),
    Array.from(ligandSteps, (step) => step.id),
    "Grouped ligand-based workflow must preserve the exact generated step order."
);
assert.ok(mixedPhases.some((phase) => phase.title.includes("Target, structure")),
    "Mixed workflow should expose a target/structure evidence phase.");
assert.ok(ligandPhases.some((phase) => phase.title.includes("Structural cross-check")),
    "Ligand-first workflow should keep structural analysis as a later cross-check.");
const renderedMixedPhases = context.renderWorkflowPhases(
    mixedSteps, "any", "visual-first", {}, "yes", "mixed"
);
assert.ok(renderedMixedPhases.includes('class="planner-workflow-phase" data-workflow-phase="target-evidence" open'),
    "The first generated phase should be open by default and phase markup should render.");
assert.ok(renderedMixedPhases.includes("Expand all step instructions") &&
    renderedMixedPhases.includes("Collapse all phases"),
    "Rendered workflow should expose working phase and instruction controls.");
assert.ok(renderedMixedPhases.includes(mixedSteps.length + " ordered steps across"),
    "The phase overview should disclose the complete ordered step count.");


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
assert.ok(plannerSource.includes("function groupWorkflowStepsByPhase"),
    "Long workflows should be grouped into navigable phases.");
assert.ok(plannerSource.includes("function renderWorkflowPhases"),
    "Grouped phase rendering function is missing.");
assert.ok(styleSource.includes(".planner-workflow-phase") &&
    styleSource.includes(".planner-phase-toolbar-actions"),
    "Workflow phase navigation styling is missing.");
for (const id of [
    "expand-workflow-phases", "collapse-workflow-phases",
    "expand-workflow-instructions", "collapse-workflow-instructions"
]) {
    assert.ok(plannerSource.includes(id), "Missing workflow navigation control " + id + ".");
}

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
        const value = String(url);
        requestedUrls.push(value);
        if (value.startsWith("https://rest.uniprot.org/uniprotkb/search?")) {
            return { results: mockEntries };
        }
        if (value === "https://search.rcsb.org/rcsbsearch/v2/query") {
            return { result_set: [{ identifier: "1ABC" }, { identifier: "2DEF" }], total_count: 2 };
        }
        if (value.startsWith("https://data.rcsb.org/rest/v1/core/entry/1ABC")) {
            return {
                rcsb_entry_info: { resolution_combined: [1.8] },
                refine: [{ ls_R_factor_R_free: 0.21 }],
                rcsb_entry_container_identifiers: { non_polymer_entity_ids: ["1", "2"] },
                exptl: [{ method: "X-RAY DIFFRACTION" }],
                struct: { title: "Protein with inhibitor" }
            };
        }
        if (value.startsWith("https://data.rcsb.org/rest/v1/core/entry/2DEF")) {
            return {
                rcsb_entry_info: { resolution_combined: [1.5] },
                refine: [{ ls_R_factor_R_free: 0.19 }],
                rcsb_entry_container_identifiers: { non_polymer_entity_ids: ["1"] },
                exptl: [{ method: "X-RAY DIFFRACTION" }],
                struct: { title: "Higher-resolution structure with only a small ion" }
            };
        }
        if (value.includes("/core/nonpolymer_entity/1ABC/1")) {
            return {
                rcsb_nonpolymer_entity_container_identifiers: { non_polymer_comp_id: "XYZ" },
                pdbx_entity_nonpoly: { name: "Known inhibitor" },
                rcsb_nonpolymer_entity: { formula_weight: 300 }
            };
        }
        if (value.includes("/core/nonpolymer_entity/1ABC/2")) {
            return {
                rcsb_nonpolymer_entity_container_identifiers: { non_polymer_comp_id: "SO4" },
                pdbx_entity_nonpoly: { name: "SULFATE" },
                rcsb_nonpolymer_entity: { formula_weight: 96 }
            };
        }
        if (value.includes("/core/nonpolymer_entity/2DEF/1")) {
            return {
                rcsb_nonpolymer_entity_container_identifiers: { non_polymer_comp_id: "SO4" },
                pdbx_entity_nonpoly: { name: "SULFATE" },
                rcsb_nonpolymer_entity: { formula_weight: 96 }
            };
        }
        throw new Error("Unexpected URL in mocked target test: " + value);
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
    assert.equal(selected.structures[0].id, "1ABC",
        "The ligand-evidence score should help rank the structure shortlist after component metadata is loaded.");
    assert.ok(selected.structures[0].score > selected.structures.find((item) => item.id === "2DEF").score,
        "A candidate ligand-sized organic component should outrank an ion-only entry when other evidence is competitive.");
    const selectedHtml = context.targetEvidenceHtml(selected);
    assert.ok(selectedHtml.includes("/ligand-validation/1ABC/XYZ"),
        "Candidate ligand components should link to RCSB ligand validation.");
    assert.ok(selectedHtml.includes("Inspect chain / mutations"),
        "Each PDB shortlist row should expose its chain/mutation check link.");
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
