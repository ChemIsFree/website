const workflowCatalogue = [];
let workflowTaxonomy = { domains: {}, resources: {} };

const stageGuides = {
    "new-project": {
        title: "Start with a focused discovery brief",
        intro: "At project start, make the biological and chemical question explicit before choosing a computational method.",
        tasks: ["bioactivity-analysis", "binding-site-analysis", "structure-search"],
        tools: ["chembl", "pubchem", "pymol-open-source"],
        actions: [
            "Write down the target identity, organism or isoform, intended biological mechanism, and the decision this workflow should support.",
            "Record what is already known: available structures, reported ligands, assay endpoints, and any project-specific constraints.",
            "Choose evidence streams that can answer the question. Ligand data, structural analysis, screening, and property prediction can be combined rather than treated as competing routes."
        ],
        deliverable: "Deliverable: a one-page discovery brief listing the hypothesis, evidence available, unknowns, and criteria for advancing compounds."
    },
    "ligand-landscape": {
        title: "Map the existing ligand and SAR landscape",
        intro: "Use existing evidence to establish what is known, how reliable it is, and where a new design hypothesis could add value.",
        tasks: ["bioactivity-analysis", "data-curation", "scaffold-analysis", "qsar"],
        tools: ["chembl", "rdkit", "pubchem"],
        actions: [
            "Resolve the target and assay context before combining activity records. Keep endpoint, relation, units, organism, assay identifier, and citation with each measurement.",
            "Standardize structures and identifiers, remove duplicates, and flag measurements that should not be compared directly (for example, different endpoints or incompatible assay formats).",
            "Group compounds into series and inspect potency changes alongside structural changes and physicochemical properties. Treat apparent SAR as a hypothesis until assay comparability is checked."
        ],
        deliverable: "Deliverable: a curated ligand table, a short series/scaffold summary, and a list of high-confidence SAR observations."
    },
    "hit-identification": {
        title: "Set up a hit-identification campaign",
        intro: "Define the search space and use complementary evidence streams so that one scoring function does not decide which compounds reach testing.",
        tasks: ["ligand-based-screening", "structure-based-screening", "molecular-docking", "structure-search"],
        tools: ["zinc", "chembl", "rdkit", "gnina", "autodock-vina"],
        actions: [
            "Define the screening source, target or reference ligands, acceptable chemical properties, known nuisance motifs, and the number of compounds that can realistically be tested.",
            "Where known ligands exist, use their structures and SAR to guide analogue or similarity searches. In parallel, use a validated protein structure for structure-based prioritization when one is available.",
            "Validate the workflow on known actives, decoys, or a redocking control when possible. Standardize outputs, remove duplicate structures, and rank compounds using several independent criteria rather than docking score alone."
        ],
        deliverable: "Deliverable: a ranked and deduplicated hit list with provenance, method-specific scores, and reasons for advancing each compound."
    },
    "hit-to-lead": {
        title: "Turn initial hits into interpretable chemical series",
        intro: "The aim is to move from isolated hits to a set of compounds that can support a reliable structure–activity hypothesis.",
        tasks: ["bioactivity-analysis", "scaffold-analysis", "molecular-descriptors-properties", "qsar"],
        tools: ["chembl", "rdkit", "pubchem", "deepchem"],
        actions: [
            "Confirm the source and quality of each hit, then check whether related compounds, orthogonal assays, or independent reports support the activity.",
            "Group hits into series, map substitutions against activity, and look for liabilities such as aggregation risk, reactive motifs, assay interference, or inconsistent potency across assay contexts.",
            "Select a small, informative analogue set that tests the most important SAR hypothesis. Avoid changing many structural features at once if the aim is to learn from the next experiment."
        ],
        deliverable: "Deliverable: a validated hit set, series-level SAR map, and a proposed first analogue matrix with explicit hypotheses."
    },
    "lead-optimization": {
        title: "Make each lead-optimization cycle testable",
        intro: "Tie proposed structural changes to a specific hypothesis about potency, selectivity, exposure, safety, or synthetic practicality.",
        tasks: ["bioactivity-analysis", "qsar", "molecular-docking", "interaction-analysis", "molecular-descriptors-properties"],
        tools: ["chembl", "rdkit", "deepchem", "pymol-open-source", "plip-protein-ligand-interaction-profiler"],
        actions: [
            "Choose the current lead series and summarize potency, selectivity, key binding interactions, and the properties that currently limit progression.",
            "Design matched analogue changes that test one rationale at a time. Where structure-based evidence exists, use it to explain a hypothesis, not as proof of binding or potency.",
            "For each proposed analogue, combine available experimental SAR, model estimates, binding-mode plausibility, and property risks. Track the reason for each design so that new results can update the hypothesis."
        ],
        deliverable: "Deliverable: a prioritized analogue plan with a rationale, expected effect, main risk, and a clear experiment that could falsify each hypothesis."
    },
    "candidate-profiling": {
        title: "Build a multi-parameter evidence matrix",
        intro: "At candidate-profiling stage, decisions should reflect the balance of pharmacology, developability, and uncertainty—not a single best score.",
        tasks: ["molecular-descriptors-properties", "drug-likeness", "adme", "toxicity", "data-curation"],
        tools: ["rdkit", "deepchem", "knime"],
        actions: [
            "Gather comparable evidence for potency, selectivity, physicochemical properties, permeability, solubility, metabolism, safety liabilities, and synthetic practicality.",
            "Record the evidence source, assay/model version, uncertainty, and applicability limits for every value. Mark missing evidence explicitly instead of treating it as a favourable result.",
            "Use a transparent decision matrix to identify which compounds are balanced, which risk is currently decisive, and which experiment would most efficiently reduce uncertainty."
        ],
        deliverable: "Deliverable: a candidate comparison table with explicit evidence gaps and a short, risk-based recommendation."
    }
};

const objectiveGuides = {
    "target-context": {
        order: 1,
        kicker: "TARGET CONTEXT",
        title: "Establish target and binding-site context",
        intro: "Build a defensible view of the target before relying on a particular modelling method.",
        tasks: ["binding-site-analysis", "protein-preparation", "molecular-visualization", "bioactivity-analysis"],
        tools: ["pymol-open-source", "chembl", "pubchem", "biopython"],
        actions: [
            "Confirm the target identifier, species, isoform, construct, and intended biological mechanism. Keep target-level evidence separate from evidence for a specific assay or ligand.",
            "Search for relevant ligand and activity records, and identify experimental structures or structural homologues if available. Check chain identity, construct differences, bound ligands, resolution, missing regions, and important cofactors.",
            "Inspect the binding pocket and known ligand interactions in a molecular viewer. Record the residues and assumptions that will be used later in docking or analogue design.",
            "List what remains unknown—for example, the relevant protein state, the selectivity mechanism, or whether a reported ligand is active in the project's assay context."
        ],
        deliverable: "Deliverable: a target-and-pocket summary with evidence provenance and a short list of testable hypotheses."
    },
    "ligand-landscape": {
        order: 2,
        kicker: "LIGAND DATA / SAR",
        title: "Curate the known-ligand landscape",
        intro: "A reliable SAR map starts with comparable bioactivity data and standardized structures.",
        tasks: ["bioactivity-analysis", "data-curation", "scaffold-analysis", "qsar"],
        tools: ["chembl", "pubchem", "rdkit", "deepchem"],
        actions: [
            "Search ChEMBL using the target name and stable identifiers; export compound structures together with standard activity value, relation, units, endpoint, assay identifier, target identifier, and source citation.",
            "Separate IC50, Ki, Kd, EC50, and other endpoints unless there is a justified conversion or modelling strategy. Inspect assay conditions and target confidence before merging records.",
            "Standardize structures, preserve original identifiers, remove duplicate salts or equivalent representations using a documented policy, and flag conflicting or censored measurements.",
            "Group compounds by scaffold or series and compare substitution changes against activity. Use plots and summaries to identify trends, outliers, and gaps rather than relying on a single potency ranking."
        ],
        deliverable: "Deliverable: a traceable activity dataset and a series-level SAR summary suitable for screening, analogue design, or modelling."
    },
    "hit-identification": {
        order: 3,
        kicker: "HIT IDENTIFICATION",
        title: "Combine search and screening evidence",
        intro: "Choose a screening route based on the evidence available, then combine complementary routes where they add independent information.",
        tasks: ["ligand-based-screening", "structure-based-screening", "molecular-docking", "structure-search"],
        tools: ["zinc", "chembl", "rdkit", "gnina", "autodock-vina"],
        actions: [
            "Define the chemical space, library source, reference ligands, property limits, and experimental capacity. Keep a record of the query and database version.",
            "If credible reference ligands exist, search for related structures or analogues and use the existing SAR to define prioritization rules. If a suitable target structure exists, consider docking as a parallel route.",
            "Check controls and known actives before trusting scores. Collapse duplicates, inspect scaffold diversity, and rank using orthogonal evidence such as ligand similarity, docking pose quality, property flags, and data provenance.",
            "Keep a route-specific record for each candidate so that a high score from one method is not mistaken for confirmation by another."
        ],
        deliverable: "Deliverable: a diverse, ranked hit shortlist with the evidence supporting each selected compound."
    },
    "structure-based": {
        order: 4,
        kicker: "STRUCTURE-BASED MODELLING",
        title: "Prepare, dock, and validate structures",
        intro: "Docking is most useful when receptor preparation and controls are treated as part of the method, not as administrative details.",
        tasks: ["protein-preparation", "ligand-preparation", "molecular-docking", "structure-based-screening", "binding-site-analysis"],
        tools: ["pymol-open-source", "open-babel", "gnina", "autodock-vina"],
        actions: [
            "Select a structure appropriate to the biological target and binding hypothesis. Inspect construct, chain, ligand identity, relevant waters, cofactors, alternate conformations, and missing residues.",
            "Prepare the receptor and ligands with explicit, recorded choices for protonation, hydrogens, charges, tautomer/stereochemistry, and treatment of waters or cofactors. Use a consistent preparation protocol across compounds.",
            "Define the docking box from the co-crystallized ligand or a justified pocket definition. Redock a known ligand or use another suitable control before interpreting a virtual screen.",
            "Run GNINA and/or AutoDock Vina with the settings recorded. Compare poses and score distributions, then inspect top poses in a molecular viewer; do not interpret small score differences as reliable affinity differences without validation."
        ],
        deliverable: "Deliverable: a validated docking setup, saved structures and settings, and a pose-ranked set of candidates with caveats."
    },
    "interactions": {
        order: 5,
        kicker: "POSE INTERPRETATION",
        title: "Translate poses into interaction hypotheses",
        intro: "Interaction analysis helps explain why a pose may be plausible and what a proposed analogue should test; it does not independently prove binding.",
        tasks: ["interaction-analysis", "binding-site-analysis", "molecular-visualization", "three-dimensional-analysis"],
        tools: ["plip-protein-ligand-interaction-profiler", "pymol-open-source"],
        actions: [
            "Run PLIP on carefully prepared protein–ligand complexes to obtain a consistent set of reported contacts, including hydrogen bonds and hydrophobic or aromatic interactions where applicable.",
            "Inspect key contacts in PyMOL. Check donor/acceptor identity, geometry, protonation, steric conflicts, water mediation, and whether the residues belong to the biologically relevant chain or pocket.",
            "Compare interaction patterns across a series and distinguish conserved anchors from contacts that differ between analogues. Do not equate a larger contact count with stronger affinity.",
            "Convert the analysis into a design hypothesis—for example, a substituent vector to explore or a contact whose contribution should be tested experimentally."
        ],
        deliverable: "Deliverable: a reproducible interaction table or fingerprint plus annotated poses and a specific follow-up design hypothesis."
    },
    "qsar": {
        order: 6,
        kicker: "QSAR / PREDICTIVE MODELLING",
        title: "Build a validated activity model",
        intro: "Model quality depends at least as much on endpoint curation and leakage-resistant validation as on the algorithm.",
        tasks: ["qsar", "machine-learning", "data-curation", "molecular-descriptors-properties"],
        tools: ["chembl", "rdkit", "deepchem"],
        actions: [
            "Define one modelling endpoint and curate a consistent dataset. Preserve measurement relations and assay metadata; do not mix incomparable endpoints or silently convert censored values.",
            "Standardize molecular structures and calculate descriptors or fingerprints. Check class balance, duplicated structures, contradictory labels, series distribution, and data leakage before training.",
            "Start with a transparent baseline, then compare more complex models. Use scaffold- or time-aware splits where appropriate and keep a genuinely held-out evaluation set.",
            "Report metrics suited to the task, calibration or uncertainty where possible, and the model's applicability domain. Use permutation or y-randomization checks when appropriate to test whether the signal exceeds chance."
        ],
        deliverable: "Deliverable: a reproducible modelling dataset, validated baseline, error analysis, and a clear statement of when predictions should not be trusted."
    },
    "analogues": {
        order: 7,
        kicker: "ANALOGUE DESIGN",
        title: "Turn SAR into a focused analogue plan",
        intro: "Design compounds to test a chemical hypothesis, not simply to maximize a single computational score.",
        tasks: ["scaffold-analysis", "structure-search", "ligand-based-screening", "molecular-descriptors-properties", "molecular-docking"],
        tools: ["rdkit", "chembl", "pubchem", "zinc", "deepchem"],
        actions: [
            "Choose a confirmed series and map the current structure–activity evidence. Identify the core features likely to be important and positions where changes are chemically and synthetically plausible.",
            "Explore existing analogues or related scaffolds before proposing new molecules. Use compound and purchasable-compound resources to avoid rediscovering available chemistry.",
            "Generate a small, interpretable set of substitutions or scaffold hops. For each design, state the intended change in binding, selectivity, or property and avoid changing too many variables at once.",
            "Assess candidates with more than one lens—known SAR or a validated QSAR model, structural plausibility where justified, physicochemical properties, novelty, and expected synthetic effort."
        ],
        deliverable: "Deliverable: an analogue matrix that links each proposed structure to a hypothesis, evidence, and experiment."
    },
    "de-novo": {
        order: 8,
        kicker: "GENERATIVE / DE NOVO DESIGN",
        title: "Define constraints before generating molecules",
        intro: "Generative design is most useful when the chemical and biological objectives are explicit and the output is independently validated.",
        tasks: ["generative-chemistry", "machine-learning", "molecular-descriptors-properties", "structure-based-screening"],
        tools: ["deepchem", "rdkit", "knime"],
        actions: [
            "Specify the intended binding mode or pharmacophore hypothesis, allowed chemistry, novelty requirements, and acceptable ranges for size, polarity, lipophilicity, and other project constraints.",
            "Use a suitable generative approach or model workflow. DeepChem is a modelling toolkit in the current catalogue, not a turnkey de novo-design application; model selection, training, and validation remain project work.",
            "Sanitize generated structures, check stereochemistry and duplicates, and assess novelty and chemical plausibility. Reject molecules that only exploit a scoring function or violate hard constraints.",
            "Apply independent downstream checks—structural review or docking where relevant, property and ADMET assessment, and synthetic feasibility—before selecting molecules for synthesis."
        ],
        deliverable: "Deliverable: a filtered, traceable set of generated ideas with the constraints, model, and rejection criteria recorded."
    },
    "admet": {
        order: 9,
        kicker: "PROPERTY / ADMET ASSESSMENT",
        title: "Assess properties and developability risks",
        intro: "Property prediction should inform a balanced decision and identify the next experiment; no single descriptor or in-silico prediction is a substitute for evidence.",
        tasks: ["physicochemical-properties", "molecular-descriptors-properties", "adme", "toxicity", "drug-likeness"],
        tools: ["rdkit", "deepchem", "knime"],
        actions: [
            "Calculate a consistent baseline of molecular descriptors and flag clear liabilities. Record the exact structure and protonation/tautomer policy used for each compound.",
            "For ADMET predictions, use a validated model with known endpoint, applicability domain, and uncertainty. The current ChemIsFree catalogue has no dedicated, turnkey ADMET predictor; RDKit supports descriptor calculation, while DeepChem is a toolkit for building or applying models rather than a ready-made prediction service.",
            "For CNS projects, assess the relevant balance of lipophilicity, ionization, solubility, permeability, efflux, metabolic stability, and safety. Avoid interpreting molecular weight or a single drug-likeness rule as a complete BBB prediction.",
            "Use predicted results to select orthogonal experimental checks and update a multi-parameter matrix. Preserve uncertainty and conflicting predictions instead of hiding them behind one composite score."
        ],
        deliverable: "Deliverable: a property-risk table with model provenance, uncertainty, and the next experimental checks."
    },
    "synthesis": {
        order: 10,
        kicker: "SYNTHETIC FEASIBILITY",
        title: "Check whether the design can be made",
        intro: "Synthetic feasibility needs route-level chemistry and expert review, not just a numerical accessibility score.",
        tasks: ["retrosynthesis", "route-planning", "reaction-prediction", "structure-conversion"],
        tools: ["rdkit", "open-babel"],
        actions: [
            "Standardize the exact target structure, stereochemistry, salt form, and protecting-group assumptions before route planning.",
            "Use a retrosynthesis or reaction-planning engine with documented reaction coverage, then compare plausible disconnections, starting-material availability, route length, selectivity, safety, and known reaction limitations.",
            "Have a chemist check each proposed transformation and identify high-risk steps, unstable intermediates, or missing precedent. Treat algorithmic routes as proposals, not validated instructions.",
            "Feed synthetic constraints back into analogue design so that a chemically attractive but impractical idea is not automatically prioritized."
        ],
        deliverable: "Deliverable: a reviewed route hypothesis with key risks and a feasible backup design.",
        coverageNote: "Catalogue gap: ChemIsFree does not currently list a dedicated retrosynthesis or route-planning engine. RDKit and Open Babel can help with structures and file conversion, but they do not replace a retrosynthesis system or chemist review."
    },
    "curation": {
        order: 0,
        kicker: "DATA / STRUCTURE PREPARATION",
        title: "Create a traceable, standardized input dataset",
        intro: "Data curation is a shared foundation for screening, SAR analysis, QSAR, docking, and analogue design.",
        tasks: ["data-curation", "structure-conversion", "ligand-preparation", "bioactivity-analysis"],
        tools: ["chembl", "pubchem", "rdkit", "open-babel"],
        actions: [
            "Preserve an untouched copy of every downloaded file and keep identifiers, source URLs, retrieval dates, assay metadata, and processing steps.",
            "Normalize structures with a documented policy for salts, mixtures, stereochemistry, tautomers, and duplicates. Do not remove stereochemistry or standardize protonation without considering the task.",
            "Normalize activity units and endpoint naming, but do not merge biologically different measurements simply because they share a numeric unit.",
            "Keep an exclusion log so that each removed compound or measurement has an auditable reason."
        ],
        deliverable: "Deliverable: a clean analysis-ready dataset linked back to its raw inputs and transformation log."
    },
    "automation": {
        order: 11,
        kicker: "REPRODUCIBLE WORKFLOWS",
        title: "Connect the steps into a repeatable pipeline",
        intro: "Automate stable, well-understood steps and keep human review at scientific decision points.",
        tasks: ["workflow-construction", "pipeline-execution", "chemical-data-analysis", "machine-learning"],
        tools: ["knime", "rdkit", "deepchem", "biopython"],
        actions: [
            "Break the workflow into explicit inputs, transformations, outputs, and quality checks. Preserve raw files and record tool versions, configuration, random seeds, and environment details.",
            "Use KNIME for a visual, low-code pipeline or programmatic libraries such as RDKit and DeepChem when scripted control is more appropriate.",
            "Add assertions for expected molecule counts, parse failures, missing data, duplicates, and failed calculations. Save intermediate outputs and logs so that a rerun can be compared with the original.",
            "Automate repetitive processing, but keep expert review for target assumptions, binding-mode interpretation, route feasibility, and final compound selection."
        ],
        deliverable: "Deliverable: a documented workflow that can be rerun on a new dataset without losing provenance."
    }
};

async function loadWorkflowCatalogue() {
    const results = document.getElementById("workflow-results");
    try {
        const responses = await Promise.all([
            fetch("data/tools.json"),
            fetch("data/taxonomy.json")
        ]);
        if (!responses[0].ok) throw new Error("Tool catalogue could not be loaded.");
        if (!responses[1].ok) throw new Error("Catalogue taxonomy could not be loaded.");
        const loadedTools = await responses[0].json();
        workflowCatalogue.splice(0, workflowCatalogue.length, ...(Array.isArray(loadedTools) ? loadedTools : []));
        workflowTaxonomy = await responses[1].json();
        const submit = document.querySelector("#workflow-form button[type='submit']");
        if (submit) submit.disabled = false;
    } catch (error) {
        console.error("Could not load workflow catalogue:", error);
        if (results) {
            results.innerHTML = '<div class="planner-error-message"><strong>Catalogue unavailable.</strong> The workflow planner could not load the current ChemIsFree tools. Check that the site is being served with its generated catalogue files, then try again.</div>';
        }
    }
}

function escapeWorkflowHtml(value) {
    return String(value === undefined || value === null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function titleLabel(value) {
    return String(value || "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, function(letter) { return letter.toUpperCase(); });
}

function getWorkflowTaskName(taskId) {
    const domains = workflowTaxonomy.domains || {};
    const keys = Object.keys(domains);
    for (let i = 0; i < keys.length; i += 1) {
        const tasks = domains[keys[i]].tasks || [];
        const found = tasks.find(function(task) { return task.id === taskId; });
        if (found) return found.name;
    }
    return titleLabel(taskId);
}

function rankWorkflowTools(config) {
    const preferred = config.tools || [];
    const taskIds = config.tasks || [];
    const domainIds = config.domains || [];
    const ranked = workflowCatalogue.map(function(tool) {
        let score = 0;
        const preferredIndex = preferred.indexOf(tool.id);
        if (preferredIndex >= 0) score += 100 - preferredIndex * 8;
        const toolTasks = Array.isArray(tool.tasks) ? tool.tasks : [];
        taskIds.forEach(function(taskId) {
            if (toolTasks.includes(taskId)) score += 8;
        });
        const toolDomains = Array.isArray(tool.domain) ? tool.domain : [];
        domainIds.forEach(function(domainId) {
            if (toolDomains.includes(domainId)) score += 2;
        });
        return { tool: tool, score: score };
    }).filter(function(item) { return item.score > 0; });

    ranked.sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.tool.name || "").localeCompare(String(b.tool.name || ""));
    });

    return ranked.slice(0, 4).map(function(item) { return item.tool; });
}

function interfaceSummary(tool) {
    const items = Array.isArray(tool.interface) ? tool.interface : [];
    return items.length ? items.map(titleLabel).join(" · ") : "Interface not specified";
}

function platformNote(tool, selectedOS) {
    const platforms = (Array.isArray(tool.platforms) ? tool.platforms : [])
        .map(function(value) { return String(value).toLowerCase(); });

    if (selectedOS === "any") {
        if (platforms.includes("web") || (Array.isArray(tool.interface) && tool.interface.includes("web"))) {
            return "Browser access listed";
        }
        return platforms.length ? "Platform notes: " + platforms.map(titleLabel).join(", ") : "Check the official setup guide";
    }

    if (platforms.includes(selectedOS)) return "Platform listed: " + titleLabel(selectedOS);
    if (platforms.includes("web") || (Array.isArray(tool.interface) && tool.interface.includes("web"))) {
        return "Browser option listed; not filtered out";
    }
    if (platforms.includes("other") || !platforms.length) return "Compatibility not specified; check documentation";
    return "Selected OS not listed; check upstream requirements";
}

function makeToolCard(tool, selectedOS) {
    const detailUrl = "tool.html?id=" + encodeURIComponent(tool.id || "");
    const official = tool.website || tool.repository || tool.documentation || "";
    const typeText = titleLabel(tool.type || tool.catalogue || "resource");
    return '<article class="planner-tool-rec">' +
        '<h4>' + escapeWorkflowHtml(tool.name || "Unnamed tool") + '</h4>' +
        '<p>' + escapeWorkflowHtml(tool.description || "No catalogue description available.") + '</p>' +
        '<div class="planner-tool-rec-meta">' + escapeWorkflowHtml(typeText) + ' · ' +
            escapeWorkflowHtml(interfaceSummary(tool)) + '<br>' +
            escapeWorkflowHtml(platformNote(tool, selectedOS)) + '</div>' +
        '<div class="planner-tool-rec-links">' +
            '<a href="' + escapeWorkflowHtml(detailUrl) + '">ChemIsFree details ↗</a>' +
            (official ? '<a href="' + escapeWorkflowHtml(official) + '" target="_blank" rel="noopener noreferrer">Official resource ↗</a>' : '') +
        '</div>' +
    '</article>';
}

function makeStep(step, index, selectedOS) {
    const actions = step.actions.map(function(action) {
        return "<li>" + escapeWorkflowHtml(action) + "</li>";
    }).join("");
    const recommendations = rankWorkflowTools(step);
    const toolsHtml = recommendations.length
        ? '<div class="planner-tool-recommendations">' +
            recommendations.map(function(tool) { return makeToolCard(tool, selectedOS); }).join("") +
          '</div>'
        : '<div class="planner-coverage-note"><strong>No directly matched catalogue entry yet.</strong> The method is still part of the workflow; the catalogue needs a relevant tool added or curated for this step.</div>';
    const coverage = step.coverageNote
        ? '<div class="planner-coverage-note"><strong>Coverage note.</strong> ' + escapeWorkflowHtml(step.coverageNote) + '</div>'
        : "";

    return '<article class="planner-workflow-step">' +
        '<div class="planner-step-number">' + String(index + 1).padStart(2, "0") + '</div>' +
        '<div class="planner-step-content">' +
            '<p class="planner-step-kicker">' + escapeWorkflowHtml(step.kicker || "WORKFLOW STEP") + '</p>' +
            '<h3>' + escapeWorkflowHtml(step.title) + '</h3>' +
            '<p class="planner-step-intro">' + escapeWorkflowHtml(step.intro) + '</p>' +
            '<ol class="planner-step-actions">' + actions + '</ol>' +
            '<p class="planner-deliverable"><strong>Output.</strong> ' + escapeWorkflowHtml(step.deliverable || "Save the result and its provenance for the next step.") + '</p>' +
            toolsHtml + coverage +
        '</div>' +
    '</article>';
}

function selectedObjectives() {
    return Array.from(document.querySelectorAll('input[name="objective"]:checked'))
        .map(function(input) { return input.value; });
}

function renderWorkflow(event) {
    if (event) event.preventDefault();
    const results = document.getElementById("workflow-results");
    if (!results) return;

    const objectives = selectedObjectives();
    const stageInput = document.querySelector('input[name="stage"]:checked');
    const stageKey = stageInput ? stageInput.value : "new-project";
    const selectedOS = document.getElementById("planner-os").value;

    if (!objectives.length) {
        results.innerHTML = '<div class="planner-empty-message"><strong>Select at least one objective.</strong> You can combine as many activities as you need; the planner will arrange them into one workflow.</div>';
        results.focus();
        return;
    }

    const stage = stageGuides[stageKey] || stageGuides["new-project"];
    const chosenSteps = objectives.map(function(id) { return objectiveGuides[id]; }).filter(Boolean);
    chosenSteps.sort(function(a, b) { return a.order - b.order; });

    const allSteps = [{
        order: -1,
        kicker: "PROJECT STAGE / " + titleLabel(stageKey).toUpperCase(),
        title: stage.title,
        intro: stage.intro,
        tasks: stage.tasks,
        tools: stage.tools,
        actions: stage.actions,
        deliverable: stage.deliverable
    }].concat(chosenSteps);

    const objectiveNames = objectives.map(function(id) {
        const input = document.querySelector('input[name="objective"][value="' + id + '"]');
        const label = input ? input.closest("label") : null;
        const title = label ? label.querySelector("strong") : null;
        return title ? title.textContent.trim() : titleLabel(id);
    });

    results.innerHTML =
        '<div class="planner-results-heading">' +
            '<div><p class="eyebrow">02 / YOUR WORKFLOW</p>' +
                '<h2>' + escapeWorkflowHtml(stage.title) + '</h2></div>' +
            '<p>' + escapeWorkflowHtml(stage.intro) + '<br><br><strong>Combined objectives:</strong> ' +
                escapeWorkflowHtml(objectiveNames.join(" · ")) +
                '<br><br>OS setting: ' + escapeWorkflowHtml(titleLabel(selectedOS === "any" ? "No preference" : selectedOS)) +
                '. Compatibility is shown as a note; relevant tools are not excluded.</p>' +
        '</div>' +
        '<div class="planner-results-list">' +
            allSteps.map(function(step, index) { return makeStep(step, index, selectedOS); }).join("") +
        '</div>' +
        '<p class="planner-method-note">Use this as a starting workflow, not as an automatic scientific decision. Validate tool outputs against experimental evidence, inspect model applicability and uncertainty, and document every input and setting. Tool suggestions come from the current ChemIsFree catalogue; missing catalogue coverage is labelled explicitly.</p>';

    results.focus();
}

function resetWorkflow() {
    const results = document.getElementById("workflow-results");
    if (results) results.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("workflow-form");
    const submit = document.querySelector("#workflow-form button[type='submit']");
    if (submit) submit.disabled = true;
    loadWorkflowCatalogue();
    if (form) form.addEventListener("submit", renderWorkflow);
    if (form) form.addEventListener("reset", function() { window.setTimeout(resetWorkflow, 0); });
});
