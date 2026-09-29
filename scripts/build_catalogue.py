import json
from datetime import date, datetime
from pathlib import Path

import yaml


TOOLS_FILE = Path("../catalogue/data/tools.yaml")
OUTPUT_FILE = Path("data/tools.json")


def make_json_serializable(value):
    """
    Convert YAML-specific Python objects into JSON-compatible values.
    """

    if isinstance(value, (date, datetime)):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            key: make_json_serializable(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            make_json_serializable(item)
            for item in value
        ]

    return value


def main():

    if not TOOLS_FILE.exists():
        raise FileNotFoundError(
            f"Catalogue file not found: {TOOLS_FILE}"
        )

    with TOOLS_FILE.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    tools = data.get("tools", [])

    tools = make_json_serializable(tools)

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with OUTPUT_FILE.open("w", encoding="utf-8") as handle:
        json.dump(
            tools,
            handle,
            indent=2,
            ensure_ascii=False
        )

    print(f"Generated {OUTPUT_FILE}")
    print(f"Catalogue contains {len(tools)} tools.")


if __name__ == "__main__":
    main()
