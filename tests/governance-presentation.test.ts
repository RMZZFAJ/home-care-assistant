import { describe, expect, it } from "vitest";
import { governanceComparison, type GovernanceChange } from "@/lib/governance-presentation";
import { governanceCommandConfirmed, governanceQuerySchema } from "@/lib/validation/governance";

const base: GovernanceChange = { id: "reference", kind: "settings", proposed: {}, current: {}, proposed_by: "global", proposerName: "Autora fictícia", subjectName: "Pessoa fictícia", status: "pending", base_version: 1, created_at: "2026-11-06T12:00:00Z", decided_at: null };
describe("governance comparisons use human fields without an editable transport payload", () => {
  it.each([
    ["settings", { archiveDays: 8 }, { archiveDays: 7 }, "Dias até arquivamento", "7", "8"],
    ["capability", { capability: "req.create", subjectRole: "professional", enabled: null }, { enabled: false }, "Permissão", "Não", "Herdar a regra da função"],
    ["membership", { userId: "person-id", role: "family" }, { role: "professional" }, "Função", "Profissional", "Familiar"],
    ["notification_rule", { event: "req.issued", role: "family", channels: ["internal", "email"] }, { channels: ["internal"] }, "Canais", "No aplicativo", "No aplicativo, E-mail"],
    ["administration", { operation: "recipient", args: { id: "patient", displayName: "Residência fictícia nova", isActive: false } }, { displayName: "Residência anterior", isActive: true }, "Ativo", "Sim", "Não"],
  ])("renders a %s change against the current value", (kind, proposed, current, label, before, after) => {
    const comparison = governanceComparison({ ...base, kind, proposed, current }, []);
    expect(comparison.supported).toBe(true);
    expect(comparison.rows.find(row => row.label === label)).toMatchObject({ current: before, proposed: after });
    expect(comparison.rows.some(row => row.key === "id")).toBe(false);
  });
  it("labels unknown fields and kinds as unsupported rather than approving or printing their JSON", () => {
    const comparison = governanceComparison({ ...base, kind: "future_kind", proposed: { future: { private: "never print as transport JSON" } } }, []);
    expect(comparison.supported).toBe(false);
    expect(comparison.title).toBe("Tipo de proposta não reconhecido");
    expect(comparison.rows[0].proposed).not.toContain("private");
  });
  it("keeps long multiline values and resolves recipients independently of their identifiers", () => {
    const value = "Linha muito extensa ".repeat(20) + "\nSegunda linha";
    const comparison = governanceComparison({ ...base, kind: "administration", proposed: { operation: "product", args: { name: value, description: "Observação\ncom quebra" } } }, []);
    expect(comparison.rows[0].proposed).toBe(value);
    expect(governanceComparison({ ...base, kind: "membership", proposed: { userId: "transport-id", role: "family" } }, []).rows[0].proposed).toBe("Pessoa fictícia");
  });
  it("never treats a known field from another kind or operation as an approvable change", () => {
    expect(governanceComparison({ ...base, proposed: { role: "family" } }, []).supported).toBe(false);
    expect(governanceComparison({ ...base, kind: "administration", proposed: { operation: "recipient", args: { lowThreshold: "2" } } }, []).supported).toBe(false);
  });
  it("resolves a catalogue identity to its name and explains the inherited capability value", () => {
    const proposal = { ...base, kind: "administration", proposed: { operation: "adoptProduct", args: { productId: "opaque-identity" } }, current: { _productName: "Material fictício" } };
    expect(governanceComparison(proposal, [])).toMatchObject({ supported: true, rows: [{ proposed: "Material fictício" }] });
    expect(governanceComparison({ ...proposal, current: null }, []).supported).toBe(false);
    expect(governanceComparison({ ...base, kind: "capability", proposed: { enabled: null }, current: { enabled: null, _inheritedEnabled: false } }, []).rows[0].proposed).toBe("Herdar a regra da função (restringir)");
  });
});
describe("a decoded response is not automatically a command confirmation", () => {
  it.each(["pending", "applied", "awaiting_acceptance", "rejected"])("recognizes a persisted %s result", status => {
    expect(governanceCommandConfirmed({ data: { id: "10000000-0000-4000-8000-000000000001", status }, pendingApproval: true })).toBe(true);
  });
  it.each([null, {}, { data: {} }, { data: { id: "transport-string", status: "applied" } }, { data: { id: "10000000-0000-4000-8000-000000000001", status: "future" } }])("refuses an unrecognized result %j", value => {
    expect(governanceCommandConfirmed(value)).toBe(false);
  });
});
describe("bounded governance query contract", () => {
  it("defaults only omitted values and accepts the documented maximum", () => {
    expect(governanceQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, status: "open" });
    expect(governanceQuerySchema.parse({ page: "1000000", pageSize: "50" }).pageSize).toBe(50);
  });
  it.each([null, "null", "", 0, 51, -1, 1.5, "NaN"])("rejects an explicit invalid page size %s", value => {
    expect(governanceQuerySchema.safeParse({ pageSize: value }).success).toBe(false);
  });
});
