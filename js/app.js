let tools = [];


// ---------------------------------------------------------
// Load catalogue
// ---------------------------------------------------------

async function loadTools() {

    try {

        const response = await fetch("data/tools.json");

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
// Catalogue
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


    const update = () => {

        const search =
            searchInput?.value.toLowerCase().trim() || "";

        const category =
            categorySelect?.value || "";

        const type =
            typeSelect?.value || "";

        const access =
            accessSelect?.value || "";

        const sort =
            sortSelect?.value || "name";


        let filtered = tools.filter(tool => {

            const searchableText = [

                tool.name,

                tool.description,

                ...(tool.developers || []),

                ...(tool.languages || []),

                ...(tool.interface || []),

                ...(tool.category || [])

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
                !access ||
                (tool.access || [])
                    .includes(access);


            return (
                matchesSearch &&
                matchesCategory &&
                matchesType &&
                matchesAccess
            );
        });


        // -------------------------------------------------
        // Sorting
        // -------------------------------------------------

        if (sort === "category") {

            filtered.sort((a, b) => {

                const categoryA =
                    (a.category || [""])
                        .join("");

                const categoryB =
                    (b.category || [""])
                        .join("");

                return categoryA.localeCompare(categoryB);
            });

        } else if (sort === "type") {

            filtered.sort((a, b) => {

                return (a.type || "")
                    .localeCompare(b.type || "");
            });

        } else {

            filtered.sort((a, b) => {

                return (a.name || "")
                    .localeCompare(b.name || "");
            });
        }


        renderTools(filtered);
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
        () => {

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

            update();
        }
    );


    populateFilters();

    update();
}


// ---------------------------------------------------------
// Populate filters
// ---------------------------------------------------------

function populateFilters() {

    const categorySelect =
        document.getElementById("category-filter");

    const typeSelect =
        document.getElementById("type-filter");

    const accessSelect =
        document.getElementById("access-filter");


    if (
        !categorySelect ||
        !typeSelect ||
        !accessSelect
    ) {
        return;
    }


    const categories = new Set();
    const types = new Set();
    const accesses = new Set();


    tools.forEach(tool => {

        (tool.category || []).forEach(
            category => categories.add(category)
        );

        if (tool.type) {
            types.add(tool.type);
        }

        (tool.access || []).forEach(
            access => accesses.add(access)
        );
    });


    [...categories]
        .sort()
        .forEach(category => {

            if (
                !categorySelect.querySelector(
                    `option[value="${escapeAttribute(category)}"]`
                )
            ) {

                categorySelect.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeAttribute(category)}">
                        ${formatLabel(category)}
                    </option>
                    `
                );
            }
        });


    [...types]
        .sort()
        .forEach(type => {

            if (
                !typeSelect.querySelector(
                    `option[value="${escapeAttribute(type)}"]`
                )
            ) {

                typeSelect.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeAttribute(type)}">
                        ${formatLabel(type)}
                    </option>
                    `
                );
            }
        });


    [...accesses]
        .sort()
        .forEach(access => {

            if (
                !accessSelect.querySelector(
                    `option[value="${escapeAttribute(access)}"]`
                )
            ) {

                accessSelect.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeAttribute(access)}">
                        ${formatLabel(access)}
                    </option>
                    `
                );
            }
        });
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

        grid.innerHTML = "";

        if (noResults) {
            noResults.hidden = false;
        }

        return;
    }


    if (noResults) {
        noResults.hidden = true;
    }


    grid.innerHTML =
        filteredTools
            .map(tool => createToolCard(tool))
            .join("");
}


// ---------------------------------------------------------
// Tool card
// ---------------------------------------------------------

function createToolCard(tool) {

    const category =
        (tool.category || []).length
            ? formatLabel(tool.category[0])
            : "Other";


    const access =
        (tool.access || []).length
            ? formatLabel(tool.access[0])
            : "Unknown";


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
                    tool.name || "Unnamed resource"
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
                    href="${escapeAttribute(website)}"
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
// ChemIsFree status badge
// ---------------------------------------------------------

function createStatusBadge(tool) {

    const status =
        tool.chemisfree_status || "curated-resource";


    if (status === "chemisfree-project") {

        return `
            <div class="tool-status tool-status-own">
                ChemIsFree Project
            </div>
        `;
    }


    if (status === "community-project") {

        return `
            <div class="tool-status tool-status-community">
                Community Project
            </div>
        `;
    }


    if (status === "archived") {

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


// ---------------------------------------------------------
// Start
// ---------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    loadTools
);
