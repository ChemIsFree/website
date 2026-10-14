(function () {
    "use strict";

    const state = { view: "featured", domain: "", access: "", search: "" };
    let allTools = [];
    let taxonomy = { domains: {}, resources: {} };
    let featured = { domains: {} };
    let featuredIds = new Set();
    let featuredRank = new Map();
    let featuredDomain = new Map();

    const $ = selector => document.querySelector(selector);

    async function loadCatalogue() {
        try {
            const responses = await Promise.all([
                fetch("data/tools.json"),
                fetch("data/taxonomy.json"),
                fetch("data/featured_tools.json")
            ]);
            const failed = responses.find(response => !response.ok);
            if (failed) throw new Error("Catalogue request failed (HTTP " + failed.status + ").");
            const payloads = await Promise.all(responses.map(response => response.json()));
            allTools = deduplicateTools(Array.isArray(payloads[0]) ? payloads[0] : []);
            taxonomy = payloads[1] || { domains: {}, resources: {} };
            featured = payloads[2] || { domains: {} };
            buildFeaturedIndex();
            $("#featured-count").textContent = String(getViewTools("featured").length);
            $("#all-count").textContent = String(allTools.length);
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

    function buildFeaturedIndex() {
        featuredIds = new Set();
        featuredRank = new Map();
        featuredDomain = new Map();
        let rank = 0;
        Object.entries(featured.domains || {}).forEach(([domainId, record]) => {
            (Array.isArray(record && record.tools) ? record.tools : []).forEach(idValue => {
                const id = String(idValue || "");
                featuredIds.add(id);
                if (!featuredRank.has(id)) featuredRank.set(id, rank++);
                if (!featuredDomain.has(id)) featuredDomain.set(id, domainId);
            });
        });
    }

    function getViewTools(view) {
        if (view === "featured") {
            return allTools
                .filter(tool => featuredIds.has(tool.id))
                .sort((a, b) => (featuredRank.get(a.id) ?? 999999) - (featuredRank.get(b.id) ?? 999999));
        }
        return allTools.slice().sort((a, b) => toolName(a).localeCompare(toolName(b)));
    }

    function toolName(tool) {
        return String(tool.name || "Unnamed tool");
    }

    function domainIds(tool) {
        return Array.isArray(tool.domain) ? tool.domain : [];
    }

    function domainName(domainId) {
        return taxonomy.domains?.[domainId]?.name || formatLabel(domainId);
    }

    function taskName(taskId) {
        for (const domain of Object.values(taxonomy.domains || {})) {
            const task = (domain.tasks || []).find(item => item.id === taskId);
            if (task) return task.name;
        }
        return formatLabel(taskId);
    }

    function getResourceLabel(tool) {
        if (tool.catalogue === "resource") {
            const aliases = {
                library: "Library", database: "Database", dataset: "Dataset",
                educational: "Resource", tutorial: "Tutorial", resource: "Resource"
            };
            return aliases[String(tool.resource_type || tool.type || "resource").toLowerCase()] || "Resource";
        }
        return "Application";
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
        return access.some(value =>
            ["commercial", "paid", "subscription", "freemium", "paid-web", "commercial-license", "subscription-required"].includes(value)
        ) || /\b(commercial|paid|subscription|freemium|enterprise plan)\b/.test(pricing);
    }

    function hasWebInterface(tool) {
        const interfaces = normalizedTokens(tool.interface);
        const platforms = normalizedTokens(tool.platforms);
        return interfaces.some(value =>
            ["web", "browser", "web-ui", "web-interface", "online", "hosted", "web-app"].includes(value)
        ) || platforms.some(value => ["web", "browser", "online"].includes(value));
    }

    function isFree(tool) {
        const access = normalizedTokens(tool.access);
        return access.some(value =>
            ["free", "free-web", "freeware", "open-source", "opensource", "free-and-open-source", "open-access"].includes(value)
        ) || isOpenSource(tool);
    }

    function isFreeWeb(tool) {
        const access = normalizedTokens(tool.access);
        const explicit = access.some(value =>
            ["free-web", "free-online", "free-web-app", "open-access-web"].includes(value)
        );
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
        const domainLabels = domainIds(tool).map(domainName);
        const tasks = (Array.isArray(tool.tasks) ? tool.tasks : []).map(taskName);
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

    function matchingSearchTools(items) {
        const query = state.search.toLowerCase().trim();
        return query ? items.filter(tool => buildSearchText(tool).includes(query)) : items;
    }

    function getBaseTools() {
        return matchingSearchTools(getViewTools(state.view));
    }

    function getScopedTools() {
        return getBaseTools().filter(tool => !state.domain || domainIds(tool).includes(state.domain));
    }

    function populateCategoryFilters() {
        const container = $("#category-filters");
        if (!container) return;
        const base = getBaseTools();
        const domains = Object.entries(taxonomy.domains || {})
            .map(([id, record]) => ({
                id,
                name: record.name || formatLabel(id),
                count: base.filter(tool => domainIds(tool).includes(id)).length
            }))
            .filter(item => item.count > 0);

        const buttons = [
            '<button type="button" class="catalogue-chip' + (!state.domain ? ' is-active' : '') +
                '" data-domain="" aria-pressed="' + (!state.domain ? 'true' : 'false') + '">All areas <span>' + base.length + '</span></button>'
        ];
        domains.forEach(item => {
            const active = state.domain === item.id;
            buttons.push('<button type="button" class="catalogue-chip' + (active ? ' is-active' : '') +
                '" data-domain="' + escapeAttribute(item.id) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
                escapeHtml(item.name) + ' <span>' + item.count + '</span></button>');
        });
        container.innerHTML = buttons.join("");
    }

    function populateAccessFilters() {
        const container = $("#access-filters");
        if (!container) return;
        const scoped = getScopedTools();
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
                escapeHtml(item.label) + ' <span>' + item.count + '</span></button>';
        }).join("");
    }

    function getPrimaryDomain(tool) {
        if (state.domain && domainIds(tool).includes(state.domain)) return state.domain;
        if (state.view === "featured" && featuredDomain.has(tool.id)) return featuredDomain.get(tool.id);
        return domainIds(tool)[0] || "";
    }

    function createCard(tool) {
        const detailUrl = "tool.html?id=" + encodeURIComponent(String(tool.id || ""));
        const domainId = getPrimaryDomain(tool);
        const category = domainId
            ? '<span class="catalogue-card-chip catalogue-card-category">' + escapeHtml(domainName(domainId)) + '</span>'
            : "";
        const statuses = getStatusBadges(tool).map(item =>
            '<span class="catalogue-card-chip catalogue-card-status status-' + item.type + '">' + escapeHtml(item.label) + '</span>'
        ).join("");
        const ownStatus = tool.chemisfree_status === "chemisfree-project"
            ? '<span class="catalogue-card-project">ChemIsFree</span>' : "";

        return '<article class="catalogue-tool-card">' +
            '<a class="catalogue-card-hitarea" href="' + escapeAttribute(detailUrl) +
                '" aria-label="View details for ' + escapeAttribute(toolName(tool)) + '"></a>' +
            '<div class="catalogue-card-topline"><span class="catalogue-card-type">' + escapeHtml(getResourceLabel(tool)) + '</span>' +
                ownStatus + '</div>' +
            '<h3><a href="' + escapeAttribute(detailUrl) + '">' + escapeHtml(toolName(tool)) + '</a></h3>' +
            '<p class="catalogue-card-description">' + escapeHtml(tool.description || "No description available.") + '</p>' +
            '<div class="catalogue-card-footer">' +
                '<div class="catalogue-card-tags">' + category + statuses + '</div>' +
                '<span class="catalogue-card-arrow" aria-hidden="true">↗</span>' +
            '</div>' +
        '</article>';
    }

    function renderCards() {
        const grid = $("#catalogue-grid");
        const noResults = $("#no-results");
        if (!grid) return;
        const filtered = getScopedTools().filter(tool => matchesAccess(tool, state.access));
        grid.innerHTML = filtered.map(createCard).join("");
        const count = $("#result-count");
        if (count) count.textContent = filtered.length + (filtered.length === 1 ? " tool shown" : " tools shown");
        if (noResults) noResults.hidden = filtered.length !== 0;
        const summary = $("#active-filter-summary");
        if (summary) {
            const parts = [state.view === "featured" ? "FEATURED SHORTLIST" : "ALL LISTED TOOLS"];
            if (state.domain) parts.push(domainName(state.domain).toUpperCase());
            if (state.access) parts.push(state.access.replace("-", " ").toUpperCase());
            if (state.search) parts.push("SEARCH: " + state.search.toUpperCase());
            summary.textContent = parts.join(" · ");
        }
    }

    function renderAll() {
        const base = getBaseTools();
        if (state.domain && !base.some(tool => domainIds(tool).includes(state.domain))) state.domain = "";
        populateCategoryFilters();
        populateAccessFilters();
        renderCards();
        updateUrlState();
        $("#view-featured")?.classList.toggle("is-active", state.view === "featured");
        $("#view-featured")?.setAttribute("aria-pressed", state.view === "featured" ? "true" : "false");
        $("#view-all")?.classList.toggle("is-active", state.view === "all");
        $("#view-all")?.setAttribute("aria-pressed", state.view === "all" ? "true" : "false");
    }

    function bindEvents() {
        $("#search")?.addEventListener("input", () => {
            state.search = $("#search").value.trim();
            renderAll();
        });
        $("#view-featured")?.addEventListener("click", () => {
            state.view = "featured";
            renderAll();
        });
        $("#view-all")?.addEventListener("click", () => {
            state.view = "all";
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
        state.view = params.get("view") === "all" ? "all" : "featured";
        state.domain = params.get("area") || params.get("domain") || "";
        state.access = params.get("access") || "";
        state.search = params.get("search") || "";
        const search = $("#search");
        if (search) search.value = state.search;
        if (state.access && !["open-source", "free", "free-web", "commercial"].includes(state.access)) state.access = "";
        if (state.domain && !Object.hasOwn(taxonomy.domains || {}, state.domain)) state.domain = "";
    }

    function updateUrlState() {
        const params = new URLSearchParams();
        if (state.view === "all") params.set("view", "all");
        if (state.domain) params.set("area", state.domain);
        if (state.access) params.set("access", state.access);
        if (state.search) params.set("search", state.search);
        const query = params.toString();
        window.history.replaceState({}, "", query ? window.location.pathname + "?" + query : window.location.pathname);
    }

    function formatLabel(value) {
        return String(value || "").replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
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
        return escapeHtml(value).replace(String.fromCharCode(96), "&#096;");
    }

    document.addEventListener("DOMContentLoaded", loadCatalogue);
})();