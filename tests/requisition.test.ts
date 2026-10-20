import { describe, expect, it } from "vitest";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { buildWhatsAppSummary } from "@/lib/receipt";
import { CATALOG, findCatalogItemByName } from "@/lib/catalog";
import { readFileSync } from "node:fs";
import path from "node:path";

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
  it("rejeita quantidade fracionária, limite de observações e produtos duplicados", () => {
    expect(requisitionInputSchema.safeParse({ ...base, lines: [{ ...base.lines[0], currentStock: 1.5 }] }).success).toBe(false);
    expect(requisitionInputSchema.safeParse({ ...base, observations: Array.from({ length: 51 }, () => "observação") }).success).toBe(false);
    expect(requisitionInputSchema.safeParse({ ...base, lines: [base.lines[0], base.lines[0]] }).success).toBe(false);
  });
  it("produz resumo sem expor dados além do comprovante", () => {
    const summary = buildWhatsAppSummary({ ...base, protocol: "HC-20261019-ABC12345", requesterName: "Profissional teste", recipientName: "Pessoa desenvolvimento", createdAt: "2026-10-19T12:00:00.000Z" });
    expect(summary).toContain("HC-20261019-ABC12345");
    expect(summary).toContain("Fralda: 4");
  });
});

describe("integridade do catálogo", () => {
  it("mantém os 29 itens únicos e presentes no seed", () => {
    expect(CATALOG).toHaveLength(29);
    expect(new Set(CATALOG.map((item) => item.id)).size).toBe(29);
    const seed = readFileSync(path.resolve(process.cwd(), "supabase/seed.sql"), "utf8");
    for (const item of CATALOG) expect(seed).toContain(`('${item.id}'`);
  });
  it("usa as unidades operacionais revisadas", () => {
    const item = (id: string) => CATALOG.find((catalogItem) => catalogItem.id === id);
    expect(item("phosfoenema")?.unit).toBe("bisnaga");
    expect(item("monuril")).toMatchObject({ name: "Fsofomicna (Monuril) 3g", unit: "envelope" });
    expect(item("quetiapina-100")?.unit).toBe("comprimido");
    expect(item("fralda")?.unit).toBe("unidade");
    expect(item("sabonete-intimo")?.unit).toBe("frasco");
    expect(item("pomada-assadura")?.unit).toBe("bisnaga");
  });
  it("resolve aliases sem duplicar o produto", () => {
    expect(findCatalogItemByName("Fosfomicina")?.id).toBe("monuril");
    expect(findCatalogItemByName("Monuril")?.id).toBe("monuril");
    expect(findCatalogItemByName("fosfomicina (monuril) 3g")?.id).toBe("monuril");
  });
});
