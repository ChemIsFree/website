const protocolLibrary = window.ChemIsFreeProtocols || {};
const workflowCatalogue = [];
let workflowTaxonomy = { domains: {}, resources: {} };

const stageGuides = {
    "new-project": {
        title: "Start with a focused discovery brief",
        intro: "Define the decision you need to make before choosing software.",
        tasks: ["bioactivity-analysis", "binding-site-analysis", "structure-search"],
        tools: ["chembl", "pubchem", "pymol-open-source"],
        actions: [
            "Write the target, species/isoform, biological question, and what the next decision should be.",
            "List what you already have: known compounds, assay data, protein structures, and practical constraints.",
            "Start with the simplest evidence that can answer the question; use docking or machine learning only when the inputs justify it."
        ],
        deliverable: "Save a one-page brief with the question, available evidence, key assumptions, and criteria for advancing compounds."
    },
    "ligand-landscape": {
        title: "Map the known ligands and SAR",
        intro: "Build a trustworthy view of the chemistry and activity already reported.",
        tasks: ["bioactivity-analysis", "data-curation", "scaffold-analysis", "qsar"],
        tools: ["chembl", "pubchem", "assayer-datawarrior", "knime"],
        actions: [
            "Search the target in ChEMBL and export structures, activity values, endpoint, units, assay details, target ID, and source.",
            "Compare like with like: keep IC50, Ki, Kd and different assay systems separate unless you have a justified conversion.",
            "Group related structures into series and check whether apparent potency trends are supported by comparable measurements."
        ],
        deliverable: "Save a traceable activity table and a short summary of the strongest, weakest, and most informative chemical series."
    },
    "hit-identification": {
        title: "Set up a hit-identification campaign",
        intro: "Choose a manageable library and use more than one line of evidence to prioritize compounds.",
        tasks: ["ligand-based-screening", "compound-library-search", "structure-based-screening", "molecular-docking"],
        tools: ["chembl", "pubchem", "zinc", "gnina", "autodock-vina"],
        actions: [
            "Define where compounds will come from, what counts as a useful hit, how many can be tested, and any hard property or chemistry limits.",
            "If known ligands exist, start with similarity and analogue searches. If a suitable protein structure exists, consider docking as a second route.",
            "Remove duplicates and retain a chemically diverse shortlist; check data quality, properties, pose plausibility, and availability—not just a score."
        ],
        deliverable: "Save a ranked shortlist with structures, source IDs, the reason each compound was selected, and the next experimental check."
    },
    "hit-to-lead": {
        title: "Turn hits into interpretable chemical series",
        intro: "The goal is to understand which changes matter, not to optimize isolated scores.",
        tasks: ["bioactivity-analysis", "scaffold-analysis", "molecular-descriptors-properties", "qsar"],
        tools: ["chembl", "assayer-datawarrior", "pubchem", "knime"],
        actions: [
            "Confirm each hit and search for related compounds or independent evidence of activity.",
            "Map potency and key properties across each series; flag inconsistent assays, likely artefacts, and missing data.",
            "Choose a small set of analogues that tests one clear hypothesis at a time."
        ],
        deliverable: "Save a series map and an analogue table stating the proposed change, expected effect, and experiment that would test it."
    },
    "lead-optimization": {
        title: "Make each lead-optimization cycle testable",
        intro: "Prioritize the current limiting factor and design experiments that distinguish between explanations.",
        tasks: ["bioactivity-analysis", "qsar", "molecular-docking", "interaction-analysis", "molecular-descriptors-properties"],
        tools: ["chembl", "assayer-datawarrior", "pymol-open-source", "plip-protein-ligand-interaction-profiler"],
        actions: [
            "Summarize potency, selectivity, properties, and the main development risk for the current lead series.",
            "Propose small, synthetically plausible changes. State the intended effect and avoid changing many structural features at once.",
            "Use models and docking to refine hypotheses—not to replace measurements—and record uncertainty for each proposed analogue."
        ],
        deliverable: "Save a prioritized analogue plan linking each design to a rationale, main risk, and a test that could disprove the hypothesis."
    },
    "candidate-profiling": {
        title: "Build a balanced candidate profile",
        intro: "Separate what is measured, what is predicted, and what remains unknown.",
        tasks: ["molecular-descriptors-properties", "drug-likeness", "adme", "toxicity", "data-curation"],
        tools: ["assayer-swissadme", "assayer-admetlab-3-0", "assayer-pkcsm", "knime"],
        actions: [
            "Compare potency, selectivity, solubility, permeability, metabolism, safety, and synthetic practicality using comparable evidence.",
            "Label each value as experimental or predicted and record its source, model, uncertainty, and limitations.",
            "Rank the remaining risks by impact and choose the experiment most likely to reduce uncertainty."
        ],
        deliverable: "Save a compound comparison table with evidence gaps and a risk-based recommendation."
    }
};

const objectiveGuides = {
    "curation": {
        order: 0, kicker: "DATA / STRUCTURE PREPARATION",
        title: "Prepare a clean, traceable dataset",
        intro: "Good inputs prevent avoidable errors later in the workflow.",
        tasks: ["data-curation", "structure-conversion", "ligand-preparation", "bioactivity-analysis"],
        tools: ["chembl", "pubchem", "assayer-datawarrior", "open-babel", "catalist"],
        actions: [
            "Keep an untouched copy of the original files and retain compound IDs, SMILES, activity metadata, and source links.",
            "Check missing structures, duplicate entries, stereochemistry, salts, units, and inconsistent endpoint labels before analysing the data.",
            "Record every cleaning rule and exclusion; never silently discard a compound or measurement."
        ],
        deliverable: "A cleaned CSV/SDF plus the original files and a short log of what changed."
    },
    "target-context": {
        order: 1, kicker: "TARGET CONTEXT",
        title: "Establish the target and binding-site context",
        intro: "Check the biological target before relying on a structure or model.",
        tasks: ["binding-site-analysis", "protein-preparation", "molecular-visualization", "bioactivity-analysis"],
        tools: ["pymol-open-source", "chembl", "pubchem", "assayer-proteinsplus-dogsitescorer"],
        actions: [
            "Confirm the target name, species, isoform, and intended mechanism; similar protein names do not guarantee the same binding site.",
            "Search for experimental protein structures and known ligands. Check chain, construct, bound ligand, missing regions, and relevant cofactors.",
            "Open a suitable structure in a molecular viewer and note the pocket and key residues. If no appropriate structure exists, do not proceed as though docking were validated."
        ],
        deliverable: "A target note with the selected structure or reason none is suitable, key references, and assumptions."
    },
    "ligand-landscape": {
        order: 2, kicker: "LIGAND DATA / SAR",
        title: "Find and compare known ligands",
        intro: "A useful SAR map starts with comparable experiments and traceable structures.",
        tasks: ["bioactivity-analysis", "data-curation", "scaffold-analysis", "qsar"],
        tools: ["chembl", "pubchem", "assayer-datawarrior", "knime", "rdkit"],
        actions: [
            "In ChEMBL, search the target and verify the correct organism and target type before exporting activity records.",
            "Filter to the endpoint and assay context relevant to your question; retain structures, units, assay IDs, and citations.",
            "Group related compounds and compare substituent changes against potency and properties. Flag conflicting or censored values instead of treating them as exact numbers."
        ],
        deliverable: "A CSV of comparable activity data and a short series-level SAR summary."
    },
    "hit-identification": {
        order: 3, kicker: "HIT IDENTIFICATION",
        title: "Find and prioritize candidate hits",
        intro: "Use a simple search route first, then add more demanding calculations when the inputs are ready.",
        tasks: ["ligand-based-screening", "compound-library-search", "structure-based-screening", "molecular-docking"],
        tools: ["chembl", "pubchem", "zinc", "gnina", "autodock-vina"],
        actions: [
            "Start with known active compounds or a defined chemical library; record the search terms and database version.",
            "Search for similar compounds and purchasable analogues. Use docking only if you have a suitable protein structure and can validate the setup.",
            "Inspect the top candidates, remove duplicates, retain scaffold diversity, and check availability and properties before proposing experiments."
        ],
        deliverable: "A diverse, ranked hit list with structures, source IDs, selection rationale, and validation needs."
    },
    "structure-based": {
        order: 4, kicker: "STRUCTURE-BASED MODELLING",
        title: "Dock compounds and review predicted poses",
        intro: "Docking is a prioritization tool, not proof that a compound binds.",
        tasks: ["protein-preparation", "ligand-preparation", "molecular-docking", "structure-based-screening", "binding-site-analysis"],
        tools: ["pymol-open-source", "gnina", "autodock-vina", "open-babel"],
        actions: [
            "Choose an appropriate protein structure; when possible, use one with a bound ligand to define the binding site and validate the setup.",
            "Prepare the protein and compound structures consistently, checking protonation, stereochemistry, cofactors, and file formats. Use a graphical/web workflow if available; command-line docking may need technical support.",
            "Run a known-ligand control or redocking test before screening. Inspect top poses in a viewer and use several lines of evidence rather than small score differences."
        ],
        deliverable: "Prepared input files, recorded settings, a control result, and a pose-ranked shortlist with limitations."
    },
    "interactions": {
        order: 5, kicker: "POSE INTERPRETATION",
        title: "Interpret protein–ligand interactions",
        intro: "Use contacts to develop design hypotheses, not to claim binding or rank affinity by contact count.",
        tasks: ["interaction-analysis", "binding-site-analysis", "molecular-visualization", "three-dimensional-analysis"],
        tools: ["plip-protein-ligand-interaction-profiler", "pymol-open-source"],
        actions: [
            "Upload a correctly prepared protein–ligand complex to PLIP when using its web service, then save the interaction report.",
            "Inspect important contacts in PyMOL; check geometry, donor/acceptor identity, chain selection, waters, and possible clashes.",
            "Compare related compounds and distinguish conserved interactions from contacts that change with substitution."
        ],
        deliverable: "An interaction table or annotated image and one specific, testable analogue-design hypothesis."
    },
    "qsar": {
        order: 6, kicker: "QSAR / PREDICTIVE MODELLING",
        title: "Build and check an activity model",
        intro: "A model is only useful if the input data and evaluation are trustworthy.",
        tasks: ["qsar", "machine-learning", "data-curation", "molecular-descriptors-properties"],
        tools: ["assayer-datawarrior", "knime", "rdkit", "deepchem"],
        actions: [
            "Choose one endpoint and curate comparable activity measurements; check duplicates, conflicting labels, and class balance.",
            "For a visual route, start with a GUI or KNIME workflow. RDKit and DeepChem are programming toolkits, not click-through prediction websites.",
            "Evaluate on compounds withheld from model training, preferably using a scaffold-aware split; inspect errors and the chemical space where predictions are unreliable."
        ],
        deliverable: "A documented dataset, validation results, error analysis, and an explicit statement of where the model should not be used."
    },
    "analogues": {
        order: 7, kicker: "ANALOGUE DESIGN",
        title: "Design a focused analogue set",
        intro: "Prefer interpretable, synthetically realistic changes over a long list of speculative molecules.",
        tasks: ["scaffold-analysis", "structure-search", "ligand-based-screening", "molecular-descriptors-properties"],
        tools: ["chembl", "pubchem", "zinc", "assayer-datawarrior", "catalist"],
        actions: [
            "Identify the core scaffold and positions that can be changed without losing essential binding features.",
            "Search known and purchasable analogues before generating new structures. Keep the core and change one region at a time where possible.",
            "For each proposal, state the expected effect, property risk, and a plausible synthetic route; reject designs that are difficult to test or interpret."
        ],
        deliverable: "An analogue matrix showing structure, design hypothesis, expected benefit, synthetic concern, and experiment."
    },
    "de-novo": {
        order: 8, kicker: "GENERATIVE DESIGN",
        title: "Use molecular generation with explicit constraints",
        intro: "Generated structures are starting ideas; they must pass chemical and experimental checks.",
        tasks: ["generative-chemistry", "machine-learning", "molecular-descriptors-properties", "structure-based-screening"],
        tools: ["assayer-reinvent4", "synthemol", "crem-pharm", "deepchem"],
        actions: [
            "Define the core or pharmacophore to preserve, allowed substituent space, property limits, and synthetic constraints before generating molecules.",
            "Check each output for valid chemistry, stereochemistry, duplicates, similarity to known compounds, and compatibility with the design goal.",
            "Prioritize molecules with a credible route and independent supporting evidence; generation or docking scores alone are not sufficient."
        ],
        deliverable: "A small, filtered set of ideas with constraints, source/model, rejection criteria, and synthetic review notes."
    },
    "admet": {
        order: 9, kicker: "PROPERTY / ADMET ASSESSMENT",
        title: "Check physicochemical properties and ADMET risks",
        intro: "Use predictions to identify risks and choose experiments; do not treat them as measurements.",
        tasks: ["physicochemical-properties", "molecular-descriptors-properties", "adme", "toxicity", "drug-likeness"],
        tools: ["assayer-swissadme", "assayer-admetlab-3-0", "assayer-pkcsm", "assayer-protox-3-0", "rdkit"],
        actions: [
            "Standardize the structure and calculate basic descriptors using the same convention for every compound.",
            "Submit SMILES to a suitable web predictor where available; record model, endpoint, prediction, and any uncertainty or applicability warning.",
            "Use the results to compare compounds and identify follow-up assays. For CNS projects, no single descriptor or web score establishes blood–brain barrier penetration."
        ],
        deliverable: "A property-risk table separating measured values, predictions, missing data, and proposed follow-up experiments."
    },
    "synthesis": {
        order: 10, kicker: "SYNTHETIC FEASIBILITY",
        title: "Check whether the designs are practical to make",
        intro: "A route predictor proposes possibilities; a chemist must assess whether the route is credible.",
        tasks: ["retrosynthesis", "route-planning", "reaction-prediction", "structure-conversion"],
        tools: ["assayer-aizynthfinder", "synthemol", "open-babel"],
        actions: [
            "Confirm the exact target structure, stereochemistry, salt form, and intended substitution pattern.",
            "Use a route-planning resource to explore disconnections and starting materials. Check whether its interface requires Python or command-line setup before investing time.",
            "Review each proposed step for precedent, selectivity, safety, availability, and purification burden; ask a synthesis chemist to assess high-risk steps."
        ],
        deliverable: "A reviewed route hypothesis with key uncertainties, likely starting-material constraints, and a backup design."
    },
    "automation": {
        order: 11, kicker: "REPRODUCIBLE WORKFLOWS",
        title: "Make the workflow repeatable",
        intro: "Automate stable steps, but keep expert review at scientific decision points.",
        tasks: ["workflow-construction", "pipeline-execution", "chemical-data-analysis", "machine-learning"],
        tools: ["knime", "molve", "rdkit", "deepchem"],
        actions: [
            "Write down the input, operation, output, and quality check for each step; keep raw files unchanged.",
            "Start with KNIME for a visual, low-code workflow. Add programming libraries only if the task cannot be handled reliably with the graphical route.",
            "Save the workflow, tool versions, settings, intermediate files, and error log. Re-run it on a small test set before using a full library."
        ],
        deliverable: "A saved workflow, a small test run, and a record of settings that another researcher could reproduce."
    }
};

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
            results.innerHTML = '<div class="planner-error-message"><strong>Catalogue unavailable.</strong> The planner could not load ChemIsFree tools. Open the site through its published pages rather than as a local file, then try again.</div>';
        }
    }
}

function getInterfaceItems(tool) {
    return Array.isArray(tool.interface) ? tool.interface.map(function(value) {
        return String(value || "").toLowerCase();
    }) : [];
}

function interfaceSummary(tool) {
    const items = getInterfaceItems(tool);
    if (!items.length || items.includes("other")) return "Interface unconfirmed";
    const labels = [];
    if (items.includes("gui") && items.includes("web")) labels.push("GUI / Web");
    else if (items.includes("gui")) labels.push("Desktop GUI");
    else if (items.includes("web")) labels.push("Web");
    if (items.includes("cli")) labels.push("Command line");
    const programmatic = items.filter(function(value) {
        return ["python", "r", "c++", "java", "api", "notebook", "mcp"].includes(value);
    });
    if (programmatic.length) labels.push("Programmatic");
    if (!labels.length) labels.push(items.map(titleLabel).join(" · "));
    return [...new Set(labels)].join(" + ");
}

function interfaceSuitability(tool, preference) {
    const items = getInterfaceItems(tool);
    const visual = items.includes("web") || items.includes("gui");
    const code = items.some(function(value) {
        return ["cli", "python", "r", "c++", "java", "api", "notebook", "mcp"].includes(value);
    });
    const uncertain = !items.length || items.includes("other");
    const library = String(tool.type || "").toLowerCase() === "library" ||
        String(tool.catalogue || "").toLowerCase() === "resource" &&
        String(tool.resource_type || "").toLowerCase() === "library";
    let score = 0;

    if (preference === "visual-first") {
        score += visual ? 32 : -16;
        if (items.includes("web")) score += 5;
        if (!visual && code) score -= 14;
        if (library && !visual) score -= 20;
        if (uncertain) score -= 18;
    } else if (preference === "programmatic") {
        score += code ? 24 : 0;
        score += items.includes("cli") ? 6 : 0;
        score += visual ? 2 : 0;
        if (uncertain) score -= 16;
    } else {
        score += visual ? 10 : 0;
        if (uncertain) score -= 16;
        if (library && !visual) score -= 5;
    }

    const confidence = tool.interface_classification && tool.interface_classification.confidence;
    if (confidence === "low") score -= 8;
    if (confidence === "medium") score -= 2;
    if (String(tool.status || "").toLowerCase() === "archived") score -= 35;
    return score;
}

function rankWorkflowTools(config, preference) {
    const preferred = config.tools || [];
    const taskIds = config.tasks || [];
    const domainIds = config.domains || [];

    const ranked = workflowCatalogue.map(function(tool) {
        let score = 0;
        const preferredIndex = preferred.indexOf(tool.id);
        if (preferredIndex >= 0) score += Math.max(4, 18 - preferredIndex * 2);
        const toolTasks = Array.isArray(tool.tasks) ? tool.tasks : [];
        taskIds.forEach(function(taskId) {
            if (toolTasks.includes(taskId)) score += 9;
        });
        const toolDomains = Array.isArray(tool.domain) ? tool.domain : [];
        domainIds.forEach(function(domainId) {
            if (toolDomains.includes(domainId)) score += 1;
        });
        score += interfaceSuitability(tool, preference);
        return { tool: tool, score: score };
    }).filter(function(item) { return item.score > 0; });

    ranked.sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        const aVisual = getInterfaceItems(a.tool).some(function(value) { return value === "gui" || value === "web"; });
        const bVisual = getInterfaceItems(b.tool).some(function(value) { return value === "gui" || value === "web"; });
        if (aVisual !== bVisual && preference === "visual-first") return aVisual ? -1 : 1;
        return String(a.tool.name || "").localeCompare(String(b.tool.name || ""));
    });

    return ranked.slice(0, 4).map(function(item) { return item.tool; });
}

function safeHttpUrl(value) {
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
        const url = String(candidate || "").trim();
        if (/^https?:\/\//i.test(url)) return url;
    }
    return "";
}

function platformNote(tool, selectedOS) {
    const platforms = (Array.isArray(tool.platforms) ? tool.platforms : [])
        .map(function(value) { return String(value).toLowerCase(); });

    if (selectedOS === "any") {
        if (platforms.includes("web") || getInterfaceItems(tool).includes("web")) return "Browser option listed";
        return platforms.length ? "Platforms listed: " + platforms.map(titleLabel).join(", ") : "Check the official setup guide";
    }
    if (platforms.includes(selectedOS)) return "Platform listed: " + titleLabel(selectedOS);
    if (platforms.includes("web") || getInterfaceItems(tool).includes("web")) return "Browser option listed; not filtered out";
    if (platforms.includes("other") || !platforms.length) return "Compatibility not specified; check documentation";
    return "Selected OS not listed; check upstream requirements";
}

function toolQuickStart(tool, step) {
    const id = String(tool.id || "").toLowerCase();
    const name = String(tool.name || "").toLowerCase();
    const haystack = id + " " + name;
    const items = getInterfaceItems(tool);

    if (haystack.includes("chembl")) {
        return "Open ChEMBL and search the target. Verify organism and target type, then filter the activity table to one relevant endpoint. Export structures together with assay IDs, units, target IDs, and source details.";
    }
    if (haystack.includes("pubchem")) {
        return "Search by exact name, SMILES, or InChIKey. Confirm the structure and stereochemistry, then save the CID, SMILES, properties, and source.";
    }
    if (haystack.includes("pymol")) {
        return "Open the PDB structure, confirm the protein chain and any bound ligand, then inspect the pocket around that ligand. Save the session and an annotated image; check waters and cofactors before removing them.";
    }
    if (haystack.includes("plip") || name.includes("protein-ligand interaction")) {
        return "Provide a protein–ligand complex in the required format and run the interaction analysis. Save the report, then inspect important contacts in a molecular viewer; listed contacts do not prove binding or affinity.";
    }
    if (haystack.includes("swissadme")) {
        return "Enter standardized SMILES in the web form and run the property calculation. Save the complete output with each compound ID; treat permeability and blood–brain barrier estimates as rough filters, not a final answer.";
    }
    if (haystack.includes("admetlab") || haystack.includes("pkcsm") || haystack.includes("protox") || haystack.includes("admet-ai")) {
        return "Submit a standardized SMILES and record the exact endpoint and model output. Save the raw predictions and check the tool's stated scope; predictions are not experimental measurements.";
    }
    if (haystack.includes("knime")) {
        return "Start with a File Reader node, inspect the columns, then add only the required filtering, duplicate-checking, or plotting nodes. Save the workflow and export a result table; begin visually rather than writing code.";
    }
    if (haystack.includes("datawarrior")) {
        return "Open the CSV or SDF and identify the structure/SMILES column. Inspect structures, create the descriptors or plots relevant to the question, group related compounds, and export a table that retains compound IDs.";
    }
    if (haystack.includes("autodock-vina") || haystack.includes("gnina")) {
        return "This is mainly a command-line docking workflow. Prepare compatible receptor and ligand files, define the box from a justified binding site, and run a known-ligand control first. Inspect poses in a viewer; do not rank by score alone.";
    }
    if (haystack.includes("open-babel")) {
        return "Use the graphical option if available, select the input and output file formats, and convert a small test set first. Check stereochemistry and atom counts before converting a full library.";
    }
    if (haystack.includes("rdkit") || haystack.includes("deepchem") || haystack.includes("biopython")) {
        return "This is a programming library rather than a click-through app. Use it through an existing notebook or a prepared graphical workflow, or work with a computational colleague; check the input and output on a small example first.";
    }
    if (haystack.includes("zinc")) {
        return "Search the relevant purchasable-compound collection with clear structural or property constraints. Save compound identifiers and availability information, and verify the catalogue/source before selecting compounds to order.";
    }
    if (haystack.includes("catalist")) {
        return "Open the desktop application, draw or import a structure, and use the structure search or property tools to inspect your compounds. Export results with the original identifiers so they can be traced back to your series.";
    }
    if (haystack.includes("synthemol") || haystack.includes("reinvent") || haystack.includes("crem-pharm") || haystack.includes("aizynthfinder")) {
        return "Check the setup requirements before starting: this resource may need Python, command-line use, or a configured model/reaction set. Confirm its inputs and dependencies on a small example, then review every generated molecule or route chemically.";
    }
    if (items.includes("web")) {
        return "Open the official web interface, read its input-format example, and start with one known compound or structure. Save the raw result and record the input and date before testing a batch.";
    }
    if (items.includes("gui")) {
        return "Open the desktop interface and try one representative structure or a small file first. Check the output visually, save the project/settings, and only then process the full dataset.";
    }
    if (items.includes("other") || !items.length) {
        return "The interface is not confirmed in the catalogue. Open the official resource and verify whether it is a web service, desktop app, command-line tool, or programming library before planning your workflow around it.";
    }
    return "Open the official documentation and find its smallest example matching this task. Test one input first, save the settings and output, and scale up only after checking the result.";
}

function toolUseNote(tool, preference) {
    const items = getInterfaceItems(tool);
    if (!items.length || items.includes("other")) return "Interface unconfirmed — verify upstream documentation";
    const hasVisual = items.includes("web") || items.includes("gui");
    const hasCode = items.some(function(value) {
        return ["cli", "python", "r", "c++", "java", "api", "notebook", "mcp"].includes(value);
    });
    if (preference === "visual-first" && !hasVisual && hasCode) return "More technical option — command line or programming";
    if (items.includes("web")) return "Browser-based option";
    if (items.includes("gui")) return "Graphical interface";
    if (items.includes("cli")) return "Command-line tool";
    if (hasCode) return "Programming/API resource";
    return interfaceSummary(tool);
}

function makeToolCard(tool, selectedOS, preference, index, step) {
    const detailUrl = "tool.html?id=" + encodeURIComponent(tool.id || "");
    const official = safeHttpUrl(tool.website) || safeHttpUrl(tool.repository) || safeHttpUrl(tool.documentation);
    const typeText = titleLabel(tool.type || tool.catalogue || "resource");
    const classification = tool.interface_classification;
    const confidenceText = classification && classification.confidence && classification.confidence !== "high"
        ? "Classification: " + (classification.confidence === "low" ? "provisional" : "inferred")
        : "";
    const archivedText = String(tool.status || "").toLowerCase() === "archived" ? "Archived resource — check maintenance status" : "";
    const startLabel = index === 0 ? "SUGGESTED START" : "ALTERNATIVE";
    const quickStart = toolQuickStart(tool, step);

    return '<article class="planner-tool-rec">' +
        '<p class="planner-tool-rec-role">' + startLabel + '</p>' +
        '<h4>' + escapeWorkflowHtml(tool.name || "Unnamed tool") + '</h4>' +
        '<p>' + escapeWorkflowHtml(tool.description || "No catalogue description available.") + '</p>' +
        '<div class="planner-tool-rec-meta">' + escapeWorkflowHtml(typeText) + ' · ' +
            escapeWorkflowHtml(interfaceSummary(tool)) + '<br>' +
            escapeWorkflowHtml(toolUseNote(tool, preference)) + '<br>' +
            escapeWorkflowHtml(platformNote(tool, selectedOS)) +
            (confidenceText ? '<br>' + escapeWorkflowHtml(confidenceText) : '') +
            (archivedText ? '<br>' + escapeWorkflowHtml(archivedText) : '') +
        '</div>' +
        '<div class="planner-tool-quickstart"><strong>How to start.</strong> ' + escapeWorkflowHtml(quickStart) + '</div>' +
        '<div class="planner-tool-rec-links">' +
            '<a href="' + escapeWorkflowHtml(detailUrl) + '">ChemIsFree details ↗</a>' +
            (official ? '<a href="' + escapeWorkflowHtml(official) + '" target="_blank" rel="noopener noreferrer">Official resource ↗</a>' : '') +
        '</div>' +
    '</article>';
}


const plannerInputLabels = {
    target: "Target and organism are specified",
    structure: "A relevant experimental or selected protein structure is available",
    "prepared-protein": "A prepared receptor is available",
    "native-ligand": "A native/co-crystal ligand or independent pose reference is available",
    "binding-site": "Binding-site coordinates or pocket definition are available",
    "known-actives": "A traceable known-active set is available",
    "known-inactives": "Known inactives or experimentally tested controls are available",
    decoys: "A property-matched decoy/control set is available",
    library: "The screening library and source are defined",
    "activity-data": "A traceable activity dataset with assay metadata is available",
    "compound-set": "Compound structures/SMILES and stable IDs are available",
    "prepared-ligands": "Prepared ligands or conformers are available",
    "pocket-hypotheses": "Alternative pocket predictions are available",
    pharmacophore: "A pharmacophore hypothesis or interaction constraints are available",
    "admet-data": "Property or ADMET data are available",
    "qsar-model": "An existing QSAR/predictive model is available",
    "synthesis-constraints": "Synthesis/procurement constraints are defined",
    "validated-docking": "Docking has passed pose and enrichment controls"
};

function currentPlannerInputs() {
    const available = {};
    Object.keys(plannerInputLabels).forEach(function(key) {
        if (key === "target") return;
        const input = document.querySelector('input[name="asset"][value="' + key + '"]');
        available[key] = Boolean(input && input.checked);
    });
    const targetControl = document.getElementById("planner-target");
    const organismControl = document.getElementById("planner-organism");
    const target = targetControl ? targetControl.value.trim() : "";
    const organism = organismControl ? organismControl.value.trim() : "";
    available.target = Boolean(target && organism);
    return { available: available, target: target, organism: organism };
}

function unmetInputNames(keys, available) {
    return (keys || []).filter(function(key) { return !available[key]; }).map(function(key) {
        return plannerInputLabels[key] || titleLabel(key);
    });
}

function makeStep(step, index, selectedOS, preference, availableInputs) {
    const actions = (step.actions || []).map(function(action) {
        return "<li>" + escapeWorkflowHtml(action) + "</li>";
    }).join("");
    const recommendations = rankWorkflowTools(step, preference);
    const toolsHtml = recommendations.length
        ? '<div class="planner-tool-recommendations">' +
            recommendations.map(function(tool, toolIndex) { return makeToolCard(tool, selectedOS, preference, toolIndex, step); }).join("") +
          '</div>'
        : '<div class="planner-coverage-note"><strong>No directly matched catalogue entry yet.</strong> The method is still listed, but no catalogue tool is being claimed as a direct match. Suggest a relevant resource through the contribution page.</div>';
    const coverage = step.coverageNote
        ? '<div class="planner-coverage-note"><strong>Important limitation.</strong> ' + escapeWorkflowHtml(step.coverageNote) + '</div>'
        : "";
    const missing = unmetInputNames(step.requires, availableInputs);
    const prereqHtml = step.before || missing.length
        ? '<div class="planner-step-prerequisite"><strong>Before this step.</strong> ' +
            (step.before ? escapeWorkflowHtml(step.before) : "Confirm the prerequisites listed below.") +
            (missing.length ? '<ul>' + missing.map(function(name) { return "<li>Not yet marked available: " + escapeWorkflowHtml(name) + "</li>"; }).join("") + '</ul>' : '<span class="planner-prereq-ok">Required inputs marked available.</span>') +
          '</div>'
        : "";
    const gateHtml = step.gate
        ? '<div class="planner-step-gate"><strong>Gate — do not advance until:</strong> ' + escapeWorkflowHtml(step.gate) + '</div>'
        : "";
    const failureHtml = step.commonFailure
        ? '<div class="planner-step-failure"><strong>Common failure.</strong> ' + escapeWorkflowHtml(step.commonFailure) + '</div>'
        : "";
    const sourcesHtml = Array.isArray(step.sources) && step.sources.length
        ? '<div class="planner-step-sources"><strong>References / resources:</strong> ' +
          step.sources.map(function(source) {
              const url = safeHttpUrl(source.url);
              return url ? '<a href="' + escapeWorkflowHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeWorkflowHtml(source.title || url) + ' ↗</a>' : escapeWorkflowHtml(source.title || "");
          }).join(" · ") + '</div>'
        : "";

    const codeHtml = Array.isArray(step.codeExamples) && step.codeExamples.length
        ? '<div class="planner-code-examples"><h4>Code / command examples</h4>' +
            step.codeExamples.map(function(example) {
                const label = escapeWorkflowHtml(example.label || "Example");
                const lang = escapeWorkflowHtml(example.language || "bash");
                const code = escapeWorkflowHtml(example.code || "");
                const note = example.note ? '<p class="planner-code-note">' + escapeWorkflowHtml(example.note) + '</p>' : "";
                return '<details class="planner-code-example"><summary>' + label + '</summary>' +
                    note + '<pre><code class="language-' + lang + '">' + code + '</code></pre>' +
                    '<button type="button" class="planner-copy-code" data-copy-code="' + encodeURIComponent(example.code || "") + '">Copy example</button></details>';
            }).join("") + '</div>'
        : "";

    return '<details class="planner-workflow-step"' + (index === 0 ? ' open' : '') + '>' +
        '<summary class="planner-step-summary">' +
            '<span class="planner-step-number">' + String(index + 1).padStart(2, "0") + '</span>' +
            '<span class="planner-step-summary-main">' +
                '<span class="planner-step-kicker">' + escapeWorkflowHtml(step.kicker || "PROTOCOL STEP") + '</span>' +
                '<span class="planner-step-title">' + escapeWorkflowHtml(step.title) + '</span>' +
                '<span class="planner-step-intro">' + escapeWorkflowHtml(step.intro) + '</span>' +
            '</span>' +
            '<span class="planner-step-chevron" aria-hidden="true">+</span>' +
        '</summary>' +
        '<div class="planner-step-details"><div class="planner-step-content">' +
            '<ol class="planner-step-actions">' + actions + '</ol>' +
            codeHtml +
            '<p class="planner-deliverable"><strong>Record / deliverable.</strong> ' + escapeWorkflowHtml(step.deliverable || "Save the result, source identifiers and relevant settings.") + '</p>' +
            prereqHtml + gateHtml + failureHtml + sourcesHtml +
            toolsHtml + coverage +
        '</div></div>' +
    '</details>';
}

function selectedObjectives() {
    return Array.from(document.querySelectorAll('input[name="objective"]:checked'))
        .map(function(input) { return input.value; });
}

function objectiveDisplayName(id) {
    const input = document.querySelector('input[name="objective"][value="' + id + '"]');
    const label = input ? input.closest("label") : null;
    const title = label ? label.querySelector("strong") : null;
    return title ? title.textContent.trim() : (protocolLibrary[id] ? protocolLibrary[id].title : titleLabel(id));
}

function choosePrimaryProtocol(objectives) {
    const priority = ["structure-based","hit-identification","ligand-landscape","qsar","target-context","analogues","de-novo","interactions","admet","synthesis","curation","automation"];
    for (let i = 0; i < priority.length; i += 1) {
        if (objectives.includes(priority[i]) && protocolLibrary[priority[i]]) return priority[i];
    }
    return objectives.find(function(id) { return Boolean(protocolLibrary[id]); }) || "target-context";
}

function composeProtocolSteps(objectives, primaryId, approach) {
    const orderedObjectives = [primaryId].concat(objectives.filter(function(id) { return id !== primaryId; }));
    const seen = {};
    const steps = [];
    orderedObjectives.forEach(function(id) {
        const definition = protocolLibrary[id];
        if (!definition) return;
        definition.steps.forEach(function(step) {
            const key = String(step.id || "") + "|" + String(step.title || "");
            if (!seen[key]) {
                seen[key] = true;
                steps.push(step);
            }
        });
    });
    steps.sort(function(a, b) {
        if (approach !== "ligand-based") {
            const rankA = a.id === "target.resolve" ? 0 : (a.id === "structure.choose" ? 1 : 2);
            const rankB = b.id === "target.resolve" ? 0 : (b.id === "structure.choose" ? 1 : 2);
            if (rankA !== rankB) return rankA - rankB;
        }
        if (a.order !== b.order) return a.order - b.order;
        return String(a.title || "").localeCompare(String(b.title || ""));
    });
    return steps;
}

function getProtocolRequirements(objectives) {
    const result = [];
    const seen = {};
    objectives.forEach(function(id) {
        (protocolLibrary[id] ? protocolLibrary[id].requiredInputs || [] : []).forEach(function(key) {
            if (!seen[key]) {
                seen[key] = true;
                result.push(key);
            }
        });
    });
    return result;
}



let chemblTargetSearchTimer = null;
let chemblTargetSearchRequestId = 0;
let chemblActivityRows = [];
let chemblActivityOffset = 0;
let chemblActivityTotal = 0;
let chemblActivityBusy = false;
let selectedChemblTarget = null;

function clearChemblSelection() {
    selectedChemblTarget = null;
    chemblActivityRows = [];
    chemblActivityOffset = 0;
    chemblActivityTotal = 0;
    const id = document.getElementById("planner-chembl-target-id");
    const selected = document.getElementById("selected-target-info");
    const panel = document.getElementById("chembl-activity-panel");
    const rows = document.getElementById("chembl-activity-results");
    const status = document.getElementById("chembl-activity-status");
    const more = document.getElementById("chembl-load-more");
    const download = document.getElementById("chembl-download-all");
    if (id) id.value = "";
    if (selected) { selected.hidden = true; selected.innerHTML = ""; }
    if (panel) panel.hidden = true;
    if (rows) rows.innerHTML = "";
    if (status) status.textContent = "";
    if (more) more.hidden = true;
    if (download) download.hidden = true;
}

function initialiseProgressiveIntake() {
    const form = document.getElementById("workflow-form");
    if (!form) return;

    const targetStatusRadios = Array.from(document.querySelectorAll('input[name="target-status"]'));
    const approachRadios = Array.from(document.querySelectorAll('input[name="approach"]'));
    const guiRadios = Array.from(document.querySelectorAll('input[name="gui-only"]'));
    const targetInput = document.getElementById("planner-target");
    const organismInput = document.getElementById("planner-organism");
    const searchResults = document.getElementById("target-search-results");
    const searchStatus = document.getElementById("target-search-status");
    const endpoint = document.getElementById("planner-activity-endpoint");

    function updateVisibility() {
        const targetChoice = document.querySelector('input[name="target-status"]:checked');
        const approachChoice = document.querySelector('input[name="approach"]:checked');
        const guiChoice = document.querySelector('input[name="gui-only"]:checked');
        const targetPanel = document.getElementById("target-search-panel");
        const approachPanel = document.getElementById("question-approach");
        const guiPanel = document.getElementById("question-gui-only");
        const goalsPanel = document.getElementById("question-objectives");
        const assetsPanel = document.getElementById("question-assets");
        const actions = document.getElementById("planner-form-actions");

        if (targetPanel) targetPanel.hidden = !targetChoice || targetChoice.value !== "yes";
        if (approachPanel) approachPanel.hidden = !targetChoice;
        if (guiPanel) guiPanel.hidden = !approachChoice;
        if (goalsPanel) goalsPanel.hidden = !guiChoice;
        if (assetsPanel) assetsPanel.hidden = !guiChoice;
        if (actions) actions.hidden = !guiChoice;
    }

    targetStatusRadios.forEach(function(radio) {
        radio.addEventListener("change", function() {
            const choice = document.querySelector('input[name="target-status"]:checked');
            if (choice && choice.value !== "yes") {
                if (targetInput) targetInput.value = "";
                if (organismInput) organismInput.value = "";
                if (searchResults) searchResults.innerHTML = "";
                if (searchStatus) searchStatus.textContent = "";
                clearChemblSelection();
            }
            updateVisibility();
        });
    });
    approachRadios.forEach(function(radio) { radio.addEventListener("change", updateVisibility); });
    guiRadios.forEach(function(radio) { radio.addEventListener("change", updateVisibility); });

    if (targetInput) {
        targetInput.addEventListener("input", function() {
            const query = targetInput.value.trim();
            if (selectedChemblTarget && query !== String(selectedChemblTarget.pref_name || selectedChemblTarget.target_chembl_id)) {
                clearChemblSelection();
            }
            if (searchResults) searchResults.innerHTML = "";
            if (query.length < 2) {
                if (searchStatus) searchStatus.textContent = "Type at least two characters to search ChEMBL.";
                return;
            }
            if (searchStatus) searchStatus.textContent = "Searching ChEMBL…";
            if (chemblTargetSearchTimer) window.clearTimeout(chemblTargetSearchTimer);
            const requestId = ++chemblTargetSearchRequestId;
            chemblTargetSearchTimer = window.setTimeout(function() {
                searchChemblTargets(query, requestId);
            }, 280);
        });
        targetInput.addEventListener("keydown", function(event) {
            if (event.key === "Escape" && searchResults) searchResults.innerHTML = "";
        });
    }

    if (searchResults) {
        searchResults.addEventListener("click", function(event) {
            const button = event.target.closest("button[data-target-id]");
            if (!button) return;
            const target = {
                target_chembl_id: button.getAttribute("data-target-id"),
                pref_name: button.getAttribute("data-target-name") || "",
                organism: button.getAttribute("data-organism") || "",
                target_type: button.getAttribute("data-target-type") || "",
                target_components: []
            };
            chooseChemblTarget(target);
        });
    }
    if (endpoint) endpoint.addEventListener("change", function() {
        if (selectedChemblTarget) loadChemblActivities(true);
    });

    const more = document.getElementById("chembl-load-more");
    if (more) more.addEventListener("click", function() { loadChemblActivities(false); });
    const download = document.getElementById("chembl-download-all");
    if (download) download.addEventListener("click", downloadAllChemblActivities);

    const reset = document.getElementById("planner-reset");
    if (reset) reset.addEventListener("click", function() {
        window.setTimeout(function() {
            clearChemblSelection();
            if (searchResults) searchResults.innerHTML = "";
            if (searchStatus) searchStatus.textContent = "";
            if (targetInput) targetInput.value = "";
            if (organismInput) organismInput.value = "";
            updateVisibility();
        }, 0);
    });
    if (form) form.addEventListener("reset", function() {
        window.setTimeout(function() {
            clearChemblSelection();
            if (searchResults) searchResults.innerHTML = "";
            if (searchStatus) searchStatus.textContent = "";
            updateVisibility();
        }, 0);
    });
    updateVisibility();
}

async function searchChemblTargets(query, requestId) {
    const results = document.getElementById("target-search-results");
    const status = document.getElementById("target-search-status");
    if (!results || !status) return;
    try {
        const params = new URLSearchParams({ q: query, limit: "10" });
        const data = await fetchJsonResource("https://www.ebi.ac.uk/chembl/api/data/target/search.json?" + params.toString());
        if (requestId !== chemblTargetSearchRequestId) return;
        const rows = Array.isArray(data.targets) ? data.targets : (Array.isArray(data.target_search_results) ? data.target_search_results : []);
        if (!rows.length) {
            results.innerHTML = "";
            status.innerHTML = 'No ChEMBL target matches returned. Check the spelling or continue with the target name and organism. <a href="https://www.ebi.ac.uk/chembl/" target="_blank" rel="noopener noreferrer">Open ChEMBL ↗</a>';
            return;
        }
        status.textContent = rows.length + " possible target match" + (rows.length === 1 ? "" : "es") + ". Choose the correct target and organism.";
        results.innerHTML = rows.map(function(row) {
            const id = row.target_chembl_id || "";
            const name = row.pref_name || row.target_name || id;
            const organism = row.organism || row.organism_name || "Organism not specified";
            const type = row.target_type || "Target type unreported";
            return '<button type="button" class="planner-target-result" role="option" data-target-id="' + escapeWorkflowHtml(id) +
                '" data-target-name="' + escapeWorkflowHtml(name) + '" data-organism="' + escapeWorkflowHtml(organism === "Organism not specified" ? "" : organism) +
                '" data-target-type="' + escapeWorkflowHtml(type) + '">' +
                '<span class="planner-target-result-name">' + escapeWorkflowHtml(name) + '</span>' +
                '<span class="planner-target-result-meta">' + escapeWorkflowHtml(id) + ' · ' + escapeWorkflowHtml(organism) + ' · ' + escapeWorkflowHtml(type) + '</span></button>';
        }).join("");
    } catch (error) {
        if (requestId !== chemblTargetSearchRequestId) return;
        results.innerHTML = "";
        status.innerHTML = 'The live ChEMBL lookup could not be reached from this session. You can enter the target and organism manually, or <a href="https://www.ebi.ac.uk/chembl/" target="_blank" rel="noopener noreferrer">search ChEMBL directly ↗</a>.';
    }
}

function chooseChemblTarget(target) {
    selectedChemblTarget = target;
    const targetInput = document.getElementById("planner-target");
    const organismInput = document.getElementById("planner-organism");
    const idInput = document.getElementById("planner-chembl-target-id");
    const results = document.getElementById("target-search-results");
    const searchStatus = document.getElementById("target-search-status");
    const selected = document.getElementById("selected-target-info");
    const panel = document.getElementById("chembl-activity-panel");
    if (targetInput) targetInput.value = target.pref_name || target.target_chembl_id || "";
    if (organismInput) organismInput.value = target.organism || "";
    if (idInput) idInput.value = target.target_chembl_id || "";
    if (results) results.innerHTML = "";
    if (searchStatus) searchStatus.textContent = "Selected ChEMBL target " + (target.target_chembl_id || "") + ".";
    if (selected) {
        const components = Array.isArray(target.target_components) ? target.target_components : [];
        const accessions = components.map(function(component) { return component.accession; }).filter(Boolean);
        selected.innerHTML = '<div><strong>' + escapeWorkflowHtml(target.pref_name || target.target_chembl_id) + '</strong>' +
            '<p>' + escapeWorkflowHtml(target.target_chembl_id) + ' · ' + escapeWorkflowHtml(target.organism || "Organism not reported") +
            ' · ' + escapeWorkflowHtml(target.target_type || "Target type not reported") + '</p>' +
            (accessions.length ? '<p>Target component accession(s): ' + accessions.map(escapeWorkflowHtml).join(", ") + '</p>' : '') +
            '<a href="https://www.ebi.ac.uk/chembl/target_report_card/' + encodeURIComponent(target.target_chembl_id) + '/" target="_blank" rel="noopener noreferrer">Open ChEMBL target record ↗</a></div>';
        selected.hidden = false;
    }
    if (panel) panel.hidden = false;
    loadChemblActivities(true);
}

async function fetchChemblActivities(targetId, endpoint, offset, limit) {
    const params = new URLSearchParams({
        target_chembl_id: targetId,
        standard_type: endpoint,
        limit: String(limit),
        offset: String(offset)
    });
    return fetchJsonResource("https://www.ebi.ac.uk/chembl/api/data/activity.json?" + params.toString());
}

async function addChemblMoleculeDetails(rows) {
    const ids = [...new Set(rows.map(function(row) { return row.molecule_chembl_id; }).filter(Boolean))];
    const details = {};
    for (let start = 0; start < ids.length; start += 80) {
        const batch = ids.slice(start, start + 80);
        try {
            const params = new URLSearchParams({
                molecule_chembl_id__in: batch.join(","),
                limit: String(Math.max(100, batch.length))
            });
            const payload = await fetchJsonResource("https://www.ebi.ac.uk/chembl/api/data/molecule.json?" + params.toString());
            (payload.molecules || []).forEach(function(molecule) {
                const structures = molecule.molecule_structures || {};
                details[molecule.molecule_chembl_id] = {
                    name: molecule.pref_name || "",
                    smiles: structures.canonical_smiles || ""
                };
            });
        } catch (error) {
            // Activity records remain useful if molecule-structure enrichment is temporarily unavailable.
        }
    }
    return rows.map(function(row) {
        const detail = details[row.molecule_chembl_id] || {};
        row.compound_name = detail.name || row.molecule_pref_name || "";
        row.canonical_smiles = detail.smiles || "";
        return row;
    });
}

function activityValue(row) {
    const value = row.standard_value === null || row.standard_value === undefined || row.standard_value === ""
        ? "Not reported" : String(row.standard_value);
    const relation = row.standard_relation || "";
    const unit = row.standard_units || "";
    return (relation ? relation + " " : "") + value + (unit ? " " + unit : "");
}

function renderChemblActivityTable() {
    const container = document.getElementById("chembl-activity-results");
    if (!container) return;
    if (!chemblActivityRows.length) {
        container.innerHTML = '<p class="planner-field-help">No records have been loaded for this endpoint yet.</p>';
        return;
    }
    const countText = "Showing " + chemblActivityRows.length.toLocaleString() + " of " + chemblActivityTotal.toLocaleString() + " matching ChEMBL activity records.";
    container.innerHTML = '<details class="planner-activity-preview"><summary>' + escapeWorkflowHtml(countText) + ' <span>Expand data preview</span></summary>' +
        '<div class="planner-activity-table-wrap"><table class="planner-activity-table"><thead><tr><th>Compound</th><th>Activity</th><th>pChEMBL</th><th>Assay</th><th>SMILES available</th></tr></thead><tbody>' +
        chemblActivityRows.map(function(row) {
            const compound = row.molecule_chembl_id || "Compound ID missing";
            const name = row.compound_name ? '<small>' + escapeWorkflowHtml(row.compound_name) + '</small>' : "";
            const compoundCell = row.molecule_chembl_id
                ? '<a href="https://www.ebi.ac.uk/chembl/compound_report_card/' + encodeURIComponent(row.molecule_chembl_id) + '/" target="_blank" rel="noopener noreferrer">' + escapeWorkflowHtml(compound) + ' ↗</a>' + name
                : escapeWorkflowHtml(compound);
            const pchembl = row.pchembl_value === null || row.pchembl_value === undefined || row.pchembl_value === "" ? "—" : String(row.pchembl_value);
            const assay = row.assay_chembl_id ? '<a href="https://www.ebi.ac.uk/chembl/assay_report_card/' + encodeURIComponent(row.assay_chembl_id) + '/" target="_blank" rel="noopener noreferrer">' + escapeWorkflowHtml(row.assay_chembl_id) + ' ↗</a>' : "—";
            return '<tr><td>' + compoundCell + '</td><td>' + escapeWorkflowHtml(activityValue(row)) + '</td><td>' + escapeWorkflowHtml(pchembl) + '</td><td>' + assay + '</td><td>' + (row.canonical_smiles ? "Yes" : "Not returned") + '</td></tr>';
        }).join("") + '</tbody></table></div></details>';
}

async function loadChemblActivities(reset) {
    if (!selectedChemblTarget || chemblActivityBusy) return;
    const status = document.getElementById("chembl-activity-status");
    const more = document.getElementById("chembl-load-more");
    const download = document.getElementById("chembl-download-all");
    const endpointControl = document.getElementById("planner-activity-endpoint");
    const endpoint = endpointControl ? endpointControl.value : "IC50";
    if (reset) {
        chemblActivityRows = [];
        chemblActivityOffset = 0;
        chemblActivityTotal = 0;
        const results = document.getElementById("chembl-activity-results");
        if (results) results.innerHTML = "";
    }
    chemblActivityBusy = true;
    if (status) status.textContent = "Loading " + endpoint + " records from ChEMBL…";
    if (more) more.disabled = true;
    if (download) download.disabled = true;
    try {
        const payload = await fetchChemblActivities(selectedChemblTarget.target_chembl_id, endpoint, chemblActivityOffset, 20);
        const incoming = Array.isArray(payload.activities) ? payload.activities : [];
        const enriched = await addChemblMoleculeDetails(incoming);
        chemblActivityRows = chemblActivityRows.concat(enriched);
        chemblActivityOffset += incoming.length;
        chemblActivityTotal = Number(payload.page_meta && payload.page_meta.total_count !== undefined ? payload.page_meta.total_count : chemblActivityRows.length);
        renderChemblActivityTable();
        if (status) status.textContent = incoming.length
            ? "Loaded " + chemblActivityRows.length.toLocaleString() + " of " + chemblActivityTotal.toLocaleString() + " " + endpoint + " records. Check assay details and units before combining measurements."
            : "No " + endpoint + " records were returned for this ChEMBL target.";
        if (more) {
            more.hidden = chemblActivityOffset >= chemblActivityTotal || incoming.length === 0;
            more.disabled = false;
        }
        if (download) {
            download.hidden = chemblActivityTotal === 0;
            download.disabled = false;
        }
    } catch (error) {
        if (status) status.textContent = "Could not retrieve activity data from ChEMBL. Check the endpoint and try again or use the target's ChEMBL record.";
        if (more) more.disabled = false;
        if (download) download.disabled = false;
    } finally {
        chemblActivityBusy = false;
    }
}

function csvEscape(value) {
    const text = String(value === undefined || value === null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
}

function saveCsv(filename, headers, rows) {
    const csv = [headers].concat(rows.map(function(row) { return headers.map(function(key) { return row[key]; }); }))
        .map(function(row) { return row.map(csvEscape).join(","); }).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

async function downloadAllChemblActivities() {
    if (!selectedChemblTarget || chemblActivityBusy) return;
    const status = document.getElementById("chembl-activity-status");
    const download = document.getElementById("chembl-download-all");
    const endpointControl = document.getElementById("planner-activity-endpoint");
    const endpoint = endpointControl ? endpointControl.value : "IC50";
    const target = selectedChemblTarget;
    chemblActivityBusy = true;
    if (download) download.disabled = true;
    const allRows = [];
    let offset = 0;
    let total = chemblActivityTotal;
    const hardLimit = 100000;
    try {
        while (offset < Math.min(total || hardLimit, hardLimit)) {
            if (status) status.textContent = "Preparing CSV export: retrieved " + offset.toLocaleString() + " activity records…";
            const payload = await fetchChemblActivities(target.target_chembl_id, endpoint, offset, 1000);
            const incoming = Array.isArray(payload.activities) ? payload.activities : [];
            if (!incoming.length) break;
            allRows.push.apply(allRows, incoming);
            offset += incoming.length;
            total = Number(payload.page_meta && payload.page_meta.total_count !== undefined ? payload.page_meta.total_count : (total || offset));
        }
        const enriched = await addChemblMoleculeDetails(allRows);
        const headers = ["molecule_chembl_id","compound_name","canonical_smiles","target_chembl_id","target_pref_name","target_organism","standard_type","standard_relation","standard_value","standard_units","pchembl_value","assay_chembl_id","assay_type","assay_description","bao_label","document_chembl_id","activity_id"];
        saveCsv("chembl_" + target.target_chembl_id + "_" + endpoint.toLowerCase() + "_activities.csv", headers, enriched);
        if (status) status.textContent = "CSV downloaded with " + enriched.length.toLocaleString() + " records." + (total > hardLimit ? " The API record count exceeds the browser safety limit; the export includes the first 100,000 matching records." : "");
    } catch (error) {
        if (status) status.textContent = "The full export failed before completion. The preview remains available; try a smaller target or export from the ChEMBL record.";
    } finally {
        chemblActivityBusy = false;
        if (download) download.disabled = false;
    }
}


let liveEvidenceRequestId = 0;

function escapeSearchQuery(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

async function fetchJsonResource(url, options) {
    const response = await fetch(url, options || {});
    if (!response.ok) throw new Error("Request failed (" + response.status + ")");
    return response.json();
}

async function lookupUniProtTarget(target, organism) {
    const targetTerm = escapeSearchQuery(target);
    const organismTerm = escapeSearchQuery(organism);
    const isSymbol = /^[A-Za-z0-9_.-]+$/.test(targetTerm);
    const queries = [];
    if (isSymbol) queries.push('gene_exact:' + targetTerm + ' AND organism_name:"' + organismTerm + '"');
    queries.push('gene:' + targetTerm + ' AND organism_name:"' + organismTerm + '"');
    queries.push('protein_name:"' + targetTerm + '" AND organism_name:"' + organismTerm + '"');
    queries.push('(' + targetTerm + ') AND organism_name:"' + organismTerm + '"');

    let lastError = null;
    for (const query of queries) {
        try {
            const params = new URLSearchParams({
                query: query,
                fields: "accession,id,protein_name,gene_names,organism_name,length,xref_pdb",
                format: "json",
                size: "5"
            });
            const data = await fetchJsonResource("https://rest.uniprot.org/uniprotkb/search?" + params.toString());
            if (Array.isArray(data.results) && data.results.length) return data.results;
        } catch (error) {
            lastError = error;
        }
    }
    if (lastError) throw lastError;
    return [];
}

function extractUniProtMatch(entry) {
    const gene = Array.isArray(entry.genes) && entry.genes[0] && entry.genes[0].geneName
        ? entry.genes[0].geneName.value
        : "";
    const name = entry.proteinDescription && entry.proteinDescription.recommendedName && entry.proteinDescription.recommendedName.fullName
        ? entry.proteinDescription.recommendedName.fullName.value
        : (entry.proteinDescription && entry.proteinDescription.submissionNames && entry.proteinDescription.submissionNames[0]
            ? entry.proteinDescription.submissionNames[0].fullName.value
            : "Protein name unavailable");
    return {
        accession: entry.primaryAccession || "",
        entryName: entry.uniProtkbId || "",
        name: name,
        gene: gene,
        organism: entry.organism && entry.organism.scientificName ? entry.organism.scientificName : "",
        length: entry.sequence && entry.sequence.length ? entry.sequence.length : "",
        reviewed: String(entry.entryType || "").toLowerCase().includes("reviewed"),
        pdbRefs: Array.isArray(entry.uniProtKBCrossReferences)
            ? entry.uniProtKBCrossReferences.filter(function(ref) { return ref.database === "PDB"; }).map(function(ref) { return ref.id; })
            : []
    };
}

async function searchRcsbEntries(uniprotAccession, target, organism) {
    const rows = 12;
    const accessionQuery = {
        query: {
            type: "terminal",
            service: "text",
            parameters: {
                attribute: "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession",
                operator: "exact_match",
                negation: false,
                value: uniprotAccession
            }
        },
        return_type: "entry",
        request_options: {
            paginate: { start: 0, rows: rows },
            results_content_type: ["experimental"],
            sort: [{ sort_by: "score", direction: "desc" }],
            scoring_strategy: "combined"
        }
    };

    let response = null;
    let accessionSearchError = null;
    try {
        response = await fetchJsonResource("https://search.rcsb.org/rcsbsearch/v2/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(accessionQuery)
        });
    } catch (error) {
        accessionSearchError = error;
    }
    let results = response && Array.isArray(response.result_set) ? response.result_set : [];
    if (results.length) return { results: results, total: response.total_count || results.length, exactAccession: true };

    // Fallback search is deliberately labelled weaker because text matches are less specific than UniProt cross-references.
    // It also gives the user a chance to recover when the accession query is unsupported by the live service.
    const generalQuery = {
        query: {
            type: "group",
            logical_operator: "and",
            nodes: [
                { type: "terminal", service: "text", parameters: { value: target } },
                { type: "terminal", service: "text", parameters: {
                    attribute: "rcsb_entity_source_organism.ncbi_scientific_name",
                    operator: "contains_phrase",
                    negation: false,
                    value: organism
                } }
            ]
        },
        return_type: "entry",
        request_options: {
            paginate: { start: 0, rows: rows },
            results_content_type: ["experimental"],
            sort: [{ sort_by: "score", direction: "desc" }],
            scoring_strategy: "combined"
        }
    };
    response = await fetchJsonResource("https://search.rcsb.org/rcsbsearch/v2/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generalQuery)
    });
    results = Array.isArray(response.result_set) ? response.result_set : [];
    return {
        results: results,
        total: response.total_count || results.length,
        exactAccession: false,
        accessionSearchError: accessionSearchError ? String(accessionSearchError.message || accessionSearchError) : ""
    };
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function scoreStructureRecord(record) {
    let score = 0;
    const resolution = record.resolution;
    const rfree = record.rfree;
    if (resolution !== null) {
        if (resolution <= 1.5) score += 4;
        else if (resolution <= 2.0) score += 3.5;
        else if (resolution <= 2.5) score += 3;
        else if (resolution <= 3.0) score += 2;
        else if (resolution <= 3.5) score += 1.5;
        else score += 0.5;
    }
    if (rfree !== null) {
        if (rfree <= 0.20) score += 3;
        else if (rfree <= 0.25) score += 2.5;
        else if (rfree <= 0.30) score += 1.5;
        else score += 0.5;
    }
    if (record.nonpolymerIds.length) score += 2;
    if (String(record.method).toUpperCase().includes("X-RAY")) score += 1;
    return Math.min(10, score);
}

async function loadRcsbStructureRecord(pdbId) {
    const encodedId = encodeURIComponent(String(pdbId || "").toUpperCase());
    const entry = await fetchJsonResource("https://data.rcsb.org/rest/v1/core/entry/" + encodedId);
    const info = entry.rcsb_entry_info || {};
    const resolutions = Array.isArray(info.resolution_combined) ? info.resolution_combined : [];
    const resolution = resolutions.map(numberOrNull).filter(function(value) { return value !== null; })[0] ?? numberOrNull(info.diffrn_resolution_high);
    const refine = Array.isArray(entry.refine) ? entry.refine : [];
    let rfree = null;
    for (let i = 0; i < refine.length; i += 1) {
        const candidate = numberOrNull(refine[i].ls_R_factor_R_free);
        if (candidate !== null) { rfree = candidate; break; }
    }
    const containers = entry.rcsb_entry_container_identifiers || {};
    const nonpolymerIds = Array.isArray(containers.non_polymer_entity_ids)
        ? containers.non_polymer_entity_ids
        : [];
    const methods = Array.isArray(entry.exptl) ? entry.exptl.map(function(item) { return item.method || ""; }).filter(Boolean) : [];
    return {
        id: String(pdbId).toUpperCase(),
        title: entry.struct && entry.struct.title ? entry.struct.title : "",
        resolution: resolution,
        rfree: rfree,
        method: methods.join(", ") || "Method not reported",
        nonpolymerIds: nonpolymerIds,
        score: 0
    };
}


async function loadRcsbComponent(pdbId, entityId) {
    const url = "https://data.rcsb.org/rest/v1/core/nonpolymer_entity/" +
        encodeURIComponent(String(pdbId || "").toUpperCase()) + "/" +
        encodeURIComponent(String(entityId || ""));
    try {
        const entity = await fetchJsonResource(url);
        const containers = entity.rcsb_nonpolymer_entity_container_identifiers || {};
        const chemComp = entity.chem_comp || {};
        const legacy = entity.pdbx_entity_nonpoly || {};
        const annotation = entity.rcsb_nonpolymer_entity || {};
        const componentId = containers.non_polymer_comp_id || legacy.comp_id || chemComp.id || String(entityId);
        const description = legacy.name || legacy.pdbx_description || annotation.pdbx_description || chemComp.name || "";
        const molecularWeight = numberOrNull(annotation.formula_weight || chemComp.formula_weight || legacy.formula_weight);
        return {
            id: String(componentId),
            description: String(description || ""),
            molecularWeight: molecularWeight
        };
    } catch (error) {
        return { id: String(entityId), description: "", molecularWeight: null };
    }
}

async function enrichStructureComponents(records) {
    return Promise.all(records.map(async function(record) {
        const entityIds = record.nonpolymerIds.slice(0, 3);
        const loaded = await Promise.all(entityIds.map(function(entityId) {
            return loadRcsbComponent(record.id, entityId);
        }));
        record.components = loaded;
        return record;
    }));
}

function targetEvidenceHtml(evidence) {
    const uniprotRows = evidence.matches.map(function(match) {
        const accessionUrl = match.accession ? "https://www.uniprot.org/uniprotkb/" + encodeURIComponent(match.accession) : "https://www.uniprot.org/";
        return '<tr><td><a href="' + escapeWorkflowHtml(accessionUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeWorkflowHtml(match.accession || "—") + ' ↗</a></td>' +
            '<td>' + escapeWorkflowHtml(match.name) + (match.gene ? '<small>' + escapeWorkflowHtml(match.gene) + '</small>' : '') + '</td>' +
            '<td>' + escapeWorkflowHtml(match.organism) + '</td>' +
            '<td>' + escapeWorkflowHtml(match.length || "—") + '</td>' +
            '<td>' + (match.reviewed ? "Reviewed" : "Unreviewed / other") + '</td></tr>';
    }).join("");

    let structures = "";
    if (evidence.structures && evidence.structures.length) {
        structures = '<h4>Experimental structure shortlist</h4>' +
            '<p class="live-evidence-note">Sorted by a transparent triage heuristic, not by docking or ligand potency. Inspect the full record before selecting a receptor.</p>' +
            '<div class="live-evidence-table-wrap"><table class="live-evidence-table"><thead><tr><th>PDB</th><th>Resolution (Å)</th><th>R-free</th><th>Method</th><th>Bound non-polymer components</th><th>Triage / 10</th></tr></thead><tbody>' +
            evidence.structures.map(function(record) {
                const pdbUrl = "https://www.rcsb.org/structure/" + encodeURIComponent(record.id);
                return '<tr><td><a href="' + escapeWorkflowHtml(pdbUrl) + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeWorkflowHtml(record.id) + '</strong> ↗</a></td>' +
                    '<td>' + (record.resolution === null ? "n/a" : record.resolution.toFixed(2)) + '</td>' +
                    '<td>' + (record.rfree === null ? "n/a" : record.rfree.toFixed(3)) + '</td>' +
                    '<td>' + escapeWorkflowHtml(record.method) + '</td>' +
                    '<td>' + escapeWorkflowHtml(record.components && record.components.length
                        ? record.components.map(function(component) {
                            const detail = component.description ? component.id + " — " + component.description : component.id;
                            return component.molecularWeight !== null ? detail + " (" + component.molecularWeight.toFixed(1) + " Da)" : detail;
                          }).join("; ")
                        : (record.nonpolymerIds.length ? record.nonpolymerIds.join(", ") : "None listed")) + '</td>' +
                    '<td>' + record.score.toFixed(1) + '</td></tr>';
            }).join("") +
            '</tbody></table></div>' +
            '<p class="live-evidence-note">Triage score components: resolution (0–4), R-free (0–3 when reported), non-polymer component presence (+2), and X-ray diffraction (+1). This simple heuristic may favour well-refined X-ray structures over cryo-EM structures and does not score site completeness, ligand medicinal relevance, mutation state, clashes or binding-mode suitability. Non-polymer IDs can include cofactors/ions, so they do not prove that a drug-like ligand is bound.</p>';
    } else {
        structures = '<div class="live-evidence-empty"><strong>No experimental structures were returned by the accession-specific query.</strong> The target may lack a matching structure, the cross-reference may be missing, or the API query may be incomplete. Check the manual RCSB search before concluding there are no structures.</div>';
    }

    const targetMatchesNote = evidence.matches.length > 1
        ? '<p class="live-evidence-note"><strong>Target match needs human review.</strong> UniProt returned several records. The structure search uses the first result above; confirm the intended accession before using any structure.</p>'
        : "";
    const searchMode = evidence.exactAccession
        ? "Structures matched through the selected UniProt accession."
        : "Fallback text search used because the accession-specific search returned no entries or could not be completed; inspect target/organism mapping carefully.";
    return '<section class="live-target-evidence" id="live-target-evidence">' +
        '<div class="live-evidence-heading"><p class="eyebrow">LIVE DATABASE LOOKUP</p><h3>Target and structure evidence</h3><p>Retrieved from UniProt and RCSB PDB in the browser. This is discovery metadata, not a structural validation.</p></div>' +
        '<h4>UniProt target matches</h4>' +
        '<div class="live-evidence-table-wrap"><table class="live-evidence-table"><thead><tr><th>Accession</th><th>Protein / gene</th><th>Organism</th><th>Length (aa)</th><th>Record type</th></tr></thead><tbody>' + uniprotRows + '</tbody></table></div>' +
        targetMatchesNote +
        '<p class="live-evidence-note">' + escapeWorkflowHtml(searchMode) + ' Total reported RCSB results: ' + String(evidence.structureTotal) + '.</p>' +
        structures +
        '<p class="live-evidence-note"><a href="https://www.uniprot.org/" target="_blank" rel="noopener noreferrer">Open UniProt ↗</a> · <a href="https://www.rcsb.org/" target="_blank" rel="noopener noreferrer">Open RCSB PDB ↗</a></p>' +
    '</section>';
}

async function retrieveLiveTargetEvidence(target, organism) {
    const rawMatches = await lookupUniProtTarget(target, organism);
    const matches = rawMatches.map(extractUniProtMatch);
    if (!matches.length || !matches[0].accession) {
        throw new Error("No UniProt match was returned for this target and organism.");
    }
    const selected = matches[0];
    const structureSearch = await searchRcsbEntries(selected.accession, target, organism);
    const ids = structureSearch.results.map(function(item) { return item.identifier; }).filter(Boolean);
    const metadataResults = await Promise.allSettled(ids.slice(0, 12).map(loadRcsbStructureRecord));
    const sortedStructures = metadataResults.filter(function(item) { return item.status === "fulfilled"; }).map(function(item) {
        const record = item.value;
        record.score = scoreStructureRecord(record);
        return record;
    }).sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        if (a.resolution !== null && b.resolution !== null && a.resolution !== b.resolution) return a.resolution - b.resolution;
        return a.id.localeCompare(b.id);
    });
    const structures = await enrichStructureComponents(sortedStructures.slice(0, 8));
    return {
        matches: matches,
        structures: structures,
        structureTotal: structureSearch.total,
        exactAccession: structureSearch.exactAccession,
        accessionSearchError: structureSearch.accessionSearchError || ""
    };
}

function renderLiveEvidenceUnavailable(target, organism, message) {
    const safeTarget = escapeWorkflowHtml(target);
    const safeOrganism = escapeWorkflowHtml(organism);
    return '<section class="live-target-evidence" id="live-target-evidence">' +
        '<div class="live-evidence-heading"><p class="eyebrow">LIVE DATABASE LOOKUP</p><h3>Target and structure evidence</h3></div>' +
        '<div class="live-evidence-empty"><strong>Live evidence lookup did not complete.</strong> ' + escapeWorkflowHtml(message || "The remote database could not be queried from this browser session.") +
        '<p>No accession or PDB ranking has been invented. Check the target name (“' + safeTarget + '”), organism (“' + safeOrganism + '”) and try the official databases directly.</p>' +
        '<p><a href="https://www.uniprot.org/" target="_blank" rel="noopener noreferrer">Search UniProt ↗</a> · <a href="https://www.rcsb.org/" target="_blank" rel="noopener noreferrer">Search RCSB PDB ↗</a></p></div></section>';
}

function renderWorkflow(event) {
    if (event) event.preventDefault();
    const results = document.getElementById("workflow-results");
    if (!results) return;

    const objectives = selectedObjectives().filter(function(id) { return Boolean(protocolLibrary[id]); });
    const stageInput = document.querySelector('input[name="stage"]:checked');
    const stageKey = stageInput ? stageInput.value : "new-project";
    const stage = stageGuides[stageKey] || stageGuides["new-project"];
    const osControl = document.getElementById("planner-os");
    const selectedOS = osControl ? osControl.value : "any";
    const experienceControl = document.getElementById("planner-experience");
    const experience = experienceControl ? experienceControl.value : "new";
    const preferenceControl = document.getElementById("planner-tool-style");
    const guiOnlyControl = document.querySelector('input[name="gui-only"]:checked');
    const preference = guiOnlyControl && guiOnlyControl.value === "yes"
        ? "visual-first"
        : (preferenceControl ? preferenceControl.value : "mixed");
    const approachControl = document.querySelector('input[name="approach"]:checked');
    const approach = approachControl ? approachControl.value : "mixed";
    const focusControl = document.getElementById("planner-project-focus");
    const focus = focusControl ? focusControl.value.trim() : "";
    const inputState = currentPlannerInputs();

    if (!objectives.length) {
        results.innerHTML = '<div class="planner-empty-message"><strong>Select at least one objective.</strong> The protocol engine will create an ordered plan from the selected research decision.</div>';
        results.focus();
        return;
    }

    const primaryId = choosePrimaryProtocol(objectives);
    const primary = protocolLibrary[primaryId];
    const steps = composeProtocolSteps(objectives, primaryId, approach);
    const requirementKeys = getProtocolRequirements(objectives);
    const missingRequirements = unmetInputNames(requirementKeys, inputState.available);
    const question = focus || primary.question.replace("the specified target", inputState.target || "the target of interest").replace("the stated organism", inputState.organism || "the relevant organism");
    const targetLine = inputState.target && inputState.organism
        ? escapeWorkflowHtml(inputState.target) + " · " + escapeWorkflowHtml(inputState.organism)
        : (inputState.target ? escapeWorkflowHtml(inputState.target) + " · organism not specified" : "Not specified yet");
    const goalNames = objectives.map(objectiveDisplayName);
    const experienceSummary = experience === "new"
        ? "Beginner explanation"
        : experience === "some"
            ? "Some computational experience"
            : "Command line / coding comfortable";
    const styleSummary = preference === "visual-first"
        ? "Browser / desktop first"
        : preference === "mixed"
            ? "Visual and technical tools"
            : "Programming / command line acceptable";
    const assetsSummary = missingRequirements.length
        ? "Provisional plan · " + missingRequirements.length + " required input(s) not yet marked available"
        : "Inputs declared · scientific validation gates still apply";
    const stopStatements = [];
    objectives.forEach(function(id) {
        const statement = protocolLibrary[id] && protocolLibrary[id].stopIf;
        if (statement && !stopStatements.includes(statement)) stopStatements.push(statement);
    });
    const stopHtml = stopStatements.slice(0, 3).map(function(statement) { return "<li>" + escapeWorkflowHtml(statement) + "</li>"; }).join("");
    const missingHtml = missingRequirements.length
        ? '<div class="planner-gaps"><h3>Resolve these input gaps</h3><p>This protocol is useful for planning, but it is not ready to execute end-to-end. The step-level prerequisites below show where missing inputs block downstream work.</p><ul>' +
            missingRequirements.map(function(name) { return "<li>" + escapeWorkflowHtml(name) + "</li>"; }).join("") +
          '</ul></div>'
        : '<div class="planner-gaps planner-gaps-ok"><h3>Inputs declared</h3><p>The selected prerequisites are marked available. This does not mean the methods are validated: follow each step-level gate and stop when a control fails.</p></div>';
    const additionalGoals = goalNames.length > 1
        ? '<p><strong>Combined objectives:</strong> ' + escapeWorkflowHtml(goalNames.join(" · ")) + '</p>'
        : "";
    const longWorkflowNote = steps.length > 12
        ? '<p class="planner-length-note"><strong>Combined protocol.</strong> This plan is broad because several objectives were selected. Run it phase by phase; do not skip a gate simply to shorten the workflow.</p>'
        : "";
    const guidance = experience === "new" && preference === "visual-first"
        ? "Start with browser or graphical tools where the catalogue offers a direct match. Some preparation, docking, QSAR and simulation steps still require command-line use or a configured environment; a web interface does not remove the need for method validation."
        : "Record inputs, versions, settings, control results and failures. A tool suggestion is not evidence that the method is valid for your target or chemotype.";
    const selectedOSLabel = selectedOS === "any" ? "No preference" : titleLabel(selectedOS);
    const approachLabel = approach === "structure-based" ? "Structure-based" : (approach === "ligand-based" ? "Ligand-based" : "Mixed");
    const approachConflict = approach === "ligand-based" && objectives.includes("structure-based")
        ? '<p class="planner-approach-warning"><strong>Note:</strong> Docking/pose evaluation is still selected below, so this is a hybrid plan despite the ligand-based preference. Uncheck that goal for a ligand-only workflow.</p>'
        : "";

    results.innerHTML =
        '<div class="protocol-results-header">' +
            '<div class="protocol-kicker">02 / GENERATED SCIENTIFIC PROTOCOL</div>' +
            '<div class="protocol-state ' + (missingRequirements.length ? "is-provisional" : "is-input-complete") + '">' + escapeWorkflowHtml(assetsSummary) + '</div>' +
            '<h2>' + escapeWorkflowHtml(primary.title) + '</h2>' +
            '<p class="protocol-summary">' + escapeWorkflowHtml(primary.question.replace("the specified target", inputState.target || "the target of interest").replace("the stated organism", inputState.organism || "the relevant organism")) + '</p>' +
            '<div class="protocol-decision-grid">' +
                '<div><span>QUESTION</span><p>' + escapeWorkflowHtml(question) + '</p></div>' +
                '<div><span>TARGET / ORGANISM</span><p>' + targetLine + '</p></div>' +
                '<div><span>THIS DECIDES</span><p>' + escapeWorkflowHtml(primary.decision) + '</p></div>' +
            '</div>' +
            (inputState.target && inputState.organism
                ? '<section class="live-target-evidence" id="live-target-evidence"><div class="live-evidence-heading"><p class="eyebrow">LIVE DATABASE LOOKUP</p><h3>Target and structure evidence</h3><p>Retrieving UniProt and RCSB records…</p></div></section>'
                : '<section class="live-target-evidence" id="live-target-evidence"><div class="live-evidence-heading"><p class="eyebrow">TARGET EVIDENCE</p><h3>Target and structure evidence</h3><p>Enter both a target and organism above to retrieve UniProt matches and an experimental PDB shortlist when the public APIs are reachable.</p></div></section>') +
            '<div class="planner-approach-summary"><strong>Preferred approach:</strong> ' + escapeWorkflowHtml(approachLabel) + (guiOnlyControl && guiOnlyControl.value === "yes" ? ' · <strong>Interface:</strong> GUI / browser only' : ' · <strong>Interface:</strong> coding / command line allowed') + '</div>' + approachConflict +
            additionalGoals + missingHtml +
            '<div class="protocol-stop"><strong>Stop condition</strong><ul>' + stopHtml + '</ul></div>' +
            '<div class="planner-beginner-note"><strong>Execution note.</strong> ' + escapeWorkflowHtml(guidance) +
                '<br><strong>Experience:</strong> ' + escapeWorkflowHtml(experienceSummary) +
                ' · <strong>Tool route:</strong> ' + escapeWorkflowHtml(styleSummary) +
                ' · <strong>Operating system:</strong> ' + escapeWorkflowHtml(selectedOSLabel) +
                '<br><strong>Starting point:</strong> ' + escapeWorkflowHtml(stage.title) +
            '</div>' + longWorkflowNote +
            '<div class="protocol-actions"><button type="button" class="button button-secondary" id="print-workflow">Print / save protocol as PDF</button><button type="button" class="button button-secondary" id="edit-inputs">Edit inputs</button></div>' +
            '<div class="planner-results-list">' +
                steps.map(function(step, index) { return makeStep(step, index, selectedOS, preference, inputState.available); }).join("") +
            '</div>' +
            '<p class="planner-method-note">Catalogue matches are ranked from ChemIsFree records using task tags and interface preference. Interface classifications may be provisional or unconfirmed. External references are starting points, not endorsements. Thresholds labelled as working defaults are project heuristics rather than universal rules. Predicted poses, activity scores and ADMET outputs are not experimental confirmation.</p>';

    const thisEvidenceRequest = ++liveEvidenceRequestId;
    const evidencePanel = document.getElementById("live-target-evidence");
    const needsTargetEvidence = ["target-context","ligand-landscape","hit-identification","structure-based","interactions","qsar","analogues","de-novo"].some(function(id) { return objectives.includes(id); });
    if (needsTargetEvidence && inputState.target && inputState.organism && evidencePanel) {
        retrieveLiveTargetEvidence(inputState.target, inputState.organism).then(function(evidence) {
            if (thisEvidenceRequest !== liveEvidenceRequestId) return;
            const panel = document.getElementById("live-target-evidence");
            if (panel) panel.outerHTML = targetEvidenceHtml(evidence);
        }).catch(function(error) {
            if (thisEvidenceRequest !== liveEvidenceRequestId) return;
            const panel = document.getElementById("live-target-evidence");
            if (panel) panel.outerHTML = renderLiveEvidenceUnavailable(inputState.target, inputState.organism, error && error.message ? error.message : "");
        });
    }
    const printButton = document.getElementById("print-workflow");
    if (printButton) printButton.addEventListener("click", function() { window.print(); });
    const editButton = document.getElementById("edit-inputs");
    if (editButton) editButton.addEventListener("click", function() {
        const form = document.getElementById("workflow-form");
        if (form) form.scrollIntoView({behavior:"smooth", block:"start"});
    });
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
    initialiseProgressiveIntake();
    if (form) form.addEventListener("submit", renderWorkflow);
    if (form) form.addEventListener("reset", function() { window.setTimeout(resetWorkflow, 0); });
});
