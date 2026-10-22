import { normalizeCatalogText } from "@/lib/catalog-match";
type Product = { id: string; name: string; aliases?: string[]; unit: string };
export type ConsumptionMessage = {
  kind: "consumption" | "shortage";
  lines: { productId: string; quantity: string; unit: string }[];
  needsReview: boolean;
};
/** Deterministic suggestions only: an unmatched or ambiguous clause remains unstructured. */
export function parseConsumptionMessage(
  text: string,
  catalog: Product[],
): ConsumptionMessage {
  const normalized = normalizeCatalogText(text);
  const kind = /\b(falta|faltou|acabou|sem material)\b/.test(normalized)
    ? "shortage"
    : "consumption";
  const lines: ConsumptionMessage["lines"] = [];
  let needsReview = false;
  for (const rawClause of text.split(/[;\n]/).filter((part) => part.trim())) {
    const clause = normalizeCatalogText(rawClause);
    const matches = catalog.filter((product) =>
      [product.name, ...(product.aliases ?? [])].some((name) => {
        const candidate = normalizeCatalogText(name);
        return candidate.length > 2 && clause.includes(candidate);
      }),
    );
    const amounts = rawClause.match(/\b\d+(?:[.,]\d{1,6})?\b/g) ?? [];
    if (
      matches.length !== 1 ||
      amounts.length !== 1 ||
      Number(amounts[0].replace(",", ".")) <= 0
    ) {
      needsReview = true;
      continue;
    }
    const product = matches[0];
    const namedUnit = clause.match(
      /\b(caixas?|pacotes?|frascos?|ml|gramas?|comprimidos?|unidades?)\b/,
    )?.[0];
    if (
      namedUnit &&
      !normalizeCatalogText(product.unit).startsWith(
        namedUnit.replace(/s$/, ""),
      )
    ) {
      needsReview = true;
      continue;
    }
    if (lines.some((line) => line.productId === product.id)) {
      needsReview = true;
      continue;
    }
    lines.push({
      productId: product.id,
      quantity: amounts[0].replace(",", "."),
      unit: product.unit,
    });
  }
  return { kind, lines, needsReview };
}
export interface AudioTranscriptionAdapter {
  transcribe(input: {
    mediaId: string;
    mimeType: string;
    correlationId: string;
  }): Promise<{ text: string; confidence?: number }>;
}
