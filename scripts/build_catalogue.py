import json
from pathlib import Path

import yaml


TOOLS_FILE = Path("../catalogue/data/tools.yaml")
OUTPUT_FILE = Path("data/tools.json")


def main():
    if not TOOLS_FILE.exists():
        raise FileNotFoundError(
            f"Catalogue file not found: {TOOLS_FILE}"
        )

    with TOOLS_FILE.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    tools = data.get("tools", [])

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

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
