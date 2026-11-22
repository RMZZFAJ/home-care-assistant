import { quantity } from "@/lib/quantity";
import type { ProductStock, StockCustody } from "@/types/stock";

export type StockBalanceFilter = "all" | "low" | "zero";
export type StockBalanceRow = {
  product: ProductStock;
  custody: "FAMILY" | "CARE_TEAM";
  stock: StockCustody;
};

export function stockBalanceSituation(stock: StockCustody) {
  const confirmed = quantity(stock.confirmed),
    isZero = confirmed.isZero();
  const atOrBelowMinimum =
    stock.minimum !== null && confirmed.lte(stock.minimum);
  if (confirmed.isNegative())
    return {
      label: "Saldo negativo",
      tone: "danger",
      isZero,
      atOrBelowMinimum,
    } as const;
  if (stock.minimum !== null) {
    const comparison = confirmed.comparedTo(stock.minimum);
    return {
      label:
        comparison < 0
          ? "Abaixo do mínimo"
          : comparison === 0
            ? "No mínimo"
            : "Regular",
      tone: comparison <= 0 ? "warning" : "success",
      isZero,
      atOrBelowMinimum,
    } as const;
  }
  return {
    label: isZero ? "Saldo zero · mínimo não definido" : "Mínimo não definido",
    tone: isZero ? "warning" : "neutral",
    isZero,
    atOrBelowMinimum,
  } as const;
}

/** Presentation filters never grant access or add incoming stock to available stock. */
export function stockBalanceRows(
  products: ProductStock[],
  custody: string,
  allowedCustodies: string[],
  filter: StockBalanceFilter,
): StockBalanceRow[] {
  return products.flatMap((product) => {
    const rows: StockBalanceRow[] = [];
    for (const key of ["FAMILY", "CARE_TEAM"] as const) {
      if (!allowedCustodies.includes(key) || (custody && custody !== key))
        continue;
      const stock = key === "FAMILY" ? product.family : product.team;
      if (!stock) continue;
      const situation = stockBalanceSituation(stock);
      if (filter === "low" && !situation.atOrBelowMinimum) continue;
      if (filter === "zero" && !situation.isZero) continue;
      rows.push({ product, stock, custody: key });
    }
    return rows;
  });
}
