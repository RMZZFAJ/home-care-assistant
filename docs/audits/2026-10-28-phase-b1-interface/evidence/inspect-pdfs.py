"""Read-only synthetic PDF inspection; renders derivatives inside B1 evidence."""
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone
import pymupdf

directory = Path(__file__).resolve().parent
result = {"at": datetime.now(timezone.utc).isoformat(), "sha": "37cb7f85e96e551d6419871f94dd950712e2565b", "tool": "PyMuPDF", "documents": []}
for source in sorted(directory.glob("current-*.pdf")):
    document = pymupdf.open(source)
    pages = []
    for index, page in enumerate(document):
        image = directory / f"{source.stem}-page-{index + 1}.png"
        page.get_pixmap(matrix=pymupdf.Matrix(1.3, 1.3), alpha=False).save(image)
        pages.append({"page": index + 1, "image": image.name, "text": page.get_text(), "size_points": [page.rect.width, page.rect.height], "visual_inspected": False})
    result["documents"].append({"file": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "bytes": source.stat().st_size, "page_count": len(document), "structure_tree": document.xref_get_key(document.pdf_catalog(), "StructTreeRoot")[0], "language": document.xref_get_key(document.pdf_catalog(), "Lang"), "pages": pages})
(directory / "pdf-inspection.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"documents": len(result["documents"]), "pages": sum(d["page_count"] for d in result["documents"])}))
