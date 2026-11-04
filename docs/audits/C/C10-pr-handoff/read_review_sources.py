"""Read the original finding rows for semantic review; never runs audit probes."""
from pathlib import Path
import argparse
import csv
import json

ROOT = Path(__file__).resolve().parents[4]


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("start", type=int)
    parser.add_argument("end", type=int)
    args = parser.parse_args()
    crosswalk = read(ROOT / "docs/audits/C/C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv")
    cache = {}
    for entry in crosswalk[args.start:args.end]:
        path = ROOT / entry["source_csv"]
        if path not in cache:
            cache[path] = read(path)
        row = cache[path][int(entry["source_record"]) - 1]
        assert row.get("id", row.get("finding_id")) == entry["source_id"], entry["source_id"]
        selected = {k: v for k, v in row.items() if k in {"observed", "current_behavior", "root_cause", "cause", "probable_cause", "counterproof", "limits", "limitations"} and v}
        print(f"{entry['source_id']} -> {entry['cause_id']} | {entry['source_title']}")
        print(json.dumps(selected, ensure_ascii=False))


if __name__ == "__main__":
    main()
