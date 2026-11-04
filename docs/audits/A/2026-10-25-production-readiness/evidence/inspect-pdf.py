from pathlib import Path
import json
import hashlib
import pymupdf as fitz
from fontTools.ttLib import TTFont

root = Path.cwd()
output = root / "docs/audits/2026-10-25-production-readiness/evidence"
results = []
for path in sorted((root / "docs/references/v3").glob("*.pdf")):
    document = fitz.open(path)
    pages = []
    for number, page in enumerate(document, 1):
        target = output / (path.stem + f"-page-{number}.png")
        page.get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False).save(target)
        pages.append({"page": number, "width": page.rect.width, "height": page.rect.height, "text": page.get_text(), "image": target.name})
    results.append({"path": path.relative_to(root).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "pageCount": len(document), "pages": pages})
for path in sorted((root / "public/fonts").glob("*.ttf")):
    font = TTFont(path)
    results.append({"path": path.relative_to(root).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "glyphs": font["maxp"].numGlyphs, "portugueseGlyphsPresent": all(ord(c) in font.getBestCmap() for c in "áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ"), "names": sorted(set(str(n.toUnicode()) for n in font["name"].names if n.nameID in (1, 2, 6)))})
(output / "pdf-and-font-inspection.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(results, ensure_ascii=False, indent=2))
