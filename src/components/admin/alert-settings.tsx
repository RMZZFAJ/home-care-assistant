"use client";
import type { FormEvent } from "react";
import { inputClass, panelClass, primaryClass } from "@/components/workspace";
import { Check, text, bool, type Row } from "./admin-fields";

export function AlertSettings({
  rows,
  products,
  handle,
}: {
  rows: Row[];
  products: Row[];
  handle: (
    event: FormEvent<HTMLFormElement>,
    payload: (data: FormData) => Row,
    success?: string,
  ) => void;
}) {
  return (
    <section className={panelClass}>
      <h2 className="mb-4 font-bold">Limites de estoque por item e custódia</h2>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) =>
          handle(event, (data) => ({
            action: "alertRule",
            productId: data.get("productId"),
            location: data.get("location"),
            lowThreshold: String(data.get("lowThreshold")),
            criticalThreshold: String(data.get("criticalThreshold")),
            isEnabled: data.has("isEnabled"),
          }))
        }
      >
        <label className="text-sm font-semibold">
          Item do catálogo
          <select name="productId" required className={inputClass}>
            <option value="">Selecione</option>
            {products
              .filter((product) => product.is_active !== false)
              .map((product) => (
                <option key={text(product, "id")} value={text(product, "id")}>
                  {text(product, "name")}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Custódia
          <select className={inputClass} name="location">
            <option value="CARE_TEAM">Equipe de cuidado</option>
            <option value="FAMILY">Família</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Limite baixo<input className={inputClass} name="lowThreshold" inputMode="decimal" defaultValue="0" required pattern="[0-9]+([.,][0-9]{1,6})?" /></label>
        <label className="text-sm font-semibold">Limite crítico<input className={inputClass} name="criticalThreshold" inputMode="decimal" defaultValue="0" required pattern="[0-9]+([.,][0-9]{1,6})?" /></label>
        <Check name="isEnabled" label="Regra habilitada" />
        <button className={primaryClass} type="submit">
          Salvar regra
        </button>
      </form>
      <ul className="mt-5 space-y-2">
        {rows.map((row) => (
          <li
            key={text(row, "id")}
            className="rounded border border-(--line) p-3 text-sm"
          >
            {text(
              products.find((product) => product.id === row.product_id) ?? row,
              "name",
            ) || text(row, "product_id")}{" "}
            · {text(row, "location")} · baixo: {text(row, "low_threshold")} ·
            crítico: {text(row, "critical_threshold")} ·{" "}
            {bool(row, "is_enabled") ? "habilitada" : "desabilitada"}
          </li>
        ))}
      </ul>
    </section>
  );
}
