"""Read-only inspection of synthetic product PDFs; does not create product documents."""
import hashlib
import json
from pathlib import Path

import pymupdf

root = Path(__file__).resolve().parent
items = []
for version in (1, 5):
    source = root / f"b28-req-v{version}.pdf"
    doc = pymupdf.open(source)
    pages = []
    for number, page in enumerate(doc, 1):
        target = root / f"b28-req-v{version}-page-{number}.png"
        page.get_pixmap(matrix=pymupdf.Matrix(1.4, 1.4)).save(target)
        pages.append({"page": number, "image": target.name,
                      "text": page.get_text(), "width": page.rect.width,
                      "height": page.rect.height,
                      "visualInspection": "PENDING"})
    items.append({"file": source.name,
                  "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                  "version": version, "pages": pages})
(root / "pdf-inspection.json").write_text(
    json.dumps({"method": "PyMuPDF read and rasterize only; synthetic PDFs from local product",
                "items": items}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"pdfs": len(items), "pages": sum(len(i["pages"]) for i in items)}))
