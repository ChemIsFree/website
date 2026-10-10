#!/usr/bin/env python3
"""Validate the pre-launch merged catalogue and its registry provenance."""

import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE_ROOT = ROOT.parent / "catalogue"
PRIMARY_FILE = CATALOGUE_ROOT / "data" / "tools.yaml"
TAXONOMY_FILE = CATALOGUE_ROOT / "data" / "taxonomy.yaml"
REGISTRY_FILE = CATALOGUE_ROOT / "data" / "assayer_free_registry.json"
TOOLS_JSON = ROOT / "data" / "tools.json"
TAXONOMY_JSON = ROOT / "data" / "taxonomy.json"

ERRORS = []


def fail(message):
    ERRORS.append(message)


def read_yaml(path):
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def collect_task_ids(taxonomy):
    return {
        task.get("id")
        for domain in taxonomy.get("domains", {}).values()
        for task in domain.get("tasks", [])
        if task.get("id")
    }


def main():
    required = [PRIMARY_FILE, TAXONOMY_FILE, REGISTRY_FILE, TOOLS_JSON, TAXONOMY_JSON]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        print("Missing required build inputs/outputs:", *missing, sep="\n  ", file=sys.stderr)
        return 2

    primary = read_yaml(PRIMARY_FILE).get("tools", [])
    source_taxonomy = read_yaml(TAXONOMY_FILE)
    imported = read_json(REGISTRY_FILE)
    built = read_json(TOOLS_JSON)
    built_taxonomy = read_json(TAXONOMY_JSON)

    source_tasks = collect_task_ids(source_taxonomy)
    built_tasks = collect_task_ids(built_taxonomy)
    if source_tasks != built_tasks:
        fail("Built taxonomy task IDs differ from the source taxonomy.")

    ids = [str(tool.get("id", "")) for tool in built]
    duplicate_ids = sorted({item for item in ids if ids.count(item) > 1})
    if duplicate_ids:
        fail(f"Duplicate IDs in built catalogue: {', '.join(duplicate_ids[:20])}")

    all_domain_ids = set(source_taxonomy.get("domains", {}).keys())
    for tool in built:
        if not tool.get("name"):
            fail(f"Record {tool.get('id')!r} is missing a name.")
        if "free" not in (tool.get("access") or []):
            fail(f"Record {tool.get('id')!r} is not explicitly marked free.")
        for task_id in tool.get("tasks", []) or []:
            if task_id not in source_tasks:
                fail(f"Record {tool.get('id')!r} refers to unknown task {task_id!r}.")
        for domain_id in tool.get("domain", []) or []:
            if domain_id not in all_domain_ids:
                fail(f"Record {tool.get('id')!r} refers to unknown domain {domain_id!r}.")

    allowed_licences = {
        "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "GPL-2.0",
        "GPL-3.0", "Unlicense", "AGPL-3.0", "LGPL-3.0", "LGPL-2.1",
        "MPL-2.0", "AFL-3.0", "Artistic-2.0", "CC-BY-4.0",
        "CC-BY-SA-4.0", "CC0-1.0", "Open-source (specific licence not recorded)",
        "Not specified",
    }
    restricted = {"commercial", "proprietary", "academic", "not licensed",
                  "noassertion", "other", "free of charge (with restrictions)"}
    imported_ids = set()
    for tool in imported:
        record_id = str(tool.get("id", ""))
        if not record_id.startswith("assayer-"):
            fail(f"Imported record {record_id!r} is missing the Assayer ID prefix.")
        if record_id in imported_ids:
            fail(f"Imported registry contains repeated ID {record_id!r}.")
        imported_ids.add(record_id)
        if tool.get("chemisfree_status") != "registry-listed":
            fail(f"Imported record {record_id!r} lacks registry-listed status.")
        if "free" not in (tool.get("access") or []):
            fail(f"Imported record {record_id!r} is not marked free.")
        if not re.match(r"^https?://", str(tool.get("website", "")), re.I):
            fail(f"Imported record {record_id!r} has no official http(s) URL.")
        if tool.get("source_project") != "Assayer" or not tool.get("source_project_url"):
            fail(f"Imported record {record_id!r} is missing provenance.")
        licence = str(tool.get("license", "Not specified"))
        if licence not in allowed_licences:
            fail(f"Imported record {record_id!r} has an unapproved licence label {licence!r}.")
        if licence == "Not specified" and "free to access" not in str(tool.get("access_note", "")).lower():
            fail(f"Imported record {record_id!r} has no named licence and no access caveat.")
        original_licence = str(tool.get("source_registry_license", "")).strip().lower()
        if original_licence in restricted:
            fail(f"Restricted Assayer entry {record_id!r} was imported unexpectedly.")
        if not tool.get("tasks"):
            fail(f"Imported record {record_id!r} has no assigned catalogue task.")

    if len(imported) < 1000:
        fail(f"Expected a large imported free subset; only {len(imported)} records found.")
    expected_total = len(primary) + len(imported)
    if len(built) != expected_total:
        fail(f"Built catalogue has {len(built)} records; expected {expected_total} after deduplication.")
    if len(primary) != 16:
        print(f"Note: hand-maintained catalogue contains {len(primary)} records (it may have changed).")

    if ERRORS:
        print("Catalogue validation FAILED:")
        for issue in ERRORS:
            print(" - " + issue)
        return 1

    print("Catalogue validation passed.")
    print(f"Hand-maintained entries: {len(primary)}")
    print(f"Free-only Assayer registry entries: {len(imported)}")
    print(f"Built combined catalogue: {len(built)} unique IDs")
    print(f"Recognised taxonomy tasks: {len(source_tasks)}")
    print("All built records declare free access; imported records retain provenance and review status.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
