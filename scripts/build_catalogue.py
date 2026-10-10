import json
import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import yaml


# ---------------------------------------------------------
# Input / output files
# ---------------------------------------------------------

TOOLS_FILE = Path("../catalogue/data/tools.yaml")
TAXONOMY_FILE = Path("../catalogue/data/taxonomy.yaml")
ASSAYER_FILE = Path("../catalogue/data/assayer_free_registry.json")

TOOLS_OUTPUT = Path("data/tools.json")
TAXONOMY_OUTPUT = Path("data/taxonomy.json")


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
        return yaml.safe_load(handle)


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


def deduplicate_catalogue(primary, supplemental):
    """Keep the hand-maintained catalogue authoritative over imported records."""
    known_ids = {str(item.get("id", "")) for item in primary}
    known_names = {normalized_name(item.get("name")) for item in primary}
    known_urls = {
        normalized_url(item.get(key))
        for item in primary
        for key in ("website", "repository", "documentation")
        if normalized_url(item.get(key))
    }
    added = []
    skipped = 0

    for item in supplemental:
        item_id = str(item.get("id", ""))
        item_name = normalized_name(item.get("name"))
        item_urls = {
            normalized_url(item.get(key))
            for key in ("website", "repository", "documentation")
            if normalized_url(item.get(key))
        }
        if (
            not item_id
            or item_id in known_ids
            or (item_name and item_name in known_names)
            or bool(item_urls & known_urls)
        ):
            skipped += 1
            continue

        added.append(item)
        known_ids.add(item_id)
        if item_name:
            known_names.add(item_name)
        known_urls.update(item_urls)

    return added, skipped


def main():
    tools_data = load_yaml(TOOLS_FILE)
    primary_tools = tools_data.get("tools", [])
    supplemental_tools = load_json(ASSAYER_FILE)
    imported_tools, skipped_duplicates = deduplicate_catalogue(
        primary_tools, supplemental_tools
    )
    tools = primary_tools + imported_tools

    taxonomy_data = load_yaml(TAXONOMY_FILE)
    write_json(TOOLS_OUTPUT, tools)
    write_json(TAXONOMY_OUTPUT, taxonomy_data)

    print(f"Generated {TOOLS_OUTPUT}")
    print(f"Catalogue contains {len(tools)} tools ({len(primary_tools)} hand-maintained; "
          f"{len(imported_tools)} imported; {skipped_duplicates} duplicate imports skipped).")
    print(f"Generated {TAXONOMY_OUTPUT}")
    print(f"Taxonomy contains {len(taxonomy_data.get('domains', {}))} domains.")
    print("Imported records retain their source and access notes; upstream entries are not "
          "represented as independently verified by ChemIsFree.")


if __name__ == "__main__":
    main()
