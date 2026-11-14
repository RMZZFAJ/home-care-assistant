import type { PresentationSelection } from "@/types/catalogue";
import { formatQuantity, quantity } from "@/lib/quantity";

export type PresentationConversion = PresentationSelection & {
  convertedQuantity: string;
};
export function readPresentationConversions(
  value: unknown,
): PresentationConversion[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is PresentationConversion => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as Record<string, unknown>;
    return (
      [
        "id",
        "barcode",
        "name",
        "packages",
        "baseQuantity",
        "unit",
        "convertedQuantity",
      ].every((key) => typeof row[key] === "string") &&
      Number.isSafeInteger(row.version)
    );
  });
}
export function presentationCaption(row: PresentationSelection) {
  const total = quantity(row.packages).times(row.baseQuantity).toFixed();
  return `${row.name} · código ${row.barcode} · ${formatQuantity(row.packages)} × ${formatQuantity(row.baseQuantity, row.unit)} = ${formatQuantity(total, row.unit)} · v${row.version}`;
}
