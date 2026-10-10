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


def main():
    primary = load_yaml(TOOLS_FILE).get("tools", [])
    supplemental = load_json(ASSAYER_FILE)
    tools, imported_count, skipped_duplicates = merge_catalogue(primary, supplemental)

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
