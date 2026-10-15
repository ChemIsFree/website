let taxonomy = { domains: {}, resources: {} };

async function loadTool() {
    try {
        const params = new URLSearchParams(window.location.search);
        const toolId = params.get("id");

        if (!toolId) {
            showError("No tool was specified.", "Please return to the catalogue and select a tool.");
            return;
        }

        const [toolsResponse, taxonomyResponse] = await Promise.all([
            fetch("data/tools.json?v=2"),
            fetch("data/taxonomy.json")
        ]);

        if (!toolsResponse.ok) throw new Error(`Tools HTTP ${toolsResponse.status}`);
        if (!taxonomyResponse.ok) throw new Error(`Taxonomy HTTP ${taxonomyResponse.status}`);

        const tools = await toolsResponse.json();
        taxonomy = await taxonomyResponse.json();

        const tool = tools.find(item => item.id === toolId);

        if (!tool) {
            showError("Tool not found.", "The requested entry does not exist in the ChemIsFree catalogue.");
            return;
        }

        renderTool(tool);
    } catch (error) {
        console.error("Could not load tool:", error);
        showError("Catalogue unavailable.", "The tool information could not be loaded. Please try again later.");
    }
}

function renderTool(tool) {
    document.title = String(tool.name || "Tool") + " — ChemIsFree";

    const hero = document.getElementById("tool-hero-content");
    const content = document.getElementById("tool-content");
    if (!hero || !content) return;

    const description = tool.description || "No description available.";
    const domains = getToolDomains(tool);

    hero.innerHTML =
        '<div class="tool-detail-hero-grid">' +
            '<div class="tool-detail-heading">' +
                createStatusBadge(tool) +
                '<div class="tool-detail-type">' + escapeHtml(formatLabel(tool.type || "resource")) + '</div>' +
                '<h1>' + escapeHtml(tool.name || "Unnamed resource") + '</h1>' +
                '<p class="tool-detail-full-description">' + escapeHtml(description) + '</p>' +
            '</div>' +
            '<div class="tool-detail-side-intro">' +
                '<div class="detail-kicker">WHERE IT FITS</div>' +
                '<div class="detail-taxonomy-list">' +
                    domains.map(domain =>
                        '<a href="tools.html?domain=' + encodeURIComponent(domain) + '">' +
                            escapeHtml(getDomainName(domain)) + '<span>↗</span>' +
                        '</a>'
                    ).join("") +
                '</div>' +
            '</div>' +
        '</div>';

    const linksSection = createLinksSection(tool);
    const citationSection = createCitationSection(tool);
    const topPanels = [linksSection, citationSection].filter(Boolean);
    const panelClass = topPanels.length > 1 ? "two-panels" : "single-panel";

    content.innerHTML =
        '<div class="tool-detail-compact-layout">' +
            (topPanels.length
                ? '<div class="tool-detail-link-citation-row ' + panelClass + '">' + topPanels.join("") + '</div>'
                : '') +
            createInformationAvailabilitySection(tool) +
            createNotesSection(tool) +
        '</div>';
}

function firstValidUrl(value) {
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
        const url = String(candidate || "").trim();
        if (/^https?:\/\//i.test(url) && url !== "[]") return url;
    }
    return "";
}

function createInformationAvailabilitySection(tool) {
    const classification = tool.interface_classification;
    let confidenceNote = "";

    if (classification && classification.confidence && classification.confidence !== "high") {
        const confidenceLabel = classification.confidence === "low"
            ? "Provisional interface classification."
            : "Inferred interface classification.";
        confidenceNote =
            '<p class="tool-interface-confidence-note"><strong>' +
            escapeHtml(confidenceLabel) + '</strong> ' +
            escapeHtml(classification.reason || "Check the official documentation to confirm the available interface.") +
            '</p>';
    }

    const fields = [
        ["Type", formatLabel(tool.type || (tool.catalogue === "resource" ? "resource" : "software"))],
        ["Access", getDisplayAccess(tool)],
        ["License", tool.license || "Not specified"],
        ["Developer", (Array.isArray(tool.developers) ? tool.developers : []).join(", ") || "Not specified"],
        ["Platforms", (Array.isArray(tool.platforms) ? tool.platforms : []).map(formatLabel).join(", ") || "Not specified"],
        ["Interfaces", getInterfaceLabels(tool).join(" + ") || "Not specified"],
        ["Languages", (Array.isArray(tool.languages) ? tool.languages : []).join(", ") || "Not specified"]
    ];

    return '<section class="tool-info-card tool-info-availability">' +
        '<div class="tool-info-card-heading"><span>02</span><h2>Information &amp; availability</h2></div>' +
        '<dl class="tool-info-availability-grid">' +
            fields.map(([label, value]) =>
                '<div class="tool-info-cell"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
            ).join("") +
        '</dl>' + confidenceNote +
    '</section>';
}

function createLinksSection(tool) {
    const links = [
        { label: "Official website", url: firstValidUrl(tool.website) },
        { label: "Source repository", url: firstValidUrl(tool.repository) },
        { label: "Documentation", url: firstValidUrl(tool.documentation) }
    ].filter(link => link.url);

    if (!links.length) return "";

    return '<section class="tool-section tool-detail-resource-panel">' +
        '<div class="tool-section-label">01 / LINKS</div><h2>Resources</h2>' +
        '<div class="tool-external-links">' +
            links.map(link =>
                '<a href="' + escapeAttribute(link.url) + '" target="_blank" rel="noopener noreferrer" class="external-link">' +
                    escapeHtml(link.label) + '<span>↗</span></a>'
            ).join("") +
        '</div>' +
    '</section>';
}

function createNotesSection(tool) {
    if (!tool.notes) return "";
    const note = Array.isArray(tool.notes) ? tool.notes.join(" ") : String(tool.notes);
    return '<section class="tool-section tool-detail-notes">' +
        '<div class="tool-section-label">03 / CHEMISFREE NOTE</div><h2>Notes</h2>' +
        '<p>' + escapeHtml(note) + '</p>' +
    '</section>';
}

function createCitationSection(tool) {
    if (!Array.isArray(tool.citation) || !tool.citation.length) return "";

    const citationItems = tool.citation.map(item => {
        const citation = String(item || "").trim();
        if (/^https?:\/\//i.test(citation)) {
            return '<p><a href="' + escapeAttribute(citation) + '" target="_blank" rel="noopener noreferrer">' +
                escapeHtml(citation) + '<span>↗</span></a></p>';
        }
        return '<p>' + escapeHtml(citation) + '</p>';
    }).join("");

    return '<section class="tool-section tool-detail-citation-panel">' +
        '<div class="tool-section-label">01 / CITATION</div><h2>Citation</h2>' +
        '<div class="tool-citation">' + citationItems + '</div>' +
    '</section>';
}

function getToolDomains(tool) { return Array.isArray(tool.domain) ? tool.domain : []; }
function getToolTasks(tool) { return Array.isArray(tool.tasks) ? tool.tasks : []; }

function getDomainName(domainId) {
    const functionalNames = {
        "target-identification": "Target Identification",
        "protein-structures": "Protein Structures",
        "visualization": "Visualization",
        "binding-pockets": "Binding Pockets",
        "structure-based": "Structure-Based",
        "molecular-dynamics": "Molecular Dynamics",
        "cheminformatics": "Cheminformatics",
        "de-novo-design": "De Novo Design",
        "ligand-based-qsar": "Ligand-Based and QSAR",
        "admet-prediction": "ADMET Prediction",
        "retrosynthesis": "Retrosynthesis",
        "nomenclature-format-conversion": "Nomenclature and Format Conversion",
        "libraries-datasets": "Libraries and Datasets",
        "organization": "Organization"
    };
    if (functionalNames[domainId]) return functionalNames[domainId];

    const legacyNames = {
        "chemical-structures": "Cheminformatics",
        "ligand-based-discovery": "Ligand-Based and QSAR",
        "structure-based-discovery": "Structure-Based",
        "molecular-properties-admet": "ADMET Prediction",
        "synthesis-reaction-design": "Retrosynthesis",
        "data-analysis": "Target Identification",
        "visualization-and-interpretation": "Visualization",
        "laboratory-workflows": "Organization"
    };
    return legacyNames[domainId] || taxonomy.domains?.[domainId]?.name || formatLabel(domainId);
}

function getTaskName(taskId) {
    for (const domain of Object.values(taxonomy.domains || {})) {
        const task = (domain.tasks || []).find(item => item.id === taskId);
        if (task) return task.name;
    }
    return formatLabel(taskId);
}

function hasGuiOrWeb(tool) {
    const interfaces = tool.interface || [];
    return interfaces.includes("gui") || interfaces.includes("web");
}

function hasCli(tool) { return (tool.interface || []).includes("cli"); }

function getInterfaceLabels(tool) {
    const values = (Array.isArray(tool.interface) ? tool.interface : [])
        .map(value => String(value).toLowerCase().trim())
        .filter(Boolean);
    const labels = [];

    const gui = values.includes("gui");
    const web = values.includes("web");
    const cli = values.includes("cli");
    const programmingModes = values.filter(value =>
        ["python", "r", "c++", "java", "api", "notebook", "mcp"].includes(value)
    );

    if (gui && web) labels.push("GUI + Web");
    else if (gui) labels.push("GUI");
    else if (web) labels.push("Web");

    if (cli) labels.push("CLI");

    if (programmingModes.length) {
        if (programmingModes.includes("api") && programmingModes.length === 1) {
            labels.push("API");
        } else {
            labels.push("Programmatic (" + programmingModes.map(formatLabel).join(", ") + ")");
        }
    }

    const known = new Set(["gui", "web", "cli", "python", "r", "c++", "java", "api", "notebook", "mcp", "other"]);
    if (values.includes("other")) labels.push("Interface unconfirmed");
    if (values.some(value => !known.has(value))) labels.push("Other");

    return labels;
}

function getDisplayAccess(tool) {
    if ((tool.access || []).includes("free")) return "Free";
    if (tool.source_available === true || (tool.access || []).includes("open-source")) return "Open Source";
    return "Unknown";
}

function createStatusBadge(tool) {
    const status = tool.chemisfree_status || "curated-resource";
    if (status === "chemisfree-project") return `<div class="tool-status tool-status-own">ChemIsFree Project</div>`;
    if (status === "community-project") return `<div class="tool-status tool-status-community">Community Project</div>`;
    if (status === "archived") return `<div class="tool-status tool-status-archived">Archived</div>`;
    return "";
}

function deduplicate(items) { return [...new Set(items)]; }

function formatLabel(value) {
    if (!value) return "";
    return String(value).replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function showError(title, message) {
    const hero = document.getElementById("tool-hero-content");
    const content = document.getElementById("tool-content");

    if (hero) {
        hero.innerHTML = `
            <div class="tool-error">
                <div class="tool-section-label">CHEMISFREE</div>
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(message)}</p>
                <a href="tools.html" class="button button-primary">Return to catalogue <span>↗</span></a>
            </div>
        `;
    }
    if (content) content.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", loadTool);
