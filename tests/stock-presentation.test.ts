import { describe, expect, test } from "vitest";
import {
  stockBalanceRows,
  stockBalanceSituation,
} from "@/lib/stock-presentation";
import type { ProductStock, StockCustody } from "@/types/stock";

const stock = (
  confirmed: string,
  minimum: string | null = "1",
): StockCustody => ({
  confirmed,
  minimum,
  incoming: "100",
  purchasePending: "100",
});
const product = (index: number): ProductStock => ({
  productId: String(index),
  name: "Material " + index,
  unit: "mL",
  decimals: 6,
  active: true,
  family: stock("30"),
  team: stock("0"),
  disputed: "0",
});

describe("exact stock presentation", () => {
  test("distinguishes immediately below, at and above the configured minimum without float rounding", () => {
    expect(
      stockBalanceSituation(stock("999999999.999999", "1000000000")).label,
    ).toBe("Abaixo do mínimo");
    expect(
      stockBalanceSituation(stock("1000000000.000000", "1000000000")).label,
    ).toBe("No mínimo");
    expect(stockBalanceSituation(stock("0.000001", "0")).label).toBe("Regular");
  });
  test("keeps a missing minimum distinct from a configured zero and does not claim regularity", () => {
    expect(stockBalanceSituation(stock("30", null))).toMatchObject({
      label: "Mínimo não definido",
      tone: "neutral",
      atOrBelowMinimum: false,
    });
    expect(stockBalanceSituation(stock("0", "0"))).toMatchObject({
      label: "No mínimo",
      atOrBelowMinimum: true,
      isZero: true,
    });
  });
  test("retains negative stock as an explicit exception rather than a zero or a regular balance", () => {
    expect(stockBalanceSituation(stock("-0.000001", null))).toMatchObject({
      label: "Saldo negativo",
      tone: "danger",
      isZero: false,
    });
  });
  test("zero filter uses confirmed stock and ignores incoming and purchase projections", () => {
    const a = product(0);
    a.family = stock("0", null);
    const b = product(1);
    b.family = stock("0.000001", null);
    expect(
      stockBalanceRows([a, b], "FAMILY", ["FAMILY"], "zero").map(
        (r) => r.product.productId,
      ),
    ).toEqual(["0"]);
  });
  test("low filter includes equality according to the existing operational threshold and excludes an absent rule", () => {
    const a = product(0);
    a.family = stock("1");
    const b = product(1);
    b.family = stock("0", null);
    const c = product(2);
    c.family = stock("0.999999");
    expect(
      stockBalanceRows([a, b, c], "FAMILY", ["FAMILY"], "low").map(
        (r) => r.product.productId,
      ),
    ).toEqual(["0", "2"]);
  });
  test("a filter cannot expose another custody or manufacture a restricted balance", () => {
    const a = product(0);
    a.family = null;
    expect(stockBalanceRows([a], "FAMILY", ["CARE_TEAM"], "all")).toEqual([]);
    expect(
      stockBalanceRows([product(1)], "", ["CARE_TEAM"], "all").map(
        (r) => r.custody,
      ),
    ).toEqual(["CARE_TEAM"]);
    expect(stockBalanceRows([product(2)], "", [], "all")).toEqual([]);
  });
  test("all101 records remain reachable, with distinct identities, inactive stock and complete names/precision", () => {
    const products = Array.from({ length: 101 }, (_, i) => product(i));
    products[100].active = false;
    products[100].name = "IdentificaçãoExtensa".repeat(8);
    products[100].family = stock("999999999.999999", null);
    const before = structuredClone(products),
      rows = stockBalanceRows(
        products,
        "FAMILY",
        ["FAMILY", "CARE_TEAM"],
        "all",
      );
    expect(rows).toHaveLength(101);
    expect(new Set(rows.map((r) => r.product.productId)).size).toBe(101);
    expect(rows[100].product).toEqual(products[100]);
    expect(rows[100].stock.confirmed).toBe("999999999.999999");
    expect(products).toEqual(before);
  });
});
