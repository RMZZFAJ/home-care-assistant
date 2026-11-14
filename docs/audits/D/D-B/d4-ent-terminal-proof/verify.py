"""Offline terminal-state oracle; no external trust, visual or human approval."""
import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime
from decimal import Decimal
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


def verify(manifest):
    rows = json.loads(manifest.read_text(encoding="utf8"))
    assert rows
    results = []
    for row in rows:
        path = manifest.parent / row["file"]
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == row["sha256"]
        reader = PdfReader(path)
        identity = json.loads(str(reader.trailer["/Root"]["/HCAIssuance"]))
        assert identity == row["identity"] and identity["rendererRevision"] in (8, 9)
        assert str(reader.trailer["/Root"]["/Lang"]) == "pt-BR"
        with pdfplumber.open(path) as pdf:
            assert 0 < len(pdf.pages) <= 200
            # Remove decoration so a page break cannot hide an imperative.
            body = compact(" ".join(page.crop((0, 86, page.width, page.height-55)).extract_text() or "" for page in pdf.pages))
            for value in [identity["id"], identity["documentId"], row["sourceHash"]]:
                assert compact(value) in body
            forbidden = compact("A pessoa designada deve conferir")
            if identity["rendererRevision"] == 9:
                assert not row["legacyIncorrectInstructionPreserved"]
                assert forbidden not in body, "receipt task reactivated"
                assert compact("Aguardando conferência") not in body, "terminal row turned pending"
                if row["representation"] == "derived":
                    assert compact("Esta representação descreve uma versão preservada") in body
                elif row["sourceStatus"] == "cancelled":
                    assert compact("Documento cancelado. Este exemplar não solicita novo recebimento") in body
                else:
                    assert row["sourceStatus"] == "administratively_closed"
                    assert compact("Encerramento administrativo não substitui aceite pessoal") in body
                if row["sourceAcceptedAt"]:
                    stamp = datetime.fromisoformat(row["sourceAcceptedAt"].replace("Z", "+00:00")).astimezone(ZoneInfo("America/Sao_Paulo")).strftime("%d/%m/%Y, %H:%M")
                    assert compact("Conferência pessoal preservada em " + stamp) in body
                    assert row["sourceAcceptedBy"]
                for line in row["sourceLines"]:
                    expected = Decimal(2) if row["sourceAcceptedBy"] else Decimal(0)
                    assert Decimal(line["accepted_quantity"]) == expected
            else:
                assert row["legacyIncorrectInstructionPreserved"] and forbidden in body
            for number, page in enumerate(pdf.pages, 1):
                assert page.chars
                for char in page.chars:
                    assert char["x0"] >= -.5 and char["x1"] <= page.width+.5
                    assert char["top"] >= -.5 and char["bottom"] <= page.height+.5
                footer = compact(page.crop((0, page.height-55, page.width, page.height)).extract_text() or "")
                assert footer == compact(f"{row['code']} · v{identity['version']} · Conteúdo autorizado Página {number} de {len(pdf.pages)}")
            pages = len(pdf.pages)
        root = x509.Certificate.load(pem.unarmor((manifest.parent/row["publicRoot"]).read_bytes())[2])
        with path.open("rb") as stream:
            signed = PdfFileReader(stream)
            assert len(signed.embedded_signatures) == 1
            context = lambda: ValidationContext(trust_roots=[root], allow_fetching=False, revocation_mode="soft-fail")
            status = validate_pdf_signature(signed.embedded_signatures[0], signer_validation_context=context(), ts_validation_context=context())
            assert status.bottom_line and status.coverage.name == "ENTIRE_FILE"
            assert status.timestamp_validity and status.timestamp_validity.intact and status.timestamp_validity.valid and status.timestamp_validity.trusted
        results.append({"file": path.name, "revision": identity["rendererRevision"], "sha256": row["sha256"], "pages": pages, "stateAndTask": "PASS", "signature": "ENTIRE_FILE", "internalTimestamp": True})
    return {"passed": True, "artifacts": results, "externalTrustOrTime": False, "externalRevocation": False, "styleOrHumanApproval": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.manifest)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf8") as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(json.dumps({"passed": True, "artifacts": len(result["artifacts"])}))
