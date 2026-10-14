(function () {
    "use strict";

    const CATEGORY_ORDER = [
        { id: "target-identification", label: "Target Identification" },
        { id: "protein-structures", label: "Protein Structures" },
        { id: "visualization", label: "Visualization" },
        { id: "binding-pockets", label: "Binding Pockets" },
        { id: "structure-based", label: "Structure-Based" },
        { id: "molecular-dynamics", label: "Molecular Dynamics" },
        { id: "cheminformatics", label: "Cheminformatics" },
        { id: "de-novo-design", label: "De Novo Design" },
        { id: "ligand-based-qsar", label: "Ligand-Based and QSAR" },
        { id: "admet-prediction", label: "ADMET Prediction" },
        { id: "retrosynthesis", label: "Retrosynthesis" },
        { id: "nomenclature-format-conversion", label: "Nomenclature and Format Conversion" },
        { id: "libraries-datasets", label: "Libraries and Datasets" },
        { id: "organization", label: "Organization" }
    ];
    const CATEGORY_IDS = CATEGORY_ORDER.map(item => item.id);
    const CATEGORY_BY_ID = new Map(CATEGORY_ORDER.map(item => [item.id, item]));
    const state = { domain: "", access: "", search: "", task: "" };
    let allTools = [];

    const LEGACY_DOMAIN_MAP = {
        "chemical-structures": ["cheminformatics"],
        "ligand-based-discovery": ["ligand-based-qsar", "de-novo-design"],
        "structure-based-discovery": ["structure-based", "protein-structures", "binding-pockets", "molecular-dynamics"],
        "molecular-properties-admet": ["admet-prediction"],
        "synthesis-reaction-design": ["retrosynthesis"],
        "data-analysis": ["target-identification", "ligand-based-qsar", "libraries-datasets"],
        "visualization-and-interpretation": ["visualization"],
        "visualization": ["visualization"],
        "laboratory-workflows": ["organization"]
    };

    const TASK_CATEGORY_MAP = {
        "target-assessment": ["target-identification"],
        "clinical-evidence": ["target-identification"],
        "bioactivity-analysis": ["target-identification", "ligand-based-qsar"],
        "protein-structure-prediction": ["protein-structures"],
        "protein-preparation": ["protein-structures", "structure-based"],
        "protein-peptide-design": ["de-novo-design", "protein-structures"],
        "molecular-visualization": ["visualization"],
        "three-dimensional-analysis": ["visualization"],
        "trajectory-analysis": ["molecular-dynamics", "visualization"],
        "scientific-visualization": ["visualization"],
        "interaction-analysis": ["structure-based", "visualization"],
        "binding-site-analysis": ["binding-pockets"],
        "ligand-preparation": ["structure-based"],
        "molecular-docking": ["structure-based"],
        "structure-based-screening": ["structure-based"],
        "molecular-dynamics": ["molecular-dynamics"],
        "free-energy": ["molecular-dynamics"],
        "structure-drawing": ["cheminformatics"],
        "structure-elucidation": ["cheminformatics"],
        "molecular-descriptors-properties": ["cheminformatics", "admet-prediction"],
        "structure-search": ["cheminformatics"],
        "chemical-space": ["cheminformatics"],
        "data-curation": ["cheminformatics", "organization"],
        "chemical-data-analysis": ["cheminformatics"],
        "quantum-chemistry": ["cheminformatics"],
        "generative-chemistry": ["de-novo-design"],
        "scaffold-analysis": ["de-novo-design", "ligand-based-qsar"],
        "pharmacophore-modelling": ["ligand-based-qsar"],
        "qsar": ["ligand-based-qsar"],
        "ligand-based-screening": ["ligand-based-qsar"],
        "compound-library-search": ["ligand-based-qsar", "libraries-datasets"],
        "machine-learning": ["ligand-based-qsar"],
        "physicochemical-properties": ["admet-prediction"],
        "adme": ["admet-prediction"],
        "toxicity": ["admet-prediction"],
        "drug-likeness": ["admet-prediction"],
        "retrosynthesis": ["retrosynthesis"],
        "reaction-prediction": ["retrosynthesis"],
        "route-planning": ["retrosynthesis"],
        "reaction-analysis": ["retrosynthesis"],
        "benchmarks-datasets": ["libraries-datasets"],
        "inventory-management": ["organization"],
        "chemical-inventory": ["organization"],
        "laboratory-automation": ["organization"],
        "research-infrastructure": ["organization"],
        "workflow-construction": ["organization"],
        "pipeline-execution": ["organization"],
        "structure-conversion": ["nomenclature-format-conversion"]
    };

    const CATEGORY_ALIASES = {
        "target-identification": "target-identification",
        "target-validation": "target-identification",
        "protein-structures": "protein-structures",
        "protein-structure": "protein-structures",
        "visualisation": "visualization",
        "visualization-interpretation": "visualization",
        "binding-pocket": "binding-pockets",
        "binding-site": "binding-pockets",
        "structure-based-discovery": "structure-based",
        "chemical-structures": "cheminformatics",
        "cheminformatics": "cheminformatics",
        "de-novo": "de-novo-design",
        "generative-design": "de-novo-design",
        "ligand-based-and-qsar": "ligand-based-qsar",
        "ligand-based-discovery": "ligand-based-qsar",
        "molecular-properties-admet": "admet-prediction",
        "synthesis-reaction-design": "retrosynthesis",
        "nomenclature-and-format-conversion": "nomenclature-format-conversion",
        "format-conversion": "nomenclature-format-conversion",
        "libraries-and-datasets": "libraries-datasets",
        "data-and-datasets": "libraries-datasets",
        "data-analysis": "target-identification",
        "laboratory-workflows": "organization"
    };

    const CATEGORY_PATTERNS = [
        ["target-identification", /target (identification|assessment|prioriti[sz]ation|validation|discovery|prediction)|target.?druggability|target ranking|target selection|target biology|open targets|gene.?disease association/i],
        ["protein-structures", /protein structure|structure prediction|protein folding|protein model|homology model|alphafold|colabfold|esmfold|protein structure database/i],
        ["binding-pockets", /binding.?pocket|binding.?site|pocket detection|cavity detection|cryptic pocket|p2rank|fpocket|prankweb|dogsitescorer/i],
        ["visualization", /visuali[sz]|molecular graphics|molecular viewer|trajectory viewer|pymol|ngl viewer|3dmol|molstar|scientific graphics/i],
        ["molecular-dynamics", /molecular dynamics|md simulation|trajectory analysis|free.?energy calculation|metadynamics|openmm|gromacs|namd|charmm/i],
        ["structure-based", /docking|virtual screening|pose prediction|pose scoring|protein.?ligand interaction|receptor preparation|structure.?based|redocking|cross.?docking|autodock|gnina|smina|vina|meeko|haddock/i],
        ["cheminformatics", /cheminformatics|chemical structure|molecular fingerprint|similarity search|substructure search|chemical space|molecular descriptor|structure drawing|rdkit|open babel|chemistry toolkit|chemical data/i],
        ["de-novo-design", /de.?novo|generative|molecule generation|molecular design|fragment growing|scaffold decoration|reinvent|synthemol|pocket2mol|targetdiff/i],
        ["ligand-based-qsar", /\bqsar\b|ligand.?based|pharmacophore|structure.?activity relationship|\bsar\b|bioactivity|activity prediction|compound similarity|chemprop|bindingdb/i],
        ["admet-prediction", /\badmet\b|\badme\b|toxicity|pharmacokinetic|drug.?likeness|permeability|solubility|metabolism|clearance|swissadme|pkcs|protox/i],
        ["retrosynthesis", /retro.?synthesis|reaction prediction|synthetic route|route planning|reaction mapping|reaction analysis|synthesis planning|aizynth|rxnmapper/i],
        ["nomenclature-format-conversion", /nomenclature|iupac|chemical name|name.?to.?structure|structure.?to.?name|format conversion|format converter|file format|canonicali[sz]ation|smiles conversion|inchi conversion/i],
        ["libraries-datasets", /\bdataset\b|\bbenchmark\b|compound library|screening collection|reference database|chemical database|bioactivity database|compound catalog/i],
        ["organization", /inventory|lab notebook|laboratory management|workflow|pipeline|scheduler|compute infrastructure|research computing|orchestration|workflow automation|compound management|project management/i]
    ];

    const $ = selector => document.querySelector(selector);

    async function loadCatalogue() {
        try {
            const response = await fetch("data/tools.json");
            if (!response.ok) throw new Error("Catalogue request failed (HTTP " + response.status + ").");
            const payload = await response.json();
            allTools = deduplicateTools(Array.isArray(payload) ? payload : []);
            $("#all-count").textContent = allTools.length.toLocaleString();
            readUrlState();
            renderAll();
            bindEvents();
        } catch (error) {
            console.error("Could not load ChemIsFree catalogue:", error);
            const count = $("#result-count");
            if (count) count.textContent = "Catalogue unavailable";
            const noResults = $("#no-results");
            if (noResults) {
                noResults.hidden = false;
                noResults.innerHTML = '<span class="no-results-number">ERR</span><h3>Catalogue unavailable.</h3><p>The catalogue could not be loaded. Please refresh the page and try again.</p>';
            }
        }
    }

    function deduplicateTools(items) {
        const ids = new Set();
        return items.filter(tool => {
            const id = String(tool && tool.id || "").trim();
            if (!id || ids.has(id)) return false;
            ids.add(id);
            return true;
        });
    }

    function slugify(value) {
        return String(value || "").toLowerCase().trim()
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function normalizeCategory(value) {
        const id = slugify(value);
        if (CATEGORY_BY_ID.has(id)) return id;
        if (CATEGORY_ALIASES[id]) return CATEGORY_ALIASES[id];
        if (LEGACY_DOMAIN_MAP[id]) return LEGACY_DOMAIN_MAP[id][0];
        return "";
    }

    function isResource(tool) {
        // Primary catalogue type wins over broad implementation labels.
        if (tool.catalogue === "app") return false;
        if (tool.catalogue === "resource") return true;
        const type = String(tool.resource_type || tool.type || "").toLowerCase();
        return ["library", "database", "dataset", "educational", "tutorial", "resource"].includes(type);
    }

    function firstValidUrl(value) {
        const candidates = Array.isArray(value) ? value : [value];
        for (const candidate of candidates) {
            const url = String(candidate || "").trim();
            if (/^https?:\/\//i.test(url) && url !== "[]") return url;
        }
        return "";
    }

    function getCardOutboundUrl(tool) {
        // Direct links prefer the official website; use the source repository as fallback.
        return firstValidUrl(tool.website) || firstValidUrl(tool.repository);
    }

    function isGtoPdb(tool) {
        const name = String(tool.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
        const id = String(tool.id || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
        return name.includes("gtopdb") || name.includes("guidetopharmacology") ||
            id.includes("gtopdb") || id.includes("guidetopharmacology");
    }

    function isResourceInCurrentView(tool) {
        // GtoPdb is intentionally accessible as a target-identification tool as well
        // as a database; the category view puts it with Tools, while Libraries & Datasets
        // and the all-categories view retain its resource placement.
        if (state.domain === "target-identification" && isGtoPdb(tool)) return false;
        return isResource(tool);
    }

    function resourceTypeName(tool) {
        const value = String(tool.resource_type || tool.type || "").toLowerCase();
        const names = {
            library: "Library", database: "Database", dataset: "Dataset",
            educational: "Resource", tutorial: "Tutorial", resource: "Resource"
        };
        return names[value] || (isResource(tool) ? "Resource" : "Tool");
    }

    function getToolCategories(tool) {
        const assigned = [];
        const add = category => {
            if (CATEGORY_BY_ID.has(category) && !assigned.includes(category)) assigned.push(category);
        };

        const rawDomains = Array.isArray(tool.domain) ? tool.domain : (tool.domain ? [tool.domain] : []);
        rawDomains.forEach(raw => {
            const canonical = normalizeCategory(raw);
            if (canonical) add(canonical);
            else {
                const legacy = LEGACY_DOMAIN_MAP[slugify(raw)];
                if (legacy) legacy.forEach(add);
            }
        });

        const tasks = Array.isArray(tool.tasks) ? tool.tasks : [];
        tasks.forEach(task => (TASK_CATEGORY_MAP[slugify(task)] || []).forEach(add));

        if (assigned.length === 0) {
            const rawCategories = [];
            ["category", "categories", "tags"].forEach(key => {
                if (Array.isArray(tool[key])) rawCategories.push.apply(rawCategories, tool[key]);
                else if (tool[key]) rawCategories.push(tool[key]);
            });
            rawCategories.forEach(value => {
                const canonical = normalizeCategory(value);
                if (canonical) add(canonical);
            });

            const searchable = [
                tool.name, tool.description, tool.type, tool.resource_type,
                ...rawDomains, ...rawCategories
            ].filter(Boolean).join(" ");
            CATEGORY_PATTERNS.forEach(([category, pattern]) => {
                if (pattern.test(searchable)) add(category);
            });
        }

        if (isResource(tool) && ["library", "database", "dataset"].includes(
            String(tool.resource_type || tool.type || "").toLowerCase()
        )) add("libraries-datasets");

        if (assigned.length === 0) add(isResource(tool) ? "libraries-datasets" : "cheminformatics");
        return CATEGORY_ORDER.map(item => item.id).filter(id => assigned.includes(id));
    }

    function primaryCategory(tool) {
        const categories = getToolCategories(tool);
        return categories.find(id => id !== "libraries-datasets") || categories[0] || "cheminformatics";
    }

    function normalizedTokens(values) {
        return (Array.isArray(values) ? values : [])
            .map(value => String(value || "").toLowerCase().trim().replace(/[\s_]+/g, "-"))
            .filter(Boolean);
    }

    function isOpenSource(tool) {
        const access = normalizedTokens(tool.access);
        const license = String(tool.license || "");
        return tool.source_available === true ||
            access.some(value => ["open-source", "opensource", "source-available", "free-and-open-source"].includes(value)) ||
            /\b(mit|apache|gpl|lgpl|bsd|mpl|agpl|epl|isc|artistic|cc0|unlicense)\b/i.test(license);
    }

    function isCommercial(tool) {
        const access = normalizedTokens(tool.access);
        const pricing = String(tool.pricing || tool.availability || tool.business_model || "").toLowerCase();
        return access.some(value => ["commercial", "paid", "subscription", "freemium", "paid-web", "commercial-license", "subscription-required"].includes(value)) ||
            /\b(commercial|paid|subscription|freemium|enterprise plan)\b/.test(pricing);
    }

    function hasWebInterface(tool) {
        const interfaces = normalizedTokens(tool.interface);
        const platforms = normalizedTokens(tool.platforms);
        return interfaces.some(value => ["web", "browser", "web-ui", "web-interface", "online", "hosted", "web-app"].includes(value)) ||
            platforms.some(value => ["web", "browser", "online"].includes(value));
    }

    function isFree(tool) {
        const access = normalizedTokens(tool.access);
        return access.some(value => ["free", "free-web", "freeware", "open-source", "opensource", "free-and-open-source", "open-access"].includes(value)) || isOpenSource(tool);
    }

    function isFreeWeb(tool) {
        const access = normalizedTokens(tool.access);
        const explicit = access.some(value => ["free-web", "free-online", "free-web-app", "open-access-web"].includes(value));
        return explicit || (isFree(tool) && hasWebInterface(tool) && !isCommercial(tool));
    }

    function matchesAccess(tool, filter) {
        if (!filter) return true;
        if (filter === "open-source") return isOpenSource(tool);
        if (filter === "free") return isFree(tool);
        if (filter === "free-web") return isFreeWeb(tool);
        if (filter === "commercial") return isCommercial(tool);
        return true;
    }

    function getStatusBadges(tool) {
        const badges = [];
        if (isOpenSource(tool)) badges.push({ label: "Open source", type: "open-source" });
        if (isCommercial(tool)) badges.push({ label: "Commercial", type: "commercial" });
        else if (isFreeWeb(tool)) badges.push({ label: "Free web", type: "free-web" });
        else if (isFree(tool) && !isOpenSource(tool)) badges.push({ label: "Free", type: "free" });
        return badges.slice(0, 2);
    }

    function buildSearchText(tool) {
        const domainLabels = getToolCategories(tool).map(id => CATEGORY_BY_ID.get(id).label);
        const tasks = (Array.isArray(tool.tasks) ? tool.tasks : []).map(task => String(task).replace(/-/g, " "));
        return [
            tool.name, tool.description, tool.type, tool.resource_type, tool.catalogue,
            tool.license, tool.website, tool.repository, tool.documentation,
            ...(Array.isArray(tool.category) ? tool.category : []),
            ...(Array.isArray(tool.interface) ? tool.interface : []),
            ...(Array.isArray(tool.access) ? tool.access : []),
            ...(Array.isArray(tool.developers) ? tool.developers : []),
            ...(Array.isArray(tool.languages) ? tool.languages : []),
            ...domainLabels, ...tasks
        ].filter(Boolean).join(" ").toLowerCase();
    }

    function getSearchTools() {
        const query = state.search.toLowerCase().trim();
        let tools = query ? allTools.filter(tool => buildSearchText(tool).includes(query)) : allTools.slice();
        if (state.task) {
            tools = tools.filter(tool => (Array.isArray(tool.tasks) ? tool.tasks : [])
                .some(task => slugify(task) === state.task));
        }
        return tools;
    }

    function getScopedTools() {
        return getSearchTools()
            .filter(tool => !state.domain || getToolCategories(tool).includes(state.domain))
            .filter(tool => matchesAccess(tool, state.access))
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    function populateCategoryFilters() {
        const container = $("#category-filters");
        if (!container) return;
        const base = getSearchTools();
        const buttons = [
            '<button type="button" class="catalogue-chip' + (!state.domain ? ' is-active' : '') +
            '" data-domain="" aria-pressed="' + (!state.domain ? 'true' : 'false') + '">All categories <span>' +
            base.length.toLocaleString() + '</span></button>'
        ];
        CATEGORY_ORDER.forEach(category => {
            const count = base.filter(tool => getToolCategories(tool).includes(category.id)).length;
            const active = state.domain === category.id;
            buttons.push('<button type="button" class="catalogue-chip' + (active ? ' is-active' : '') +
                '" data-domain="' + escapeAttribute(category.id) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
                escapeHtml(category.label) + ' <span>' + count.toLocaleString() + '</span></button>');
        });
        container.innerHTML = buttons.join("");
    }

    function populateAccessFilters() {
        const container = $("#access-filters");
        if (!container) return;
        const scoped = getSearchTools().filter(tool => !state.domain || getToolCategories(tool).includes(state.domain));
        const filters = [
            { id: "", label: "Any access", count: scoped.length },
            { id: "open-source", label: "Open source", count: scoped.filter(isOpenSource).length },
            { id: "free", label: "Free", count: scoped.filter(isFree).length },
            { id: "free-web", label: "Free web", count: scoped.filter(isFreeWeb).length },
            { id: "commercial", label: "Commercial / paid", count: scoped.filter(isCommercial).length }
        ];
        container.innerHTML = filters.map(item => {
            const active = state.access === item.id;
            return '<button type="button" class="catalogue-chip' + (active ? ' is-active' : '') +
                '" data-access="' + escapeAttribute(item.id) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
                escapeHtml(item.label) + ' <span>' + item.count.toLocaleString() + '</span></button>';
        }).join("");
    }

    function getDisplayResourceType(tool) {
        return isResource(tool) ? resourceTypeName(tool) : "Tool";
    }

    function createCard(tool) {
        const detailUrl = "tool.html?id=" + encodeURIComponent(String(tool.id || ""));
        const domainId = state.domain || primaryCategory(tool);
        const category = CATEGORY_BY_ID.get(domainId);
        const categoryTag = category
            ? '<span class="catalogue-card-chip catalogue-card-category">' + escapeHtml(category.label) + '</span>'
            : "";
        const outboundUrl = getCardOutboundUrl(tool);
        const statuses = getStatusBadges(tool).map(item => {
            const classes = 'catalogue-card-chip catalogue-card-status status-' + item.type;
            if (!outboundUrl) return '<span class="' + classes + '">' + escapeHtml(item.label) + '</span>';
            const destinationLabel = firstValidUrl(tool.website) ? "official website" : "source repository";
            return '<a class="' + classes + ' catalogue-card-status-link" href="' + escapeAttribute(outboundUrl) +
                '" target="_blank" rel="noopener noreferrer" title="Open ' + destinationLabel +
                '" aria-label="Open ' + destinationLabel + ' for ' + escapeAttribute(tool.name || "this entry") + '">' +
                escapeHtml(item.label) + '</a>';
        }).join("");
        const ownStatus = tool.chemisfree_status === "chemisfree-project"
            ? '<span class="catalogue-card-project">ChemIsFree</span>' : "";

        return '<article class="catalogue-tool-card">' +
            '<a class="catalogue-card-hitarea" href="' + escapeAttribute(detailUrl) +
                '" aria-label="View details for ' + escapeAttribute(tool.name || "Unnamed tool") + '"></a>' +
            '<div class="catalogue-card-topline"><span class="catalogue-card-type">' + escapeHtml(getDisplayResourceType(tool)) + '</span>' +
                ownStatus + '</div>' +
            '<h3><a href="' + escapeAttribute(detailUrl) + '">' + escapeHtml(tool.name || "Unnamed tool") + '</a></h3>' +
            '<p class="catalogue-card-description">' + escapeHtml(tool.description || "No description available.") + '</p>' +
            '<div class="catalogue-card-footer"><div class="catalogue-card-tags">' + categoryTag + statuses + '</div>' +
            '<span class="catalogue-card-arrow" aria-hidden="true">↗</span></div>' +
            '</article>';
    }

    function renderCardSection(title, note, tools) {
        if (!tools.length) return "";
        return '<section class="catalogue-card-section"><div class="catalogue-card-section-heading"><h3>' + escapeHtml(title) +
            '</h3><span>' + tools.length.toLocaleString() + ' shown</span></div>' +
            (note ? '<p class="catalogue-card-section-note">' + escapeHtml(note) + '</p>' : '') +
            '<div class="catalogue-card-grid">' + tools.map(createCard).join("") + '</div></section>';
    }

    function renderCards() {
        const grid = $("#catalogue-grid");
        const noResults = $("#no-results");
        if (!grid) return;
        const filtered = getScopedTools();
        const applications = filtered.filter(tool => !isResourceInCurrentView(tool));
        const resources = filtered.filter(isResourceInCurrentView);
        grid.innerHTML =
            renderCardSection("Tools", "Applications and end-user software", applications) +
            renderCardSection("Libraries & datasets", "Libraries, databases, reference collections, and supporting resources", resources);
        const count = $("#result-count");
        if (count) count.textContent = filtered.length.toLocaleString() + (filtered.length === 1 ? " entry shown" : " entries shown");
        if (noResults) noResults.hidden = filtered.length !== 0;
        const summary = $("#active-filter-summary");
        if (summary) {
            const parts = ["ALL LISTED TOOLS"];
            if (state.domain) parts.push(CATEGORY_BY_ID.get(state.domain)?.label.toUpperCase() || "");
            if (state.access) parts.push(state.access.replace("-", " ").toUpperCase());
            if (state.search) parts.push("SEARCH: " + state.search.toUpperCase());
            if (state.task) parts.push("TASK: " + state.task.replace(/-/g, " ").toUpperCase());
            summary.textContent = parts.filter(Boolean).join(" · ");
        }
    }

    function renderAll() {
        populateCategoryFilters();
        populateAccessFilters();
        renderCards();
        updateUrlState();
    }

    function bindEvents() {
        $("#search")?.addEventListener("input", () => {
            state.search = $("#search").value.trim();
            renderAll();
        });
        $("#category-filters")?.addEventListener("click", event => {
            const button = event.target.closest("[data-domain]");
            if (!button) return;
            state.domain = button.getAttribute("data-domain") || "";
            renderAll();
        });
        $("#access-filters")?.addEventListener("click", event => {
            const button = event.target.closest("[data-access]");
            if (!button) return;
            state.access = button.getAttribute("data-access") || "";
            renderAll();
        });
        const reset = () => {
            state.domain = "";
            state.access = "";
            state.search = "";
            state.task = "";
            const search = $("#search");
            if (search) search.value = "";
            renderAll();
        };
        $("#clear-filters")?.addEventListener("click", reset);
        $("#clear-filters-empty")?.addEventListener("click", reset);
        window.addEventListener("popstate", () => {
            readUrlState();
            renderAll();
        });
    }

    function readUrlState() {
        const params = new URLSearchParams(window.location.search);
        state.domain = normalizeCategory(params.get("domain") || params.get("area") || "");
        state.access = params.get("access") || "";
        state.search = params.get("search") || "";
        state.task = params.get("task") || "";
        const search = $("#search");
        if (search) search.value = state.search;
        if (state.access && !["open-source", "free", "free-web", "commercial"].includes(state.access)) state.access = "";
    }

    function updateUrlState() {
        const params = new URLSearchParams();
        if (state.domain) params.set("domain", state.domain);
        if (state.access) params.set("access", state.access);
        if (state.search) params.set("search", state.search);
        if (state.task) params.set("task", state.task);
        const query = params.toString();
        window.history.replaceState({}, "", query ? window.location.pathname + "?" + query : window.location.pathname);
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).split(String.fromCharCode(96)).join("&#096;");
    }

    document.addEventListener("DOMContentLoaded", loadCatalogue);
})();