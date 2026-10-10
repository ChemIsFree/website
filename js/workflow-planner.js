(function () {
    "use strict";

    var catalogue = [];
    var taxonomy = { domains: {}, resources: {} };
    var latestPlanText = "";
    var customOrder = [];
    var MAX_CUSTOM_TASKS = 8;

    var templates = {
        "target-to-hit": {
            title: "Target-to-hit virtual screening",
            summary: "A target-centred route from biological context and receptor preparation to compound ranking and inspection.",
            stages: [
                { title: "Frame the target and binding site", tasks: ["target-assessment", "binding-site-analysis"], detail: "Check target context and identify a site suitable for the question." },
                { title: "Find or prepare a protein structure", tasks: ["protein-structure-prediction", "protein-preparation"], detail: "Choose a suitable structure, inspect quality, and prepare it for downstream calculations." },
                { title: "Prepare the compound set", tasks: ["ligand-preparation", "structure-conversion"], detail: "Standardise structures and generate suitable input representations." },
                { title: "Dock and rank compounds", tasks: ["molecular-docking", "structure-based-screening"], detail: "Run a docking or screening workflow and retain the assumptions and scoring method." },
                { title: "Inspect poses and contacts", tasks: ["interaction-analysis", "molecular-visualization", "binding-site-analysis"], detail: "Review plausible poses and interactions rather than relying on scores alone." },
                { title: "Connect predictions to evidence", tasks: ["bioactivity-analysis", "data-curation"], detail: "Compare shortlisted compounds with measured activity and the limits of existing evidence." }
            ]
        },
        "ligand-based-modeling": {
            title: "Ligand-based discovery / QSAR",
            summary: "A data-to-model route for cleaning activity data, understanding chemical space, training models, and checking reliability.",
            stages: [
                { title: "Collect relevant activity evidence", tasks: ["bioactivity-analysis", "compound-library-search"], detail: "Start with the assay context, measurement type, target, and source provenance." },
                { title: "Curate and standardise structures", tasks: ["data-curation", "structure-conversion", "ligand-preparation"], detail: "Resolve duplicates, units, salts, structures, and assay conflicts before modelling." },
                { title: "Explore chemical series", tasks: ["chemical-space", "scaffold-analysis"], detail: "Inspect diversity, scaffold coverage, and the possibility of data leakage." },
                { title: "Build or apply predictive models", tasks: ["qsar", "machine-learning"], detail: "Choose an appropriate ligand-based method and document the applicability domain." },
                { title: "Evaluate model reliability", tasks: ["benchmarks-datasets", "chemical-data-analysis"], detail: "Use suitable validation splits, baselines, and external or prospective checks where possible." }
            ]
        },
        "admet": {
            title: "Molecular properties and ADMET profiling",
            summary: "A screening-level route from structure preparation to property, ADME, and toxicity assessment.",
            stages: [
                { title: "Prepare molecular structures", tasks: ["structure-conversion", "ligand-preparation"], detail: "Check valence, protonation, stereochemistry, and representation consistency." },
                { title: "Calculate physicochemical properties", tasks: ["molecular-descriptors-properties", "physicochemical-properties", "drug-likeness"], detail: "Use descriptors as interpretable screens, not as proof of developability." },
                { title: "Estimate absorption and disposition", tasks: ["adme"], detail: "Choose models relevant to the endpoint and record the model version and intended domain." },
                { title: "Screen toxicity and liabilities", tasks: ["toxicity"], detail: "Treat predictions as prioritisation signals that need experimental and regulatory context." },
                { title: "Check the evidence and data quality", tasks: ["benchmarks-datasets", "data-curation"], detail: "Review known applicability limits and the quality of the structures being predicted." }
            ]
        },
        "molecular-dynamics": {
            title: "Molecular dynamics and binding analysis",
            summary: "A structure-based route covering system preparation, simulation, trajectory interpretation, and optional free-energy methods.",
            stages: [
                { title: "Select and prepare the receptor", tasks: ["protein-preparation", "protein-structure-prediction"], detail: "Check structural quality, unresolved regions, cofactors, and the suitability of the starting model." },
                { title: "Prepare ligand and complex", tasks: ["ligand-preparation", "structure-conversion"], detail: "Check atom mapping, protonation, parameters, and ligand geometry." },
                { title: "Set up and run simulations", tasks: ["molecular-dynamics"], detail: "Choose force fields, ensemble, sampling, controls, and replicate strategy deliberately." },
                { title: "Analyse trajectories", tasks: ["trajectory-analysis", "molecular-dynamics"], detail: "Use more than a single summary metric and consider convergence and replicate consistency." },
                { title: "Estimate binding free energy if justified", tasks: ["free-energy"], detail: "Free-energy calculations are optional and carry additional setup and convergence requirements." },
                { title: "Inspect structures and interactions", tasks: ["interaction-analysis", "molecular-visualization"], detail: "Use visual inspection alongside quantitative analyses, not as a substitute for them." }
            ]
        },
        "retrosynthesis": {
            title: "Retrosynthesis and reaction planning",
            summary: "A chemistry-led route from target structure to proposed disconnections, reaction options, and route review.",
            stages: [
                { title: "Define the target structure", tasks: ["structure-drawing", "structure-search"], detail: "Confirm connectivity, stereochemistry, and the exact target representation." },
                { title: "Generate retrosynthetic proposals", tasks: ["retrosynthesis", "route-planning"], detail: "Treat suggested disconnections as hypotheses that need chemist review." },
                { title: "Review reaction outcomes and precedent", tasks: ["reaction-prediction", "reaction-analysis"], detail: "Check conditions, selectivity, substrate scope, and evidence for each key transformation." },
                { title: "Compare route feasibility", tasks: ["route-planning", "chemical-data-analysis"], detail: "Review step count, availability, safety, cost, and supporting literature before choosing a route." },
                { title: "Record the decisions", tasks: ["data-curation", "workflow-construction"], detail: "Keep source references, rejected options, and assumptions with the final route." }
            ]
        },
        "compound-curation": {
            title: "Chemical and bioactivity data curation",
            summary: "A reproducible data route for collecting, standardising, analysing, and documenting chemical records.",
            stages: [
                { title: "Locate relevant compounds and evidence", tasks: ["bioactivity-analysis", "compound-library-search"], detail: "Capture source database, target, assay, units, and measurement type." },
                { title: "Standardise and quality-check records", tasks: ["data-curation", "structure-conversion"], detail: "Document duplicate handling, structure normalisation, missing data, and value aggregation." },
                { title: "Describe chemical space", tasks: ["molecular-descriptors-properties", "chemical-space", "scaffold-analysis"], detail: "Summarise descriptors, diversity, scaffold coverage, and outliers." },
                { title: "Analyse or model the curated data", tasks: ["chemical-data-analysis", "machine-learning", "qsar"], detail: "Choose a method that matches the data quality and research question." },
                { title: "Keep a reproducible trail", tasks: ["workflow-construction", "research-infrastructure", "benchmarks-datasets"], detail: "Record inputs, versions, transformations, and quality checks so the analysis can be repeated." }
            ]
        }
    };

    function byId(id) { return document.getElementById(id); }
    function unique(items) { return Array.from(new Set(items)); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function safeUrl(value) {
        var valueText = String(value || "");
        return /^https?:\/\//i.test(valueText) ? valueText : "";
    }
    function label(value) {
        return String(value || "").replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    function taskNames(ids) {
        var result = [];
        Object.keys(taxonomy.domains || {}).forEach(function (domainId) {
            asArray(taxonomy.domains[domainId].tasks).forEach(function (task) {
                if (ids.indexOf(task.id) !== -1 && result.indexOf(task.name) === -1) result.push(task.name);
            });
        });
        return result;
    }
    function interfaceSet(tool) {
        return asArray(tool.interface).map(function (x) { return String(x).toLowerCase(); });
    }
    function hasGuiWeb(tool) {
        var items = interfaceSet(tool);
        return items.indexOf("gui") !== -1 || items.indexOf("web") !== -1;
    }
    function hasCli(tool) {
        var items = interfaceSet(tool);
        var codeLanguages = asArray(tool.languages).map(function (x) { return String(x).toLowerCase(); });
        var codeInterfaces = ["cli", "python", "r", "c++", "java", "notebook"];
        return codeInterfaces.some(function (kind) {
            return items.indexOf(kind) !== -1 || codeLanguages.indexOf(kind) !== -1;
        });
    }
    function hasOpenSource(tool) {
        // Source files alone do not establish an open-source licence.
        return asArray(tool.access).indexOf("open-source") !== -1 &&
            /^(MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|GPL-2\.0|GPL-3\.0|AGPL-3\.0|LGPL-2\.1|LGPL-3\.0|MPL-2\.0|AFL-3\.0|Artistic-2\.0|Unlicense)$/i.test(String(tool.license || ""));
    }
    function osKnown(tool) {
        var platforms = asArray(tool.platforms).map(function (x) { return String(x).toLowerCase(); });
        return platforms.indexOf("linux") !== -1 || platforms.indexOf("windows") !== -1 || platforms.indexOf("macos") !== -1;
    }
    function fitsStrictPreferences(tool, prefs) {
        // This planner must never suggest an entry not explicitly marked as free access.
        if (asArray(tool.access).indexOf("free") === -1) return false;
        var gui = hasGuiWeb(tool);
        var cli = hasCli(tool);
        if (prefs.interface === "gui-only" && (!gui || (cli && !gui))) return false;
        if (prefs.interface === "cli-only" && !cli) return false;
        if (prefs.access === "oss-only" && !hasOpenSource(tool)) return false;
        if (prefs.access === "web-only" && interfaceSet(tool).indexOf("web") === -1) return false;
        var platforms = asArray(tool.platforms).map(function (x) { return String(x).toLowerCase(); });
        var explicitDesktopPlatform = platforms.some(function (platform) {
            return ["linux", "windows", "macos", "desktop"].indexOf(platform) !== -1;
        });
        var browserOnly = platforms.indexOf("web") !== -1 && !explicitDesktopPlatform;
        if (prefs.os !== "any" && osKnown(tool) && platforms.indexOf(prefs.os) === -1 && platforms.indexOf("desktop") === -1) return false;
        if (prefs.compute === "standard" && String(tool.gpu || "").toLowerCase() === "required") return false;
        return true;
    }
    function scoreTool(tool, taskIds, prefs) {
        var matched = asArray(tool.tasks).filter(function (taskId) { return taskIds.indexOf(taskId) !== -1; });
        if (!matched.length) return null;
        var score = Math.max(1, 11 - taskIds.indexOf(matched[0]) * 1.5);
        score += Math.max(0, matched.length - 1) * 1.5;
        var reasons = [];
        reasons.push("Catalogue task match: " + taskNames(matched).join(", "));

        var interfaces = interfaceSet(tool);
        var guiWeb = hasGuiWeb(tool);
        var cli = hasCli(tool);
        if (prefs.interface === "gui-prefer" || prefs.interface === "gui-only") {
            if (guiWeb) { score += 3; reasons.push("matches your GUI / web preference"); }
            else if (prefs.interface === "gui-prefer" && cli) score -= 1;
            else if (interfaces.length === 0) reasons.push("interface is not classified");
        } else if (prefs.interface === "cli-prefer" || prefs.interface === "cli-only") {
            if (cli) { score += 3; reasons.push("matches your command-line / code preference"); }
            else if (prefs.interface === "cli-prefer" && guiWeb) score -= 1;
            else if (interfaces.length === 0) reasons.push("interface is not classified");
        } else if (interfaces.length === 0) {
            reasons.push("interface not specified in the catalogue");
        }

        var platforms = asArray(tool.platforms).map(function (x) { return String(x).toLowerCase(); });
        var explicitDesktopPlatform = platforms.some(function (platform) {
            return ["linux", "windows", "macos", "desktop"].indexOf(platform) !== -1;
        });
        var browserOnly = platforms.indexOf("web") !== -1 && !explicitDesktopPlatform;
        if (prefs.os !== "any") {
            if (platforms.indexOf(prefs.os) !== -1) {
                score += 3;
                reasons.push("catalogue lists " + label(prefs.os) + " support");
            } else if (browserOnly) {
                score += 1;
                reasons.push("browser-based resource; typically usable regardless of desktop operating system");
            } else if (platforms.length === 0 || !osKnown(tool)) {
                reasons.push("platform compatibility needs checking");
            }
        }
        if (prefs.compute === "standard" && String(tool.gpu || "").toLowerCase() !== "required") {
            score += 1;
            if (String(tool.gpu || "").toLowerCase() === "unknown") reasons.push("GPU requirements are not recorded; verify before running");
        } else if (prefs.compute === "gpu" && /recommended|required/i.test(String(tool.gpu || ""))) {
            score += 1;
            reasons.push("GPU-aware option according to catalogue metadata");
        }

        if (prefs.access === "oss-prefer" || prefs.access === "oss-only") {
            if (hasOpenSource(tool)) { score += 3; reasons.push("open-source preferred"); }
        }
        if (prefs.access === "balanced" && asArray(tool.access).indexOf("free") !== -1) score += 1;
        if (prefs.experience === "beginner") {
            if (guiWeb) { score += 2; reasons.push("more approachable GUI / web route"); }
            else if (cli) score -= 0.5;
        } else if (prefs.experience === "advanced" && (cli || tool.source_available)) {
            score += 1;
            reasons.push("supports a code / command-line oriented workflow");
        }

        if (tool.verification && tool.verification.status === "verified") {
            score += 2.5;
            reasons.push("marked verified in ChemIsFree metadata");
        } else if (tool.chemisfree_status === "registry-listed") {
            score -= 0.25;
            reasons.push("registry import; not independently reviewed by ChemIsFree");
        } else if (tool.chemisfree_status === "community-project" || tool.chemisfree_status === "curated-resource") {
            score += 1;
            reasons.push("hand-maintained ChemIsFree catalogue entry");
        }
        if (tool.status === "active") score += 0.5;
        if (tool.access_note) reasons.push("licence/access terms need confirmation");
        return { tool: tool, score: score, matched: matched, reasons: unique(reasons).slice(0, 4) };
    }
    function getPrefs() {
        return {
            goal: byId("planner-goal").value,
            context: byId("planner-context").value.trim(),
            interface: byId("planner-interface").value,
            os: byId("planner-os").value,
            compute: byId("planner-compute").value,
            access: byId("planner-access").value,
            experience: byId("planner-experience").value
        };
    }
    function getCustomTasks() {
        return customOrder.map(function (id) {
            var el = document.querySelector('[data-custom-task][value="' + id.replace(/"/g, '\\\"') + '"]');
            if (!el || !el.checked) return null;
            return { id: el.value, name: el.getAttribute("data-task-name") || label(el.value), tasks: [el.value], detail: "A custom step based on the selected catalogue task. Check that its output is suitable for the next step." };
        }).filter(Boolean);
    }
    function buildStages(prefs) {
        if (prefs.goal === "custom") return getCustomTasks();
        return templates[prefs.goal] ? templates[prefs.goal].stages : [];
    }
    function getTemplate(prefs) {
        if (prefs.goal === "custom") return {
            title: "Custom research workflow",
            summary: "A user-assembled sequence of catalogue tasks. Tool recommendations follow the selected order."
        };
        return templates[prefs.goal] || { title: "Research workflow", summary: "" };
    }

    function renderCustomOptions() {
        var target = byId("custom-task-options");
        if (!target) return;
        var html = "";
        Object.keys(taxonomy.domains || {}).forEach(function (domainId) {
            var domain = taxonomy.domains[domainId] || {};
            var tasks = asArray(domain.tasks);
            if (!tasks.length) return;
            html += '<fieldset class="planner-task-group"><legend>' + esc(domain.name || label(domainId)) + '</legend><div>';
            tasks.forEach(function (task) {
                html += '<label class="planner-task-option"><input type="checkbox" data-custom-task value="' + esc(task.id) + '" data-task-name="' + esc(task.name) + '"><span>' + esc(task.name) + '</span></label>';
            });
            html += '</div></fieldset>';
        });
        target.innerHTML = html;
        target.querySelectorAll("[data-custom-task]").forEach(function (checkbox) {
            checkbox.addEventListener("change", function () {
                if (checkbox.checked && customOrder.indexOf(checkbox.value) === -1) customOrder.push(checkbox.value);
                if (!checkbox.checked) customOrder = customOrder.filter(function (id) { return id !== checkbox.value; });
                updateCustomTaskCount();
                renderCustomOrder();
            });
        });
        updateCustomTaskCount();
        renderCustomOrder();
    }
    function renderCustomOrder() {
        var target = byId("custom-task-order");
        if (!target) return;
        if (!customOrder.length) {
            target.innerHTML = '<p class="planner-order-empty">Selected steps will appear here in sequence.</p>';
            return;
        }
        var html = '<p class="planner-order-heading">WORKFLOW ORDER</p><ol>';
        customOrder.forEach(function (id, index) {
            var checkbox = document.querySelector('[data-custom-task][value="' + id.replace(/"/g, '\\\"') + '"]');
            var name = checkbox ? checkbox.getAttribute("data-task-name") : label(id);
            html += '<li><span>' + esc(name) + '</span><div class="planner-order-controls">' +
                '<button type="button" data-order-move="up" data-order-id="' + esc(id) + '"' + (index === 0 ? ' disabled' : '') + ' aria-label="Move ' + esc(name) + ' earlier">↑</button>' +
                '<button type="button" data-order-move="down" data-order-id="' + esc(id) + '"' + (index === customOrder.length - 1 ? ' disabled' : '') + ' aria-label="Move ' + esc(name) + ' later">↓</button>' +
                '</div></li>';
        });
        html += '</ol>';
        target.innerHTML = html;
        target.querySelectorAll("[data-order-move]").forEach(function (button) {
            button.addEventListener("click", function () {
                var id = button.getAttribute("data-order-id");
                var index = customOrder.indexOf(id);
                var next = button.getAttribute("data-order-move") === "up" ? index - 1 : index + 1;
                if (index < 0 || next < 0 || next >= customOrder.length) return;
                var swap = customOrder[index];
                customOrder[index] = customOrder[next];
                customOrder[next] = swap;
                renderCustomOrder();
            });
        });
    }
    function updateCustomTaskCount() {
        var checked = Array.from(document.querySelectorAll("[data-custom-task]:checked"));
        var count = byId("custom-task-count");
        if (count) count.textContent = checked.length + " / " + MAX_CUSTOM_TASKS + " selected";
        document.querySelectorAll("[data-custom-task]").forEach(function (checkbox) {
            if (!checkbox.checked && checked.length >= MAX_CUSTOM_TASKS) checkbox.disabled = true;
            else checkbox.disabled = false;
        });
    }
    function updateCustomVisibility() {
        var isCustom = byId("planner-goal").value === "custom";
        byId("custom-task-picker").hidden = !isCustom;
    }
    function safeToolLink(tool) {
        var url = safeUrl(tool.website) || safeUrl(tool.repository) || safeUrl(tool.documentation);
        if (!url) return '<span class="planner-no-link">Official link not recorded</span>';
        return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Visit resource ↗</a>';
    }
    function toolCard(item, index) {
        var tool = item.tool;
        var recordType = tool.chemisfree_status === "registry-listed" ? "Registry import · review pending" :
            tool.verification && tool.verification.status === "verified" ? "Verified catalogue record" : "Catalogue record";
        var license = tool.license && tool.license !== "Not specified" ? tool.license : "Licence not specified";
        var access = asArray(tool.access).indexOf("open-source") !== -1 ? "Free · open-source-listed" : "Free access listed";
        var details = item.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("");
        return '<article class="planner-tool-card">' +
            '<div class="planner-tool-topline"><span>' + (index === 0 ? "RECOMMENDED OPTION" : "ALTERNATIVE " + index) + '</span><span class="planner-score">' + Math.round(item.score) + ' MATCH</span></div>' +
            '<h4>' + esc(tool.name || "Unnamed tool") + '</h4>' +
            '<p class="planner-tool-description">' + esc(tool.description || "Description not recorded.") + '</p>' +
            '<div class="planner-tool-meta"><span>' + esc(access) + '</span><span>' + esc(license) + '</span><span>' + esc(recordType) + '</span></div>' +
            '<details class="planner-why"><summary>Why it matched</summary><ul>' + details + '</ul></details>' +
            '<div class="planner-tool-links"><a href="tool.html?id=' + encodeURIComponent(tool.id || "") + '">ChemIsFree details ↗</a>' + safeToolLink(tool) + '</div>' +
            '</article>';
    }
    function renderPlan(prefs) {
        var stages = buildStages(prefs);
        var planTemplate = getTemplate(prefs);
        var results = byId("planner-results");
        var formMessage = byId("planner-form-message");
        if (!stages.length) {
            if (formMessage) formMessage.textContent = "For a custom route, select one to eight tasks first.";
            results.innerHTML = '<div class="planner-empty-state"><h2>Add at least one task.</h2><p>Select tasks in the custom workflow panel and build the plan again.</p></div>';
            byId("planner-copy-row").hidden = true;
            latestPlanText = "";
            return;
        }
        var prefsSummary = [];
        if (prefs.os !== "any") prefsSummary.push(label(prefs.os));
        if (prefs.interface !== "any") prefsSummary.push(byId("planner-interface").selectedOptions[0].textContent);
        if (prefs.compute === "standard") prefsSummary.push("CPU / standard laptop");
        if (prefs.access === "oss-only") prefsSummary.push("open-source only");
        if (prefs.access === "web-only") prefsSummary.push("free web tools only");
        var html = '<div class="planner-results-header"><div><p class="eyebrow">02 / YOUR WORKFLOW</p><h2>' + esc(planTemplate.title) + '</h2><p>' + esc(planTemplate.summary || "") + '</p>' +
            (prefs.context ? '<p class="planner-context-note"><strong>Project note:</strong> ' + esc(prefs.context) + '</p>' : '') +
            '</div><div class="planner-result-stats"><strong>' + stages.length + '</strong><span>steps in order</span><small>' + esc(prefsSummary.join(" · ") || "No extra constraints") + '</small></div></div>';
        var missing = [];
        var summaryLines = ["ChemIsFree workflow plan", planTemplate.title];
        if (prefs.context) summaryLines.push("Project context: " + prefs.context);
        summaryLines.push("Constraints: " + (prefsSummary.join(", ") || "No extra constraints"));
        summaryLines.push("");
        stages.forEach(function (stage, index) {
            var taskIds = asArray(stage.tasks);
            var candidates = [];
            catalogue.forEach(function (tool) {
                if (!fitsStrictPreferences(tool, prefs)) return;
                var scored = scoreTool(tool, taskIds, prefs);
                if (scored) candidates.push(scored);
            });
            candidates.sort(function (a, b) { return b.score - a.score || String(a.tool.name).localeCompare(String(b.tool.name)); });
            var top = candidates.slice(0, 3);
            var taskLabels = taskNames(taskIds);
            summaryLines.push((index + 1) + ". " + stage.title);
            summaryLines.push("   Task tags: " + (taskLabels.join(", ") || taskIds.join(", ")));
            if (!top.length) {
                missing.push(stage.title);
                html += '<article class="planner-stage planner-stage-missing"><div class="planner-stage-heading"><span class="planner-stage-index">' + String(index + 1).padStart(2, "0") + '</span><div><p class="eyebrow">STEP ' + String(index + 1).padStart(2, "0") + ' / NEEDS REVIEW</p><h3>' + esc(stage.title) + '</h3><p>' + esc(stage.detail || "") + '</p></div></div><div class="planner-no-candidates"><strong>No match for the selected constraints.</strong><p>Try a less restrictive interface, operating system, or access preference, or browse the related task in the catalogue.</p>' +
                    taskIds.map(function (id) { return '<a href="tools.html?task=' + encodeURIComponent(id) + '">' + esc(label(id)) + ' ↗</a>'; }).join(" ") + '</div></article>';
                summaryLines.push("   No match for current constraints.");
                return;
            }
            summaryLines.push("   Recommended: " + top[0].tool.name + " — " + (top[0].tool.website || top[0].tool.repository || ""));
            top.slice(1).forEach(function (item) { summaryLines.push("   Alternative: " + item.tool.name + " — " + (item.tool.website || item.tool.repository || "")); });
            html += '<article class="planner-stage"><div class="planner-stage-heading"><span class="planner-stage-index">' + String(index + 1).padStart(2, "0") + '</span><div><p class="eyebrow">STEP ' + String(index + 1).padStart(2, "0") + ' / ' + esc(taskLabels.slice(0, 2).join(" · ") || "CATALOGUE TASK") + '</p><h3>' + esc(stage.title) + '</h3><p>' + esc(stage.detail || "") + '</p></div></div><div class="planner-recommendations">' + top.map(toolCard).join("") + '</div></article>';
        });
        if (missing.length) {
            html += '<div class="planner-caveat"><strong>' + missing.length + ' step(s) have no match under these strict constraints.</strong><p>Relax one constraint or visit the task links shown in the affected step. The planner intentionally does not substitute a tool from an unrelated task.</p></div>';
            summaryLines.push("", "Unmatched steps: " + missing.join(", "));
        }
        html += '<div class="planner-caveat"><strong>Research-use reminder</strong><p>Task tags are discovery aids, not proof of scientific fitness or interoperability. Confirm the version, licence, platform, input/output formats, validation evidence, and citations before joining tools into a real protocol.</p></div>';
        latestPlanText = summaryLines.join("\n");
        results.innerHTML = html;
        byId("planner-copy-row").hidden = false;
        byId("planner-copy-fallback").hidden = true;
        if (formMessage) formMessage.textContent = "Plan built from " + catalogue.length + " catalogue records.";
        results.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function buildPreferences() {
        var prefs = getPrefs();
        if (prefs.goal === "custom" && !getCustomTasks().length) {
            byId("planner-form-message").textContent = "Select at least one task for a custom workflow.";
            return;
        }
        renderPlan(prefs);
    }
    function resetForm() {
        byId("planner-form").reset();
        byId("planner-goal").value = "target-to-hit";
        byId("planner-interface").value = "any";
        byId("planner-os").value = "any";
        byId("planner-compute").value = "standard";
        byId("planner-access").value = "balanced";
        byId("planner-experience").value = "mixed";
        byId("planner-context").value = "";
        document.querySelectorAll("[data-custom-task]").forEach(function (checkbox) { checkbox.checked = false; checkbox.disabled = false; });
        customOrder = [];
        updateCustomTaskCount();
        renderCustomOrder();
        updateCustomVisibility();
        byId("planner-form-message").textContent = "";
        byId("planner-results").innerHTML = '<div class="planner-empty-state"><span class="planner-step-number">READY / 01</span><h2>Your toolchain will appear here.</h2><p>Choose a research objective, set your practical constraints, and build a plan to see recommended tools for each step.</p></div>';
        byId("planner-copy-row").hidden = true;
        byId("planner-copy-fallback").hidden = true;
        byId("planner-copy-fallback").value = "";
        latestPlanText = "";
    }
    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        var temporary = document.createElement("textarea");
        temporary.value = text;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "absolute";
        temporary.style.left = "-9999px";
        document.body.appendChild(temporary);
        temporary.select();
        var success = document.execCommand("copy");
        temporary.remove();
        return success ? Promise.resolve() : Promise.reject(new Error("Copy is not available in this browser."));
    }
    async function loadData() {
        try {
            var responses = await Promise.all([fetch("data/tools.json"), fetch("data/taxonomy.json")]);
            if (!responses[0].ok || !responses[1].ok) throw new Error("Catalogue file unavailable");
            catalogue = await responses[0].json();
            taxonomy = await responses[1].json();
            byId("planner-catalogue-status").textContent = catalogue.length.toLocaleString() + " free catalogue records";
            renderCustomOptions();
            updateCustomVisibility();
        } catch (error) {
            byId("planner-catalogue-status").textContent = "Catalogue unavailable";
            byId("planner-form-message").textContent = "The catalogue could not be loaded. Open the Explore page to check availability.";
            console.error("Could not load workflow catalogue:", error);
        }
    }

    byId("planner-goal").addEventListener("change", updateCustomVisibility);
    byId("planner-form").addEventListener("submit", function (event) { event.preventDefault(); buildPreferences(); });
    byId("planner-reset").addEventListener("click", resetForm);
    byId("planner-copy").addEventListener("click", async function () {
        var status = byId("planner-copy-status");
        try {
            await copyText(latestPlanText);
            status.textContent = "Workflow summary copied.";
            byId("planner-copy-fallback").hidden = true;
        } catch (error) {
            var fallback = byId("planner-copy-fallback");
            fallback.value = latestPlanText;
            fallback.hidden = false;
            fallback.focus();
            fallback.select();
            status.textContent = "Automatic copy is unavailable. The summary is ready to copy from the text box below.";
        }
    });
    loadData();
})();