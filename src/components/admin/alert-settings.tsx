"use client";
import { panelClass } from "@/components/workspace";
import { text, bool, type Row } from "./admin-fields";

import { AdministrativePreparationEditor } from "./administrative-preparation-editor";
import type { AdministrativeOutcome } from "@/lib/validation/administrative-preparation";

export function AlertSettings({
  rows,
  products,
  patientId, userId, globalMode, onConfirmed,
}: {
  rows: Row[];
  products: Row[];
  patientId: string; userId: string; globalMode: boolean;
  onConfirmed: (outcome: AdministrativeOutcome) => void;
}) {
  return (
    <section className={panelClass}>
      <h2 className="mb-4 font-bold">Limites de estoque por item e custódia</h2>
      <AdministrativePreparationEditor
        scope={{patientId,mode:globalMode ? "global" : "patient",purpose:"alertRule",targetId:null}}
        userId={userId} products={products} onConfirmed={onConfirmed}
      />
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
