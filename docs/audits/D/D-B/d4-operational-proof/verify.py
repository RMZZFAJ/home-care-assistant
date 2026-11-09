"""Independent technical corpus oracle; no application issuance or human approval."""
import argparse
import hashlib
import json
import re
import runpy
import unicodedata
from pathlib import Path

import pdfplumber
import pymupdf
from asn1crypto import pem, x509
from pypdf import PdfReader
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext


def compact(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(value))).casefold()


def verify(directory):
    rows = json.loads((directory / "CORPUS.json").read_text(encoding="utf-8"))
    assert len(rows) == 10 and len({row["label"] for row in rows}) == 10
    structure = runpy.run_path(str(Path(__file__).parent.parent / "d4-structure-proof/verify.py"))["inspect"]
    root = x509.Certificate.load(pem.unarmor((directory / "root-public.pem").read_bytes())[2])
    results, marker_images = [], []
    for row in rows:
        file = directory / row["file"]
        assert hashlib.sha256(file.read_bytes()).hexdigest() == row["sha256"]
        facts = structure(PdfReader(file))
        with pdfplumber.open(file) as pdf:
            body = compact(" ".join(page.extract_text() or "" for page in pdf.pages))
            for value in row["expected"]:
                assert compact(value) in body, row["label"] + ": missing " + value[:60]
            for value in row["forbidden"]:
                assert compact(value) not in body, row["label"] + ": forbidden " + value
            for index, page in enumerate(pdf.pages):
                assert page.chars, "empty page"
                for char in page.chars:
                    assert 43.5 <= char["x0"] <= char["x1"] <= page.width - 43.5, "horizontal content outside useful area"
                    assert 20 <= char["top"] <= char["bottom"] <= page.height, "vertical content cut"
                footer = compact(page.crop((0, page.height - 55, page.width, page.height)).extract_text() or "")
                assert footer == compact(f"{row['code']} · v{row['version']} · Conteúdo autorizado Página {index + 1} de {len(pdf.pages)}"), "footer overlap"
            if row["label"] == "ENT-partial":
                assert compact("01 PARCIAL_ENT_MATERIAL 3 unidade") in body, "dispatch quantity lost"
                assert compact("PARCIAL_ENT_MATERIAL 1 0 Divergência aberta") in body, "accepted/reconciled row changed"
        fields = {}
        attachment_hashes = []
        with pymupdf.open(file) as pdf:
            for page_index, page in enumerate(pdf):
                image = page.get_pixmap(matrix=pymupdf.Matrix(1, 1), alpha=False)
                assert image.width > 500 and image.height > 800 and min(image.samples) < 100, "empty raster"
                if row["label"] == "REQ-partial":
                    for label, value in [("LINHAS ATENDIDAS", "2 de 6"), ("LINHAS PENDENTES", "4")]:
                        for label_box in page.search_for(label):
                            area = pymupdf.Rect(label_box.x0 - 1, label_box.y0 - 1, label_box.x0 + 220, label_box.y1 + 24)
                            actual = compact(page.get_textbox(area))
                            assert actual == compact(label + value), "field/value association differs"
                            fields[label] = value
                if row["long"]:
                    for header in page.search_for("SHA-256"):
                        if not any(abs(label.y0 - header.y0) < 1 and label.x0 < header.x0 for label in page.search_for("ARQUIVO")):
                            continue
                        area = pymupdf.Rect(header.x0 - 1, header.y1 + 1, page.rect.width - 44, page.rect.height - 55)
                        attachment_hashes.append(compact(page.get_textbox(area)))
                    for marker in ["FIM_NOME_160", "FIM_B6_MATERIAIS_" + row["type"], "FIM_B6_NOTAS_" + row["type"], "FIM_B6_ANEXO"]:
                        for box in page.search_for(marker):
                            assert 43.5 <= box.x0 < box.x1 <= page.rect.width - 43.5
                            assert 20 <= box.y0 < box.y1 < page.rect.height - 55
                            clip = page.get_pixmap(matrix=pymupdf.Matrix(1, 1), clip=box, alpha=False)
                            assert min(clip.samples) < 180, "final marker has no rendered ink"
                            image_file = row["label"] + "-" + marker + "-" + str(page_index + 1) + ".png"
                            clip.save(directory / image_file)
                            marker_images.append(image_file)
            if row["label"] == "REQ-partial":
                assert fields == {"LINHAS ATENDIDAS": "2 de 6", "LINHAS PENDENTES": "4"}
            if row["long"]:
                assert attachment_hashes == ["d" * 64], "attachment hash column truncated or changed"
                for suffix in ["FIM_NOME_160", "FIM_B6_MATERIAIS_" + row["type"], "FIM_B6_NOTAS_" + row["type"], "FIM_B6_ANEXO"]:
                    assert any(name.startswith(row["label"] + "-" + suffix + "-") for name in marker_images)
                assert len(pdf) > 3
        with file.open("rb") as stream:
            embedded = PdfFileReader(stream).embedded_signatures
            assert len(embedded) == 1
            context = lambda: ValidationContext(trust_roots=[root], allow_fetching=False, revocation_mode="soft-fail")
            status = validate_pdf_signature(embedded[0], signer_validation_context=context(), ts_validation_context=context())
            assert status.bottom_line and status.coverage.name == "ENTIRE_FILE"
            assert status.timestamp_validity and status.timestamp_validity.intact and status.timestamp_validity.valid and status.timestamp_validity.trusted
        results.append({"label": row["label"], "file": row["file"], "sha256": row["sha256"], "expectedText": True, "forbiddenTextAbsent": True, "usefulBounds": True, "footerExcluded": True, "allPagesRasterized": True, "entireFileSignature": True, "internalTimestamp": True, "fields": fields, **facts})
    return {"passed": True, "artifacts": results, "markerRasterFiles": marker_images, "ordinaryLongTypes": sorted(row["type"] for row in rows if row["long"]), "controlledRendererProbes": True, "actualApplicationIssuances": False, "externalTrust": False, "physicalPrint": False, "humanAtApproval": False, "pdfUaApproval": False, "productionApproval": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.directory)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"artifacts": len(result["artifacts"]), "pages": sum(row["pages"] for row in result["artifacts"]), "markerRasters": len(result["markerRasterFiles"]), "passed": result["passed"]}))
