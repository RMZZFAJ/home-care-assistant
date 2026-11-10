import type { FlowPreparationContent } from "@/lib/validation/flow-preparations";
import { DefinitionGrid } from "@/components/ui/controls";
import { formatBrazilDate } from "@/lib/receipt";
export function FlowPreparationSummary({
  content,
}: {
  content: FlowPreparationContent;
}) {
  const source = content.reference?.suggestion,
    fields = content.review;
  return (
    <div className="hca-form-stack">
      <p>
        Preenchimento privado da revisão do Flow. Salvar não confirma a
        sugestão, não cria relato e não desconta estoque.
      </p>
      <DefinitionGrid
        items={[
          {
            label: "Decisão preservada",
            value: fields.accept
              ? "Registrar os dados conferidos"
              : "Descartar a sugestão",
          },
          {
            label: "Tipo conferido",
            value:
              fields.kind === "consumption"
                ? "Consumo extraordinário"
                : fields.kind === "shortage"
                  ? "Falta de material"
                  : "Não preenchido",
          },
          {
            label: "Descrição conferida",
            value: (
              <span className="whitespace-pre-wrap">
                {fields.text || "Não preenchida"}
              </span>
            ),
            wide: true,
          },
        ]}
      />
      <ul>
        {fields.lines.map((l) => (
          <li className="wrap-anywhere" key={l.productId}>
            {l.name || l.productId} ·{" "}
            {l.quantity || "Quantidade não preenchida"} {l.unit}
          </li>
        ))}
      </ul>
      {!fields.accept ? (
        <p>
          Tipo, descrição e quantidades de registro não serão enviados na
          recusa.
        </p>
      ) : null}
      {source ? (
        <section aria-label="Sugestão original preservada">
          <h3>Sugestão original preservada</h3>
          <p>
            Recebida em {formatBrazilDate(source.createdAt)}. Sua revisão não
            altera o texto recebido.
          </p>
          <p className="whitespace-pre-wrap wrap-anywhere">
            {typeof source.body.text === "string"
              ? source.body.text
              : "Sem descrição textual recebida."}
          </p>
          <p>
            Referência: <span className="wrap-anywhere">{source.id}</span>
          </p>
        </section>
      ) : (
        <p>
          A referência ainda não foi preservada. Consulte e adote a versão atual
          antes de confirmar.
        </p>
      )}
    </div>
  );
}
