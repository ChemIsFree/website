# ChemIsFree website

The ChemIsFree website is a static HTML/CSS/JavaScript site for discovering free chemistry and drug-discovery software, web tools, libraries, and data resources.

## Catalogue inputs

The catalogue source of truth is maintained in the companion repository: [ChemIsFree/tools](https://github.com/ChemIsFree/tools).

The website build expects that repository to be checked out beside this repository in a folder named `catalogue`. It combines:

- `catalogue/data/tools.yaml` — hand-maintained ChemIsFree entries.
- `catalogue/data/taxonomy.yaml` — research domains and task tags.
- `catalogue/data/assayer_free_registry.json` — the free/open Assayer subset with upstream provenance and access/licence notes.
- `catalogue/data/featured_tools.yaml` — the ordered editorial shortlist shown by default in each category. The complete catalogue remains available through search, filters, and the full-index toggle.

Run the build from the website repository root:

```bash
python -m pip install pyyaml
python scripts/build_catalogue.py
```

This generates `data/tools.json`, `data/taxonomy.json`, and `data/featured_tools.json`. The generated JSON files are build outputs; edit the YAML and the supplemental registry, not the generated files.

The featured shortlist is maintained separately from tool records and references existing IDs. The pre-launch validator checks that each category contains 5–20 valid picks, every featured ID exists, and each pick is assigned to the category where it is shown. The shortlist affects the default browse view only; it does not remove records from search or the workflow planner.

## Workflow planner

`workflow-planner.html` and `js/workflow-planner.js` provide rule-based recommendations for common research workflows and custom sequences. Recommendations are generated in the browser from catalogue task tags and user-selected constraints. No external AI service or paid API is needed.

The planner only recommends records explicitly marked with free access. Its open-source-only option requires a recognised, named software licence; source-code availability by itself is not treated as proof of open-source licensing. Registry imports are labelled as pending review and should not be described as independently verified by ChemIsFree.

## Data provenance and access

The import policy and attribution record are maintained in `ChemIsFree/tools/data/ASSAYER-IMPORT-ATTRIBUTION.md`. Imported records keep their Assayer source ID, original licence/access label, and source links. An upstream “free” label does not establish rights to redistribute software or data; users should check the official terms.

## Validation

The pre-launch workflow `.github/workflows/validate-prelaunch.yml` runs on the `prelaunch/catalogue-and-workflow-planner` branch. It builds the merged catalogue, checks IDs, tasks, free-access labels and provenance, and checks JavaScript syntax. It is a validation-only workflow and does not publish the website.

The deployment workflow is separate. Do not run or merge deployment-related changes until the pre-launch review is complete and the release is explicitly approved.
