(function () {
    "use strict";

    const form = document.getElementById("workflow-form");
    const results = document.getElementById("workflow-results");
    const feedback = document.getElementById("workflow-intake-feedback");
    const targetPanel = document.getElementById("target-name-panel");
    const targetInput = document.getElementById("planner-target");
    let selectedChemblTargetRecord = null;
    let targetLookupRequest = 0;
    let activityDownloadInProgress = false;

    const objectiveTitles = {
        "target-context": "Understand the target and binding site",
        "ligand-landscape": "Analyze known ligands and SAR",
        "hit-identification": "Find and prioritize hits",
        "structure-based": "Dock compounds and review poses",
        "interactions": "Analyze protein–ligand interactions",
        "qsar": "Build QSAR or predictive models",
        "analogues": "Design analogues",
        "de-novo": "Explore molecular generation",
        "admet": "Assess properties or ADMET",
        "synthesis": "Plan synthesis"
    };

    const approachTitles = {
        "ligand-based": "Ligand-based",
        "structure-based": "Structure-based",
        "mixed": "Mixed approach"
    };

    const interfaceTitles = {
        "yes": "GUI-first",
        "not-necessarily": "GUI and code"
    };

    const pymolOverview = [
        "# Replace the filename with one of your downloaded structures.",
        "load /path/to/your_structure.cif, complex",
        "",
        "hide everything",
        "show cartoon, complex and polymer.protein",
        "color cyan, complex and polymer.protein",
        "set cartoon_transparency, 0.35, complex and polymer.protein",
        "",
        "# Start with organic non-solvent molecules. If several are selected,",
        "# replace this with the exact ligand residue / chain / residue number.",
        "select ligand, complex and organic and not solvent",
        "show sticks, ligand",
        "util.cbag ligand",
        "color salmon, ligand and elem C",
        "set valence, 1  # display ligand bond orders where the structure records them",
        "",
        "set stick_radius, 0.18",
        "bg_color white",
        "set ray_opaque_background, on",
        "set antialias, 2",
        "orient ligand",
        "zoom ligand, 8"
    ].join("\n");

    const pymolInteractions = [
        "# Assumes the 'complex' and 'ligand' selections from above exist.",
        "",
        "# 1) Candidate hydrogen bonds (blue dashed lines; geometry-based)",
        "delete hbonds",
        "distance hbonds, (complex and polymer.protein), ligand, 3.6, mode=2",
        "set dash_color, marine, hbonds",
        "set dash_width, 2",
        "set dash_gap, 0.25",
        "hide labels, hbonds",
        "",
        "# 2) Close protein-ligand carbon contacts (orange dashed lines).",
        "# This is a proximity view, NOT a validated hydrophobic-interaction classifier.",
        "delete close_cc",
        "distance close_cc, (complex and polymer.protein and elem C), (ligand and elem C), 4.0, mode=0",
        "set dash_color, orange, close_cc",
        "set dash_width, 1.4",
        "hide labels, close_cc",
        "",
        "# To remove either overlay later, run: delete hbonds",
        "# or: delete close_cc",
        "zoom ligand, 8"
    ].join("\n");

    function escapeHtml(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function selectedValue(name) {
        const selected = form.querySelector('input[name="' + name + '"]:checked');
        return selected ? selected.value : "";
    }

    function selectedObjectives() {
        return Array.from(form.querySelectorAll('input[name="objective"]:checked'))
            .map(function (input) { return input.value; });
    }

    function queryLink(base, query) {
        return base + encodeURIComponent(query || "");
    }

    function setQuestionState(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    function updateIntakeState() {
        const targetChoice = selectedValue("target-choice");
        targetPanel.hidden = targetChoice !== "yes";

        setQuestionState("target-question-state",
            targetChoice === "yes" ? (targetInput.value.trim() ? "Target entered" : "Add target name")
                : targetChoice === "not-yet" ? "No target yet"
                : targetChoice === "private" ? "Target not shared"
                : "Not answered");

        setQuestionState("approach-question-state",
            approachTitles[selectedValue("approach")] || "Choose one");

        setQuestionState("interface-question-state",
            interfaceTitles[selectedValue("gui-only")] || "Choose one");

        const count = selectedObjectives().length;
        setQuestionState("objective-question-state", count ? count + " selected" : "Choose activities");

        if (!feedback.hidden) {
            feedback.hidden = true;
            feedback.textContent = "";
        }
    }

    function firstValidationIssue() {
        const targetChoice = selectedValue("target-choice");
        if (!targetChoice) return {
            question: "question-target",
            message: "Please answer Question 1: choose a target, continue without one, or keep it private.",
            focus: 'input[name="target-choice"]'
        };
        if (targetChoice === "yes" && !targetInput.value.trim()) return {
            question: "question-target",
            message: "Enter a target name or gene symbol, or choose “Not yet” / “Rather not say”.",
            focus: "#planner-target"
        };
        if (!selectedValue("approach")) return {
            question: "question-approach",
            message: "Please answer Question 2: choose your preferred approach.",
            focus: 'input[name="approach"]'
        };
        if (!selectedValue("gui-only")) return {
            question: "question-interface",
            message: "Please answer Question 3: choose your interface preference.",
            focus: 'input[name="gui-only"]'
        };
        if (!selectedObjectives().length) return {
            question: "question-objectives",
            message: "Please answer Question 4: select at least one objective.",
            focus: 'input[name="objective"]'
        };
        return null;
    }

    function showValidation(issue) {
        feedback.textContent = issue.message;
        feedback.hidden = false;
        const question = document.getElementById(issue.question);
        if (question) {
            question.open = true;
            question.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        window.setTimeout(function () {
            const target = document.querySelector(issue.focus);
            if (target) target.focus({ preventScroll: true });
            feedback.focus({ preventScroll: true });
        }, 0);
    }

    function toolLink(label, url, note) {
        return '<a class="workflow-tool-link" href="' + escapeHtml(url) +
            '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(label) +
            ' ↗</strong>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '') + '</a>';
    }

    function codeBlock(id, code, buttonLabel) {
        return '<div class="workflow-code-wrap"><div class="workflow-code-top"><span>' +
            escapeHtml(buttonLabel) + '</span><button type="button" class="copy-code-button" data-copy="' +
            escapeHtml(id) + '">Copy code</button></div><pre><code id="' + escapeHtml(id) + '">' +
            escapeHtml(code) + '</code></pre><p class="copy-code-status" aria-live="polite"></p></div>';
    }

    async function fetchChemblJson(url, timeoutMs) {
        const controller = new AbortController();
        const timeout = window.setTimeout(function () { controller.abort(); }, timeoutMs || 7000);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error("ChEMBL request failed (HTTP " + response.status + ").");
            return await response.json();
        } finally {
            window.clearTimeout(timeout);
        }
    }

    function isHumanTarget(target) {
        return String(target.organism || "").trim().toLowerCase() === "homo sapiens";
    }

    function isSingleProteinTarget(target) {
        return String(target.targetType || "").trim().toUpperCase() === "SINGLE PROTEIN";
    }

    function sortChemblTargets(targets) {
        return targets.slice().sort(function (a, b) {
            if (isHumanTarget(a) !== isHumanTarget(b)) return isHumanTarget(a) ? -1 : 1;
            if (isSingleProteinTarget(a) !== isSingleProteinTarget(b)) return isSingleProteinTarget(a) ? -1 : 1;
            const aCount = Number.isFinite(a.activityCount) ? a.activityCount : -1;
            const bCount = Number.isFinite(b.activityCount) ? b.activityCount : -1;
            if (aCount !== bCount) return bCount - aCount;
            return a.searchOrder - b.searchOrder;
        });
    }

    async function countChemblActivities(target) {
        const params = new URLSearchParams({
            target_chembl_id: target.id,
            standard_type__in: "IC50,Ki,EC50",
            limit: "1",
            only: "activity_id"
        });
        const payload = await fetchChemblJson(
            "https://www.ebi.ac.uk/chembl/api/data/activity.json?" + params.toString(), 6000);
        if (payload.page_meta && payload.page_meta.total_count !== undefined) {
            return Number(payload.page_meta.total_count);
        }
        return Array.isArray(payload.activities) ? payload.activities.length : null;
    }

    function renderChemblTargetCandidates(targets) {
        const list = document.getElementById("chembl-target-results");
        if (!list) return;
        list.innerHTML = targets.map(function (target) {
            const organism = target.organism || "Organism not reported";
            const type = target.targetType || "Target type not reported";
            const count = Number.isFinite(target.activityCount)
                ? target.activityCount.toLocaleString() + " IC₅₀/Kᵢ/EC₅₀ records"
                : "Activity count unavailable";
            const humanTag = isHumanTarget(target)
                ? '<span class="chembl-target-badge">Homo sapiens</span>' : "";
            const proteinTag = isSingleProteinTarget(target)
                ? '<span class="chembl-target-badge">Single protein</span>' : "";
            return '<article class="chembl-target-card">' +
                '<div class="chembl-target-card-copy"><strong>' + escapeHtml(target.name) + '</strong>' +
                '<small>' + escapeHtml(target.id) + ' · ' + escapeHtml(organism) + ' · ' + escapeHtml(type) + '</small>' +
                '<div class="chembl-target-badges">' + humanTag + proteinTag + '</div>' +
                '<small class="chembl-target-count">' + escapeHtml(count) + '</small></div>' +
                '<button type="button" class="chembl-use-target" data-target-id="' + escapeHtml(target.id) + '">Use target</button>' +
                '</article>';
        }).join("");

        list.querySelectorAll(".chembl-use-target").forEach(function (button) {
            button.addEventListener("click", function () {
                const target = targets.find(function (item) {
                    return item.id === button.getAttribute("data-target-id");
                });
                if (!target) return;
                selectedChemblTargetRecord = target;
                const panel = document.getElementById("chembl-export-panel");
                const selected = document.getElementById("chembl-selected-target");
                const status = document.getElementById("chembl-download-status");
                if (panel) panel.hidden = false;
                if (selected) {
                    selected.textContent = target.name + " (" + target.id + ") · " +
                        (target.organism || "organism unknown") + " · " +
                        (Number.isFinite(target.activityCount)
                            ? target.activityCount.toLocaleString() + " qualifying activity records"
                            : "activity record count unavailable");
                }
                if (status) status.textContent = "Choose one or more endpoints. The download keeps their original endpoint labels and assay metadata.";
            });
        });
    }

    async function searchChemblTargets() {
        const input = document.getElementById("planner-target");
        const button = document.getElementById("chembl-target-search");
        const status = document.getElementById("chembl-finder-status");
        const resultsList = document.getElementById("chembl-target-results");
        const exportPanel = document.getElementById("chembl-export-panel");
        const query = input ? input.value.trim() : "";
        const requestId = ++targetLookupRequest;

        if (!query) {
            if (status) status.textContent = "Enter a target name or gene symbol in Question 1 first.";
            return;
        }
        selectedChemblTargetRecord = null;
        if (exportPanel) exportPanel.hidden = true;
        if (resultsList) resultsList.replaceChildren();
        if (button) button.disabled = true;
        if (status) status.textContent = "Searching ChEMBL once for target records…";
        try {
            const params = new URLSearchParams({ q: query, limit: "20" });
            const payload = await fetchChemblJson(
                "https://www.ebi.ac.uk/chembl/api/data/target/search.json?" + params.toString(), 9000);
            if (requestId !== targetLookupRequest) return;
            const records = Array.isArray(payload.targets) ? payload.targets
                : Array.isArray(payload.target_search_results) ? payload.target_search_results : [];
            const seen = new Set();
            const candidates = records.map(function (record, index) {
                return {
                    id: String(record.target_chembl_id || record.chembl_id || ""),
                    name: String(record.pref_name || record.target_name || record.name || "Unnamed target"),
                    organism: String(record.organism || record.target_organism || ""),
                    targetType: String(record.target_type || record.target_type_description || ""),
                    activityCount: null,
                    searchOrder: index
                };
            }).filter(function (target) {
                if (!/^CHEMBL\d+$/i.test(target.id) || seen.has(target.id)) return false;
                seen.add(target.id);
                return true;
            });

            if (!candidates.length) {
                if (status) status.textContent =
                    "ChEMBL returned no target records for this query. Check the spelling or use the DataWarrior / official ChEMBL route above.";
                return;
            }

            const shortlist = sortChemblTargets(candidates).slice(0, 10);
            renderChemblTargetCandidates(shortlist);
            if (status) status.textContent = "Found " + candidates.length +
                " matching target records. Checking IC₅₀/Kᵢ/EC₅₀ record counts for the leading 10; results are already selectable.";

            const countResults = await Promise.all(shortlist.map(async function (target) {
                try {
                    target.activityCount = await countChemblActivities(target);
                } catch (error) {
                    target.activityCount = null;
                }
                return target;
            }));
            if (requestId !== targetLookupRequest) return;
            const sorted = sortChemblTargets(countResults);
            renderChemblTargetCandidates(sorted);
            const counted = sorted.filter(function (target) { return Number.isFinite(target.activityCount); }).length;
            if (status) status.textContent = "Ranked " + sorted.length +
                " targets: Homo sapiens first, then single-protein targets, then the largest number of IC₅₀/Kᵢ/EC₅₀ records. Counts are measurements, not unique compounds." +
                (counted < sorted.length ? " Some counts could not be retrieved; those records are marked unavailable." : "");
        } catch (error) {
            if (requestId !== targetLookupRequest) return;
            if (status) status.textContent =
                "The ChemIsFree lookup could not reach ChEMBL in this browser session. Use DataWarrior's Databases → Search ChEMBL database or open ChEMBL directly above.";
            if (resultsList) resultsList.replaceChildren();
        } finally {
            if (button && requestId === targetLookupRequest) button.disabled = false;
        }
    }

    function csvCell(value) {
        const text = value === undefined || value === null ? "" : String(value);
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function triggerCsvDownload(rows, targetId, endpoints, truncated, totalAvailable) {
        const columns = [
            "activity_id", "target_chembl_id", "target_organism", "molecule_chembl_id",
            "standard_type", "standard_relation", "standard_value", "standard_units", "pchembl_value",
            "assay_chembl_id", "assay_type", "assay_description", "data_validity_comment",
            "potential_duplicate", "document_chembl_id", "bao_label", "src_id"
        ];
        const lines = [columns.map(csvCell).join(",")];
        rows.forEach(function (row) {
            lines.push(columns.map(function (column) { return csvCell(row[column]); }).join(","));
        });
        const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = targetId + "_" + endpoints.join("_") + "_activities.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        const status = document.getElementById("chembl-download-status");
        if (status) status.textContent = "Downloaded " + rows.length.toLocaleString() +
            " activity observations for " + endpoints.join(", ") + ". " +
            (truncated ? "ChEMBL reports " + Number(totalAvailable).toLocaleString() +
                " total; the browser safety limit was reached, so use DataWarrior for the complete dataset." :
                "All observations reported by this query were included. The CSV preserves repeated measurements and assay/source fields.");
    }

    async function downloadChemblActivities() {
        if (!selectedChemblTargetRecord || activityDownloadInProgress) return;
        const endpoints = Array.from(document.querySelectorAll('#chembl-export-panel input[name="chembl-endpoint"]:checked'))
            .map(function (input) { return input.value; });
        const status = document.getElementById("chembl-download-status");
        const button = document.getElementById("download-chembl-activities");
        if (!endpoints.length) {
            if (status) status.textContent = "Select at least one endpoint.";
            return;
        }

        activityDownloadInProgress = true;
        if (button) button.disabled = true;
        try {
            const target = selectedChemblTargetRecord;
            const pageSize = 1000;
            const maxRows = 50000;
            const fields = [
                "activity_id", "molecule_chembl_id", "standard_type", "standard_relation",
                "standard_value", "standard_units", "pchembl_value", "assay_chembl_id",
                "assay_type", "assay_description", "data_validity_comment", "potential_duplicate",
                "document_chembl_id", "bao_label", "src_id", "target_chembl_id", "target_organism"
            ].join(",");
            async function getPage(offset) {
                const params = new URLSearchParams({
                    target_chembl_id: target.id,
                    standard_type__in: endpoints.join(","),
                    limit: String(pageSize),
                    offset: String(offset),
                    only: fields
                });
                const payload = await fetchChemblJson(
                    "https://www.ebi.ac.uk/chembl/api/data/activity.json?" + params.toString(), 14000);
                return {
                    rows: Array.isArray(payload.activities) ? payload.activities : [],
                    total: Number(payload.page_meta && payload.page_meta.total_count !== undefined
                        ? payload.page_meta.total_count : 0)
                };
            }

            if (status) status.textContent = "Retrieving selected activity endpoints from ChEMBL…";
            const first = await getPage(0);
            const totalAvailable = first.total || first.rows.length;
            const targetRows = Math.min(totalAvailable, maxRows);
            let rows = first.rows.slice(0, targetRows);
            const offsets = [];
            for (let offset = pageSize; offset < targetRows; offset += pageSize) offsets.push(offset);

            for (let i = 0; i < offsets.length; i += 4) {
                const batch = offsets.slice(i, i + 4);
                const pages = await Promise.all(batch.map(getPage));
                pages.forEach(function (page) { rows.push.apply(rows, page.rows); });
                if (status) status.textContent = "Retrieving ChEMBL data… " +
                    Math.min(rows.length, targetRows).toLocaleString() + " of " + targetRows.toLocaleString() + " records.";
            }

            rows = rows.slice(0, targetRows);
            if (!rows.length) {
                if (status) status.textContent = "No activity observations were returned for the selected target and endpoints. This is not proof that the target has no active compounds.";
                return;
            }
            triggerCsvDownload(rows, target.id, endpoints, totalAvailable > rows.length, totalAvailable);
        } catch (error) {
            if (status) status.textContent =
                "The activity export failed before all records were retrieved. Try again or use DataWarrior for the full target dataset.";
        } finally {
            activityDownloadInProgress = false;
            if (button) button.disabled = false;
        }
    }

    function wireChemblFinder() {
        const searchButton = document.getElementById("chembl-target-search");
        const downloadButton = document.getElementById("download-chembl-activities");
        if (searchButton) searchButton.addEventListener("click", searchChemblTargets);
        if (downloadButton) downloadButton.addEventListener("click", downloadChemblActivities);
    }

    function renderWorkflow() {
        const targetChoice = selectedValue("target-choice");
        const target = targetChoice === "yes" ? targetInput.value.trim() : "";
        const targetLabel = target || (targetChoice === "private" ? "Target not disclosed" :
            targetChoice === "not-yet" ? "Target not selected yet" : "Target not specified");
        const chemblUrl = target
            ? queryLink("https://www.ebi.ac.uk/chembl/web_components/search_results/", target)
            : "https://www.ebi.ac.uk/chembl/";
        const pdbUrl = target
            ? queryLink("https://www.rcsb.org/search?query=", target)
            : "https://www.rcsb.org/";
        const approach = approachTitles[selectedValue("approach")];
        const interfaceChoice = interfaceTitles[selectedValue("gui-only")];
        const objectives = selectedObjectives().map(function (id) { return objectiveTitles[id] || id; });
        const objectivesMarkup = objectives.map(function (item) {
            return '<span class="workflow-summary-chip">' + escapeHtml(item) + '</span>';
        }).join("");

        results.innerHTML =
            '<div class="planner-results-heading">' +
                '<div><p class="eyebrow">02 / YOUR STARTING WORKFLOW</p>' +
                '<h2>A clear route<br>in three steps.</h2></div>' +
                '<div class="workflow-summary"><p><strong>Target</strong><span>' + escapeHtml(targetLabel) + '</span></p>' +
                    '<p><strong>Approach</strong><span>' + escapeHtml(approach) + '</span></p>' +
                    '<p><strong>Interface</strong><span>' + escapeHtml(interfaceChoice) + '</span></p>' +
                    '<div class="workflow-summary-objectives"><strong>Your focus</strong><div>' + objectivesMarkup + '</div></div>' +
                '</div>' +
            '</div>' +
            '<div class="workflow-stepper" role="tablist" aria-label="Workflow steps">' +
                '<button type="button" class="workflow-step-tab is-active" role="tab" id="workflow-tab-1" aria-selected="true" aria-controls="workflow-panel-1" data-step-tab="0"><span>01</span><strong>Bioactivity data</strong><small>Find the measurements</small></button>' +
                '<button type="button" class="workflow-step-tab" role="tab" id="workflow-tab-2" aria-selected="false" aria-controls="workflow-panel-2" tabindex="-1" data-step-tab="1"><span>02</span><strong>Protein structures</strong><small>Download a shortlist</small></button>' +
                '<button type="button" class="workflow-step-tab" role="tab" id="workflow-tab-3" aria-selected="false" aria-controls="workflow-panel-3" tabindex="-1" data-step-tab="2"><span>03</span><strong>Visualise in PyMOL</strong><small>See protein and ligand</small></button>' +
            '</div>' +
            '<div class="workflow-tab-panels">' +
                '<section id="workflow-panel-1" class="workflow-tab-panel" role="tabpanel" aria-labelledby="workflow-tab-1" data-step-panel="0">' +
                    '<div class="workflow-panel-heading"><span class="workflow-step-kicker">STEP 01 / DATA</span><h3>Collect bioactivity data</h3><p>Get the full set first; compare like with like afterwards.</p></div>' +
                    '<div class="workflow-tools-row">' +
                        toolLink("Download DataWarrior", "https://openmolecules.org/datawarrior/download.html", "Desktop chemical-data analysis") +
                        toolLink("Browse ChEMBL", chemblUrl, "Open the official database in your browser") +
                    '</div>' +
                    '<div class="chembl-finder">' +
                        '<div class="chembl-finder-heading"><div><strong>Or use the ChemIsFree activity finder</strong><p>Search once, rank human single-protein targets first, compare available IC₅₀/Kᵢ/EC₅₀ records, then export the selected measurements.</p></div>' +
                        '<button type="button" class="button button-secondary" id="chembl-target-search">Find target records</button></div>' +
                        '<p id="chembl-finder-status" class="chembl-finder-status" role="status" aria-live="polite">Enter a target above and select Find target records. Nothing is searched while you type.</p>' +
                        '<div id="chembl-target-results" class="chembl-target-results"></div>' +
                        '<div id="chembl-export-panel" class="chembl-export-panel" hidden>' +
                            '<p id="chembl-selected-target" class="chembl-selected-target"></p>' +
                            '<fieldset class="chembl-endpoint-options"><legend>Activity endpoints to include</legend>' +
                                '<label><input type="checkbox" name="chembl-endpoint" value="IC50" checked> IC₅₀</label>' +
                                '<label><input type="checkbox" name="chembl-endpoint" value="Ki" checked> Kᵢ</label>' +
                                '<label><input type="checkbox" name="chembl-endpoint" value="EC50" checked> EC₅₀</label>' +
                            '</fieldset>' +
                            '<button type="button" class="button button-primary" id="download-chembl-activities">Download activity CSV</button>' +
                            '<p id="chembl-download-status" class="chembl-finder-status" role="status" aria-live="polite"></p>' +
                            '<p class="planner-field-help">The CSV preserves each observation and assay/source metadata. It uses ChEMBL molecule IDs rather than embedding structure files; DataWarrior is the easier route when you need the chemical structures alongside every record.</p>' +
                        '</div>' +
                    '</div>' +
                    '<ol class="workflow-short-list">' +
                        '<li>In DataWarrior, choose <strong>Databases → Search ChEMBL database</strong> and enter the target name or gene symbol.</li>' +
                        '<li>Check the exact target record. Prioritise <strong>Homo sapiens</strong> and the relevant single-protein target; among correct matches, compare how many usable activity records are available.</li>' +
                        '<li>Retrieve the endpoint types you need: <strong>IC₅₀, Kᵢ and/or EC₅₀</strong>. Keep each endpoint labelled separately; they are not interchangeable.</li>' +
                        '<li>Export the results with compound structures/SMILES, values, units, relations, assay IDs and source references. Keep an untouched original export.</li>' +
                    '</ol>' +
                    '<details class="workflow-more"><summary>What to check before analysing the data</summary><p>Keep the target ID, species, target type, assay context, units and source for each measurement. Do not silently merge repeated measurements or convert censored relations such as &lt; and &gt; into exact values. If you compare potency later, use a clearly defined endpoint and compatible assay context.</p></details>' +
                    '<p class="workflow-step-note">ChemIsFree creates a target-specific ChEMBL shortcut from your answer; it does not silently choose a target record or claim that a search result is the correct protein.</p>' +
                '</section>' +

                '<section id="workflow-panel-2" class="workflow-tab-panel" role="tabpanel" aria-labelledby="workflow-tab-2" data-step-panel="1" hidden>' +
                    '<div class="workflow-panel-heading"><span class="workflow-step-kicker">STEP 02 / STRUCTURES</span><h3>Download 10 candidate structures</h3><p>Build a shortlist, then inspect the actual files before choosing a docking template.</p></div>' +
                    '<div class="workflow-tools-row">' +
                        toolLink("Search RCSB PDB", pdbUrl, "Experimental structures and structure metadata") +
                    '</div>' +
                    '<ol class="workflow-short-list">' +
                        '<li>Search by target name, gene symbol or UniProt accession. Filter to <strong>Homo sapiens</strong> and the correct protein/construct.</li>' +
                        '<li>Prefer experimental structures with a relevant bound small molecule when possible. Check method and resolution, chain, mutations, missing residues and whether the binding site is intact.</li>' +
                        '<li>Select up to <strong>10 useful candidate structures</strong> and download their PDB or mmCIF files. If fewer than 10 suitable structures exist, keep the smaller, defensible set rather than adding irrelevant structures.</li>' +
                        '<li>Record each PDB ID, chain, method/resolution, ligand name and any construct/mutation notes beside the file.</li>' +
                    '</ol>' +
                    '<details class="workflow-more"><summary>Why not simply download the first 10 results?</summary><p>A search can return other species, homologues, apo structures, engineered constructs or structures with a blocked/altered pocket. Resolution is useful but not the only criterion. The number 10 is a review shortlist, not a requirement to use every structure.</p></details>' +
                    '<p class="workflow-step-note">The target-specific link opens RCSB PDB search directly instead of relying on an in-page lookup that may miss structures or rank them poorly.</p>' +
                '</section>' +

                '<section id="workflow-panel-3" class="workflow-tab-panel" role="tabpanel" aria-labelledby="workflow-tab-3" data-step-panel="2" hidden>' +
                    '<div class="workflow-panel-heading"><span class="workflow-step-kicker">STEP 03 / VISUALISATION</span><h3>Visualise the complex in PyMOL</h3><p>Show the protein as a semi-transparent cyan cartoon and the ligand as sticks with salmon carbon atoms.</p></div>' +
                    '<div class="workflow-tools-row">' +
                        toolLink("PyMOL", "https://pymol.org/", "Molecular visualisation") +
                        toolLink("PLIP", "https://plip-tool.biotec.tu-dresden.de/", "Optional typed protein–ligand interaction report") +
                    '</div>' +
                    '<p class="workflow-instruction">Open PyMOL, replace the file path below, and paste the commands into the PyMOL command line. The first ligand selection is a convenient starting point; inspect it and narrow it to the exact bound ligand if it selects several molecules.</p>' +
                    codeBlock("pymol-overview-code", pymolOverview, "Protein + ligand view") +
                    '<details class="workflow-more"><summary>Make the ligand selection exact</summary><p>If more than one organic molecule is shown, use the residue name, chain and residue number for the co-crystallised ligand. Replace the example values below with those shown in your structure.</p>' +
                        codeBlock("pymol-exact-ligand-code", ["select ligand, complex and resn LIG and chain A and resi 501", "show sticks, ligand", "util.cbag ligand", "color salmon, ligand and elem C", "orient ligand", "zoom ligand, 8"].join("\n"), "Exact ligand selection") +
                    '</details>' +
                    '<details class="workflow-more"><summary>Optional: show candidate interactions as colour-coded dashed lines</summary><p>Blue lines show PyMOL-detected donor–acceptor geometry. Orange lines show close carbon–carbon contacts as a visual proxy only; they are not a chemically validated hydrophobic-interaction assignment. For typed interaction reporting, use PLIP and inspect the result rather than interpreting distances alone.</p>' +
                        codeBlock("pymol-interactions-code", pymolInteractions, "Interaction overlays") +
                    '</details>' +
                    '<p class="workflow-step-note">If the downloaded structure is apo (no ligand), there is no co-crystallised ligand to display. Choose a ligand-bound structure for this step, or select a ligand from another justified source.</p>' +
                '</section>' +
            '</div>' +
            '<div class="workflow-tab-controls"><button type="button" class="button button-secondary" id="previous-workflow-step" disabled>← Previous</button><span id="workflow-step-count" aria-live="polite">Step 1 of 3</span><button type="button" class="button button-primary" id="next-workflow-step">Next step →</button></div>' +
            '<p class="workflow-reset-note"><button type="button" id="edit-workflow-answers" class="planner-reset">← Edit answers</button></p>';

        results.hidden = false;
        wireTabs();
        wireCopyButtons();
        wireChemblFinder();
    }

    function wireTabs() {
        const tabs = Array.from(results.querySelectorAll("[data-step-tab]"));
        const panels = Array.from(results.querySelectorAll("[data-step-panel]"));
        const previous = document.getElementById("previous-workflow-step");
        const next = document.getElementById("next-workflow-step");
        const counter = document.getElementById("workflow-step-count");
        let activeIndex = 0;

        function selectTab(index, moveFocus) {
            activeIndex = Math.max(0, Math.min(tabs.length - 1, index));
            tabs.forEach(function (tab, i) {
                const active = i === activeIndex;
                tab.classList.toggle("is-active", active);
                tab.setAttribute("aria-selected", active ? "true" : "false");
                tab.tabIndex = active ? 0 : -1;
                panels[i].hidden = !active;
            });
            previous.disabled = activeIndex === 0;
            next.disabled = activeIndex === tabs.length - 1;
            next.textContent = activeIndex === tabs.length - 1 ? "Last step" : "Next step →";
            counter.textContent = "Step " + (activeIndex + 1) + " of " + tabs.length;
            if (moveFocus) tabs[activeIndex].focus();
        }

        tabs.forEach(function (tab, i) {
            tab.addEventListener("click", function () { selectTab(i, false); });
            tab.addEventListener("keydown", function (event) {
                if (event.key === "ArrowRight") {
                    event.preventDefault();
                    selectTab((activeIndex + 1) % tabs.length, true);
                } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    selectTab((activeIndex - 1 + tabs.length) % tabs.length, true);
                } else if (event.key === "Home") {
                    event.preventDefault();
                    selectTab(0, true);
                } else if (event.key === "End") {
                    event.preventDefault();
                    selectTab(tabs.length - 1, true);
                }
            });
        });
        previous.addEventListener("click", function () { selectTab(activeIndex - 1, false); });
        next.addEventListener("click", function () {
            if (activeIndex < tabs.length - 1) selectTab(activeIndex + 1, false);
        });
        const edit = document.getElementById("edit-workflow-answers");
        edit.addEventListener("click", function () {
            document.querySelector(".guided-questionnaire").scrollIntoView({ behavior: "smooth", block: "start" });
            document.getElementById("question-target").open = true;
        });
        selectTab(0, false);
    }

    function wireCopyButtons() {
        results.querySelectorAll("[data-copy]").forEach(function (button) {
            button.addEventListener("click", async function () {
                const code = document.getElementById(button.getAttribute("data-copy"));
                const wrap = button.closest(".workflow-code-wrap");
                const status = wrap ? wrap.querySelector(".copy-code-status") : null;
                if (!code) return;
                try {
                    await navigator.clipboard.writeText(code.textContent);
                    button.textContent = "Copied";
                    if (status) status.textContent = "Code copied to clipboard.";
                } catch (error) {
                    const range = document.createRange();
                    range.selectNodeContents(code);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    if (status) status.textContent = "Code selected. Press Ctrl+C (or ⌘C on Mac) to copy it.";
                    button.textContent = "Select to copy";
                }
            });
        });
    }

    form.addEventListener("change", updateIntakeState);
    targetInput.addEventListener("input", updateIntakeState);

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const issue = firstValidationIssue();
        if (issue) {
            showValidation(issue);
            return;
        }
        feedback.hidden = true;
        renderWorkflow();
        results.scrollIntoView({ behavior: "smooth", block: "start" });
        results.focus({ preventScroll: true });
    });

    document.getElementById("reset-workflow").addEventListener("click", function () {
        form.reset();
        document.querySelectorAll(".planner-question").forEach(function (question) { question.open = false; });
        results.innerHTML = "";
        results.hidden = true;
        feedback.hidden = true;
        feedback.textContent = "";
        updateIntakeState();
        document.getElementById("question-target").open = true;
        document.getElementById("question-target").scrollIntoView({ behavior: "smooth", block: "center" });
    });

    updateIntakeState();
    document.getElementById("question-target").open = true;
})();