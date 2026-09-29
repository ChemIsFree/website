// ---------------------------------------------------------
// Load selected tool
// ---------------------------------------------------------

async function loadTool() {

    const content =
        document.getElementById("tool-content");

    if (!content) {
        return;
    }


    try {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const toolId =
            params.get("id");


        if (!toolId) {

            showError(
                "No tool was specified.",
                "Please return to the catalogue and select a tool."
            );

            return;
        }


        const response =
            await fetch("data/tools.json");


        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const tools =
            await response.json();


        const tool =
            tools.find(
                item => item.id === toolId
            );


        if (!tool) {

            showError(
                "Tool not found.",
                "The requested tool does not exist in the ChemIsFree catalogue."
            );

            return;
        }


        renderTool(tool);

    } catch (error) {

        console.error(
            "Could not load tool:",
            error
        );


        showError(
            "Catalogue unavailable.",
            "The tool information could not be loaded. Please try again later."
        );
    }
}


// ---------------------------------------------------------
// Render tool
// ---------------------------------------------------------

function renderTool(tool) {

    const content =
        document.getElementById("tool-content");


    document.title =
        `${tool.name || "Tool"} — ChemIsFree`;


    const category =
        (tool.category || [])
            .map(formatLabel)
            .join(", ") ||
        "Other";


    const type =
        formatLabel(
            tool.type || "resource"
        );


    const access =
        (tool.access || [])
            .map(formatLabel)
            .join(", ") ||
        "Unknown";


    const statusBadge =
        createStatusBadge(tool);


    const developers =
        (tool.developers || [])
            .map(escapeHtml)
            .join(", ") ||
        "Not specified";


    const platforms =
        (tool.platforms || [])
            .map(formatLabel)
            .map(escapeHtml)
            .join(", ") ||
        "Not specified";


    const interfaces =
        (tool.interface || [])
            .map(formatLabel)
            .map(escapeHtml)
            .join(", ") ||
        "Not specified";


    const languages =
        (tool.languages || [])
            .map(escapeHtml)
            .join(", ") ||
        "Not specified";


    const license =
        tool.license
            ? escapeHtml(tool.license)
            : "Not specified";


    const description =
        tool.description
            ? escapeHtml(tool.description)
            : "No description available.";


    content.innerHTML = `

        <div class="tool-detail-header">

            ${statusBadge}

            <div class="tool-type">
                ${escapeHtml(type)}
            </div>

            <h1>
                ${escapeHtml(
                    tool.name || "Unnamed resource"
                )}
            </h1>

            <p class="tool-detail-description">
                ${description}
            </p>

        </div>


        <div class="tool-detail-layout">


            <!-- =================================================
                 MAIN INFORMATION
                 ================================================= -->

            <div class="tool-detail-main">

                <section class="tool-section">

                    <h2>
                        About
                    </h2>

                    <p>
                        ${description}
                    </p>

                </section>


                ${createLinksSection(tool)}


                ${createCitationSection(tool)}


                ${createNotesSection(tool)}

            </div>


            <!-- =================================================
                 SIDEBAR
                 ================================================= -->

            <aside class="tool-detail-sidebar">

                <div class="tool-info-card">

                    <h2>
                        Information
                    </h2>


                    <dl>

                        <div>
                            <dt>
                                Category
                            </dt>

                            <dd>
                                ${escapeHtml(category)}
                            </dd>
                        </div>


                        <div>
                            <dt>
                                Type
                            </dt>

                            <dd>
                                ${escapeHtml(type)}
                            </dd>
                        </div>


                        <div>
                            <dt>
                                Access
                            </dt>

                            <dd>
                                ${escapeHtml(access)}
                            </dd>
                        </div>


                        <div>
                            <dt>
                                License
                            </dt>

                            <dd>
                                ${license}
                            </dd>
                        </div>


                        <div>
                            <dt>
                                Developer
                            </dt>

                            <dd>
                                ${developers}
                            </dd>
                        </div>


                    </dl>

                </div>


                <div class="tool-info-card">

                    <h2>
                        Availability
                    </h2>


                    <dl>

                        <div>
                            <dt>
                                Platforms
                            </dt>

                            <dd>
                                ${platforms}
                            </dd>
                        </div>


                        <div>
                            <dt>
                                Interfaces
                            </dt>

                            <dd>
                                ${interfaces}
                            </dd>
                        </div>


                        <div>
                            <dt>
                                Languages
                            </dt>

                            <dd>
                                ${languages}
                            </dd>
                        </div>

                    </dl>

                </div>


                ${createPrimaryLink(tool)}

            </aside>


        </div>

    `;
}


// ---------------------------------------------------------
// Links section
// ---------------------------------------------------------

function createLinksSection(tool) {

    const links = [];


    if (tool.website) {

        links.push(`
            <a
                href="${escapeAttribute(tool.website)}"
                target="_blank"
                rel="noopener noreferrer"
                class="external-link"
            >
                Official website →
            </a>
        `);
    }


    if (tool.repository) {

        links.push(`
            <a
                href="${escapeAttribute(tool.repository)}"
                target="_blank"
                rel="noopener noreferrer"
                class="external-link"
            >
                Source repository →
            </a>
        `);
    }


    if (tool.documentation) {

        links.push(`
            <a
                href="${escapeAttribute(tool.documentation)}"
                target="_blank"
                rel="noopener noreferrer"
                class="external-link"
            >
                Documentation →
            </a>
        `);
    }


    if (links.length === 0) {
        return "";
    }


    return `

        <section class="tool-section">

            <h2>
                Resources
            </h2>

            <div class="tool-external-links">

                ${links.join("")}

            </div>

        </section>

    `;
}


// ---------------------------------------------------------
// Primary link
// ---------------------------------------------------------

function createPrimaryLink(tool) {

    const url =
        tool.website ||
        tool.repository ||
        tool.documentation;


    if (!url) {
        return "";
    }


    return `

        <a
            href="${escapeAttribute(url)}"
            target="_blank"
            rel="noopener noreferrer"
            class="button button-primary tool-primary-button"
        >
            Visit resource →
        </a>

    `;
}


// ---------------------------------------------------------
// Citation
// ---------------------------------------------------------

function createCitationSection(tool) {

    if (
        !tool.citation ||
        !tool.citation.length
    ) {
        return "";
    }


    return `

        <section class="tool-section">

            <h2>
                Citation
            </h2>

            <div class="tool-citation">

                ${tool.citation
                    .map(citation =>
                        `<p>${escapeHtml(citation)}</p>`
                    )
                    .join("")
                }

            </div>

        </section>

    `;
}


// ---------------------------------------------------------
// Notes
// ---------------------------------------------------------

function createNotesSection(tool) {

    if (!tool.notes) {
        return "";
    }


    return `

        <section class="tool-section">

            <h2>
                Notes
            </h2>

            <p>
                ${escapeHtml(tool.notes)}
            </p>

        </section>

    `;
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
// Error display
// ---------------------------------------------------------

function showError(title, message) {

    const content =
        document.getElementById("tool-content");


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="no-results">

            <h2>
                ${escapeHtml(title)}
            </h2>

            <p>
                ${escapeHtml(message)}
            </p>

            <a
                href="tools.html"
                class="button button-primary"
            >
                Return to catalogue
            </a>

        </div>

    `;
}


// ---------------------------------------------------------
// Start
// ---------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    loadTool
);
