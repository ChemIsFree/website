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
            fetch("data/tools.json"),
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
    document.title = `${tool.name || "Tool"} — ChemIsFree`;

    const hero = document.getElementById("tool-hero-content");
    const content = document.getElementById("tool-content");
    if (!hero || !content) return;

    const description = tool.description || "No description available.";
    const domains = getToolDomains(tool);
    const tasks = getToolTasks(tool);

    hero.innerHTML = `
        <div class="tool-detail-hero-grid">
            <div class="tool-detail-heading">
                ${createStatusBadge(tool)}
                <div class="tool-detail-type">${escapeHtml(formatLabel(tool.type || "resource"))}</div>
                <h1>${escapeHtml(tool.name || "Unnamed resource")}</h1>
                <p>${escapeHtml(description)}</p>
            </div>
            <div class="tool-detail-side-intro">
                <div class="detail-kicker">WHERE IT FITS</div>
                <div class="detail-taxonomy-list">
                    ${domains.map(domain => `
                        <a href="tools.html?domain=${encodeURIComponent(domain)}">
                            ${escapeHtml(getDomainName(domain))}
                            <span>↗</span>
                        </a>
                    `).join("")}
                </div>
            </div>
        </div>
    `;

    content.innerHTML = `
        <div class="tool-detail-layout">
            <div class="tool-detail-main">
                ${createTaskSection(tasks)}
                <section class="tool-section">
                    <div class="tool-section-label">01 / OVERVIEW</div>
                    <h2>About</h2>
                    <p>${escapeHtml(description)}</p>
                </section>
                ${createLinksSection(tool)}
                ${createNotesSection(tool)}
                ${createCitationSection(tool)}
            </div>
            <aside class="tool-detail-sidebar">
                ${createInformationCard(tool)}
                ${createAvailabilityCard(tool)}
                ${createPrimaryLink(tool)}
            </aside>
        </div>
    `;
}

function createTaskSection(taskIds) {
    if (!taskIds.length) return "";

    const tasks = deduplicate(taskIds).map(taskId => ({ id: taskId, name: getTaskName(taskId) }));

    return `
        <section class="tool-section tool-task-section">
            <div class="tool-section-label">00 / TASKS</div>
            <h2>What it helps you do</h2>
            <div class="tool-task-tags">
                ${tasks.map(task => `
                    <a href="tools.html?task=${encodeURIComponent(task.id)}" class="tool-task-tag">
                        ${escapeHtml(task.name)}
                        <span>↗</span>
                    </a>
                `).join("")}
            </div>
        </section>
    `;
}

function createInformationCard(tool) {
    return `
        <div class="tool-info-card">
            <div class="tool-info-card-heading"><span>01</span><h2>Information</h2></div>
            <dl>
                ${createDefinition("Type", formatLabel(tool.type || "resource"))}
                ${createDefinition("Access", getDisplayAccess(tool))}
                ${createDefinition("License", tool.license || "Not specified")}
                ${createDefinition("Developer", (tool.developers || []).join(", ") || "Not specified")}
            </dl>
        </div>
    `;
}

function createAvailabilityCard(tool) {
    const interfaces = getInterfaceLabels(tool);

    return `
        <div class="tool-info-card">
            <div class="tool-info-card-heading"><span>02</span><h2>Availability</h2></div>
            <dl>
                ${createDefinition("Platforms", (tool.platforms || []).map(formatLabel).join(", ") || "Not specified")}
                ${createDefinition("Interfaces", interfaces.join(" + ") || "Not specified")}
                ${createDefinition("Languages", (tool.languages || []).join(", ") || "Not specified")}
            </dl>
        </div>
    `;
}

function createDefinition(label, value) {
    return `<div class="tool-info-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function createLinksSection(tool) {
    const links = [];

    if (tool.website) links.push(`<a href="${escapeAttribute(tool.website)}" target="_blank" rel="noopener noreferrer" class="external-link">Official website <span>↗</span></a>`);
    if (tool.repository) links.push(`<a href="${escapeAttribute(tool.repository)}" target="_blank" rel="noopener noreferrer" class="external-link">Source repository <span>↗</span></a>`);
    if (tool.documentation) links.push(`<a href="${escapeAttribute(tool.documentation)}" target="_blank" rel="noopener noreferrer" class="external-link">Documentation <span>↗</span></a>`);

    if (!links.length) return "";

    return `
        <section class="tool-section">
            <div class="tool-section-label">02 / LINKS</div>
            <h2>Resources</h2>
            <div class="tool-external-links">${links.join("")}</div>
        </section>
    `;
}

function createNotesSection(tool) {
    if (!tool.notes) return "";

    return `
        <section class="tool-section">
            <div class="tool-section-label">03 / CHEMISFREE NOTE</div>
            <h2>Notes</h2>
            <p>${escapeHtml(tool.notes)}</p>
        </section>
    `;
}

function createCitationSection(tool) {
    if (!Array.isArray(tool.citation) || !tool.citation.length) return "";

    return `
        <section class="tool-section">
            <div class="tool-section-label">04 / CITATION</div>
            <h2>Citation</h2>
            <div class="tool-citation">
                ${tool.citation.map(item => `<p>${escapeHtml(item)}</p>`).join("")}
            </div>
        </section>
    `;
}

function createPrimaryLink(tool) {
    const url = tool.website || tool.repository || tool.documentation;
    if (!url) return "";

    return `
        <a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" class="button button-primary tool-primary-button">
            Visit resource <span>↗</span>
        </a>
    `;
}

function getToolDomains(tool) { return Array.isArray(tool.domain) ? tool.domain : []; }
function getToolTasks(tool) { return Array.isArray(tool.tasks) ? tool.tasks : []; }

function getDomainName(domainId) {
    return taxonomy.domains?.[domainId]?.name || formatLabel(domainId);
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
    const labels = [];
    const interfaces = tool.interface || [];
    if (interfaces.includes("gui") && interfaces.includes("web")) labels.push("GUI + Web");
    else if (interfaces.includes("gui")) labels.push("GUI");
    else if (interfaces.includes("web")) labels.push("Web");
    if (hasCli(tool)) labels.push("CLI");
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
