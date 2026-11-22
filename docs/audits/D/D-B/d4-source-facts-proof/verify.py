"""Independent, read-only PDF facts/layout oracle for the synthetic D4.5 corpus."""
import argparse
import hashlib
import json
import re
import unicodedata
from importlib.metadata import version
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pdfplumber
from pypdf import PdfReader
from asn1crypto import pem, x509
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext


def compact(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value))


def date(value):
    if value is None:
        return "Data desconhecida"
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(
        ZoneInfo("America/Sao_Paulo")
    ).strftime("%d/%m/%Y, %H:%M")


def field_value(pages, label):
    for page in pages:
        matches = page.search(label, regex=False, case=True)
        if matches:
            box = matches[0]
            return compact(page.within_bbox((box["x0"] - 1, box["bottom"] + 1,
                min(page.width, box["x0"] + 230), box["bottom"] + 24)).extract_text() or "")
    raise AssertionError("missing labeled field: " + label)


def verify(manifest, render=None):
    results = []
    root_path=manifest.parent/"public-root.crt"
    root=x509.Certificate.load(pem.unarmor(root_path.read_bytes())[2])
    for row in json.loads(manifest.read_text(encoding="utf-8")):
        path = manifest.parent / row["file"]
        if not path.exists():
            path = Path(row["file"])
        data = path.read_bytes()
        assert len(data) <= 10 * 1024 * 1024, "artifact size limit"
        assert hashlib.sha256(data).hexdigest() == row["sha256"], "artifact bytes differ"
        reader = PdfReader(path)
        identity = json.loads(str(reader.trailer["/Root"]["/HCAIssuance"]))
        assert identity["rendererRevision"] == 6
        assert identity["sourceHash"] == row["sourceHash"]
        assert identity["requestedAt"] == row["requestedAt"]
        code = str(reader.metadata.title).split(" - Home Care Assistant")[0]
        with pdfplumber.open(path) as pdf:
            assert 1 <= len(pdf.pages) <= 200
            text = compact(" ".join(page.extract_text() or "" for page in pdf.pages))
            f = row["sourceFacts"]
            temporal = ({"Data do documento de origem": f["sourceCreatedAt"],
                         "Importação no sistema": f["importedAt"],
                         "Primeiro registro técnico no sistema": f["registeredAt"]}
                        if f["historical"] else
                        {"Criação da ficha": f["documentCreatedAt"],
                         "Emissão operacional registrada": f["issuedAt"],
                         **({"Primeiro rascunho privado salvo": f["draftCreatedAt"]}
                            if f["draftCreatedAt"] else {})})
            for label, value in temporal.items():
                assert compact(label + ": " + date(value)) in text, "missing or mislabelled time: " + label
            for label, value in {
                "Responsável na origem": f["issuerName"] or "Autoria nominal desconhecida",
                "Identidade vinculada ao responsável": f["issuerId"] or "Identidade não preservada",
                "Paciente no registro de origem": f["patientName"] or "Nome do paciente não preservado",
            }.items():
                assert compact(label + ": " + value) in text, "missing origin identity: " + label
            assert field_value(pdf.pages, "SOLICITAÇÃO DE GERAÇÃO") == compact(date(row["requestedAt"]))
            assert field_value(pdf.pages, "SOLICITANTE DA GERAÇÃO") == compact(row["requestedName"])
            if row["label"] == "private-draft":
                assert row["requestedName"] != f["issuerName"], "rename counterproof requires distinct identities"
                assert datetime.fromisoformat(f["draftCreatedAt"]) < datetime.fromisoformat(f["issuedAt"])
            if f["historical"]:
                assert compact("REQUISIÇÃO HISTÓRICA DE MATERIAIS") in text
                assert compact("Consulta histórica; sem pendência operacional") in text
                assert compact("Pendente nesta versão") not in text
            emission_pages = [page for page in pdf.pages if page.search("EMISSÃO DESTE EXEMPLAR", regex=False)]
            assert len(emission_pages) == 1, "one generation heading required"
            emission_text = compact(emission_pages[0].extract_text() or "")
            assert compact("SOLICITAÇÃO DE GERAÇÃO") in emission_text
            assert compact("SOLICITANTE DA GERAÇÃO") in emission_text
            assert compact("Verificação de integridade") in emission_text, "generation details and QR split across pages"
            for index, page in enumerate(pdf.pages):
                for char in page.chars:
                    assert char["x0"] >= 19.5 and char["x1"] <= page.width - 19.5, "horizontal clipping"
                    assert char["top"] >= -0.5 and char["bottom"] <= page.height + 0.5, "vertical clipping"
                footer = compact(page.crop((0, page.height - 55, page.width, page.height)).extract_text() or "")
                expected = compact(f"{code} · v{identity['version']} · Conteúdo autorizado Página {index+1} de {len(pdf.pages)}")
                assert footer == expected, "body overlaps footer or footer is missing"
            result={"label": row["label"], "file": path.name, "sha256": row["sha256"],
                "pages": len(pdf.pages), "sourceFacts": "PASS", "fieldPositions": "PASS",
                "textBounds": "PASS", "footerExclusion": "PASS", "emissionGroupKeptTogether": "PASS", "rendererRevision": 6}
        with path.open("rb") as stream:
            signed=PdfFileReader(stream)
            assert len(signed.embedded_signatures)==1,"one technical signature required"
            context=lambda:ValidationContext(trust_roots=[root],allow_fetching=False,revocation_mode="soft-fail")
            status=validate_pdf_signature(signed.embedded_signatures[0],signer_validation_context=context(),ts_validation_context=context())
            assert status.bottom_line and status.coverage.name=="ENTIRE_FILE","signature or whole-file coverage failed"
            timestamp=status.timestamp_validity
            assert timestamp and timestamp.intact and timestamp.valid and timestamp.trusted,"embedded timestamp failed"
            result["pyHanko"]={"accepted":True,"coverage":status.coverage.name,"timestampTrustedToProvidedInternalRoot":True,"externalTrustOrRevocationProof":False}
        results.append(result)
        if render:
            import pypdfium2 as pdfium
            document = pdfium.PdfDocument(str(path))
            render.mkdir(parents=True, exist_ok=True)
            for number, page in enumerate(document):
                page.render(scale=1.4).to_pil().save(render / f"{row['label']}-{number+1}.png")
    probe = json.loads((manifest.parent / "UNSIGNED_PROBE.json").read_text(encoding="utf-8"))
    probe_path = manifest.parent / probe["file"]
    assert hashlib.sha256(probe_path.read_bytes()).hexdigest() == probe["sha256"]
    probe_reader = PdfReader(probe_path)
    probe_identity = json.loads(str(probe_reader.trailer["/Root"]["/HCAIssuance"]))
    assert probe_identity["rendererRevision"] == 6
    marker_pages = []
    with pdfplumber.open(probe_path) as pdf:
        assert 5 < len(pdf.pages) <= 200
        code = str(probe_reader.metadata.title).split(" - Home Care Assistant")[0]
        for index, page in enumerate(pdf.pages):
            if probe["marker"] in (page.extract_text() or ""):
                marker_pages.append(index)
            for char in page.chars:
                assert char["x0"] >= 19.5 and char["x1"] <= page.width - 19.5
                assert char["top"] >= -0.5 and char["bottom"] <= page.height + 0.5
            footer = compact(page.crop((0, page.height - 55, page.width, page.height)).extract_text() or "")
            expected = compact(f"{code} · v{probe_identity['version']} · Conteúdo autorizado Página {index+1} de {len(pdf.pages)}")
            assert footer == expected, "long content overlaps footer"
        assert len(marker_pages) == 1, "final marker must remain extractable exactly once"
        probe_result = {**probe, "pages": len(pdf.pages), "finalMarkerPage": marker_pages[0] + 1,
                        "textBounds": "PASS", "footerExclusion": "PASS", "signatureProof": False}
    with probe_path.open("rb") as stream:
        assert not PdfFileReader(stream).embedded_signatures, "probe must remain explicitly unsigned"
    if render:
        import pypdfium2 as pdfium
        document = pdfium.PdfDocument(str(probe_path))
        for index in marker_pages:
            document[index].render(scale=1.4).to_pil().save(render / f"long-note-marker-{index+1}.png")
    return {"passed": True,"publicRootSha256":hashlib.sha256(root_path.read_bytes()).hexdigest(),
            "dependencies": {name: version(name) for name in ["pdfplumber", "pypdf", "pyHanko", "pyhanko-certvalidator", "pypdfium2"]},
            "artifacts": results, "unsignedTextProbe": probe_result, "physicalDeviceOrATProof": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--render", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.manifest, args.render)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "artifacts": len(result["artifacts"]),
                      "pages": sum(a["pages"] for a in result["artifacts"])}))
