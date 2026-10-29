"""Record only inspected synthetic browser captures, without browser Auth state."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parent
entries = []
for filename, state, scope, snapshot in [
    ("b28-professional-empty-pending.png", "Default own pending_receipt inbox is empty", "1280x720 desktop viewport", "b28-professional-pending.txt"),
    ("b28-professional-all.png", "All deliveries includes two cancellation_pending documents", "1280x720 desktop viewport", "b28-professional-all.txt"),
    ("b28-consent-mobile.png", "ENT0004 cancellation_pending header and start of next action", "390x844 emulated viewport;form below fold", "b28-consent-only.txt"),
    ("b28-consent-mobile-full.png", "Full page shows only consent/reconcile decision;no reject or withdraw action", "390x844 emulation with full-page capture;not physical device", "b28-consent-only.txt"),
]:
    data = (root / filename).read_bytes()
    width, height = struct.unpack(">II", data[16:24])
    entries.append(dict(file=filename,width=width,height=height,scope=scope,state=state,
                        snapshot=snapshot,visualInspection="INSPECTED_BY_AUDITOR",actor="new synthetic professional",patient="new synthetic B2 residence",interaction="read,navigate,selectfilter,openform;no browser submit"))
(root / "browser-inspection.json").write_text(json.dumps(dict(entries=entries,
    method="Playwright CLI real local browser;official Auth storage state kept outside Git",
    limits="Four captures of specific states;not human acceptance,physical-device proof or all responsive breakpoints"),ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Four inspected browser captures registered")
