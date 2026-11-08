"""Offline oracle for real technical ENT issuances; no external trust claim."""
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
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(
        ZoneInfo("America/Sao_Paulo")
    ).strftime("%d/%m/%Y, %H:%M")


def amount(value):
    whole, _, part = format(Decimal(value), "f").partition(".")
    part = part.rstrip("0")
    return format(int(whole), ",").replace(",", ".") + ("," + part if part else "")


def verify(manifest):
    rows = json.loads(manifest.read_text(encoding="utf8"))
    assert rows, "empty corpus"
    results = []
    for row in rows:
        path = manifest.parent / row["file"]
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == row["sha256"]
        reader = PdfReader(path)
        identity = json.loads(str(reader.trailer["/Root"]["/HCAIssuance"]))
        assert identity == row["identity"] and identity["rendererRevision"] in (7, 8)
        assert str(reader.trailer["/Root"]["/Lang"]) == "pt-BR"
        with pdfplumber.open(path) as pdf:
            assert 0 < len(pdf.pages) <= 200
            body = compact(" ".join(page.extract_text() or "" for page in pdf.pages))
            for value in [identity["id"], identity["documentId"], row["sourceHash"]]:
                assert compact(value) in body, "missing issuance/source identity"
            case = row["caseFacts"]
            if identity["rendererRevision"] == 8:
                assert case and compact("Procedimento: " + case["id"]) in body
                proposal, decision = case["proposal"], case["decision"]
                # Label association makes an ID elsewhere in the PDF insufficient.
                facts = {
                    "Identidade do proponente": f"{proposal['proposedName']} · {case['proposed_by']} · {stamp(case['proposed_at'])}",
                    "Identidade do conferente designado": f"{proposal['reviewerName']} · {case['reviewer_id']}",
                    "Identidade do aceite pessoal original": case["before_snapshot"]["acceptedBy"] or "Sem aceite pessoal declarado",
                    "Motivo original": proposal["reason"], "Evidências e limites": proposal["basis"],
                    "Identidade da decisão": f"{decision['actorName']} · {decision['actorId']} · {stamp(decision['recordedAt'])}" if decision else "Sem decisão registrada",
                }
                assert compact(f"· v{case['before_snapshot']['version']}") in body
                lines = decision["lines"] if decision and decision["lines"] else proposal["lines"]
                has_moves = case["state"] == "approved" and any(line.get("movementIds") for line in lines)
                facts["Execução transacional dos movimentos"] = facts["Identidade da decisão"] if has_moves else "Sem movimentação de estoque identificada neste procedimento"
                if decision:
                    facts["Justificativa da decisão"] = decision["reason"]
                for label, value in facts.items():
                    assert compact(label + value) in body, "missing/misattributed fact: " + label
                for line in lines:
                    applied = sum(Decimal(line[key]) for key in ["receivedQuantity", "returnedQuantity", "missingQuantity"]) if case["state"] == "approved" else Decimal(0)
                    settled = Decimal(line["priorReconciledQuantity"]) + applied
                    transit = Decimal(line["pendingQuantity"]) - applied
                    assert transit >= 0
                    unit = line["unit"]
                    before = f"{amount(line['priorReconciledQuantity'])} {unit} · {amount(line['pendingQuantity'])} {unit}"
                    after = f"{amount(settled)} {unit} · {amount(transit)} {unit}"
                    assert compact("Conciliação anterior e trânsito anterior" + before) in body
                    assert compact("Conciliação após este procedimento e trânsito restante" + after) in body
                    for move_id in line.get("movementIds", []):
                        matching = [m for m in row["movements"] if m["id"] == move_id]
                        assert len(matching) == 1 and matching[0]["performed_by"] == decision["actorId"]
                        assert compact("Movimento administrativo vinculado: " + move_id) in body
                    if case["state"] == "approved":
                        assert Decimal(row["lineAfter"]["reconciled_quantity"]) == settled
                        assert Decimal(row["lineAfter"]["accepted_quantity"]) == Decimal(line["acceptedQuantity"])
                assert case["before_snapshot"]["acceptedBy"] == row["originalAcceptedBy"]
                assert compact("Efeitos administrativos abaixo não alteram") in body if case["state"] == "approved" else compact("Quantidades propostas abaixo não representam movimentação confirmada") in body
            for number, page in enumerate(pdf.pages, 1):
                assert page.chars
                for char in page.chars:
                    assert char["x0"] >= -.5 and char["x1"] <= page.width + .5
                    assert char["top"] >= -.5 and char["bottom"] <= page.height + .5
                footer = compact(page.crop((0, page.height - 55, page.width, page.height)).extract_text() or "")
                assert footer.endswith(compact(f"· v{identity['version']} · Conteúdo autorizado Página {number} de {len(pdf.pages)}"))
            page_count = len(pdf.pages)
        root_path = manifest.parent / row["publicRoot"]
        root = x509.Certificate.load(pem.unarmor(root_path.read_bytes())[2])
        with path.open("rb") as stream:
            signed = PdfFileReader(stream)
            assert len(signed.embedded_signatures) == 1
            context = lambda: ValidationContext(trust_roots=[root], allow_fetching=False, revocation_mode="soft-fail")
            status = validate_pdf_signature(signed.embedded_signatures[0], signer_validation_context=context(), ts_validation_context=context())
            assert status.bottom_line and status.coverage.name == "ENTIRE_FILE"
            assert status.timestamp_validity and status.timestamp_validity.intact and status.timestamp_validity.valid and status.timestamp_validity.trusted
        results.append({"file": path.name, "label": row["label"], "sha256": row["sha256"], "revision": identity["rendererRevision"], "pages": page_count, "facts": "PASS", "signature": "ENTIRE_FILE", "timestampInternalRoot": True})
    return {"passed": True, "artifacts": results, "dependencies": {n: version(n) for n in ["pdfplumber", "pypdf", "pyHanko", "pyhanko-certvalidator"]}, "externalTrustOrTime": False, "externalRevocation": False, "styleOrHumanApproval": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf8") as destination:
        json.dump(result, destination, ensure_ascii=False, indent=2)
        destination.write("\n")
    print(json.dumps({"passed": True, "artifacts": len(result["artifacts"])}))
