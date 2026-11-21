"""Independent tagged-content, internal-signature and unchanged-paint oracle.

Only controlled local fixtures; no PDF/UA, human AT or production approval.
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

import pymupdf
from asn1crypto import pem, x509
from pypdf import PdfReader
from pypdf.generic import ContentStream, IndirectObject
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext


def ref(value):
    return value.idnum, value.generation


def inspect(reader):
    root = reader.trailer["/Root"]
    assert root["/Lang"] == "pt-BR" and root["/MarkInfo"]["/Marked"]
    tree = root["/StructTreeRoot"]
    assert tree["/Type"] == "/StructTreeRoot"
    assert len(tree["/K"]) == 1 and tree["/K"][0].get_object()["/S"] == "/Document"
    pages = {ref(page.indirect_reference): page for page in reader.pages}
    seen, content, roles = set(), {}, Counter()

    def walk(indirect, parent, parent_role):
        assert isinstance(indirect, IndirectObject) and ref(indirect) not in seen
        seen.add(ref(indirect))
        node = indirect.get_object()
        role = node["/S"]
        assert node["/Type"] == "/StructElem" and ref(node.raw_get("/P")) == ref(parent)
        roles[role] += 1
        kids = node["/K"]
        if parent_role == "/Table":
            assert role == "/TR"
        if parent_role == "/TR":
            assert role in ("/TH", "/TD")
        if role == "/TH":
            assert node["/A"]["/O"] == "/Table" and node["/A"]["/Scope"] == "/Column"
        if role == "/Figure":
            assert node["/Alt"].strip()
        if role == "/Table":
            assert kids
            columns = len(kids[0].get_object()["/K"])
            assert columns
            for row_index, row_ref in enumerate(kids):
                cells = row_ref.get_object()["/K"]
                assert len(cells) == columns
                assert all(cell.get_object()["/S"] == ("/TD" if row_index else "/TH") for cell in cells)
        for child in kids:
            if isinstance(child, IndirectObject):
                walk(child, indirect, role)
            else:
                assert child["/Type"] == "/MCR"
                page_ref, mcid = ref(child.raw_get("/Pg")), int(child["/MCID"])
                identifier = page_ref, mcid
                assert page_ref in pages and mcid >= 0 and identifier not in content
                content[identifier] = ref(indirect), role

    walk(tree["/K"][0], tree.indirect_reference, "root")
    assert roles["/Document"] == roles["/H1"] == roles["/Figure"] == 1
    assert roles["/H2"] and roles["/Table"] and roles["/TH"] and roles["/TD"]
    nums = tree["/ParentTree"]["/Nums"]
    assert len(nums) == len(pages) * 2
    used, painted, page_counts = set(), 0, []
    for index, page in enumerate(reader.pages):
        assert page["/Tabs"] == "/S" and page["/StructParents"] == nums[index * 2] == index
        parents, stack, marked = nums[index * 2 + 1], [], []
        for operands, operation in ContentStream(page["/Contents"], reader).operations:
            if operation == b"BDC":
                role, properties = operands
                identifier = ref(page.indirect_reference), int(properties["/MCID"])
                assert identifier not in used and content[identifier][1] == role
                used.add(identifier)
                marked.append(identifier[1])
                assert content[identifier][0] == ref(parents[identifier[1]])
                stack.append(identifier)
            elif operation == b"BMC":
                assert operands == ["/Artifact"]
                stack.append("artifact")
            elif operation == b"EMC":
                assert stack
                stack.pop()
            elif operation in (b"Tj", b"TJ", b"'", b'"', b"Do", b"S", b"s", b"f", b"F", b"f*", b"B", b"B*", b"b", b"b*", b"sh"):
                assert stack, (index, operation)
                painted += 1
        assert not stack and marked == list(range(len(parents)))
        page_counts.append(len(marked))
    assert used == set(content)
    return {"pages": len(pages), "elements": len(seen), "roles": dict(roles), "markedContentPerPage": page_counts, "paintedOperatorsCovered": painted}


def verify(directory):
    results = []
    for current in sorted((directory / "current").glob("*.pdf")):
        reader = PdfReader(current)
        result = {"file": current.name, "sha256": hashlib.sha256(current.read_bytes()).hexdigest(), **inspect(reader)}
        baseline = directory / "baseline" / current.name
        if current.name != "oversized.pdf":
            assert baseline.exists(), "Byte-qualified V9 fixture is required for the pixel comparison"
        if baseline.exists():
            old = PdfReader(baseline)
            assert "/StructTreeRoot" not in old.trailer["/Root"]
            assert [p.extract_text() for p in old.pages] == [p.extract_text() for p in reader.pages]
            with pymupdf.open(baseline) as left, pymupdf.open(current) as right:
                assert len(left) == len(right)
                for previous_page, current_page in zip(left, right):
                    a, b = previous_page.get_pixmap(), current_page.get_pixmap()
                    assert (a.width, a.height, a.samples) == (b.width, b.height, b.samples)
            result["baselineTextAndPixelsUnchanged"] = True
        results.append(result)
    assert len(results) == 7
    with (directory / "signed/root-public.pem").open("rb") as stream:
        public_root = x509.Certificate.load(pem.unarmor(stream.read())[2])
    signed_results = []
    for signed in sorted((directory / "signed").glob("*.pdf")):
        facts = inspect(PdfReader(signed))
        with signed.open("rb") as stream:
            embedded = PdfFileReader(stream).embedded_signatures
            assert len(embedded) == 1
            context = lambda: ValidationContext(trust_roots=[public_root], allow_fetching=False, revocation_mode="soft-fail")
            status = validate_pdf_signature(embedded[0], signer_validation_context=context(), ts_validation_context=context())
            assert status.bottom_line and status.coverage.name == "ENTIRE_FILE"
            assert status.timestamp_validity and status.timestamp_validity.intact and status.timestamp_validity.valid and status.timestamp_validity.trusted
        signed_results.append({"file": signed.name, "sha256": hashlib.sha256(signed.read_bytes()).hexdigest(), "entireFileSignature": True, "internalTimestamp": True, **facts})
    assert len(signed_results) == 6
    # Independent negative: a cell marked as a header without its scope is invalid.
    negative = PdfReader(next((directory / "current").glob("*.pdf")))
    todo = list(negative.trailer["/Root"]["/StructTreeRoot"]["/K"])
    while todo:
        node = todo.pop().get_object()
        if node["/S"] == "/TH":
            del node["/A"]
            break
        todo.extend(child for child in node["/K"] if isinstance(child, IndirectObject))
    try:
        inspect(negative)
    except (AssertionError, KeyError):
        rejected = True
    else:
        rejected = False
    assert rejected
    return {"unsigned": results, "signed": signed_results, "missingHeaderScopeRejected": rejected, "externalTimeTrust": False, "pdfUaApproval": False, "humanAtApproval": False, "productionApproval": False}


def inspect_application(corpora, since):
    rows, results, families = [], [], set()
    for corpus in corpora:
        rows.extend({**row, "corpusDirectory": corpus.parent} for row in json.loads(corpus.read_text(encoding="utf-8")))
    observed = set()
    for row in rows:
        if row.get("rendererRevision", row.get("identity", {}).get("rendererRevision")) != 10:
            continue
        file = Path(row["file"])
        if not file.exists():
            file = row["corpusDirectory"] / file
        reader = PdfReader(file)
        identity = json.loads(reader.trailer["/Root"]["/HCAIssuance"])
        if identity["rendererRevision"] != 10 or identity["requestedAt"] < since:
            continue
        if identity["id"] in observed:
            continue
        observed.add(identity["id"])
        facts = inspect(reader)
        public_path = Path(row["publicRoot"])
        if not public_path.exists():
            public_path = row["corpusDirectory"] / public_path
        public_root = x509.Certificate.load(pem.unarmor(public_path.read_bytes())[2])
        with file.open("rb") as stream:
            embedded = PdfFileReader(stream).embedded_signatures
            assert len(embedded) == 1
            context = lambda: ValidationContext(trust_roots=[public_root], allow_fetching=False, revocation_mode="soft-fail")
            status = validate_pdf_signature(embedded[0], signer_validation_context=context(), ts_validation_context=context())
            assert status.bottom_line and status.coverage.name == "ENTIRE_FILE"
            assert status.timestamp_validity and status.timestamp_validity.intact and status.timestamp_validity.valid and status.timestamp_validity.trusted
        # Controlled fixture labels identify the family; legacy codes are opaque.
        family = row["label"].split("-")[0].upper()
        assert family in ("REQ", "COM", "ENT", "BAL")
        assert identity["id"] == row["issuanceId"] and identity["documentId"] == row["documentId"] and identity["version"] == row["version"]
        assert identity["sourceHash"] == row["sourceHash"]
        families.add(family)
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        if "sha256" in row:
            assert digest == row["sha256"]
        results.append({"file": str(file), "sha256": digest, "issuance": identity["id"], "version": identity["version"], "revision": 10, "family": family, "entireFileSignature": True, "internalTimestamp": True, **facts})
    assert families == {"REQ", "COM", "ENT", "BAL"}
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--corpus", type=Path, nargs="*", default=[])
    parser.add_argument("--since", default="2026-11-09T01:40:00")
    args = parser.parse_args()
    outcome = verify(args.directory)
    if args.corpus:
        outcome["applicationIssuances"] = inspect_application(args.corpus, args.since)
    args.output.write_text(json.dumps(outcome, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"unsigned": len(outcome["unsigned"]), "signed": len(outcome["signed"]), "negativeRejected": outcome["missingHeaderScopeRejected"]}))
