import { describe, expect, it } from "vitest";
import { matchCatalog, normalizeCatalogText } from "@/lib/catalog-match";

describe("patient catalogue matching", () => {
  it("normalizes case, accents, repeated whitespace and punctuation for exact names", () => {
    expect(normalizeCatalogText("  LUVA — Nitrílica...  ")).toBe("luva nitrilica");
    const product = { id: "local-luva", name: "Luva nitrílica" };
    expect(matchCatalog("  LUVA--NITRILICA! ", [product])).toMatchObject({ classification: "exact", candidates: [{ product, kind: "exact", distance: 0 }] });
  });

  it("recognizes exact aliases and ranks them ahead of nearby spellings", () => {
    const catalog = [{ id: "canonical", name: "Fralda adulto", aliases: ["Proteção absorvente"] }, { id: "near", name: "Protecao absorventes" }];
    const result = matchCatalog("proteção absorvente", catalog);
    expect(result.classification).toBe("alias");
    expect(result.candidates.map((candidate) => candidate.product.id)).toEqual(["canonical"]);
    expect(result.candidates[0].matchedName).toBe("Proteção absorvente");
  });

  it("keeps conflicting exact names and aliases ambiguous without choosing one", () => {
    const catalog = [{ id: "by-alias", name: "Material A", aliases: ["Gaze"] }, { id: "by-name", name: "Gaze" }];
    const result = matchCatalog("gaze", catalog);
    expect(result.classification).toBe("ambiguous");
    expect(result.candidates.map((candidate) => [candidate.product.id, candidate.kind])).toEqual([["by-name", "exact"], ["by-alias", "alias"]]);
    expect(catalog[0].aliases).toEqual(["Gaze"]);
  });

  it("suggests bounded spelling corrections, including adjacent transpositions", () => {
    const catalog = [{ id: "fralda", name: "Fralda" }, { id: "luva", name: "Luva nitrílica" }];
    expect(matchCatalog("fradla", catalog)).toMatchObject({ classification: "approximate", candidates: [{ product: { id: "fralda" }, distance: 1 }] });
    expect(matchCatalog("luva nitrilca", catalog)).toMatchObject({ classification: "approximate", candidates: [{ product: { id: "luva" }, distance: 1 }] });
    expect(matchCatalog("material completamente distinto", catalog).classification).toBe("absent");
    expect(matchCatalog("fra", catalog).classification).toBe("absent");
  });

  it("reports multiple approximate candidates as ambiguous and limits spelling distance", () => {
    const catalog = [{ id: "a", name: "Gaze" }, { id: "b", name: "Gaza" }, { id: "far", name: "Agulha" }];
    const result = matchCatalog("gazi", catalog);
    expect(result.classification).toBe("ambiguous");
    expect(result.candidates.map((candidate) => candidate.product.id)).toEqual(["b", "a"]);
    expect(result.candidates.every((candidate) => candidate.distance === 1)).toBe(true);
  });

  it("does not treat changed numeric sizes or concentrations as a typo", () => {
    const catalog = [{ id: "a", name: "Soro 100 ml" }, { id: "b", name: "Fralda tamanho 20" }];
    expect(matchCatalog("soro 10 ml", catalog).classification).toBe("absent");
    expect(matchCatalog("fralda tamanho 2", catalog).classification).toBe("absent");
  });

  it("handles blank or empty catalogues, ignores inactive entries and deduplicates aliases of one identity", () => {
    expect(matchCatalog("  ... ", [{ id: "a", name: "Gaze" }])).toEqual({ classification: "absent", candidates: [] });
    expect(matchCatalog("Gaze", [])).toEqual({ classification: "absent", candidates: [] });
    expect(matchCatalog("Gaze", [{ id: "a", name: "Gaze", active: false }, { id: "b", name: "Gaze", is_active: false }]).classification).toBe("absent");
    expect(matchCatalog("Gaze", [{ id: "a", name: "Gaze", aliases: ["Gaze", "GÁZE"] }])).toMatchObject({ classification: "exact", candidates: [{ product: { id: "a" } }] });
  });

  it("only returns identities supplied in the selected patient's catalogue", () => {
    const patientA = [{ id: "exclusive-a", name: "Material exclusivo A", aliases: ["Insumo especial"] }];
    const patientB = [{ id: "exclusive-b", name: "Material exclusivo B" }];
    expect(matchCatalog("Insumo especial", patientA).candidates[0].product.id).toBe("exclusive-a");
    expect(matchCatalog("Insumo especial", patientB)).toEqual({ classification: "absent", candidates: [] });
  });
});
