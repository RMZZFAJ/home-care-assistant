"use client";

import { ActionButton, FormField, SelectField, TextAreaField } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import Link from "next/link";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { balanceReviewItemFields, balanceReviewItems } from "@/lib/validation/balance-review-items";
import { balanceReviewItemsFromFields } from "@/lib/validation/balance-review-items";
import type { Ref } from "react";
import type { BalancePreparation } from "@/lib/validation/balance-document-decisions";
import type { BalanceReviewRecord } from "@/types/documents";

export function BalanceReviewItemFields({ lines, fields, onChange, disabled, ref }: {
  lines: BalancePreparation["lines"];
  fields: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled: boolean;
  ref?: Ref<HTMLFieldSetElement>;
}) {
  const currentIds = new Set(lines.map(line => line.id));
  const previous = Object.keys(fields).filter(key => key.startsWith("item:") && !currentIds.has(key.slice(5)));
  const change = (key: string, value: unknown) => {
    const next = { ...fields };
    if (value === null) delete next[key]; else next[key] = JSON.stringify(value);
    onChange(next);
  };
  return <fieldset ref={ref} disabled={disabled} className="hca-form-stack">
    <legend>Materiais efetivamente examinados</legend>
    <p>Deixe Não examinado nos materiais que não conferiu. Uma revisão geral não confirma cada material. Indicar reconto ou ajuste não executa esse ato.</p>
    {previous.length ? <Notice>Há referências de materiais da preparação anterior que não constam nesta contagem. Remova-as explicitamente antes de confirmar.
      {previous.map((key, index) => <ActionButton key={key} onClick={() => change(key, null)}>Remover referência anterior {index + 1} desta revisão</ActionButton>)}
    </Notice> : null}
    {lines.map(line => {
      const key = "item:" + line.id;
      const raw = fields[key];
      let parsed: ReturnType<typeof balanceReviewItemFields.safeParse> | null = null;
      try { if (raw !== undefined) parsed = balanceReviewItemFields.safeParse(JSON.parse(raw)); } catch { /* Keep the original field until an explicit choice replaces it. */ }
      const value = parsed?.success ? parsed.data : null;
      const staleLabel = value && ((value.materialName !== undefined && value.materialName !== line.name) || (value.unit !== undefined && value.unit !== line.unit));
      return <fieldset className="hca-form-stack" key={line.id}>
        <legend>{line.name} · {line.unit}</legend>
        {raw !== undefined && !value ? <Notice error>O preenchimento deste material não pôde ser conferido. Ele foi mantido; escolha novamente o resultado para corrigi-lo.</Notice> : null}
        <FormField label={"Resultado da revisão — " + line.name} error={raw !== undefined && (!value || staleLabel) ? "A referência do material mudou ou não pôde ser conferida. Escolha novamente seu resultado." : undefined}>
          <SelectField value={value?.result ?? "not_examined"} onChange={event => {
            const result = event.currentTarget.value;
            if (result === "not_examined") change(key, null);
            else change(key, { result, forwarding: result === "confirmed" ? "none" : value?.forwarding ?? "none", comment: value?.comment ?? "", materialName: line.name, unit: line.unit });
          }}>
            <option value="not_examined">Não examinado</option>
            <option value="confirmed">Confirmado</option>
            <option value="difference">Diferença apontada</option>
          </SelectField>
        </FormField>
        {value?.result === "difference" ? <FormField label={"Encaminhamento — " + line.name} required error={value.forwarding === "none" ? "Escolha reconto ou ajuste autorizado em ato próprio." : undefined} helpText="A diferença e o encaminhamento ficam registrados. A correção exige um ato autorizado próprio.">
          <SelectField value={value.forwarding} onChange={event => change(key, { ...value, forwarding: event.currentTarget.value })}>
            <option value="none">Escolha o encaminhamento</option>
            <option value="recount">Solicitar reconto</option>
            <option value="adjustment">Ajuste autorizado em ato próprio</option>
          </SelectField>
        </FormField> : null}
        {value ? <FormField label={"Comentário do material — " + line.name} helpText={`${value.comment.length}/500 caracteres.`}>
          <TextAreaField value={value.comment} maxLength={500} onChange={event => change(key, { ...value, comment: event.currentTarget.value })} />
        </FormField> : null}
      </fieldset>;
    })}
  </fieldset>;
}

export function BalanceReviewPreparedFacts({ lines, fields }: { lines: BalancePreparation["lines"]; fields: Record<string, string>; }) {
  let items: ReturnType<typeof balanceReviewItemsFromFields> | null = null;
  try { items = balanceReviewItemsFromFields(fields); } catch { /* Malformed saved values remain editable. */ }
  if (!items) return <Notice error>Confira os resultados por material antes de confirmar.</Notice>;
  if (!items.length) return <p>Revisão geral; nenhum material foi declarado como examinado individualmente.</p>;
  return <section className="hca-form-stack" aria-label="Materiais incluídos na revisão">
    <h3>Materiais incluídos na revisão</h3>
    {items.map(item => <article key={item.lineId} className="hca-form-stack">
      <strong>{lines.find(line => line.id === item.lineId)?.name ?? "Referência anterior não disponível"}</strong>
      <p>{item.result === "confirmed" ? "Confirmado" : "Diferença apontada"} · {item.forwarding === "none" ? "Sem encaminhamento adicional" : item.forwarding === "recount" ? "Solicitar reconto" : "Ajuste autorizado em ato próprio"}.</p>
      {item.comment ? <p className="whitespace-pre-wrap wrap-anywhere">{item.comment}</p> : null}
    </article>)}
    <p>Os demais materiais não foram declarados como examinados. A revisão não altera o estoque.</p>
  </section>;
}

export function BalanceReviewItemFacts({ review, corrections, documentId, documentVersion }: { review: BalanceReviewRecord; corrections?: unknown; documentId: string; documentVersion: number; }) {
  const linked = balanceCorrectionFacts.safeParse(corrections);
  const parsed = balanceReviewItems.safeParse(review.item_results ?? []);
  if (!parsed.success) return <Notice error>Não foi possível conferir o detalhamento por material desta revisão.</Notice>;
  if (!parsed.data.length) return <p>Revisão geral; nenhum resultado por material foi declarado neste ato.</p>;
  return <section className="hca-form-stack" aria-label="Resultados por material desta revisão">
    <h4>Materiais com revisão individual</h4>
    {parsed.data.map(item => {
      const line = review.reviewed_snapshot.lines.find(row => row.id === item.lineId);
      return <article key={item.lineId} className="hca-form-stack">
        <strong>{line ? `${line.name_snapshot} · ${line.unit_snapshot}` : "Material não identificado no registro preservado"}</strong>
        <p>{item.result === "confirmed" ? "Confirmado" : "Diferença apontada"} · {item.forwarding === "none" ? "Sem encaminhamento adicional" : item.forwarding === "recount" ? "Solicitação de reconto indicada" : "Ajuste autorizado em ato próprio indicado"}.</p>
        {item.comment ? <p className="whitespace-pre-wrap wrap-anywhere">{item.comment}</p> : null}
        {item.result === "difference" ? <>
          <p>A revisão não corrige o estoque. O encaminhamento, sozinho, não comprova sua execução.</p>
          {!linked.success ? <Notice error>Não foi possível conferir os atos posteriores vinculados. Consulte novamente esta ficha.</Notice> : (() => {
            const entry = linked.data.find(row => row.reviewId === review.id && row.sourceLineId === item.lineId);
            if (!entry || entry.acts.some(act => act.documentId !== documentId || act.version > documentVersion || act.version <= review.reviewed_document_version || act.countVersion <= review.count_version || (act.application.state === 'applied' && act.application.documentVersion > documentVersion))) return <Notice error>Os atos posteriores não correspondem à ficha, contagem ou versão consultada. Consulte novamente esta ficha.</Notice>;
            if (entry.sourceState === 'unavailable') return <Notice>Identidade histórica deste material indisponível; nenhum vínculo foi presumido por nome ou quantidade.</Notice>;
            if (!entry.acts.length) return <p>Nenhum reconto posterior vinculado a este material nesta ficha.</p>;
            return <section className="hca-form-stack" aria-label="Atos posteriores vinculados a este material">
              <h5>Atos posteriores vinculados</h5>
              {entry.acts.map(act => <article className="hca-form-stack" key={act.eventId}>
                <strong>Reconto {act.countVersion} · versão {act.version}</strong>
                <p>{act.actorName ?? "Nome histórico não preservado"} · {formatBrazilDate(act.recordedAt)}.</p>
                <p>{act.line.name} · contado neste reconto: {formatQuantity(act.line.quantity, act.line.unit)}.</p>
                <Link className="ui-button ui-button-secondary" href={"/documentos/" + act.documentId + "/arquivos?version=" + act.version}>Consultar versão {act.version} do reconto</Link>
                {act.application.state === 'applied' ? <>
                  <p>Aplicado por {act.application.actorName} · {formatBrazilDate(act.application.appliedAt)} · versão {act.application.documentVersion}.</p>
                  <p>Saldo após a aplicação deste reconto: {act.application.lines[0].state === 'restricted' ? 'Acesso restrito' : formatQuantity(act.application.lines[0].quantity, act.line.unit)}.</p>
                  <Link className="ui-button ui-button-secondary" href={"/documentos/" + act.documentId + "/arquivos?version=" + act.application.documentVersion}>Consultar aplicação na versão {act.application.documentVersion}</Link>
                </> : <p>{act.application.state === 'not_applied' ? 'Reconto registrado; contagem não aplicada ao estoque.' : 'Saldo após a aplicação: Não disponível no registro.'}</p>}
              </article>)}
              <p>Esses atos têm autoria e resultado próprios. Não substituem o Contado nem o saldo da contagem anterior e não declaram esta revisão como confirmação das contagens seguintes.</p>
            </section>;
          })()}
        </> : null}
      </article>;
    })}
    <p>Os demais materiais não têm resultado individual declarado neste revisão.</p>
  </section>;
}
