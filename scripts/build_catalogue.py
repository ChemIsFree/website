import json
import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import yaml

TOOLS_FILE = Path("../catalogue/data/tools.yaml")
TAXONOMY_FILE = Path("../catalogue/data/taxonomy.yaml")
ASSAYER_FILE = Path("../catalogue/data/assayer_free_registry.json")
FEATURED_FILE = Path("../catalogue/data/featured_tools.yaml")
CURATION_FILE = Path("../catalogue/data/category_curation.yaml")

TOOLS_OUTPUT = Path("data/tools.json")
TAXONOMY_OUTPUT = Path("data/taxonomy.json")
FEATURED_OUTPUT = Path("data/featured_tools.json")


def make_json_serializable(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: make_json_serializable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [make_json_serializable(item) for item in value]
    return value


def load_yaml(path):
    if not path.exists():
        raise FileNotFoundError(f"Catalogue file not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def load_json(path):
    if not path.exists():
        raise FileNotFoundError(f"Registry supplement not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(make_json_serializable(data), handle, indent=2, ensure_ascii=False)


def normalized_name(value):
    value = str(value or "").lower()
    value = re.sub(r"\(open source\)|open-source", "", value)
    return re.sub(r"[^a-z0-9]+", "", value)


def normalized_url(value):
    if not value or value == "[]":
        return ""
    parsed = urlsplit(str(value).strip().lower())
    if not parsed.netloc:
        return ""
    host = parsed.netloc.removeprefix("www.")
    path = parsed.path.rstrip("/")
    return urlunsplit(("", host, path, "", ""))


def merge_catalogue(primary, supplemental):
    """Keep curated records authoritative and avoid obvious duplicate imports."""
    primary_ids = {str(item.get("id", "")) for item in primary}
    primary_names = {normalized_name(item.get("name")) for item in primary}
    primary_urls = {
        normalized_url(item.get(key))
        for item in primary
        for key in ("website", "repository", "documentation")
        if normalized_url(item.get(key))
    }

    seen_import_keys = set()
    imported = []
    skipped = 0
    for item in supplemental:
        item_id = str(item.get("id", ""))
        item_name = normalized_name(item.get("name"))
        item_urls = {
            normalized_url(item.get(key))
            for key in ("website", "repository", "documentation")
            if normalized_url(item.get(key))
        }
        import_key = (item_name, tuple(sorted(item_urls)))

        if (
            not item_id
            or item_id in primary_ids
            or (item_name and item_name in primary_names)
            or bool(item_urls & primary_urls)
            or import_key in seen_import_keys
        ):
            skipped += 1
            continue

        imported.append(item)
        seen_import_keys.add(import_key)

    return primary + imported, len(imported), skipped


CATEGORY_ORDER = [
    "target-identification",
    "protein-structures",
    "visualization",
    "binding-pockets",
    "structure-based",
    "molecular-dynamics",
    "cheminformatics",
    "de-novo-design",
    "ligand-based-qsar",
    "admet-prediction",
    "retrosynthesis",
    "nomenclature-format-conversion",
    "libraries-datasets",
    "organization",
]

LEGACY_DOMAIN_MAP = {
    "chemical-structures": ["cheminformatics"],
    "ligand-based-discovery": ["ligand-based-qsar"],
    "structure-based-discovery": ["structure-based"],
    "molecular-properties-admet": ["admet-prediction"],
    "synthesis-reaction-design": ["retrosynthesis"],
    "data-analysis": ["target-identification"],
    "visualization": ["visualization"],
    "laboratory-workflows": ["organization"],
}

TASK_CATEGORY_MAP = {
    "target-assessment": ["target-identification"],
    "clinical-evidence": ["target-identification"],
    "bioactivity-analysis": ["target-identification", "ligand-based-qsar"],
    "protein-structure-prediction": ["protein-structures"],
    "protein-preparation": ["protein-structures", "structure-based"],
    "protein-peptide-design": ["de-novo-design", "protein-structures"],
    "molecular-visualization": ["visualization"],
    "three-dimensional-analysis": ["visualization"],
    "trajectory-analysis": ["molecular-dynamics", "visualization"],
    "scientific-visualization": ["visualization"],
    "interaction-analysis": ["structure-based", "visualization"],
    "binding-site-analysis": ["binding-pockets"],
    "ligand-preparation": ["structure-based"],
    "molecular-docking": ["structure-based"],
    "structure-based-screening": ["structure-based"],
    "molecular-dynamics": ["molecular-dynamics"],
    "free-energy": ["molecular-dynamics"],
    "structure-drawing": ["cheminformatics"],
    "structure-elucidation": ["cheminformatics"],
    "molecular-descriptors-properties": ["cheminformatics", "admet-prediction"],
    "structure-search": ["cheminformatics"],
    "chemical-space": ["cheminformatics"],
    "data-curation": ["cheminformatics", "organization"],
    "chemical-data-analysis": ["cheminformatics"],
    "quantum-chemistry": ["cheminformatics"],
    "generative-chemistry": ["de-novo-design"],
    "scaffold-analysis": ["de-novo-design", "ligand-based-qsar"],
    "pharmacophore-modelling": ["ligand-based-qsar"],
    "qsar": ["ligand-based-qsar"],
    "ligand-based-screening": ["ligand-based-qsar"],
    "compound-library-search": ["ligand-based-qsar", "libraries-datasets"],
    "machine-learning": ["ligand-based-qsar"],
    "physicochemical-properties": ["admet-prediction"],
    "adme": ["admet-prediction"],
    "toxicity": ["admet-prediction"],
    "drug-likeness": ["admet-prediction"],
    "retrosynthesis": ["retrosynthesis"],
    "reaction-prediction": ["retrosynthesis"],
    "route-planning": ["retrosynthesis"],
    "reaction-analysis": ["retrosynthesis"],
    "benchmarks-datasets": ["libraries-datasets"],
    "inventory-management": ["organization"],
    "chemical-inventory": ["organization"],
    "laboratory-automation": ["organization"],
    "research-infrastructure": ["organization"],
    "workflow-construction": ["organization"],
    "pipeline-execution": ["organization"],
    "structure-conversion": ["nomenclature-format-conversion"],
}

CATEGORY_PATTERNS = [
    ("target-identification", re.compile(
        r"target (identification|assessment|prioriti[sz]ation|validation|discovery|prediction)|"
        r"target.?druggability|target ranking|target selection|target biology|"
        r"open targets|gene.?disease association|target finding", re.I)),
    ("protein-structures", re.compile(
        r"protein structure|structure prediction|protein folding|protein model|"
        r"homology model|alphafold|colabfold|esmfold|protein structure database|"
        r"protein sequence structure", re.I)),
    ("binding-pockets", re.compile(
        r"binding.?pocket|binding.?site|pocket detection|cavity detection|cryptic pocket|"
        r"p2rank|fpocket|prankweb|dogsitescorer|site prediction", re.I)),
    ("visualization", re.compile(
        r"visuali[sz]|molecular graphics|molecular viewer|trajectory viewer|"
        r"pymol|ngl viewer|3dmol|molstar|scientific graphics", re.I)),
    ("molecular-dynamics", re.compile(
        r"molecular dynamics|md simulation|trajectory analysis|free.?energy calculation|"
        r"metadynamics|openmm|gromacs|amber simulation|namd|charmm", re.I)),
    ("structure-based", re.compile(
        r"docking|virtual screening|pose prediction|pose scoring|protein.?ligand interaction|"
        r"receptor preparation|structure.?based|redocking|cross.?docking|autodock|gnina|"
        r"smina|vina|meeko|haddock", re.I)),
    ("cheminformatics", re.compile(
        r"cheminformatics|chemical structure|molecular fingerprint|similarity search|"
        r"substructure search|chemical space|molecular descriptor|structure drawing|"
        r"rdkit|open babel|chemistry toolkit|chemical data", re.I)),
    ("de-novo-design", re.compile(
        r"de.?novo|generative|molecule generation|molecular design|fragment growing|"
        r"scaffold decoration|reinvent|synthemol|pocket2mol|targetdiff", re.I)),
    ("ligand-based-qsar", re.compile(
        r"\bqsar\b|ligand.?based|pharmacophore|structure.?activity relationship|\bsar\b|"
        r"bioactivity|activity prediction|compound similarity|chemprop|bindingdb", re.I)),
    ("admet-prediction", re.compile(
        r"\badmet\b|\badme\b|toxicity|pharmacokinetic|drug.?likeness|permeability|"
        r"solubility|metabolism|clearance|swissadme|pkcs|protox", re.I)),
    ("retrosynthesis", re.compile(
        r"retro.?synthesis|reaction prediction|synthetic route|route planning|"
        r"reaction mapping|reaction analysis|synthesis planning|aizynth|rxnmapper", re.I)),
    ("nomenclature-format-conversion", re.compile(
        r"nomenclature|iupac|chemical name|name.?to.?structure|structure.?to.?name|"
        r"format conversion|format converter|file format|canonicali[sz]ation|"
        r"smiles conversion|inchi conversion", re.I)),
    ("libraries-datasets", re.compile(
        r"\bdataset\b|\bbenchmark\b|compound library|screening collection|"
        r"reference database|chemical database|bioactivity database|compound catalog", re.I)),
    ("organization", re.compile(
        r"inventory|lab notebook|laboratory management|workflow|pipeline|scheduler|"
        r"compute infrastructure|research computing|orchestration|workflow automation|"
        r"compound management|project management", re.I)),
]

def name_matches(tool, aliases):
    """Match stable name/ID tokens while tolerating punctuation and display-name variants."""
    values = [
        normalized_name(tool.get("name")),
        normalized_name(tool.get("id")),
        normalized_name(tool.get("title")),
    ]
    normalized_aliases = [normalized_name(alias) for alias in aliases]
    for value in values:
        if not value:
            continue
        for alias in normalized_aliases:
            if not alias:
                continue
            if value == alias:
                return True
            # Avoid matching short abbreviations inside unrelated words.
            if len(alias) >= 5 and alias in value:
                return True
            if value.startswith("assayer") and value.endswith(alias):
                return True
    return False

def is_opera(tool):
    name = normalized_name(tool.get("name"))
    record_id = normalized_name(tool.get("id"))
    return name == "opera" or record_id in {"opera", "assayeropera"}

def is_supporting_resource(tool):
    # An explicit catalogue classification takes precedence over a broad type label.
    # ODDT, for example, is a tool for users even though it is a Python library.
    if tool.get("catalogue") == "app":
        return False
    if tool.get("catalogue") == "resource":
        return True
    resource_type = str(tool.get("resource_type") or tool.get("type") or "").lower()
    return resource_type in {
        "library", "database", "dataset", "educational", "tutorial", "resource"
    }

RECORD_OVERRIDE_FIELDS = {
    "name", "description", "catalogue", "resource_type", "type", "access",
    "source_available", "license", "platforms", "interface", "languages", "gpu",
    "installation", "status", "developers", "website", "repository",
    "documentation", "citation", "notes", "verification", "chemisfree_status",
    "interface_classification",
}

def apply_record_overrides(tool, domains, overrides):
    """Apply explicit category and metadata curation to the matching catalogue record."""
    for override in overrides:
        names = override.get("names") or []
        if not names or not name_matches(tool, names):
            continue

        if override.get("replace_categories"):
            domains = list(override.get("categories") or [])
        else:
            domains.extend(override.get("add_categories") or [])

        # Apply only known record fields. Control keys such as names/categories never leak
        # into a displayed record, while licence and URL corrections actually take effect.
        for field in RECORD_OVERRIDE_FIELDS:
            if field in override and override[field] is not None:
                tool[field] = override[field]
        if override.get("clear_resource_type"):
            tool.pop("resource_type", None)

    return domains

def normalize_tool_domains(tool, category_curation):
    """Apply the functional taxonomy and the explicitly curated categories."""
    raw_domains = tool.get("domain") or []
    if isinstance(raw_domains, str):
        raw_domains = [raw_domains]
    raw_tasks = tool.get("tasks") or []
    if isinstance(raw_tasks, str):
        raw_tasks = [raw_tasks]

    current_domains = []
    legacy_domains = []
    for value in raw_domains:
        slug = str(value or "").strip().lower().replace(" ", "-").replace("_", "-")
        if slug in CATEGORY_ORDER:
            current_domains.append(slug)
        elif slug in LEGACY_DOMAIN_MAP:
            legacy_domains.extend(LEGACY_DOMAIN_MAP[slug])

    task_domains = []
    for task in raw_tasks:
        task_slug = str(task or "").strip().lower().replace(" ", "-").replace("_", "-")
        task_domains.extend(TASK_CATEGORY_MAP.get(task_slug, []))

    domains = current_domains or task_domains or legacy_domains

    if not domains:
        values = []
        for key in ("name", "description", "category", "categories", "tags", "domain", "type", "resource_type"):
            value = tool.get(key)
            if isinstance(value, list):
                values.extend(str(item) for item in value)
            elif value:
                values.append(str(value))
        searchable = " ".join(values)
        domains = [
            category_id for category_id, pattern in CATEGORY_PATTERNS
            if pattern.search(searchable)
        ]

    curation = category_curation or {}
    domains = apply_record_overrides(
        tool,
        domains,
        curation.get("record_overrides", []),
    )

    # Apply the shared hand-curated category mapping to both maintained records and
    # imported registry entries. This prevents the taxonomy from depending on legacy tags.
    category_membership = curation.get("category_membership", {}) or {}
    for category_id, names in category_membership.items():
        if category_id in CATEGORY_ORDER and name_matches(tool, names or []):
            domains.append(category_id)

    # Target Identification remains intentionally curated. Explicit memberships from the
    # curated category map count as approval alongside the dedicated target keep-list.
    target_rule = (curation.get("target-identification") or {})
    target_keep = target_rule.get("keep") or []
    target_members = category_membership.get("target-identification", []) or []
    if name_matches(tool, list(target_keep) + list(target_members)):
        domains.append("target-identification")
    else:
        domains = [domain for domain in domains if domain != "target-identification"]

    # Supporting libraries/databases/datasets remain in the lower resource section.
    if is_supporting_resource(tool) and str(tool.get("resource_type") or tool.get("type") or "").lower() in {
        "library", "database", "dataset"
    }:
        domains.append("libraries-datasets")

    domains = [domain for domain in CATEGORY_ORDER if domain in set(domains)]
    if not domains:
        domains = ["libraries-datasets"] if is_supporting_resource(tool) else ["cheminformatics"]
    tool["domain"] = domains

def main():
    primary = load_yaml(TOOLS_FILE).get("tools", [])
    supplemental = load_json(ASSAYER_FILE)
    tools, imported_count, skipped_duplicates = merge_catalogue(primary, supplemental)

    curation_data = load_yaml(CURATION_FILE) if CURATION_FILE.exists() else {}
    category_curation = curation_data.get("category_curation", {})
    for tool in tools:
        normalize_tool_domains(tool, category_curation)

    taxonomy = load_yaml(TAXONOMY_FILE)
    featured = load_yaml(FEATURED_FILE)

    ids = [str(item.get("id", "")) for item in tools]
    if len(ids) != len(set(ids)):
        raise ValueError("The merged catalogue contains duplicate IDs.")
    if any(not item.get("interface") for item in supplemental):
        raise ValueError("One or more imported records are missing interface classifications.")

    write_json(TOOLS_OUTPUT, tools)
    write_json(TAXONOMY_OUTPUT, taxonomy)
    write_json(FEATURED_OUTPUT, featured)

    print(f"Generated {TOOLS_OUTPUT}")
    print(
        f"Catalogue contains {len(tools)} unique tools "
        f"({len(primary)} hand-maintained; {imported_count} imported; "
        f"{skipped_duplicates} duplicate imports skipped)."
    )
    print(f"Generated {TAXONOMY_OUTPUT} with {len(taxonomy.get('domains', {}))} domains.")
    print(f"Generated {FEATURED_OUTPUT} with {len(featured.get('domains', {}))} editorial category lists.")
    print("Imported source records retain provenance and interface-classification confidence metadata.")


if __name__ == "__main__":
    main()
