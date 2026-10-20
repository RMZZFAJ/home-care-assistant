import { describe, expect, it } from "vitest";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { buildWhatsAppSummary } from "@/lib/receipt";

const base = { lines: [{ productId: "fralda", productName: "Fralda", category: "higiene" as const, currentStock: 2, requestedQuantity: 4, urgent: true }], extraItems: [], observations: [], idempotencyKey: "4c9b5c6a-7d8e-4f90-a123-456789abcdef" };

describe("validação de requisição", () => {
  it("aceita itens válidos com quantidade inteira", () => expect(requisitionInputSchema.safeParse(base).success).toBe(true));
  it("bloqueia estoque negativo e solicitação decimal", () => {
    expect(requisitionInputSchema.safeParse({ ...base, lines: [{ ...base.lines[0], currentStock: -1 }] }).success).toBe(false);
    expect(requisitionInputSchema.safeParse({ ...base, lines: [{ ...base.lines[0], requestedQuantity: 1.5 }] }).success).toBe(false);
  });
  it("bloqueia item extra sem nome e observação vazia", () => {
    expect(requisitionInputSchema.safeParse({ ...base, extraItems: [{ id: "x", name: " ", currentStock: 0, requestedQuantity: 1, urgent: false }] }).success).toBe(false);
    expect(requisitionInputSchema.safeParse({ ...base, observations: [" "] }).success).toBe(false);
  });
  it("permite uma requisição composta apenas por item extra válido", () => {
    expect(requisitionInputSchema.safeParse({ ...base, lines: [], extraItems: [{ id: "x", name: "Material especial", currentStock: 0, requestedQuantity: 1, urgent: false }] }).success).toBe(true);
  });
  it("produz resumo sem expor dados além do comprovante", () => {
    const summary = buildWhatsAppSummary({ ...base, protocol: "HC-20261019-ABC12345", requesterName: "Profissional teste", recipientName: "Pessoa desenvolvimento", createdAt: "2026-10-19T12:00:00.000Z" });
    expect(summary).toContain("HC-20261019-ABC12345");
    expect(summary).toContain("Fralda: 4");
  });
});
