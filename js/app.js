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
        console.error("Could not load ChemIsFree catalogue:", error);

        const grid = document.getElementById("tools-grid");

        if (grid) {
            grid.innerHTML = `
                <div class="no-results">
                    <h3>Catalogue temporarily unavailable</h3>
                    <p>
                        The ChemIsFree catalogue could not be loaded.
                        Please try again later.
                    </p>
                </div>
            `;
        }
    }
}


// ---------------------------------------------------------
// Catalogue
// ---------------------------------------------------------

function initializeCatalogue() {

    const searchInput = document.getElementById("search");
    const categorySelect = document.getElementById("category-filter");
    const typeSelect = document.getElementById("type-filter");
    const accessSelect = document.getElementById("access-filter");
    const sortSelect = document.getElementById("sort");
    const clearButton = document.getElementById("clear-filters");

    const update = () => {

        const search = searchInput.value.toLowerCase().trim();
        const category = categorySelect.value;
        const type = typeSelect.value;
        const access = accessSelect.value;
        const sort = sortSelect.value;

        let filtered = tools.filter(tool => {

            const searchableText = [
                tool.name,
                tool.description,
                ...(tool.developers || [])
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !search ||
                searchableText.includes(search);

            const matchesCategory =
                !category ||
                (tool.category || []).includes(category);

            const matchesType =
                !type ||
                tool.type === type;

            const matchesAccess =
                !access ||
                (tool.access || []).includes(access);

            return (
                matchesSearch &&
                matchesCategory &&
                matchesType &&
                matchesAccess
            );
        });

        if (sort === "name-desc") {
            filtered.sort((a, b) =>
                b.name.localeCompare(a.name)
            );
        } else {
            filtered.sort((a, b) =>
                a.name.localeCompare(b.name)
            );
        }

        renderTools(filtered);
    };


    searchInput?.addEventListener("input", update);
    categorySelect?.addEventListener("change", update);
    typeSelect?.addEventListener("change", update);
    accessSelect?.addEventListener("change", update);
    sortSelect?.addEventListener("change", update);


    clearButton?.addEventListener("click", () => {

        searchInput.value = "";
        categorySelect.value = "";
        typeSelect.value = "";
        accessSelect.value = "";
        sortSelect.value = "name-asc";

        update();
    });


    populateFilters();
    update();
}


// ---------------------------------------------------------
// Filters
// ---------------------------------------------------------

function populateFilters() {

    const categorySelect =
        document.getElementById("category-filter");

    const typeSelect =
        document.getElementById("type-filter");

    const accessSelect =
        document.getElementById("access-filter");


    const categories = new Set();
    const types = new Set();
    const accesses = new Set();


    tools.forEach(tool => {

        (tool.category || []).forEach(category =>
            categories.add(category)
        );

        if (tool.type) {
            types.add(tool.type);
        }

        (tool.access || []).forEach(access =>
            accesses.add(access)
        );
    });


    [...categories]
        .sort()
        .forEach(category => {

            categorySelect?.insertAdjacentHTML(
                "beforeend",
                `<option value="${escapeAttribute(category)}">
                    ${formatLabel(category)}
                </option>`
            );
        });


    [...types]
        .sort()
        .forEach(type => {

            typeSelect?.insertAdjacentHTML(
                "beforeend",
                `<option value="${escapeAttribute(type)}">
                    ${formatLabel(type)}
                </option>`
            );
        });


    [...accesses]
        .sort()
        .forEach(access => {

            accessSelect?.insertAdjacentHTML(
                "beforeend",
                `<option value="${escapeAttribute(access)}">
                    ${formatLabel(access)}
                </option>`
            );
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


    if (!grid) return;


    if (count) {
        count.textContent =
            `${filteredTools.length} tool${
                filteredTools.length === 1 ? "" : "s"
            }`;
    }


    if (filteredTools.length === 0) {

        grid.innerHTML = "";

        if (noResults) {
            noResults.style.display = "block";
        }

        return;
    }


    if (noResults) {
        noResults.style.display = "none";
    }


    grid.innerHTML = filteredTools.map(tool => {

        const category =
            (tool.category || []).length
                ? formatLabel(tool.category[0])
                : "Other";


        const website =
            tool.website ||
            tool.repository ||
            tool.documentation ||
            "#";


        const access =
            (tool.access || []).length
                ? formatLabel(tool.access[0])
                : "Unknown";


        return `
            <article class="tool-card">

                <div class="tool-type">
                    ${formatLabel(tool.type || "resource")}
                </div>

                <h3>
                    ${escapeHtml(tool.name)}
                </h3>

                <p class="tool-description">
                    ${escapeHtml(
                        tool.description || "No description available."
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
                        href="${escapeAttribute(website)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Visit resource →
                    </a>

                </div>

            </article>
        `;

    }).join("");
}


// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function formatLabel(value) {

    if (!value) return "";

    return value
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


// ---------------------------------------------------------
// Start
// ---------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    loadTools
);
