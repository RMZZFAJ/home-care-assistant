"use client";
import { DefinitionGrid } from "@/components/ui/controls";
import Link from "next/link";
import {
  progressCategories,
  progressStages,
} from "@/lib/validation/document-progress";
import type { ProgressPreparationContent } from "@/lib/validation/progress-preparations";
export function ProgressPreparationSummary({
  content,
}: {
  content: ProgressPreparationContent;
}) {
  return (
    <div className="hca-form-stack">
      <DefinitionGrid
        items={[
          {
            label: "Categoria",
            value: progressCategories[content.note.category],
          },
          {
            label: "Etapa relacionada",
            value: content.note.stage
              ? progressStages[content.note.stage]
              : "Sem vínculo de etapa",
          },
          {
            label: "Texto preservado",
            value: (
              <p className="whitespace-pre-wrap wrap-break-word">
                {content.note.text || "Ainda não preenchido"}
              </p>
            ),
            wide: true,
          },
        ]}
      />
      {content.note.references.length ? (
        <section aria-label="Referências preservadas">
          <h3>Referências preservadas</h3>
          <ul>
            {content.note.references.map((id, index) => (
              <li key={id}>
                <Link
                  className="ui-button"
                  prefetch={false}
                  href={"/fichas/" + id}
                >
                  Abrir referência {index + 1}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
