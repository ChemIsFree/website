let tools = [];


// ---------------------------------------------------------
// Load catalogue
// ---------------------------------------------------------

async function loadTools() {

    try {

        const response =
            await fetch("data/tools.json");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        tools = await response.json();

        initializeCatalogue();

    } catch (error) {

        console.error(
            "Could not load ChemIsFree catalogue:",
            error
        );

        const grid =
            document.getElementById("tools-grid");

        const count =
            document.getElementById("result-count");

        if (grid) {
            grid.innerHTML = "";
        }

        if (count) {
            count.textContent =
                "Catalogue unavailable";
        }

        const noResults =
            document.getElementById("no-results");

        if (noResults) {

            noResults.hidden = false;

            noResults.innerHTML = `
                <h3>Catalogue temporarily unavailable</h3>

                <p>
                    The ChemIsFree catalogue could not be loaded.
                    Please try again later.
                </p>
            `;
        }
    }
}


// ---------------------------------------------------------
// Catalogue initialization
// ---------------------------------------------------------

function initializeCatalogue() {

    const searchInput =
        document.getElementById("search");

    const categorySelect =
        document.getElementById("category-filter");

    const typeSelect =
        document.getElementById("type-filter");

    const accessSelect =
        document.getElementById("access-filter");

    const sortSelect =
        document.getElementById("sort-tools");

    const clearButton =
        document.getElementById("clear-filters");

    const clearEmptyButton =
        document.getElementById("clear-filters-empty");


    // Remove obsolete access options.
    // ChemIsFree currently exposes only Free and Open Source.

    normalizeAccessFilter();


    populateFilters();


    // Read URL parameters before first render.

    applyUrlState();


    const update = () => {

        const search =
            searchInput?.value
                .toLowerCase()
                .trim() || "";

        const category =
            categorySelect?.value || "";

        const type =
            typeSelect?.value || "";

        const access =
            accessSelect?.value || "";

        const sort =
            sortSelect?.value || "name";


        let filtered =
            tools.filter(tool => {

                const searchableText = [

                    tool.name,

                    tool.description,

                    ...(tool.developers || []),

                    ...(tool.interface || []),

                    ...(tool.category || []),

                    ...(tool.tasks || []),

                    tool.type

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(search);


                const matchesCategory =
                    !category ||
                    (tool.category || [])
                        .includes(category);


                const matchesType =
                    !type ||
                    tool.type === type;


                const matchesAccess =
                    matchesAccessFilter(
                        tool,
                        access
                    );


                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesType &&
                    matchesAccess
                );
            });


        sortTools(
            filtered,
            sort
        );


        renderTools(filtered);


        updateUrlState({
            search,
            category,
            type,
            access,
            sort
        });
    };


    searchInput?.addEventListener(
        "input",
        update
    );


    categorySelect?.addEventListener(
        "change",
        update
    );


    typeSelect?.addEventListener(
        "change",
        update
    );


    accessSelect?.addEventListener(
        "change",
        update
    );


    sortSelect?.addEventListener(
        "change",
        update
    );


    clearButton?.addEventListener(
        "click",
        clearCatalogue
    );


    clearEmptyButton?.addEventListener(
        "click",
        clearCatalogue
    );


    update();
}


// ---------------------------------------------------------
// Access filter
// ---------------------------------------------------------

function normalizeAccessFilter() {

    const accessSelect =
        document.getElementById("access-filter");

    if (!accessSelect) {
        return;
    }


    accessSelect.innerHTML = `
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


function matchesAccessFilter(tool, access) {

    if (!access) {
        return true;
    }


    if (access === "free") {

        return (
            tool.access || []
        ).includes("free");
    }


    if (access === "open-source") {

        return (
            tool.source_available === true
        );
    }


    return false;
}


// ---------------------------------------------------------
// Populate filters
// ---------------------------------------------------------

function populateFilters() {

    const categorySelect =
        document.getElementById("category-filter");

    const typeSelect =
        document.getElementById("type-filter");

    if (!categorySelect || !typeSelect) {
        return;
    }


    const categories =
        new Set();

    const types =
        new Set();


    tools.forEach(tool => {

        (tool.category || [])
            .forEach(category => {
                categories.add(category);
            });


        if (tool.type) {
            types.add(tool.type);
        }
    });


    // Remove all dynamically populated options first.
    // This prevents duplicates if initialization happens again.

    categorySelect
        .querySelectorAll(
            "option:not(:first-child)"
        )
        .forEach(option => {
            option.remove();
        });


    typeSelect
        .querySelectorAll(
            "option:not(:first-child)"
        )
        .forEach(option => {
            option.remove();
        });


    [...categories]
        .sort()
        .forEach(category => {

            const option =
                document.createElement("option");

            option.value =
                category;

            option.textContent =
                formatLabel(category);

            categorySelect.appendChild(
                option
            );
        });


    [...types]
        .sort()
        .forEach(type => {

            const option =
                document.createElement("option");

            option.value =
                type;

            option.textContent =
                formatLabel(type);

            typeSelect.appendChild(
                option
            );
        });
}


// ---------------------------------------------------------
// Sorting
// ---------------------------------------------------------

function sortTools(filtered, sort) {

    if (sort === "category") {

        filtered.sort((a, b) => {

            const categoryA =
                (a.category || [])
                    .join(" ");

            const categoryB =
                (b.category || [])
                    .join(" ");

            return categoryA.localeCompare(
                categoryB
            );
        });

        return;
    }


    if (sort === "type") {

        filtered.sort((a, b) => {

            return (
                a.type || ""
            ).localeCompare(
                b.type || ""
            );
        });

        return;
    }


    filtered.sort((a, b) => {

        return (
            a.name || ""
        ).localeCompare(
            b.name || ""
        );
    });
}


// ---------------------------------------------------------
// URL state
// ---------------------------------------------------------

function applyUrlState() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const searchInput =
        document.getElementById("search");

    const categorySelect =
        document.getElementById("category-filter");

    const typeSelect =
        document.getElementById("type-filter");

    const accessSelect =
        document.getElementById("access-filter");

    const sortSelect =
        document.getElementById("sort-tools");


    const search =
        params.get("search") || "";

    const category =
        params.get("category") || "";

    const type =
        params.get("type") || "";

    const access =
        params.get("access") || "";

    const sort =
        params.get("sort") || "name";


    if (searchInput) {
        searchInput.value =
            search;
    }


    if (
        category &&
        categorySelect?.querySelector(
            `option[value="${escapeAttribute(category)}"]`
        )
    ) {
        categorySelect.value =
            category;
    }


    if (
        type &&
        typeSelect?.querySelector(
            `option[value="${escapeAttribute(type)}"]`
        )
    ) {
        typeSelect.value =
            type;
    }


    if (
        access &&
        accessSelect?.querySelector(
            `option[value="${escapeAttribute(access)}"]`
        )
    ) {
        accessSelect.value =
            access;
    }


    if (
        sort &&
        sortSelect?.querySelector(
            `option[value="${escapeAttribute(sort)}"]`
        )
    ) {
        sortSelect.value =
            sort;
    }
}


function updateUrlState(state) {

    const params =
        new URLSearchParams();


    if (state.search) {
        params.set(
            "search",
            state.search
        );
    }


    if (state.category) {
        params.set(
            "category",
            state.category
        );
    }


    if (state.type) {
        params.set(
            "type",
            state.type
        );
    }


    if (state.access) {
        params.set(
            "access",
            state.access
        );
    }


    if (
        state.sort &&
        state.sort !== "name"
    ) {
        params.set(
            "sort",
            state.sort
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

    const searchInput =
        document.getElementById("search");

    const categorySelect =
        document.getElementById("category-filter");

    const typeSelect =
        document.getElementById("type-filter");

    const accessSelect =
        document.getElementById("access-filter");

    const sortSelect =
        document.getElementById("sort-tools");


    if (searchInput) {
        searchInput.value = "";
    }


    if (categorySelect) {
        categorySelect.value = "";
    }


    if (typeSelect) {
        typeSelect.value = "";
    }


    if (accessSelect) {
        accessSelect.value = "";
    }


    if (sortSelect) {
        sortSelect.value = "name";
    }


    window.history.replaceState(
        {},
        "",
        window.location.pathname
    );


    renderTools(
        [...tools].sort((a, b) =>
            (a.name || "")
                .localeCompare(
                    b.name || ""
                )
        )
    );
}


// ---------------------------------------------------------
// Render tools
// ---------------------------------------------------------

function renderTools(filteredTools) {

    const grid =
        document.getElementById("tools-grid");

    const count =
        document.getElementById("result-count");

    const noResults =
        document.getElementById("no-results");


    if (!grid) {
        return;
    }


    if (count) {

        count.textContent =
            `${filteredTools.length} tool${
                filteredTools.length === 1
                    ? ""
                    : "s"
            }`;
    }


    if (filteredTools.length === 0) {

        grid.innerHTML =
            "";

        if (noResults) {
            noResults.hidden =
                false;
        }

        return;
    }


    if (noResults) {
        noResults.hidden =
            true;
    }


    grid.innerHTML =
        filteredTools
            .map(createToolCard)
            .join("");
}


// ---------------------------------------------------------
// Tool card
// ---------------------------------------------------------

function createToolCard(tool) {

    const category =
        (tool.category || []).length
            ? formatLabel(
                tool.category[0]
            )
            : "Other";


    const access =
        getDisplayAccess(tool);


    const website =
        tool.website ||
        tool.repository ||
        tool.documentation ||
        "#";


    const statusBadge =
        createStatusBadge(tool);


    return `
        <article class="tool-card">

            ${statusBadge}

            <div class="tool-type">
                ${formatLabel(
                    tool.type || "resource"
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
                    ${access}
                </span>

                <span>
                    ${category}
                </span>

            </div>

            <div class="tool-card-bottom">

                <a
                    class="tool-link"
                    href="tool.html?id=${encodeURIComponent(
                        tool.id || ""
                    )}"
                >
                    View tool →
                </a>

                <a
                    class="tool-link"
                    href="${escapeAttribute(
                        website
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Visit resource →
                </a>

            </div>

        </article>
    `;
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
        tool.source_available === true
    ) {
        return "Open Source";
    }


    return "Unknown";
}


// ---------------------------------------------------------
// ChemIsFree status badge
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
// Helpers
// ---------------------------------------------------------

function formatLabel(value) {

    if (!value) {
        return "";
    }


    return String(value)
        .replace(/-/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


function escapeHtml(value) {

    return String(value || "")
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


function escapeAttribute(value) {

    return String(value || "")
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
    loadTools
);
