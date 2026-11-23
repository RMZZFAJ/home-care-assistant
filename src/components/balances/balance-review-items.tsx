"use client";

import { ActionButton, FormField, SelectField, TextAreaField } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { materialCategories } from "@/components/forms/supply-wizard-stages";
import { Notice } from "@/components/workspace";
import Link from "next/link";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { balanceReviewItemFields, balanceReviewItems, balanceReviewItemsFromFields, reviewedBalanceMaterial } from "@/lib/validation/balance-review-items";
import type { Ref } from "react";
import type { BalancePreparation } from "@/lib/validation/balance-document-decisions";
import type { BalanceReviewRecord } from "@/types/documents";

const choiceLabels = [
  { value: "not_examined", label: "Não conferi", icon: null },
  { value: "confirmed", label: "Confere", icon: "check" },
  { value: "difference", label: "Diferença", icon: "alert" },
] as const;

const reviewCategories = [
  ...materialCategories,
  { id: "other", label: "Outros materiais", icon: "box" },
  { id: "extra", label: "Itens extras", icon: "box" },
] as const;

type ReviewLine = BalancePreparation["lines"][number];
type ReviewField = ReturnType<typeof readReviewField>;

function readReviewField(raw: string | undefined) {
  if (raw === undefined) return null;
  try {
    const parsed = balanceReviewItemFields.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function BalanceReviewMaterialEditor({ line, value, needsChoice, icon, onChange }: {
  line: ReviewLine;
  value: ReviewField;
  needsChoice: boolean;
  icon: IconName;
  onChange: (value: ReviewField) => void;
}) {
  return <fieldset className="hca-form-stack hca-balance-opinion-card" data-result={value?.result}>
    <legend className="sr-only">{line.name} · {line.unit}</legend>
    <div className="hca-balance-opinion-title">
      <Icon name={icon} />
      <div><strong>{line.name}</strong><small>{line.category === "extra" ? "Item extra" : line.unit}</small></div>
    </div>
    <p className="hca-balance-opinion-count"><span>Quantidade contada</span><strong>{formatQuantity(line.quantity, line.unit)}</strong></p>
    {needsChoice ? <Notice error>A referência do material mudou ou não pôde ser conferida. Escolha novamente seu resultado.</Notice> : null}
    <div role="group" className="hca-balance-opinion-choices" aria-label={"Resultado da revisão — " + line.name}>
      {choiceLabels.map(({ value: result, label, icon }) => (
        <ActionButton key={result} compact aria-pressed={(value?.result ?? "not_examined") === result} onClick={() => {
          if (result === "not_examined") onChange(null);
          else onChange({ result, forwarding: result === "confirmed" ? "none" : value?.forwarding ?? "none", comment: value?.comment ?? "", materialName: line.name, unit: line.unit });
        }}>
          {icon ? <Icon name={icon} width={15} height={15} /> : <span aria-hidden="true">−</span>}{label}
        </ActionButton>
      ))}
    </div>
    {value?.result === "difference" ? <FormField label={"Encaminhamento — " + line.name} required error={value.forwarding === "none" ? "Escolha reconto ou ajuste autorizado em ato próprio." : undefined} helpText="A diferença e o encaminhamento ficam registrados. A correção exige um ato autorizado próprio.">
      <SelectField value={value.forwarding} onChange={event => {
        const forwarding = event.currentTarget.value;
        if (forwarding === "none" || forwarding === "recount" || forwarding === "adjustment") onChange({ ...value, forwarding });
      }}>
        <option value="none">Escolha o encaminhamento</option>
        <option value="recount">Solicitar reconto</option>
        <option value="adjustment">Ajuste autorizado em ato próprio</option>
      </SelectField>
    </FormField> : null}
    {value ? <FormField label={"Comentário do material — " + line.name} helpText={`${value.comment.length}/500 caracteres.`}>
      <TextAreaField value={value.comment} maxLength={500} onChange={event => onChange({ ...value, comment: event.currentTarget.value })} />
    </FormField> : null}
  </fieldset>;
}

export function BalanceReviewItemFields({ lines, fields, onChange, disabled, ref }: {
  lines: BalancePreparation["lines"];
  fields: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled: boolean;
  ref?: Ref<HTMLFieldSetElement>;
}) {
  const currentIds = new Set(lines.map(line => line.id));
  const previous = Object.keys(fields).filter(key => key.startsWith("item:") && !currentIds.has(key.slice(5)));
  const entries = lines.map(line => {
    const raw = fields["item:" + line.id];
    const value = readReviewField(raw);
    const needsChoice = raw !== undefined && (!value ||
      (value.materialName !== undefined && value.materialName !== line.name) ||
      (value.unit !== undefined && value.unit !== line.unit));
    return { line, value, needsChoice };
  });
  const validEntries = entries.filter(({ value, needsChoice }) => value && !needsChoice);
  const differences = validEntries.filter(({ value }) => value?.result === "difference").length;
  const change = (key: string, value: ReviewField) => {
    const next = { ...fields };
    if (value === null) delete next[key]; else next[key] = JSON.stringify(value);
    onChange(next);
  };
  return <fieldset ref={ref} disabled={disabled} className="hca-form-stack">
    <legend>Materiais efetivamente examinados</legend>
    <p>Confira as quantidades e marque o resultado de cada material. Deixe “Não conferi” nos itens que você não examinou.</p>
    <div className="hca-balance-opinion-progress">
      <p><strong>{validEntries.length}</strong> de {lines.length} conferidos</p>
      <small>{differences === 0 ? "Sem apontamentos" : `${differences} ${differences === 1 ? "diferença" : "diferenças"}`}</small>
      {lines.length ? <progress aria-label="Materiais conferidos" value={validEntries.length} max={lines.length} /> : null}
    </div>
    {previous.length ? <Notice>Há referências de materiais da preparação anterior que não constam nesta contagem. Remova-as explicitamente antes de confirmar.
      {previous.map((key, index) => <ActionButton key={key} onClick={() => change(key, null)}>Remover referência anterior {index + 1} desta revisão</ActionButton>)}
    </Notice> : null}
    {reviewCategories.map(category => {
      const group = entries.filter(({ line }) => category.id === "other"
        ? line.category !== "extra" && !materialCategories.some(item => item.id === line.category)
        : line.category === category.id);
      if (!group.length) return null;
      return <section key={category.id} className="hca-form-stack hca-balance-opinion-group" aria-label={category.label}>
        <h3>{category.label} <span>{group.length}</span></h3>
        {group.map(entry => <BalanceReviewMaterialEditor key={entry.line.id} {...entry} icon={category.icon}
          onChange={value => change("item:" + entry.line.id, value)} />)}
      </section>;
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
      const material = reviewedBalanceMaterial(review.reviewed_snapshot, item.lineId);
      return <article key={item.lineId} className="hca-form-stack">
        <strong>{material ? `${material.name} · ${material.unit}${material.extra ? " · Item extra" : ""}` : "Material não identificado no registro preservado"}</strong>
        <p>{item.result === "confirmed" ? "Confirmado" : "Diferença apontada"} · {item.forwarding === "none" ? "Sem encaminhamento adicional" : item.forwarding === "recount" ? "Solicitação de reconto indicada" : "Ajuste autorizado em ato próprio indicado"}.</p>
        {item.comment ? <p className="whitespace-pre-wrap wrap-anywhere">{item.comment}</p> : null}
        {item.result === "difference" ? <>
          <p>A revisão não corrige o estoque. O encaminhamento, sozinho, não comprova sua execução.</p>
          {material?.extra ? <p>Este extra foi registrado como observação física. A revisão preserva o encaminhamento deste item sem ajuste de saldo.</p> : !linked.success ? <Notice error>Não foi possível conferir os atos posteriores vinculados. Consulte novamente esta ficha.</Notice> : (() => {
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
    <p>Os demais materiais não têm resultado individual declarado nesta revisão.</p>
  </section>;
}
