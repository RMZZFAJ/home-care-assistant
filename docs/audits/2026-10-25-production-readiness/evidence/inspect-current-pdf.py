from pathlib import Path
import json
import hashlib
import pymupdf

folder = Path("docs/audits/2026-10-25-production-readiness/evidence")
source = folder / "ui-current-ent-partial.pdf"
document = pymupdf.open(source)
pages = []
for index, page in enumerate(document, 1):
    image = folder / f"ui-current-ent-partial-page-{index}.png"
    page.get_pixmap(matrix=pymupdf.Matrix(1.3, 1.3), alpha=False).save(image)
    pages.append({"page": index, "width": page.rect.width, "height": page.rect.height, "text": page.get_text(), "image": image.name})
result = {"source": source.name, "bytes": source.stat().st_size, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "pageCount": len(pages), "pages": pages}
(folder / "current-pdf-inspection.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"pageCount": len(pages), "bytes": source.stat().st_size, "images": [p["image"] for p in pages]}))
