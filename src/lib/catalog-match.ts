export type MatchableCatalogItem = {
  id: string;
  name: string;
  aliases?: readonly string[];
  active?: boolean;
  is_active?: boolean;
};

export type CatalogMatchKind = "exact" | "alias" | "approximate";
export type CatalogMatch<T> = { product: T; kind: CatalogMatchKind; matchedName: string; distance: number };
export type CatalogMatchResult<T> = {
  classification: CatalogMatchKind | "ambiguous" | "absent";
  candidates: CatalogMatch<T>[];
};

export function normalizeCatalogText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

// Only a narrow band is calculated. Adjacent transpositions count as one typo;
// strings outside the permitted length/distance cannot become suggestions.
function boundedTypoDistance(first: string, second: string, maximum: number): number {
  if (Math.abs(first.length - second.length) > maximum) return maximum + 1;
  let previousPrevious: number[] = [];
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row++) {
    const current = new Array<number>(second.length + 1).fill(maximum + 1);
    current[0] = row;
    let minimum = current[0];
    for (let column = Math.max(1, row - maximum); column <= Math.min(second.length, row + maximum); column++) {
      current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1));
      if (row > 1 && column > 1 && first[row - 1] === second[column - 2] && first[row - 2] === second[column - 1]) current[column] = Math.min(current[column], previousPrevious[column - 2] + 1);
      minimum = Math.min(minimum, current[column]);
    }
    if (minimum > maximum) return maximum + 1;
    previousPrevious = previous;
    previous = current;
  }
  return previous[second.length];
}

const rank: Record<CatalogMatchKind, number> = { exact: 0, alias: 1, approximate: 2 };

/** The caller supplies only the current patient's catalogue. This function
 * never loads a shared/global catalogue and never changes an item association. */
export function matchCatalog<T extends MatchableCatalogItem>(query: string, catalog: readonly T[]): CatalogMatchResult<T> {
  const normalized = normalizeCatalogText(query);
  if (!normalized || normalized.length > 200) return { classification: "absent", candidates: [] };
  const byProduct = new Map<string, CatalogMatch<T>>();
  const maximum = Math.min(3, Math.max(1, Math.floor(normalized.length / 5)));
  const numbers = normalized.match(/\d+/g)?.join("|") ?? "";
  for (const product of catalog) {
    if (product.active === false || product.is_active === false) continue;
    for (const [index, label] of [product.name, ...(product.aliases ?? [])].entries()) {
      const name = normalizeCatalogText(label);
      let kind: CatalogMatchKind;
      let distance = 0;
      if (name === normalized) kind = index === 0 ? "exact" : "alias";
      else {
        // A changed concentration, size or count is not a spelling correction.
        if (normalized.length < 4 || name.length > 200 || (name.match(/\d+/g)?.join("|") ?? "") !== numbers) continue;
        distance = boundedTypoDistance(normalized, name, maximum);
        if (distance > maximum) continue;
        kind = "approximate";
      }
      const previous = byProduct.get(product.id);
      if (!previous || rank[kind] < rank[previous.kind] || rank[kind] === rank[previous.kind] && distance < previous.distance) byProduct.set(product.id, { product, kind, matchedName: label, distance });
    }
  }
  let candidates = [...byProduct.values()].sort((first, second) => rank[first.kind] - rank[second.kind] || first.distance - second.distance || first.product.name.localeCompare(second.product.name, "pt-BR") || first.product.id.localeCompare(second.product.id));
  // Exact names and exact aliases are stronger evidence than nearby spellings.
  // Conflicting exact names/aliases remain explicit alternatives for the user.
  if (candidates.some((candidate) => candidate.kind !== "approximate")) candidates = candidates.filter((candidate) => candidate.kind !== "approximate");
  return { classification: candidates.length > 1 ? "ambiguous" : candidates[0]?.kind ?? "absent", candidates };
}
