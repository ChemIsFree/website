let tools = [];
let taxonomy = {
    domains: {},
    resources: {}
};

async function loadCatalogue() {
    try {
        const [toolsResponse, taxonomyResponse] = await Promise.all([
            fetch("data/tools.json"),
            fetch("data/taxonomy.json")
        ]);

        if (!toolsResponse.ok) throw new Error(`Tools HTTP ${toolsResponse.status}`);
        if (!taxonomyResponse.ok) throw new Error(`Taxonomy HTTP ${taxonomyResponse.status}`);

        tools = await toolsResponse.json();
        taxonomy = await taxonomyResponse.json();
        initializeCatalogue();
    } catch (error) {
        console.error("Could not load ChemIsFree catalogue:", error);

        const count = document.getElementById("result-count");
        if (count) count.textContent = "Catalogue unavailable";

        const applications = document.getElementById("applications-catalogue");
        if (applications) applications.innerHTML = "";

        const resources = document.getElementById("resources-content");
        if (resources) resources.innerHTML = "";

        const noResults = document.getElementById("no-results");
        if (noResults) {
            noResults.hidden = false;
            noResults.innerHTML = `
                <span class="no-results-number">ERR</span>
                <h3>Catalogue temporarily unavailable</h3>
                <p>The ChemIsFree catalogue could not be loaded. Please try again later.</p>
            `;
        }
    }
}

function initializeCatalogue() {
    populateFilters();
    applyUrlState();

    const update = () => {
        const state = getFilterState();
        const filtered = tools.filter(tool => matchesFilters(tool, state));
        const applications = filtered.filter(isApplication);
        const resources = filtered.filter(isResource);

        renderApplications(applications);
        renderResources(resources);
        updateResultCount(applications, resources);
        updateUrlState(state);
    };

    document.getElementById("search")?.addEventListener("input", update);
    document.getElementById("domain-filter")?.addEventListener("change", update);
    document.getElementById("task-filter")?.addEventListener("change", update);
    document.getElementById("interface-filter")?.addEventListener("change", update);
    document.getElementById("access-filter")?.addEventListener("change", update);

    document.getElementById("clear-filters")?.addEventListener("click", () => {
        clearCatalogue();
        update();
    });

    document.getElementById("clear-filters-empty")?.addEventListener("click", () => {
        clearCatalogue();
        update();
    });

    update();
}

function getFilterState() {
    return {
        search: document.getElementById("search")?.value.toLowerCase().trim() || "",
        domain: document.getElementById("domain-filter")?.value || "",
        task: document.getElementById("task-filter")?.value || "",
        interface: document.getElementById("interface-filter")?.value || "",
        access: document.getElementById("access-filter")?.value || ""
    };
}

function matchesFilters(tool, state) {
    const matchesSearch = !state.search || buildSearchText(tool).includes(state.search);
    const matchesDomain = !state.domain || getToolDomains(tool).includes(state.domain);
    const matchesTask = !state.task || getToolTasks(tool).includes(state.task);
    const matchesInterface = !state.interface || matchesInterfaceFilter(tool, state.interface);
    const matchesAccess = !state.access || matchesAccessFilter(tool, state.access);

    return matchesSearch && matchesDomain && matchesTask && matchesInterface && matchesAccess;
}

function buildSearchText(tool) {
    const domains = getToolDomains(tool).map(getDomainName);
    const tasks = getToolTasks(tool).map(getTaskName);

    return [
        tool.name,
        tool.description,
        ...(tool.developers || []),
        ...(tool.interface || []),
        ...(tool.category || []),
        ...(tool.languages || []),
        ...domains,
        ...tasks,
        tool.type,
        tool.resource_type
    ].filter(Boolean).join(" ").toLowerCase();
}

function isApplication(tool) {
    if (tool.catalogue) return tool.catalogue === "app";
    return !isResource(tool);
}

function isResource(tool) {
    if (tool.catalogue) return tool.catalogue === "resource";
    return ["library", "database", "dataset", "tutorial", "resource"].includes(tool.type);
}

function getToolDomains(tool) {
    return Array.isArray(tool.domain) ? tool.domain : [];
}

function getToolTasks(tool) {
    return Array.isArray(tool.tasks) ? tool.tasks : [];
}

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

function getResourceTypeKey(tool) {
    const raw = tool.resource_type || tool.type || "educational";
    const aliases = {
        library: "libraries",
        libraries: "libraries",
        database: "databases",
        databases: "databases",
        dataset: "datasets",
        datasets: "datasets",
        tutorial: "educational",
        resource: "educational",
        educational: "educational"
    };
    return aliases[raw] || "educational";
}

function getResourceTypeName(typeKey) {
    return taxonomy.resources?.[typeKey]?.name || formatLabel(typeKey);
}

function hasGuiOrWeb(tool) {
    const interfaces = tool.interface || [];
    return interfaces.includes("gui") || interfaces.includes("web");
}

function hasCli(tool) {
    return (tool.interface || []).includes("cli");
}

function matchesInterfaceFilter(tool, filter) {
    if (filter === "gui-web") return hasGuiOrWeb(tool);
    if (filter === "cli") return hasCli(tool);
    return true;
}

function getInterfaceLabels(tool) {
    const labels = [];
    const gui = hasGuiOrWeb(tool);
    const cli = hasCli(tool);
    const interfaces = tool.interface || [];

    if (gui && cli) {
        labels.push("GUI + CLI");
    } else if (interfaces.includes("web")) {
        labels.push("WEB");
    } else if (gui) {
        labels.push("GUI");
    } else if (cli) {
        labels.push("CLI");
    }

    return labels;
}

function getPrimaryInterfaceGroup(tool) {
    return hasGuiOrWeb(tool) ? "gui-web" : hasCli(tool) ? "cli" : "other";
}

function normalizeAccessFilter() {
    const select = document.getElementById("access-filter");
    if (!select) return;
    select.innerHTML = `
        <option value="">All access types</option>
        <option value="free">Free</option>
        <option value="open-source">Open Source</option>
    `;
}

function matchesAccessFilter(tool, access) {
    if (access === "free") return (tool.access || []).includes("free");
    if (access === "open-source") {
        return tool.source_available === true || (tool.access || []).includes("open-source");
    }
    return true;
}

function populateFilters() {
    const domainSelect = document.getElementById("domain-filter");
    const taskSelect = document.getElementById("task-filter");
    if (!domainSelect || !taskSelect) return;

    domainSelect.innerHTML = `<option value="">All areas</option>`;
    taskSelect.innerHTML = `<option value="">All tasks</option>`;

    Object.entries(taxonomy.domains || {}).forEach(([domainId, domain]) => {
        const hasCatalogueEntry = tools.some(tool =>
            getToolDomains(tool).includes(domainId)
        );
        if (!hasCatalogueEntry) return;

        const option = document.createElement("option");
        option.value = domainId;
        option.textContent = domain.name;
        domainSelect.appendChild(option);
    });

    const tasks = [];

    Object.entries(taxonomy.domains || {}).forEach(([domainId, domain]) => {
        (domain.tasks || []).forEach(task => {
            const hasCatalogueEntry = tools.some(tool =>
                getToolTasks(tool).includes(task.id)
            );
            if (!hasCatalogueEntry) return;

            if (!tasks.some(item => item.id === task.id)) {
                tasks.push({ id: task.id, name: task.name, domain: domainId });
            }
        });
    });

    tasks.sort((a, b) => a.name.localeCompare(b.name));
    tasks.forEach(task => {
        const option = document.createElement("option");
        option.value = task.id;
        option.textContent = task.name;
        taskSelect.appendChild(option);
    });
}

function renderApplications(applicationTools) {
    const container = document.getElementById("applications-catalogue");
    if (!container) return;

    let html = "";

    Object.entries(taxonomy.domains || {}).forEach(([domainId, domain], domainIndex) => {
        const domainApplications = deduplicateTools(
            applicationTools.filter(tool => getToolDomains(tool).includes(domainId))
        );

        if (!domainApplications.length) return;

        const guiApps = domainApplications.filter(tool => getPrimaryInterfaceGroup(tool) === "gui-web");
        const cliApps = domainApplications.filter(tool => getPrimaryInterfaceGroup(tool) === "cli");

        html += `
            <section class="application-domain" data-domain="${escapeAttribute(domainId)}">
                <div class="application-domain-header">
                    <div>
                        <p class="eyebrow">${String(domainIndex + 1).padStart(2, "0")} / APPLICATIONS</p>
                        <h2>${escapeHtml(domain.name)}</h2>
                    </div>
                    <p class="application-domain-description">
                        ${escapeHtml(domain.description || "")}
                    </p>
                </div>
        `;

        if (guiApps.length) {
            html += `
                <div class="application-interface-group">
                    <div class="interface-label">
                        <span></span>
                        GUI / WEB
                    </div>
                    <div class="application-grid">
                        ${guiApps.map(tool => createApplicationCard(tool, domainId)).join("")}
                    </div>
                </div>
            `;
        }

        if (cliApps.length) {
            html += `
                <div class="application-interface-group">
                    <div class="interface-label">
                        <span></span>
                        COMMAND LINE
                    </div>
                    <div class="application-grid">
                        ${cliApps.map(tool => createApplicationCard(tool, domainId)).join("")}
                    </div>
                </div>
            `;
        }

        html += `</section>`;
    });

    container.innerHTML = html;
}

function createApplicationCard(tool, domainId) {
    const statusBadge = createStatusBadge(tool);
    const access = getDisplayAccess(tool);
    const website = tool.website || tool.repository || tool.documentation || "#";
    const interfaceLabels = getInterfaceLabels(tool);

    const taskLabels = deduplicateTaskLabels(
        getToolTasks(tool)
            .filter(taskId => taxonomy.domains?.[domainId]?.tasks?.some(task => task.id === taskId))
            .map(getTaskName)
    );

    return `
        <article class="tool-card application-card">
            ${statusBadge}

            <div class="application-card-topline">
                <div class="tool-type">
                    ${escapeHtml(formatLabel(tool.type || "software"))}
                </div>

                ${interfaceLabels.length ? `
                    <span class="application-interface">
                        ${escapeHtml(interfaceLabels[0])}
                    </span>
                ` : ""}
            </div>

            <h3>${escapeHtml(tool.name || "Unnamed application")}</h3>

            <p class="tool-description">
                ${escapeHtml(tool.description || "No description available.")}
            </p>

            ${taskLabels.length ? `
                <div class="application-task-tags">
                    ${taskLabels.map(label => `<span>${escapeHtml(label)}</span>`).join("")}
                </div>
            ` : ""}

            <div class="tool-meta">
                <span>${escapeHtml(access)}</span>
            </div>

            <div class="tool-card-bottom">
                <a class="tool-link" href="tool.html?id=${encodeURIComponent(tool.id || "")}">
                    View tool
                </a>
                <a class="tool-link" href="${escapeAttribute(website)}" target="_blank" rel="noopener noreferrer">
                    Visit resource
                </a>
            </div>
        </article>
    `;
}

function renderResources(resourceTools) {
    const container = document.getElementById("resources-content");
    if (!container) return;

    const groups = {};
    resourceTools.forEach(tool => {
        const type = getResourceTypeKey(tool);
        if (!groups[type]) groups[type] = [];
        groups[type].push(tool);
    });

    let html = "";

    Object.keys(taxonomy.resources || {}).forEach(type => {
        const items = groups[type] || [];
        if (!items.length) return;

        html += `
            <section class="resource-group">
                <div class="resource-group-heading">
                    <h3>${escapeHtml(getResourceTypeName(type))}</h3>
                    <span>${String(items.length).padStart(2, "0")}</span>
                </div>
                <div class="resource-grid">
                    ${items
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .map(createResourceCard)
                        .join("")}
                </div>
            </section>
        `;
    });

    container.innerHTML = html;
}

function createResourceCard(tool) {
    const website = tool.website || tool.repository || tool.documentation || "#";
    const taskLabels = deduplicateTaskLabels(getToolTasks(tool).map(getTaskName)).slice(0, 4);
    const typeKey = getResourceTypeKey(tool);

    return `
        <article class="resource-card">
            <div class="resource-card-top">
                <span class="resource-type">${escapeHtml(getResourceTypeName(typeKey))}</span>
            </div>
            <h4>${escapeHtml(tool.name || "Unnamed resource")}</h4>
            <p>${escapeHtml(tool.description || "No description available.")}</p>
            ${taskLabels.length ? `
                <div class="resource-tags">
                    ${taskLabels.map(label => `<span>${escapeHtml(label)}</span>`).join("")}
                </div>
            ` : ""}
            <div class="resource-card-bottom">
                <a class="tool-link" href="tool.html?id=${encodeURIComponent(tool.id || "")}">
                    Details
                </a>
                <a class="tool-link" href="${escapeAttribute(website)}" target="_blank" rel="noopener noreferrer">
                    Visit
                </a>
            </div>
        </article>
    `;
}

function updateResultCount(applications, resources) {
    const count = document.getElementById("result-count");
    const noResults = document.getElementById("no-results");
    if (!count) return;

    const appCount = applications.length;
    const resourceCount = resources.length;

    count.textContent = `${appCount} application${appCount === 1 ? "" : "s"} · ${resourceCount} resource${resourceCount === 1 ? "" : "s"}`;

    if (noResults) {
        noResults.hidden = appCount === 0 && resourceCount === 0;
    }
}

function applyUrlState() {
    const params = new URLSearchParams(window.location.search);

    const search = params.get("search") || "";
    let domain = params.get("domain") || "";
    const legacyCategory = params.get("category");

    if (!domain && legacyCategory) {
        domain = legacyCategoryToDomain(legacyCategory);
    }

    const task = params.get("task") || "";
    const interfaceValue = params.get("interface") || "";
    const access = params.get("access") || "";

    const searchInput = document.getElementById("search");
    const domainSelect = document.getElementById("domain-filter");
    const taskSelect = document.getElementById("task-filter");
    const interfaceSelect = document.getElementById("interface-filter");
    const accessSelect = document.getElementById("access-filter");

    if (searchInput) searchInput.value = search;
    if (domain && domainSelect?.querySelector(`option[value="${escapeAttribute(domain)}"]`)) domainSelect.value = domain;
    if (task && taskSelect?.querySelector(`option[value="${escapeAttribute(task)}"]`)) taskSelect.value = task;
    if (interfaceValue && interfaceSelect?.querySelector(`option[value="${escapeAttribute(interfaceValue)}"]`)) interfaceSelect.value = interfaceValue;
    if (access && accessSelect?.querySelector(`option[value="${escapeAttribute(access)}"]`)) accessSelect.value = access;
}

function legacyCategoryToDomain(category) {
    const mapping = {
        "cheminformatics": "chemical-structures",
        "molecular-modelling": "structure-based-discovery",
        "drug-discovery": "structure-based-discovery",
        "machine-learning": "data-analysis",
        "data-and-databases": "data-analysis",
        "visualization": "visualization",
        "laboratory": "laboratory-workflows",
        "utilities-and-workflows": "laboratory-workflows"
    };
    return mapping[category] || "";
}

function updateUrlState(state) {
    const params = new URLSearchParams();
    if (state.search) params.set("search", state.search);
    if (state.domain) params.set("domain", state.domain);
    if (state.task) params.set("task", state.task);
    if (state.interface) params.set("interface", state.interface);
    if (state.access) params.set("access", state.access);

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
}

function clearCatalogue() {
    ["search", "domain-filter", "task-filter", "interface-filter", "access-filter"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = "";
    });
    window.history.replaceState({}, "", window.location.pathname);
}

function getDisplayAccess(tool) {
    if ((tool.access || []).includes("free")) return "Free";
    if (tool.source_available === true || (tool.access || []).includes("open-source")) return "Open Source";
    return "Unknown";
}

function createStatusBadge(tool) {
    const status = tool.chemisfree_status || "curated-resource";

    if (status === "chemisfree-project") {
        return `<div class="tool-status tool-status-own">ChemIsFree Project</div>`;
    }
    if (status === "community-project") {
        return `<div class="tool-status tool-status-community">Community Project</div>`;
    }
    if (status === "archived") {
        return `<div class="tool-status tool-status-archived">Archived</div>`;
    }
    return "";
}

function deduplicateTools(items) {
    const seen = new Set();
    return items.filter(tool => {
        if (!tool.id || seen.has(tool.id)) return false;
        seen.add(tool.id);
        return true;
    });
}

function deduplicateTaskLabels(labels) {
    return [...new Set(labels.filter(Boolean))];
}

function formatLabel(value) {
    if (!value) return "";
    return String(value)
        .replace(/-/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
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

document.addEventListener("DOMContentLoaded", loadCatalogue);
