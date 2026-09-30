import json
from datetime import date, datetime
from pathlib import Path

import yaml


# ---------------------------------------------------------
# Input / output files
# ---------------------------------------------------------

TOOLS_FILE = Path("../catalogue/data/tools.yaml")
TAXONOMY_FILE = Path("../catalogue/data/taxonomy.yaml")

TOOLS_OUTPUT = Path("data/tools.json")
TAXONOMY_OUTPUT = Path("data/taxonomy.json")


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def make_json_serializable(value):
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


def load_yaml(path):
    if not path.exists():
        raise FileNotFoundError(
            f"Catalogue file not found: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8"
    ) as handle:
        return yaml.safe_load(handle)


def write_json(path, data):
    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with path.open(
        "w",
        encoding="utf-8"
    ) as handle:
        json.dump(
            make_json_serializable(data),
            handle,
            indent=2,
            ensure_ascii=False
        )


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    # Load tools
    tools_data = load_yaml(TOOLS_FILE)

    tools = tools_data.get(
        "tools",
        []
    )

    write_json(
        TOOLS_OUTPUT,
        tools
    )


    # Load taxonomy
    taxonomy_data = load_yaml(TAXONOMY_FILE)

    write_json(
        TAXONOMY_OUTPUT,
        taxonomy_data
    )


    print(
        f"Generated {TOOLS_OUTPUT}"
    )

    print(
        f"Catalogue contains {len(tools)} tools."
    )

    print(
        f"Generated {TAXONOMY_OUTPUT}"
    )

    print(
        f"Taxonomy contains "
        f"{len(taxonomy_data.get('domains', {}))} domains."
    )


if __name__ == "__main__":
    main()
