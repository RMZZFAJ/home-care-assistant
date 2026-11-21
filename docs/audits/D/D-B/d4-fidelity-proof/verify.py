"""Independent read-only oracle: frozen facts, PDF bytes, bounds and internal B-T.

No visual redesign approval, network certificate fetch, external trust or AT claim.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime
from decimal import Decimal
from importlib.metadata import version
from pathlib import Path
from zoneinfo import ZoneInfo

import pdfplumber
from asn1crypto import pem, x509
from pypdf import PdfReader
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext


def compact(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(value))).casefold()


def stamp(value):
    if value is None:
        return "Data desconhecida"
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(
        ZoneInfo("America/Sao_Paulo")
    ).strftime("%d/%m/%Y, %H:%M")


def amount(value):
    raw = format(Decimal(value), "f")
    whole, _, fraction = raw.partition(".")
    fraction = fraction.rstrip("0")
    return format(int(whole), ",").replace(",", ".") + ("," + fraction if fraction else "")


def verify(manifest):
    results = []
    entries = json.loads(manifest.read_text(encoding="utf-8"))
    assert entries, "empty corpus cannot prove fidelity"
    for row in entries:
        path = manifest.parent / row["file"]
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == row["sha256"], "stored file digest"
        assert 0 < len(data) <= 10 * 1024 * 1024, "artifact size"
        reader = PdfReader(path)
        identity = json.loads(str(reader.trailer["/Root"]["/HCAIssuance"]))
        for key, expected in {
            "id": row["issuanceId"], "documentId": row["documentId"],
            "version": row["version"], "sourceHash": row["sourceHash"],
            "rendererRevision": row["rendererRevision"],
        }.items():
            assert identity[key] == expected, "frozen identity: " + key
        assert row["rendererRevision"] in (6, 7)
        if row["rendererRevision"] == 7:
            assert str(reader.trailer["/Root"]["/Lang"]) == "pt-BR", "document language"
            assert row["documentFacts"]["schemaVersion"] == 1
        with pdfplumber.open(path) as pdf:
            assert 1 <= len(pdf.pages) <= 200, "page bound"
            body = compact(" ".join(page.extract_text() or "" for page in pdf.pages))
            assert row["expectedText"], "no expected data"
            for fact in row["expectedText"]:
                assert compact(fact) in body, "missing expected data: " + fact
            for fact in row["absentText"]:
                assert compact(fact) not in body, "forbidden future/misattributed data: " + fact
            facts = row["sourceFacts"]
            times = ({"Data do documento de origem": facts["sourceCreatedAt"],
                      "Importação no sistema": facts["importedAt"],
                      "Primeiro registro técnico no sistema": facts["registeredAt"]}
                     if facts["historical"] else
                     {"Criação da ficha": facts["documentCreatedAt"],
                      "Emissão operacional registrada": facts["issuedAt"],
                      **({"Primeiro rascunho privado salvo": facts["draftCreatedAt"]}
                         if facts["draftCreatedAt"] else {})})
            for label, value in times.items():
                assert compact(label + ": " + stamp(value)) in body, "mislabelled source time: " + label
            for label, value in {
                "Responsável na origem": facts["issuerName"] or "Autoria nominal desconhecida",
                "Identidade vinculada ao responsável": facts["issuerId"] or "Identidade não preservada",
                "Paciente no registro de origem": facts["patientName"] or "Nome do paciente não preservado",
            }.items():
                assert compact(label + ": " + value) in body, "origin identity: " + label
            extra = row.get("documentFacts") or {}
            # Check association, not just both words somewhere in the file.
            sections = body.split(compact("Resolução de divergência"))[1:]
            for event in extra.get("deliveryResolutions", []):
                matching = [block for block in sections if compact(event["eventId"]) in block]
                assert len(matching) == 1, "resolution event association"
                block = matching[0]
                labels = {"received": "Recebimento complementar", "returned": "Devolução à origem", "missing": "Falta ou perda conciliada"}
                assert compact(labels.get(event["resolution"], "Resolução não preservada")) in block, "resolution outcome belongs to wrong event"
                assert compact(event["reason"] or "Motivo não preservado") in block, "resolution reason association"
                assert compact(event["actorName"] or "Nome histórico não preservado") in block, "resolution actor association"
                assert compact(stamp(event["recordedAt"])) in block, "resolution time association"
                expected_quantity = "Quantidade não preservada" if event["quantity"] is None else amount(event["quantity"])
                assert re.search(re.escape(compact("Quantidade desta resolução" + expected_quantity)) + r"(?![\d,.])", block), "resolution quantity association"
            parcels = re.split(r"parcela\d+·", body)[1:]
            for event in extra.get("purchaseReceiptEvents", []):
                assert compact(event["eventId"]) in body, "missing receipt provenance event"
                if event["receiptId"] is not None:
                    matching = [block for block in parcels if compact(event["receiptId"]) in block]
                    assert len(matching) == 1 and compact(event["eventId"]) in matching[0], "event associated with wrong receipt"
            for index, page in enumerate(pdf.pages):
                assert page.chars, "empty page"
                for char in page.chars:
                    assert char["x0"] >= -0.5 and char["x1"] <= page.width + 0.5, "horizontal data cut"
                    assert char["top"] >= -0.5 and char["bottom"] <= page.height + 0.5, "vertical data cut"
                footer = compact(page.crop((0, page.height - 55, page.width, page.height)).extract_text() or "")
                expected = compact(f"{row['code']} · v{row['version']} · Conteúdo autorizado Página {index+1} de {len(pdf.pages)}")
                assert footer == expected, "content overlaps footer or page identity is missing"
            pages = len(pdf.pages)
        root_path = manifest.parent / row["publicRoot"]
        root = x509.Certificate.load(pem.unarmor(root_path.read_bytes())[2])
        with path.open("rb") as stream:
            signed = PdfFileReader(stream)
            assert len(signed.embedded_signatures) == 1, "one actual technical signature"
            context = lambda: ValidationContext(trust_roots=[root], allow_fetching=False, revocation_mode="soft-fail")
            status = validate_pdf_signature(signed.embedded_signatures[0], signer_validation_context=context(), ts_validation_context=context())
            assert status.bottom_line and status.coverage.name == "ENTIRE_FILE", "signature or whole-file coverage"
            timestamp = status.timestamp_validity
            assert timestamp and timestamp.intact and timestamp.valid and timestamp.trusted, "embedded internal timestamp"
        results.append({"label": row["label"], "file": path.name, "sha256": row["sha256"],
                        "pages": pages, "rendererRevision": row["rendererRevision"], "facts": "PASS",
                        "eventAssociation": "PASS", "textBoundsAndFooter": "PASS",
                        "publicRootSha256": hashlib.sha256(root_path.read_bytes()).hexdigest(),
                        "signature": "ENTIRE_FILE", "timestampTrustedToProvidedInternalRoot": True})
    return {"passed": True, "artifacts": results,
            "dependencies": {name: version(name) for name in ["pdfplumber", "pypdf", "pyHanko", "pyhanko-certvalidator"]},
            "visualRedesignApproval": False, "taggedPdfOrAssistiveTechnologyApproval": False,
            "externalTimeIndependenceOrTrust": False, "externalRevocationProof": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as destination:
        json.dump(result, destination, ensure_ascii=False, indent=2)
        destination.write("\n")
    print(json.dumps({"passed": True, "artifacts": len(result["artifacts"])}))
