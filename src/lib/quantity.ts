import Decimal from "decimal.js";

export function quantity(value: string | number) {
  return new Decimal(String(value).replace(",", "."));
}
export function formatQuantity(
  value: string | number | null | undefined,
  unit?: string,
) {
  if (value == null) return "—";
  const normalized = quantity(value).toFixed().replace(".", ",");
  return unit ? `${normalized} ${unit}` : normalized;
}
export function validQuantity(value: string, decimals = 0, allowZero = false) {
  try {
    if (!/^\d+(?:[.,]\d{1,6})?$/.test(value)) return false;
    const amount = quantity(value);
    return (
      (allowZero ? amount.gte(0) : amount.gt(0)) &&
      amount.lte(1_000_000_000) &&
      amount.decimalPlaces() <= decimals
    );
  } catch {
    return false;
  }
}
