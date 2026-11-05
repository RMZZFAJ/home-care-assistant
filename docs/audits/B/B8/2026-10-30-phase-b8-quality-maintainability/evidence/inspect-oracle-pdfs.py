"""Inspect only the synthetic outputs produced by the B8 oracle experiment."""
import json
from pathlib import Path
import pymupdf

observations = []
for mode in ("baseline", "blank-text"):
    for file in sorted((Path(".private/b8-quality") / mode).glob("*.pdf")):
        with pymupdf.open(file) as document:
            observations.append({"mode": mode, "file": file.name,
                                 "pages": len(document),
                                 "text_chars": sum(len(page.get_text()) for page in document)})
assert len(observations) == 14
assert all(row["text_chars"] == 0 for row in observations if row["mode"] == "blank-text")
assert all(row["text_chars"] > 1000 for row in observations if row["mode"] == "baseline")
Path(__file__).with_name("pdf-oracle-observations.json").write_text(
    json.dumps(observations, indent=2) + "\n", encoding="utf-8")
print("Fourteen synthetic output observations, zero text in seven counterfactuals.")
