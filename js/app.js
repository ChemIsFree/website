const TOOLS_DATA_URL =
    "https://raw.githubusercontent.com/ChemIsFree/tools/main/data/tools.yaml";

let tools = [];

// ---------------------------------------------------------
// Load catalogue
// ---------------------------------------------------------

async function loadTools() {
    try {
        const response = await fetch(TOOLS_DATA_URL);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const yamlText = await response.text();

        tools = parseSimpleYaml(yamlText);

        if (document.getElementById("tools-grid")) {
            initializeCatalogue();
        }

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
// Minimal YAML parser
// ---------------------------------------------------------
// This is temporary. We will replace this with a proper
// build system so the website receives a clean JSON file.
// ---------------------------------------------------------

function parseSimpleYaml(yaml) {
    const entries = [];
    const blocks = yaml.split(/\n(?=\s{2}- id:)/);

    for (const block of blocks) {
        if (!block.includes("- id:")) continue;

        const getValue = (key) => {
            const regex = new RegExp(
                `^\\s*${key}:\\s*(.*)$`,
                "m"
            );

            const match = block.match(regex);

            if (!match) return "";

            return match[1]
                .trim()
                .replace(/^["']|["']$/g, "");
        };

        const getList = (key) => {
            const regex = new RegExp(
                `^\\s*${key}:\\s*\\[(.*?)\\]`,
                "m"
            );

            const match = block.match(regex);

            if (!match || !match[1].trim()) return [];

            return match[1]
                .split(",")
                .map(x => x.trim().replace(/^["']|["']$/g, ""));
        };

        entries.push({
            id: getValue("id"),
            name: getValue("name"),
            description: getValue("description"),
            type: getValue("type"),
            category: getList("category"),
            access: getList("access"),
            website: getValue("website"),
            repository: getValue("repository"),
            documentation: getValue("documentation"),
            developers: getList("developers")
        });
    }

    return entries;
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

            const matchesSearch =
                !search ||
                tool.name.toLowerCase().includes(search) ||
                tool.description.toLowerCase().includes(search);

            const matchesCategory =
                !category ||
                tool.category.includes(category);

            const matchesType =
                !type ||
                tool.type === type;

            const matchesAccess =
                !access ||
                tool.access.includes(access);

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
// Populate filters
// ---------------------------------------------------------

function populateFilters() {

    const categorySelect = document.getElementById("category-filter");
    const typeSelect = document.getElementById("type-filter");
    const accessSelect = document.getElementById("access-filter");

    const categories = new Set();
    const types = new Set();
    const accesses = new Set();

    tools.forEach(tool => {

        tool.category.forEach(x => categories.add(x));

        if (tool.type) {
            types.add(tool.type);
        }

        tool.access.forEach(x => accesses.add(x));
    });

    categories.forEach(category => {
        categorySelect?.insertAdjacentHTML(
            "beforeend",
            `<option value="${category}">
                ${formatLabel(category)}
            </option>`
        );
    });

    types.forEach(type => {
        typeSelect?.insertAdjacentHTML(
            "beforeend",
            `<option value="${type}">
                ${formatLabel(type)}
            </option>`
        );
    });

    accesses.forEach(access => {
        accessSelect?.insertAdjacentHTML(
            "beforeend",
            `<option value="${access}">
                ${formatLabel(access)}
            </option>`
        );
    });
}


// ---------------------------------------------------------
// Render cards
// ---------------------------------------------------------

function renderTools(filteredTools) {

    const grid = document.getElementById("tools-grid");
    const count = document.getElementById("result-count");
    const noResults = document.getElementById("no-results");

    if (!grid) return;

    if (count) {
        count.textContent =
            `${filteredTools.length} tool${filteredTools.length === 1 ? "" : "s"}`;
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
            tool.category.length
                ? formatLabel(tool.category[0])
                : "Other";

        const website =
            tool.website ||
            tool.repository ||
            "#";

        return `
            <article class="tool-card">

                <div class="tool-type">
                    ${formatLabel(tool.type)}
                </div>

                <h3>${escapeHtml(tool.name)}</h3>

                <p class="tool-description">
                    ${escapeHtml(tool.description)}
                </p>

                <div class="tool-meta">

                    <span>
                        ${formatLabel(tool.access[0] || "unknown")}
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
                        rel="noopener"
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
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ---------------------------------------------------------
// Start
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", loadTools);
