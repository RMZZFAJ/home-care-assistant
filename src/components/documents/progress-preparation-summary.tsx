"use client";
import { DefinitionGrid } from "@/components/ui/controls";
import { useParams } from "next/navigation";
import { SavedProgressReference } from "./progress-reference";
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
  const params = useParams();
  const documentId = typeof params?.id === "string" ? params.id : undefined;
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
                {documentId ? <SavedProgressReference documentId={documentId} id={id} /> : <span>Referência {index + 1} preservada; abra a ficha para consultá-la.</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
