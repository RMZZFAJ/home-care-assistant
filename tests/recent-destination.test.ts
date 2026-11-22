import { describe, expect, it } from "vitest";
import { recentDestination, recentDestinationAllowed } from "@/lib/auth/recent-destination";
import type { ContextData } from "@/components/layout/workspace-context";

const patient = "10000000-0000-4000-8000-000000000001";
const document = "20000000-0000-4000-8000-000000000001";
const target = { userId: "person", patientId: patient, path: "/historico?careRecipientId=" + patient, at: 1000 };
const context = (): ContextData => ({ userId: "person", fullName: "Pessoa fictícia", isGlobalAdmin: false, activeContext: { mode: "patient", care_recipient_id: patient, revision: 1 }, patients: [{ id: patient, display_name: "Paciente fictício", role: "family", hasMembership: true, is_active: true, capabilities: { "req.read": true } }] });

describe("recent destination remains a bounded navigation preference", () => {
  it("binds account, time and a safe complete local path", () => {
    const row = { ...target, path: "/verificar?codigo=ABC#detalhes" };
    expect(recentDestination(JSON.stringify(row), "person", "https://local.invalid", 1000 + 30 * 60 * 1000)).toEqual(row);
    for (const [value, user, now] of [[row, "other", 1000], [row, "person", 999], [row, "person", 1801001], [{ ...row, path: "https://outside.invalid" }, "person", 1000], [{ ...row, at: null }, "person", 1000]] as const)
      expect(recentDestination(JSON.stringify(value), user, "https://local.invalid", now)).toBeNull();
  });
  it("requires a fresh matching live membership, patient context and capability", () => {
    expect(recentDestinationAllowed(target, context())).toBe(true);
    const variants = [context(), context(), context(), context(), context()];
    variants[0].userId = "other";
    variants[1].patients[0].hasMembership = false;
    variants[2].patients[0].is_active = false;
    variants[3].activeContext = { mode: "global", care_recipient_id: null, revision: 2 };
    variants[4].patients[0].capabilities = {};
    for (const value of variants) expect(recentDestinationAllowed(target, value)).toBe(false);
    expect(recentDestinationAllowed({ ...target, path: "/historico?careRecipientId=other" }, context())).toBe(false);
  });
  it("rechecks a known document's scope and type rather than trusting its URL", () => {
    const row = { ...target, path: "/documentos/" + document }, value = context();
    expect(recentDestinationAllowed(row, value)).toBe(false);
    value.documentContext = { id: document, patientId: patient, displayName: "Fictício", type: "REQ" };
    expect(recentDestinationAllowed(row, value)).toBe(true);
    value.documentContext.type = "COM";
    expect(recentDestinationAllowed(row, value)).toBe(false);
    value.documentContext.patientId = "other";
    expect(recentDestinationAllowed(row, value)).toBe(false);
  });
  it("uses actual route capabilities and the selected stock custody", () => {
    for (const [path, cap] of [["/escalas?week=2026-11-09", "schedule.read.own"], ["/consumo", "consumption.report"], ["/estoque?custody=TRANSIT", "ent.read"], ["/admin?section=catalog", "catalog.manage"], ["/unidades", "catalog.manage"]]) {
      const value=context();value.patients[0].capabilities={[cap]:true};
      expect(recentDestinationAllowed({...target,path},value)).toBe(true);
      value.patients[0].capabilities={};
      expect(recentDestinationAllowed({...target,path},value)).toBe(false);
    }
    const value=context();value.patients[0].capabilities={"stock.team.read":true};
    expect(recentDestinationAllowed({...target,path:"/estoque?custody=FAMILY"},value)).toBe(false);
  });
});
