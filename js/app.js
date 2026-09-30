let tools = [];
let taxonomy = {
    domains: {},
    resources: {}
};


// ---------------------------------------------------------
// Load catalogue
// ---------------------------------------------------------

async function loadCatalogue() {

    try {

        const [
            toolsResponse,
            taxonomyResponse
        ] = await Promise.all([

            fetch("data/tools.json"),

            fetch("data/taxonomy.json")
        ]);


        if (!toolsResponse.ok) {
            throw new Error(
                `Tools HTTP ${toolsResponse.status}`
            );
        }


        if (!taxonomyResponse.ok) {
            throw new Error(
                `Taxonomy HTTP ${taxonomyResponse.status}`
            );
        }


        tools =
            await toolsResponse.json();


        taxonomy =
            await taxonomyResponse.json();


        initializeCatalogue();


    } catch (error) {

        console.error(
            "Could not load ChemIsFree catalogue:",
            error
        );


        const count =
            document.getElementById(
                "result-count"
            );


        if (count) {
            count.textContent =
                "Catalogue unavailable";
        }


        const applications =
            document.getElementById(
                "applications-catalogue"
            );


        if (applications) {
            applications.innerHTML = "";
        }


        const resources =
            document.getElementById(
                "resources-content"
            );


        if (resources) {
            resources.innerHTML = "";
        }


        const noResults =
            document.getElementById(
                "no-results"
            );


        if (noResults) {

            noResults.hidden =
                false;


            noResults.innerHTML = `
                <h3>
                    Catalogue temporarily unavailable
                </h3>

                <p>
                    The ChemIsFree catalogue could not be loaded.
                    Please try again later.
                </p>
            `;
        }
    }
}


// ---------------------------------------------------------
// Initialize
// ---------------------------------------------------------

function initializeCatalogue() {

    normalizeAccessFilter();

    populateFilters();

    applyUrlState();


    const update = () => {

        const state =
            getFilterState();


        const filtered =
            tools.filter(tool =>
                matchesFilters(
                    tool,
                    state
                )
            );


        const applications =
            filtered.filter(
                isApplication
            );


        const resources =
            filtered.filter(
                isResource
            );


        renderApplications(
            applications
        );


        renderResources(
            resources
        );


        updateResultCount(
            applications,
            resources
        );


        updateUrlState(
            state
        );
    };


    document
        .getElementById("search")
        ?.addEventListener(
            "input",
            update
        );


    document
        .getElementById("domain-filter")
        ?.addEventListener(
            "change",
            update
        );


    document
        .getElementById("task-filter")
        ?.addEventListener(
            "change",
            update
        );


    document
        .getElementById("interface-filter")
        ?.addEventListener(
            "change",
            update
        );


    document
        .getElementById("access-filter")
        ?.addEventListener(
            "change",
            update
        );


    document
        .getElementById("clear-filters")
        ?.addEventListener(
            "click",
            () => {
                clearCatalogue();
                update();
            }
        );


    document
        .getElementById("clear-filters-empty")
        ?.addEventListener(
            "click",
            () => {
                clearCatalogue();
                update();
            }
        );


    update();
}


// ---------------------------------------------------------
// Filter state
// ---------------------------------------------------------

function getFilterState() {

    return {

        search:
            document
                .getElementById("search")
                ?.value
                .toLowerCase()
                .trim() || "",

        domain:
            document
                .getElementById("domain-filter")
                ?.value || "",

        task:
            document
                .getElementById("task-filter")
                ?.value || "",

        interface:
            document
                .getElementById("interface-filter")
                ?.value || "",

        access:
            document
                .getElementById("access-filter")
                ?.value || ""
    };
}


// ---------------------------------------------------------
// Matching
// ---------------------------------------------------------

function matchesFilters(tool, state) {

    const searchableText =
        buildSearchText(tool);


    const matchesSearch =
        !state.search ||
        searchableText.includes(
            state.search
        );


    const matchesDomain =
        !state.domain ||
        getToolDomains(tool)
            .includes(
                state.domain
            );


    const matchesTask =
        !state.task ||
        getToolTasks(tool)
            .includes(
                state.task
            );


    const matchesInterface =
        !state.interface ||
        matchesInterfaceFilter(
            tool,
            state.interface
        );


    const matchesAccess =
        !state.access ||
        matchesAccessFilter(
            tool,
            state.access
        );


    return (
        matchesSearch &&
        matchesDomain &&
        matchesTask &&
        matchesInterface &&
        matchesAccess
    );
}


// ---------------------------------------------------------
// Search text
// ---------------------------------------------------------

function buildSearchText(tool) {

    const domains =
        getToolDomains(tool)
            .map(getDomainName);


    const tasks =
        getToolTasks(tool)
            .map(getTaskName);


    return [

        tool.name,

        tool.description,

        ...(tool.developers || []),

        ...(tool.interface || []),

        ...(tool.category || []),

        ...domains,

        ...tasks,

        tool.type,

        tool.resource_type

    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}


// ---------------------------------------------------------
// Catalogue type
// ---------------------------------------------------------

function isApplication(tool) {

    if (tool.catalogue) {
        return tool.catalogue === "app";
    }


    return !isResource(tool);
}


function isResource(tool) {

    if (tool.catalogue) {
        return tool.catalogue === "resource";
    }


    return [
        "library",
        "database",
        "dataset",
        "tutorial",
        "resource"
    ].includes(
        tool.type
    );
}


// ---------------------------------------------------------
// Domains / tasks
// ---------------------------------------------------------

function getToolDomains(tool) {

    return tool.domain || [];
}


function getToolTasks(tool) {

    return tool.tasks || [];
}


function getDomainName(domainId) {

    return (
        taxonomy.domains?.[domainId]
            ?.name ||
        formatLabel(domainId)
    );
}


function getTaskName(taskId) {

    for (
        const domain of Object.values(
            taxonomy.domains || {}
        )
    ) {

        const task =
            (domain.tasks || [])
                .find(
                    item =>
                        item.id === taskId
                );


        if (task) {
            return task.name;
        }
    }


    return formatLabel(
        taskId
    );
}


function getResourceTypeName(typeId) {

    return (
        taxonomy.resources?.[typeId]
            ?.name ||
        formatLabel(typeId)
    );
}


// ---------------------------------------------------------
// Interface groups
// ---------------------------------------------------------

function hasGuiOrWeb(tool) {

    const interfaces =
        tool.interface || [];


    return (
        interfaces.includes("gui") ||
        interfaces.includes("web")
    );
}


function hasCli(tool) {

    return (
        tool.interface || []
    ).includes("cli");
}


function hasProgrammatic(tool) {

    const interfaces =
        tool.interface || [];


    const programmatic =
        [
            "python",
            "r",
            "c++",
            "java",
            "api",
            "notebook"
        ];


    return interfaces.some(
        item =>
            programmatic.includes(
                item
            )
    );
}


function matchesInterfaceFilter(
    tool,
    filter
) {

    if (filter === "gui-web") {
        return hasGuiOrWeb(tool);
    }


    if (filter === "cli") {
        return hasCli(tool);
    }


    if (filter === "programmatic") {
        return hasProgrammatic(tool);
    }


    return true;
}


// ---------------------------------------------------------
// Access
// ---------------------------------------------------------

function normalizeAccessFilter() {

    const select =
        document.getElementById(
            "access-filter"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `

        <option value="">
            All access types
        </option>

        <option value="free">
            Free
        </option>

        <option value="open-source">
            Open Source
        </option>
    `;
}


function matchesAccessFilter(
    tool,
    access
) {

    if (access === "free") {

        return (
            tool.access || []
        ).includes("free");
    }


    if (access === "open-source") {

        return (
            tool.source_available === true
        ) ||
        (
            tool.access || []
        ).includes(
            "open-source"
        );
    }


    return true;
}


// ---------------------------------------------------------
// Populate filters
// ---------------------------------------------------------

function populateFilters() {

    const domainSelect =
        document.getElementById(
            "domain-filter"
        );


    const taskSelect =
        document.getElementById(
            "task-filter"
        );


    if (
        !domainSelect ||
        !taskSelect
    ) {
        return;
    }


    domainSelect.innerHTML = `
        <option value="">
            All areas
        </option>
    `;


    taskSelect.innerHTML = `
        <option value="">
            All tasks
        </option>
    `;


    Object.entries(
        taxonomy.domains || {}
    ).forEach(
        ([domainId, domain]) => {

            const hasApps =
                tools.some(
                    tool =>
                        isApplication(tool) &&
                        getToolDomains(tool)
                            .includes(
                                domainId
                            )
                );


            if (!hasApps) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                domainId;


            option.textContent =
                domain.name;


            domainSelect.appendChild(
                option
            );
        }
    );


    const tasks = [];


    Object.entries(
        taxonomy.domains || {}
    ).forEach(
        ([domainId, domain]) => {

            (domain.tasks || [])
                .forEach(task => {

                    const hasApps =
                        tools.some(
                            tool =>
                                isApplication(tool) &&
                                getToolTasks(tool)
                                    .includes(
                                        task.id
                                    )
                        );


                    if (
                        hasApps &&
                        !tasks.some(
                            item =>
                                item.id ===
                                task.id
                        )
                    ) {

                        tasks.push({
                            id:
                                task.id,

                            name:
                                task.name,

                            domain:
                                domainId
                        });
                    }
                });
        }
    );


    tasks
        .sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        )
        .forEach(task => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                task.id;


            option.textContent =
                task.name;


            taskSelect.appendChild(
                option
            );
        });
}


// ---------------------------------------------------------
// Render applications
// ---------------------------------------------------------

function renderApplications(
    applicationTools
) {

    const container =
        document.getElementById(
            "applications-catalogue"
        );


    const noResults =
        document.getElementById(
            "no-results"
        );


    if (!container) {
        return;
    }


    let html = "";


    Object.entries(
        taxonomy.domains || {}
    ).forEach(
        ([domainId, domain], domainIndex) => {

            const domainApplications =
                applicationTools.filter(
                    tool =>
                        getToolDomains(tool)
                            .includes(
                                domainId
                            )
                );


            if (
                domainApplications.length === 0
            ) {
                return;
            }


            let domainHtml = "";


            (domain.tasks || [])
                .forEach(task => {

                    const taskTools =
                        domainApplications.filter(
                            tool =>
                                getToolTasks(tool)
                                    .includes(
                                        task.id
                                    )
                        );


                    if (
                        taskTools.length === 0
                    ) {
                        return;
                    }


                    const guiTools =
                        taskTools.filter(
                            hasGuiOrWeb
                        );


                    const cliTools =
                        taskTools.filter(
                            hasCli
                        );


                    const otherTools =
                        taskTools.filter(
                            tool =>
                                !hasGuiOrWeb(tool) &&
                                !hasCli(tool)
                        );


                    let taskHtml = "";


                    if (
                        guiTools.length > 0
                    ) {

                        taskHtml += `
                            ${createInterfaceGroup(
                                "GUI / WEB",
                                guiTools
                            )}
                        `;
                    }


                    if (
                        cliTools.length > 0
                    ) {

                        taskHtml += `
                            ${createInterfaceGroup(
                                "COMMAND LINE",
                                cliTools
                            )}
                        `;
                    }


                    if (
                        otherTools.length > 0
                    ) {

                        taskHtml += `
                            ${createInterfaceGroup(
                                "OTHER INTERFACES",
                                otherTools
                            )}
                        `;
                    }


                    domainHtml += `

                        <section
                            class="task-group"
                            data-task="${escapeAttribute(
                                task.id
                            )}"
                        >

                            <div class="task-heading">

                                <span class="task-index">
                                    ${String(
                                        taskTools.length
                                    ).padStart(2, "0")}
                                </span>

                                <h3>
                                    ${escapeHtml(
                                        task.name
                                    )}
                                </h3>

                            </div>


                            <div class="task-interface-groups">

                                ${taskHtml}

                            </div>

                        </section>

                    `;
                });


            if (!domainHtml) {
                return;
            }


            html += `

                <section
                    class="application-domain"
                    data-domain="${escapeAttribute(
                        domainId
                    )}"
                >

                    <div class="application-domain-header">

                        <div>

                            <p class="eyebrow">
                                ${String(
                                    domainIndex + 1
                                ).padStart(2, "0")}
                                /
                                APPLICATIONS
                            </p>

                            <h2>
                                ${escapeHtml(
                                    domain.name
                                )}
                            </h2>

                        </div>


                        <p class="application-domain-description">
                            ${escapeHtml(
                                domain.description ||
                                ""
                            )}
                        </p>

                    </div>


                    ${domainHtml}

                </section>

            `;
        }
    );


    container.innerHTML =
        html;


    const resources =
        document.getElementById(
            "resources-catalogue"
        );


    if (applicationTools.length === 0) {

        if (resources) {
            resources.classList.add(
                "resources-only"
            );
        }

    } else {

        if (resources) {
            resources.classList.remove(
                "resources-only"
            );
        }
    }
}


// ---------------------------------------------------------
// Interface group
// ---------------------------------------------------------

function createInterfaceGroup(
    title,
    toolsForGroup
) {

    const uniqueTools =
        deduplicateTools(
            toolsForGroup
        );


    return `

        <div class="task-interface-group">

            <div class="interface-label">
                <span></span>
                ${escapeHtml(title)}
            </div>


            <div class="application-grid">

                ${uniqueTools
                    .map(
                        createApplicationCard
                    )
                    .join("")}

            </div>

        </div>

    `;
}


// ---------------------------------------------------------
// Application card
// ---------------------------------------------------------

function createApplicationCard(
    tool
) {

    const statusBadge =
        createStatusBadge(tool);


    const access =
        getDisplayAccess(tool);


    const website =
        tool.website ||
        tool.repository ||
        tool.documentation ||
        "#";


    const secondaryInterfaces =
        getInterfaceLabels(tool);


    return `

        <article class="tool-card application-card">

            ${statusBadge}


            <div class="tool-type">
                ${escapeHtml(
                    formatLabel(
                        tool.type ||
                        "software"
                    )
                )}
            </div>


            <h3>
                ${escapeHtml(
                    tool.name ||
                    "Unnamed resource"
                )}
            </h3>


            <p class="tool-description">
                ${escapeHtml(
                    tool.description ||
                    "No description available."
                )}
            </p>


            <div class="tool-meta">

                <span>
                    ${escapeHtml(
                        access
                    )}
                </span>

                ${secondaryInterfaces
                    .map(
                        label =>
                            `<span>${escapeHtml(label)}</span>`
                    )
                    .join("")}

            </div>


            <div class="tool-card-bottom">

                <a
                    class="tool-link"
                    href="tool.html?id=${encodeURIComponent(
                        tool.id || ""
                    )}"
                >
                    View tool
                </a>


                <a
                    class="tool-link"
                    href="${escapeAttribute(
                        website
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Visit resource
                </a>

            </div>

        </article>

    `;
}


// ---------------------------------------------------------
// Resources
// ---------------------------------------------------------

function renderResources(
    resourceTools
) {

    const container =
        document.getElementById(
            "resources-content"
        );


    if (!container) {
        return;
    }


    const groups = {};


    resourceTools.forEach(tool => {

        const type =
            tool.resource_type ||
            inferResourceType(tool);


        if (!groups[type]) {
            groups[type] = [];
        }


        groups[type].push(tool);
    });


    let html = "";


    Object.keys(
        taxonomy.resources || {}
    ).forEach(type => {

        const items =
            groups[type] || [];


        if (items.length === 0) {
            return;
        }


        html += `

            <section class="resource-group">

                <div class="resource-group-heading">

                    <h3>
                        ${escapeHtml(
                            getResourceTypeName(
                                type
                            )
                        )}
                    </h3>

                    <span>
                        ${String(
                            items.length
                        ).padStart(2, "0")}
                    </span>

                </div>


                <div class="resource-grid">

                    ${items
                        .sort(
                            (a, b) =>
                                (
                                    a.name ||
                                    ""
                                ).localeCompare(
                                    b.name ||
                                    ""
                                )
                        )
                        .map(
                            createResourceCard
                        )
                        .join("")}

                </div>

            </section>

        `;
    });


    container.innerHTML =
        html;
}


function inferResourceType(tool) {

    if (
        tool.resource_type
    ) {
        return tool.resource_type;
    }


    if (
        tool.type === "library"
    ) {
        return "libraries";
    }


    if (
        tool.type === "database"
    ) {
        return "databases";
    }


    if (
        tool.type === "dataset"
    ) {
        return "datasets";
    }


    return "educational";
}


function createResourceCard(
    tool
) {

    const website =
        tool.website ||
        tool.repository ||
        tool.documentation ||
        "#";


    const taskLabels =
        getToolTasks(tool)
            .slice(0, 3)
            .map(
                getTaskName
            );


    return `

        <article class="resource-card">

            <div class="resource-card-top">

                <span class="resource-type">
                    ${escapeHtml(
                        getResourceTypeName(
                            tool.resource_type ||
                            inferResourceType(
                                tool
                            )
                        )
                    )}
                </span>

            </div>


            <h4>
                ${escapeHtml(
                    tool.name ||
                    "Unnamed resource"
                )}
            </h4>


            <p>
                ${escapeHtml(
                    tool.description ||
                    "No description available."
                )}
            </p>


            ${
                taskLabels.length
                    ? `
                        <div class="resource-tags">

                            ${taskLabels
                                .map(
                                    label =>
                                        `<span>${escapeHtml(label)}</span>`
                                )
                                .join("")}

                        </div>
                    `
                    : ""
            }


            <div class="resource-card-bottom">

                <a
                    class="tool-link"
                    href="tool.html?id=${encodeURIComponent(
                        tool.id || ""
                    )}"
                >
                    Details
                </a>


                <a
                    class="tool-link"
                    href="${escapeAttribute(
                        website
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Visit
                </a>

            </div>

        </article>

    `;
}


// ---------------------------------------------------------
// Result count
// ---------------------------------------------------------

function updateResultCount(
    applications,
    resources
) {

    const count =
        document.getElementById(
            "result-count"
        );


    if (!count) {
        return;
    }


    const appCount =
        applications.length;


    const resourceCount =
        resources.length;


    count.textContent =
        `${appCount} application${
            appCount === 1
                ? ""
                : "s"
        } · ${resourceCount} resource${
            resourceCount === 1
                ? ""
                : "s"
        }`;


    const noResults =
        document.getElementById(
            "no-results"
        );


    if (noResults) {

        noResults.hidden =
            (
                appCount === 0 &&
                resourceCount === 0
            );
    }
}


// ---------------------------------------------------------
// URL state
// ---------------------------------------------------------

function applyUrlState() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const search =
        params.get(
            "search"
        ) || "";


    let domain =
        params.get(
            "domain"
        ) || "";


    // Backwards compatibility for
    // the existing homepage links.

    const legacyCategory =
        params.get(
            "category"
        );


    if (
        !domain &&
        legacyCategory
    ) {

        domain =
            legacyCategoryToDomain(
                legacyCategory
            );
    }


    const task =
        params.get(
            "task"
        ) || "";


    const interfaceValue =
        params.get(
            "interface"
        ) || "";


    const access =
        params.get(
            "access"
        ) || "";


    const searchInput =
        document.getElementById(
            "search"
        );


    const domainSelect =
        document.getElementById(
            "domain-filter"
        );


    const taskSelect =
        document.getElementById(
            "task-filter"
        );


    const interfaceSelect =
        document.getElementById(
            "interface-filter"
        );


    const accessSelect =
        document.getElementById(
            "access-filter"
        );


    if (searchInput) {
        searchInput.value =
            search;
    }


    if (
        domain &&
        domainSelect
            ?.querySelector(
                `option[value="${escapeAttribute(
                    domain
                )}"]`
            )
    ) {

        domainSelect.value =
            domain;
    }


    if (
        task &&
        taskSelect
            ?.querySelector(
                `option[value="${escapeAttribute(
                    task
                )}"]`
            )
    ) {

        taskSelect.value =
            task;
    }


    if (
        interfaceValue &&
        interfaceSelect
            ?.querySelector(
                `option[value="${escapeAttribute(
                    interfaceValue
                )}"]`
            )
    ) {

        interfaceSelect.value =
            interfaceValue;
    }


    if (
        access &&
        accessSelect
            ?.querySelector(
                `option[value="${escapeAttribute(
                    access
                )}"]`
            )
    ) {

        accessSelect.value =
            access;
    }
}


function legacyCategoryToDomain(
    category
) {

    const mapping = {

        "cheminformatics":
            "chemical-structures",

        "molecular-modelling":
            "structure-based-discovery",

        "drug-discovery":
            "structure-based-discovery",

        "machine-learning":
            "data-analysis",

        "data-and-databases":
            "data-analysis",

        "visualization":
            "visualization",

        "laboratory":
            "laboratory-workflows",

        "utilities-and-workflows":
            "laboratory-workflows"
    };


    return (
        mapping[category] ||
        ""
    );
}


function updateUrlState(
    state
) {

    const params =
        new URLSearchParams();


    if (state.search) {
        params.set(
            "search",
            state.search
        );
    }


    if (state.domain) {
        params.set(
            "domain",
            state.domain
        );
    }


    if (state.task) {
        params.set(
            "task",
            state.task
        );
    }


    if (state.interface) {
        params.set(
            "interface",
            state.interface
        );
    }


    if (state.access) {
        params.set(
            "access",
            state.access
        );
    }


    const query =
        params.toString();


    const newUrl =
        query
            ? `${window.location.pathname}?${query}`
            : window.location.pathname;


    window.history.replaceState(
        {},
        "",
        newUrl
    );
}


// ---------------------------------------------------------
// Clear filters
// ---------------------------------------------------------

function clearCatalogue() {

    const ids = [
        "search",
        "domain-filter",
        "task-filter",
        "interface-filter",
        "access-filter"
    ];


    ids.forEach(id => {

        const element =
            document.getElementById(
                id
            );


        if (element) {
            element.value =
                "";
        }
    });


    window.history.replaceState(
        {},
        "",
        window.location.pathname
    );
}


// ---------------------------------------------------------
// Display access
// ---------------------------------------------------------

function getDisplayAccess(tool) {

    if (
        (tool.access || [])
            .includes("free")
    ) {
        return "Free";
    }


    if (
        tool.source_available === true ||
        (
            tool.access || []
        ).includes(
            "open-source"
        )
    ) {
        return "Open Source";
    }


    return "Unknown";
}


// ---------------------------------------------------------
// Status badge
// ---------------------------------------------------------

function createStatusBadge(tool) {

    const status =
        tool.chemisfree_status ||
        "curated-resource";


    if (
        status === "chemisfree-project"
    ) {

        return `
            <div class="tool-status tool-status-own">
                ChemIsFree Project
            </div>
        `;
    }


    if (
        status === "community-project"
    ) {

        return `
            <div class="tool-status tool-status-community">
                Community Project
            </div>
        `;
    }


    if (
        status === "archived"
    ) {

        return `
            <div class="tool-status tool-status-archived">
                Archived
            </div>
        `;
    }


    return "";
}


// ---------------------------------------------------------
// Interface labels
// ---------------------------------------------------------

function getInterfaceLabels(
    tool
) {

    const labels = [];


    if (hasGuiOrWeb(tool)) {
        labels.push("GUI / Web");
    }


    if (hasCli(tool)) {
        labels.push("CLI");
    }


    if (hasProgrammatic(tool)) {
        labels.push("Programmatic");
    }


    return labels;
}


// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function deduplicateTools(
    items
) {

    const seen =
        new Set();


    return items.filter(tool => {

        if (
            !tool.id ||
            seen.has(tool.id)
        ) {
            return false;
        }


        seen.add(
            tool.id
        );


        return true;
    });
}


function formatLabel(value) {

    if (!value) {
        return "";
    }


    return String(value)
        .replace(
            /-/g,
            " "
        )
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


function escapeHtml(value) {

    return String(
        value || ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(
    value
) {

    return String(
        value || ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );
}


// ---------------------------------------------------------
// Start
// ---------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    loadCatalogue
);
