"""Recalculate documentary anchors after Markdown reflow, without regenerating text."""
from pathlib import Path
import csv
import io

ROOT=Path(__file__).resolve().parents[4]
C=ROOT/"docs/audits/C"


def read(path):
    with path.open(encoding="utf-8-sig",newline="") as stream:return list(csv.DictReader(stream))


def write(path,rows):
    output=io.StringIO(newline="")
    writer=csv.DictWriter(output,fieldnames=list(rows[0]),lineterminator="\n")
    writer.writeheader();writer.writerows(rows)
    path.write_text(output.getvalue(),encoding="utf-8",newline="\n")


def main():
    p=C/"C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv"
    rows=read(p)
    for row in rows:
        lines=(ROOT/row["source_spec"]).read_text(encoding="utf-8").splitlines()
        label=row["field_label"] if row["record_type"]=="FIELD" else row["screen_scope"]
        prefix="- **Campo:** " if row["record_type"]=="FIELD" else "- **Tela:** "
        candidates=[i for i,line in enumerate(lines) if line.startswith(prefix) and label in " ".join(x.strip() for x in lines[i:i+6])]
        if not candidates:
            raise ValueError("No source anchor for "+str(row))
        row["source_line"]=str(candidates[0]+1)
    write(p,rows)
    fields=[r for r in rows if r["record_type"]=="FIELD"]
    p=C/"C8-visual-blueprint/FORM_CONTROL_CATALOG.csv"
    controls=read(p)
    for row in controls:
        if row["source_field_group"].startswith("C3-FIELD-"):
            field=fields[int(row["source_field_group"].rsplit("-",1)[-1])-1]
            row["source"]=field["source_spec"]+":"+field["source_line"]
        elif row["control_id"].startswith("CTRL-C8-"):
            field=next(r for r in fields if r["field_label"]==row["label"])
            row["source"]=field["source_spec"]+":"+field["source_line"]
    write(p,controls)
    print("Anchors reconciled: "+str(len(rows))+" C3 rows, "+str(len(controls))+" controls")


if __name__=="__main__":main()
