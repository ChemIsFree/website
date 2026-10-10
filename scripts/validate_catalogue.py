#!/usr/bin/env python3
"""Validate the pre-launch merged ChemIsFree catalogue and source provenance."""

import json
import re
import sys
from collections import Counter
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

ALLOWED_SOURCE_LICENCES = {
    "mit", "open-source", "apache-2.0", "bsd-2-clause", "bsd-3-clause",
    "gpl-2.0", "gpl-3.0", "unlicense", "agpl-3.0", "lgpl-3.0",
    "lgpl-2.1", "mpl-2.0", "afl-3.0", "artistic-2.0", "free-web",
    "free of charge", "freeware", "cc-by-4.0", "cc-by-sa-4.0", "cc0-1.0",
}
NO_COST_LABELS = {"free-web", "free of charge", "freeware"}
RESTRICTED_LABELS = {
    "commercial", "proprietary", "academic", "not licensed", "noassertion",
    "other", "free of charge (with restrictions)",
}
ALLOWED_DISPLAY_LICENCES = {
    "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "GPL-2.0",
    "GPL-3.0", "Unlicense", "AGPL-3.0", "LGPL-3.0", "LGPL-2.1",
    "MPL-2.0", "AFL-3.0", "Artistic-2.0", "CC-BY-4.0", "CC-BY-SA-4.0",
    "CC0-1.0", "Open-source (specific licence not recorded)", "Not specified",
}


def fail(message):
    ERRORS.append(message)


def read_yaml(path):
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def collect_tasks(taxonomy):
    return [
        task.get("id")
        for domain in taxonomy.get("domains", {}).values()
        for task in domain.get("tasks", [])
        if task.get("id")
    ]


def main():
    required = [PRIMARY_FILE, TAXONOMY_FILE, REGISTRY_FILE, TOOLS_JSON, TAXONOMY_JSON]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        print("Missing required catalogue input/output files:", *missing, sep="\n  ", file=sys.stderr)
        return 2

    primary = read_yaml(PRIMARY_FILE).get("tools", [])
    source_taxonomy = read_yaml(TAXONOMY_FILE)
    imported = read_json(REGISTRY_FILE)
    built = read_json(TOOLS_JSON)
    built_taxonomy = read_json(TAXONOMY_JSON)

    source_task_list = collect_tasks(source_taxonomy)
    built_task_list = collect_tasks(built_taxonomy)
    source_tasks = set(source_task_list)
    if len(source_task_list) != len(source_tasks):
        fail("Task IDs must be unique across the taxonomy.")
    if source_tasks != set(built_task_list):
        fail("Built taxonomy task IDs differ from the source taxonomy.")

    domain_ids = set(source_taxonomy.get("domains", {}).keys())
    built_ids_list = [str(tool.get("id", "")) for tool in built]
    duplicate_ids = [item for item, count in Counter(built_ids_list).items() if count > 1]
    if duplicate_ids:
        fail("Duplicate IDs in built catalogue: " + ", ".join(duplicate_ids[:20]))

    for tool in built:
        record_id = str(tool.get("id", "<missing-id>"))
        if not tool.get("name"):
            fail(f"Record {record_id!r} is missing a name.")
        if "free" not in (tool.get("access") or []):
            fail(f"Record {record_id!r} is not explicitly marked as free access.")
        for task_id in tool.get("tasks", []) or []:
            if task_id not in source_tasks:
                fail(f"Record {record_id!r} refers to unknown task {task_id!r}.")
        for domain_id in tool.get("domain", []) or []:
            if domain_id not in domain_ids:
                fail(f"Record {record_id!r} refers to unknown domain {domain_id!r}.")

    imported_ids = set()
    for tool in imported:
        record_id = str(tool.get("id", ""))
        original_licence = str(tool.get("source_registry_license", "")).strip().lower()
        display_licence = str(tool.get("license", "Not specified"))

        if not record_id.startswith("assayer-"):
            fail(f"Imported record {record_id!r} is missing the Assayer ID prefix.")
        if record_id in imported_ids:
            fail(f"Imported registry contains repeated ID {record_id!r}.")
        imported_ids.add(record_id)

        if tool.get("chemisfree_status") != "registry-listed":
            fail(f"Imported record {record_id!r} lacks registry-listed status.")
        if tool.get("status") != "unknown":
            fail(f"Imported record {record_id!r} should remain unverified/unknown until reviewed.")
        if "free" not in (tool.get("access") or []):
            fail(f"Imported record {record_id!r} is not marked free.")
        if not re.match(r"^https?://", str(tool.get("website", "")), re.I):
            fail(f"Imported record {record_id!r} has no official HTTP(S) URL.")
        if tool.get("source_project") != "Assayer" or not tool.get("source_project_url"):
            fail(f"Imported record {record_id!r} is missing source-project provenance.")
        if not tool.get("source_registry_id") or not tool.get("source_registry_url"):
            fail(f"Imported record {record_id!r} is missing source-registry provenance.")
        if display_licence not in ALLOWED_DISPLAY_LICENCES:
            fail(f"Imported record {record_id!r} has an unapproved display licence {display_licence!r}.")
        if original_licence not in ALLOWED_SOURCE_LICENCES:
            fail(f"Assayer record {record_id!r} has a source label outside the free/open import policy: {original_licence!r}.")
        if original_licence in RESTRICTED_LABELS:
            fail(f"Restricted Assayer record {record_id!r} was imported unexpectedly.")
        if display_licence == "Not specified" and original_licence not in NO_COST_LABELS:
            fail(f"Imported record {record_id!r} has no named licence without an explicit upstream no-cost label.")
        if not tool.get("tasks"):
            fail(f"Imported record {record_id!r} has no assigned catalogue task.")

    built_ids = set(built_ids_list)
    absent_imports = imported_ids - built_ids
    if absent_imports:
        fail(f"{len(absent_imports)} registry records are absent from the merged catalogue.")

    expected_total = len(primary) + len(imported)
    if len(built) != expected_total:
        fail(f"Built catalogue has {len(built)} records; expected {expected_total} after deduplication.")
    if len(primary) != 16:
        print(f"Note: hand-maintained catalogue contains {len(primary)} entries (it may have changed).")

    if ERRORS:
        print("Catalogue validation FAILED:")
        for error in ERRORS:
            print(" - " + error)
        return 1

    print("Catalogue validation passed.")
    print(f"Hand-maintained entries: {len(primary)}")
    print(f"Free-only Assayer registry entries: {len(imported)}")
    print(f"Combined catalogue: {len(built)} unique IDs")
    print(f"Recognised taxonomy tasks: {len(source_tasks)}")
    print("All catalogue entries declare free access; all imported records retain their source licence/access label and provenance.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
