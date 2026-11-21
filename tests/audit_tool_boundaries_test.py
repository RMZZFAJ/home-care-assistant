"""Exercise archived helpers' actual pure guards without replaying their work."""
import ast
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

REPOSITORY = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True


def load_guard(relative, name, namespace):
    source = REPOSITORY / relative
    spec = importlib.util.spec_from_file_location("audit_guard_test_" + source.stem, source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for key, value in namespace.items():
        setattr(module, key, value)
    return getattr(module, name)


class AuditBoundaries(unittest.TestCase):
    def test_markdown_links_keep_destinations_without_backtracking_on_bad_labels(self):
        links = load_guard("docs/audits/C/C10-pr-handoff/validate_part2.py", "markdown_hrefs", {})
        body = '[primeiro](docs/one.md) [segundo](two.md "titulo") [web](https://example.invalid/a)'
        self.assertEqual(list(links(body)), ["docs/one.md", "two.md", "https://example.invalid/a"])
        self.assertEqual(list(links("[" * 100_000)), [])
        self.assertEqual(list(links("[](incompleto" * 10_000)), [])

    def test_documentary_writes_stay_in_docs_or_root_readme(self):
        with tempfile.TemporaryDirectory(prefix="hca-document-boundary-") as folder:
            root = Path(folder).resolve()
            checked = load_guard("docs/audits/C/C10-pr-handoff/finalize_documentary_files.py", "document_path", {"ROOT": root, "Path": Path})
            for target in [root / "docs" / "report.csv", root / "README.md"]:
                self.assertEqual(checked(target), target)
            for target in [root.parent / "outside.csv", root / "docs" / ".." / ".." / "outside.csv", root / "src" / "source.ts", root / "docs" / ".." / "src" / "source.ts"]:
                with self.assertRaises(ValueError):
                    checked(target)

    def test_manifest_reads_remain_inside_the_repository(self):
        with tempfile.TemporaryDirectory(prefix="hca-manifest-boundary-") as folder:
            root = Path(folder).resolve()
            checked = load_guard("docs/audits/C/C10-pr-handoff/validate_part2.py", "root_path", {"ROOT": root, "Path": Path})
            self.assertEqual(checked(root / "src" / "source.ts"), root / "src" / "source.ts")
            for target in [root.parent / "outside.json", root / "docs" / ".." / ".." / "outside.json"]:
                with self.assertRaises(ValueError):
                    checked(target)

    def test_pdf_inspection_checks_the_fixed_case_selection_before_io(self):
        file = "docs/audits/B/B6/2026-10-30-phase-b6-documents/evidence/inspect-pdf.py"
        tree = ast.parse((REPOSITORY / file).read_text(encoding="utf-8-sig"))
        selection = next(node.value for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "selection" for target in node.targets))
        checked = load_guard(file, "checked_case_id", {"selection": ast.literal_eval(selection)})
        self.assertEqual(checked("PV01"), "PV01")
        for value in ["../../outside", "..\\outside", "/private/file", "PV01/../outside", "PV01\0", None, 1]:
            with self.assertRaises(ValueError):
                checked(value)


if __name__ == "__main__":
    unittest.main()
