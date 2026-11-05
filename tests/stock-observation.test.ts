import { describe, expect, it } from "vitest";
import { formatStockObservation, formatStockObservationTime, restoreStockObservation, validStockObservation } from "@/lib/stock-observation";

describe("observação de estoque REQ", () => {
  it("não transforma ausência ou desconhecimento em zero observado", () => {
    expect(formatStockObservation(0, "observed", "unidade")).toBe("0 unidade (observado)");
    expect(formatStockObservation(null, "unknown")).toBe("Não sei informar");
    expect(formatStockObservation(null, "unfilled")).toBe("Não informado");
    expect(formatStockObservation(0, "legacy_unclassified")).toContain("legada sem classificação");
    expect(validStockObservation({ currentStock: 0, stockObservation: "observed" }, 0)).toBe(true);
    expect(validStockObservation({ currentStock: null, stockObservation: "unfilled" })).toBe(true);
    expect(validStockObservation({ currentStock: null, stockObservation: "unknown" })).toBe(true);
    expect(validStockObservation({ currentStock: 1.0000004, stockObservation: "observed" }, 6)).toBe(false);
    expect(validStockObservation({ currentStock: 1.234567, stockObservation: "observed" }, 6)).toBe(true);
    expect(validStockObservation({ currentStock: 1.5, stockObservation: "observed" }, 0)).toBe(false);
  });
  it("recupera valores de rascunho antigo para revisão, sem inventar uma observação", () => {
    for (const amount of [0, 7]) {
      const line = restoreStockObservation({ productId: "material", currentStock: amount });
      expect(line).toEqual({ productId: "material", currentStock: amount, stockObservation: "legacy_unclassified" });
      expect(validStockObservation(line)).toBe(false);
    }
    expect(restoreStockObservation({ currentStock: null })).toEqual({ currentStock: null, stockObservation: "unfilled" });
    expect(restoreStockObservation({ currentStock: null, stockObservation: "unknown" as const }).stockObservation).toBe("unknown");
  });
  it("conserva o instante antigo e distingue sua origem do recebimento no servidor", () => {
    const at = "2026-11-04T18:12:30.000Z";
    const line = { currentStock: 7, stockObservation: "observed" as const, stockObservationAt: at };
    expect(restoreStockObservation(line)).toEqual(line);
    expect(formatStockObservationTime(at, "client_draft")).toContain("horário do dispositivo): 04/11/2026, 15:12");
    expect(formatStockObservationTime(at, "server_submission")).toContain("recebida na emissão: 04/11/2026, 15:12");
    expect(formatStockObservationTime(null, "legacy_unknown")).toBe("Horário da informação desconhecido");
  });
});
