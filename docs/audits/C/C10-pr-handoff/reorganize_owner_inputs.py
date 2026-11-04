"""Move authorized static references after verifying exact preservation."""
from pathlib import Path
import csv
import gzip
import hashlib

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
KIT = ROOT / "HOME_CARE_ASSISTANT_C7_C10_PROTOTIPOS_KIT"
PROTOTYPE = ROOT / "docs/audits/C/C8-visual-blueprint/prototype"


def checked(path, parent):
    resolved = path.resolve()
    assert resolved.is_relative_to(parent.resolve()) and resolved != parent.resolve(), str(path)
    return resolved


def main():
    if not KIT.exists():
        raise SystemExit("Inputs already reorganized; preserve the existing map.")
    with (OUT / "evidence/INPUT_PROVENANCE.csv").open(encoding="utf-8", newline="") as stream:
        provenance = list(csv.DictReader(stream))
    owner = [r for r in provenance if r["kind"] == "OWNER_INPUT"]
    assert len(owner) == 16
    # Verify all original bytes and exact archives before removing any input.
    for row in owner:
        source = checked(ROOT / row["original_path"], KIT)
        raw = source.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == row["sha256"]
        if row["exact_archive"]:
            assert gzip.decompress((ROOT / row["exact_archive"]).read_bytes()) == raw
    mandate = (KIT / "documentos/06_ORDEM_MESTRA_FASE_C_PARTE_2.md").read_text(encoding="utf-8")
    import re
    mandate = re.sub(r"^(#+)", r"#\1", mandate, flags=re.MULTILINE)
    header = """# Autoridade da missão C7–C10

Recebida em 04/11/2026, America/Sao_Paulo, com duas atualizações expressas
que prevalecem sobre a fonte abaixo:

1. O responsável já aprovou a direção visual do HTML fornecido. Não pedir
   nova aprovação equivalente nem recriar protótipo.
2. A pasta de entrada é temporária; organização, consolidação e remoção
   estão autorizadas, preservando decisões/especificações e provas históricas.

Escopo: concluir C7–C10 na audit/phase-b, validar documentos, commit/push e
abrir Draft PR para master. Não aguardar toda CI, não fazer merge, não apagar
branches, não alterar produto/dados/infra e não iniciar D. P02 individual
permanece humana. O arquivo original e os seis outros Markdown recebidos
estão em gzip exato, com hashes no manifesto de entrada. O arquivo07 citado
no leia-primeiro não foi fornecido; a mensagem atual contém a interposição
e autorização suficientes, sem inventar conteúdo ausente.

"""
    (OUT / "OWNER_MANDATE.md").write_text(header + mandate, encoding="utf-8")
    PROTOTYPE.mkdir(parents=True, exist_ok=True)
    rows = []
    for row in owner:
        source = checked(ROOT / row["original_path"], KIT)
        if source.suffix in {".html", ".png"}:
            destination = checked(PROTOTYPE / source.name, PROTOTYPE)
            assert not destination.exists()
            source.replace(destination)
            assert hashlib.sha256(destination.read_bytes()).hexdigest() == row["sha256"]
            target = destination.relative_to(ROOT).as_posix()
            disposition = "MOVED_EXACT_STATIC_DESIGN_REFERENCE;DIRECTION_OWNER_APPROVED"
        else:
            target = row["exact_archive"]
            assert gzip.decompress((ROOT / target).read_bytes()) == source.read_bytes()
            source.unlink()
            disposition = "EXACT_GZIP_ARCHIVE;CONTENT_CONSOLIDATED_IN_C7_C8_C9_C10"
        rows.append({"original_path": row["original_path"], "destination": target, "sha256": row["sha256"], "bytes": row["bytes"], "disposition": disposition})
    for directory in sorted([p for p in KIT.rglob("*") if p.is_dir()], key=lambda p: len(p.parts), reverse=True):
        checked(directory, KIT)
        directory.rmdir()  # Fails if any unexpected file remains.
    assert KIT.resolve().parent == ROOT.resolve()
    KIT.rmdir()
    with (OUT / "evidence/KIT_RELOCATION.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print("16 inputs preserved; HTML + 8 PNG moved exactly; temporary root removed.")


if __name__ == "__main__":
    main()
