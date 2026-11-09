"use client";
import { ActionButton } from "@/components/ui/controls";

import Link from "next/link";
import { useState } from "react";

import { Notice } from "@/components/workspace";
import { RecordDrawer } from "./record-drawer";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalanceDraftContent } from "@/lib/validation/creation-drafts";
import type { DraftPurpose } from "@/lib/validation/supply-drafts";
import type { CreationDraftContent } from "@/types/creation-drafts";
import type { CreationDraftController } from "./use-creation-draft";
import { navigationLabel, type DraftNavigation } from "@/lib/forms/draft-navigation";

export function DraftContentSummary({content,kind,navigation,purpose}: {
  content: CreationDraftContent | null;
  kind?: string | null;
  navigation?: DraftNavigation | null;
  purpose?: DraftPurpose;
}) {
  if (!content) return null;
  const version = "context" in content ? content.context.documentVersion : "documentVersion" in content ? content.documentVersion : null;
  const reference = "counts" in content ? content.context.referenceRevision : null;
  return <div className="hca-form-stack">
    <dl aria-label="Referências do preenchimento preservado">
      <dt>Etapa do preenchimento</dt><dd>{navigationLabel(navigation)}</dd>
      <dt>Versão base da ficha</dt><dd>{version ?? "Sem ficha oficial como base"}</dd>
      {kind === "BAL" ? <><dt>Referência de estoque preservada</dt><dd>{reference ?? "Não preservada neste rascunho"}</dd></> : null}
      <dt>Política base preservada</dt><dd>Não preservada neste rascunho; as regras vigentes serão conferidas na confirmação.</dd>
    </dl>
    <DraftFieldsSummary content={content} kind={kind} purpose={purpose}/>
  </div>;
}

function DraftFieldsSummary({
  content,kind,purpose,
}: {
  content: CreationDraftContent | null;
  kind?: string | null;
  purpose?: DraftPurpose;
}) {
  if (!content) return null;
  if ("lines" in content)
    return (
      <div className="hca-form-stack">
        {[
          ...content.lines.map((line) => ({
            ...line,
            name: line.productName,
            key: "line:" + line.productId,
          })),
          ...content.extraItems.map((line) => ({
            ...line,
            key: "extra:" + line.id,
          })),
        ].map((line) => (
          <article className="hca-record min-w-0" key={line.key}>
            <div className="hca-record-main min-w-0 wrap-anywhere">
              <strong>{line.name || "Item extra sem nome"}</strong>
              <p>
                {line.stockObservation === "unknown"
                  ? "Estoque desconhecido"
                  : line.stockObservation === "unfilled" ||
                      line.currentStock === null
                    ? "Estoque não informado"
                    : `Estoque observado: ${line.currentStock}`}
              </p>
              <small>
                Observação:{" "}
                {line.stockObservationAt
                  ? formatZonedDate(
                      line.stockObservationAt,
                      "America/Sao_Paulo",
                    )
                  : "Data não informada"}
              </small>
              {"repeatReason" in line && line.repeatReason ? (
                <p>{line.repeatReason}</p>
              ) : null}
            </div>
          </article>
        ))}
        {content.observations.length ? (
          <p className="wrap-anywhere whitespace-pre-line">
            {content.observations
              .map((value) => value || "Observação incompleta")
              .join("\n")}
          </p>
        ) : null}
        {content.remainingNeed ? (
          <p className="wrap-anywhere">
            Necessidade remanescente:{" "}
            {content.remainingNeed.reason || "Motivo incompleto"}
          </p>
        ) : null}
        {!content.lines.length && !content.extraItems.length ? (
          <p>Nenhum material selecionado.</p>
        ) : null}
      </div>
    );
  if("form" in content)return <div className="hca-form-stack">
    <p>{content.context.documentId?"Revisão de ficha existente":"Criação de nova ficha"}{content.context.documentVersion?` · versão ${content.context.documentVersion}`:""}</p>
    <dl>{kind==="COM"?<><dt>Origem da aquisição</dt><dd>{content.form.origin==="donation"?"Doação":content.form.origin==="purchase"?"Compra":"Não escolhida"}</dd></>:<><dt>Custódia de origem da entrega</dt><dd>{content.form.source==="FAMILY"?"Família":"Equipe"}</dd><dt>Pessoa recebedora</dt><dd>{content.context.recipientName||"Não escolhida ou indisponível no diretório atual"}</dd></>}</dl>
    {content.materials.filter(m=>Object.hasOwn(content.form.quantities,m.id)).map(m=><article className="hca-record min-w-0" key={m.id}><div className="hca-record-main min-w-0 wrap-anywhere"><strong>{m.name}</strong><p>Quantidade: {content.form.quantities[m.id]||"Não preenchida"} {m.unit}</p>{content.form.presentationSelections?.[m.id]?.map(p=><p key={p.id}>{p.packages||"Não preenchido"} embalagem(ns) · {p.name} · {p.baseQuantity} {p.unit} por embalagem · versão {p.version}</p>)}{content.form.sharedNeedReasons?.[m.id]?<p>{content.form.sharedNeedReasons[m.id]}</p>:null}<p>{content.links[m.id]?.length??0} vínculo(s) de necessidade; revalidados na confirmação.</p></div></article>)}
    {content.form.notes?<p className="whitespace-pre-wrap wrap-anywhere">{content.form.notes}</p>:null}{content.form.recipientReason?<p className="whitespace-pre-wrap wrap-anywhere">Justificativa da pessoa recebedora: {content.form.recipientReason}</p>:null}
  </div>;
  if ("fields" in content) {
    const name = (key: string) => content.materials.find(m => m.id === key)?.name ?? "Linha não disponível na referência atual";
    const entDecision = kind === "ENT" && purpose !== "receive" && purpose !== "divergence";
    const operation = kind === "COM" || entDecision;
    const quantityLabel = kind === "COM" ? purpose === "approve" ? "quantidade em aprovação" : purpose === "purchase" ? "quantidade em aquisição" : "quantidade informada" : entDecision ? "quantidade em conciliação" : "recebido";
    const labels: Record<string, string> = { reason: operation ? "Motivo / justificativa" : "Observação", receiptId: "Parcela no preenchimento", confirmed: "Conferência do resumo", recipientId: "Novo destinatário no preenchimento", lineId: "Material em conciliação", quantity: "Quantidade em conciliação", resolution: "Solução em preparação", requestId: "Pedido no preenchimento" };
    const display = (key: string, value: string) => {
      if (key === "receiptId") return content.fields.receiptLabel || "Referência da parcela preservada; confira a declaração ao continuar.";
      if (key === "recipientId") return content.fields.recipientLabel || "Pessoa preservada; confira sua disponibilidade ao continuar.";
      if (key === "lineId") return content.fields.lineLabel || "Material preservado; confira a linha vigente ao continuar.";
      if (key === "requestId") return content.fields.requestLabel || "Pedido preservado; confira sua identidade ao continuar.";
      if (key === "confirmed") return value === "on" ? "Marcada no preenchimento; a conclusão exige confirmação própria." : "Não marcada";
      return ({ shortage: "Quantidade menor", damaged: "Material avariado", wrong: "Produto divergente", other: "Outra diferença", received: "Recebimento complementar confirmado por mim", returned: "Material voltou à custódia de origem", missing: "Falta / perda conciliada" } as Record<string, string>)[value] ?? (value || "Não preenchido");
    };
    return <div className="hca-form-stack">
      <p>{operation ? `Preenchimento da operação ${kind} · versão de referência ${content.documentVersion}. Salvar não confirma decisões, recebimento ou movimentação de estoque.` : `Conferência pessoal · versão consultada ${content.documentVersion}. Salvar não aceita material.`}</p>
      {content.divergentIds.length ? <ul>{content.divergentIds.map(id => <li key={id}>{name(id)} · divergência em preparação</li>)}</ul> : !operation ? <p>Nenhuma linha divergente selecionada.</p> : null}
      <dl>{Object.entries(content.fields).filter(([key]) => !["receiptLabel", "recipientLabel", "lineLabel", "requestLabel", "referenceHash"].includes(key)).map(([key, value]) => <div key={key}><dt>{labels[key] ?? (key.endsWith(":return") ? name(key.slice(0, -7)) + " · devolução física em preparação" : key.endsWith(":problem") ? name(key.slice(0, -8)) + " · diferença" : name(key) + " · " + quantityLabel)}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{display(key, value)}</dd></div>)}</dl>
    </div>;
  }
  return (
    <div className="hca-form-stack">
      <p>
        {content.context.mode === "scheduled"
          ? "Contagem vinculada a plantão"
          : "Contagem sem regime de plantões"}
      </p>
      {content.materials
        .filter((material) => Object.hasOwn(content.counts, material.id))
        .map((material) => (
          <article className="hca-record min-w-0" key={material.id}>
            <div className="hca-record-main min-w-0 wrap-anywhere">
              <strong>{material.name}</strong>
              <p>
                Contagem: {content.counts[material.id] || "Não informada"}{" "}
                {material.unit}
              </p>
              <small>
                Observação:{" "}
                {content.observationTimes[material.id]
                  ? formatZonedDate(
                      content.observationTimes[material.id],
                      "America/Sao_Paulo",
                    )
                  : "Data não informada"}
              </small>
            </div>
          </article>
        ))}
      {content.notes ? <p className="wrap-anywhere">{content.notes}</p> : null}
    </div>
  );
}

export function CreationDraftPanel({
  draft,
  current,
  patientName,
  resumeHref,
  resumeLabel = "Continuar rascunho",
  discardLabel = "Descartar e começar nova",
  acknowledgeLabel = "Confirmar resultado e começar novo preenchimento",
  disabled = false,
}: {
  draft: CreationDraftController;
  current: CreationDraftContent;
  patientName: string;
  resumeHref?: string;
  resumeLabel?: string;
  discardLabel?: string;
  acknowledgeLabel?: string;
  disabled?: boolean;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  if (!draft.active) return null;
  const saved = draft.offered ?? draft.base;
  if(draft.readDenied||draft.protectedReadPending)return <section className="ui-card hca-form-stack" aria-label="Rascunho privado"><Notice error>{draft.loadError||"Revalide o acesso antes de exibir o preenchimento preservado. A tentativa original continua guardada."}</Notice><ActionButton disabled={draft.busy} onClick={draft.reload}>Revalidar acesso ao rascunho</ActionButton>{draft.pending?<ActionButton disabled={draft.busy} onClick={()=>void draft.recover()}>Recuperar mesma tentativa preservada</ActionButton>:null}</section>;
  return (
    <section
      className="ui-card hca-form-stack hca-draft-panel min-w-0"
      aria-label="Rascunho privado"
    >
      <h2 className="text-lg font-semibold">
        Seu rascunho privado · {patientName}
      </h2>
      <p>
        {draft.consumed
          ? "O resultado oficial deste preenchimento já está disponível."
          : "Salvar este preenchimento não gera protocolo, ciência ou movimentação de estoque."}
      </p>
      {!draft.consumed && !draft.pending ? <p className="hca-field-hint">Para retomar em outra aba, sessão ou aparelho, use Salvar rascunho. O preenchimento ainda não salvo pode ficar apenas nesta aba.</p> : null}
      {draft.loading ? (
        <Notice>Consultando seu rascunho no servidor…</Notice>
      ) : null}
      {draft.loadError ? (
        <Notice error>
          {draft.loadError}
          <ActionButton onClick={draft.reload} disabled={draft.busy}>
            Consultar novamente
          </ActionButton>
        </Notice>
      ) : null}
      {draft.error ? <Notice error>{draft.error}</Notice> : null}
      {draft.message ? <Notice>{draft.message}</Notice> : null}
      {saved ? (
        <p>
          {saved.kind} · Revisão {saved.revision} · salvo no servidor em{" "}
          {formatZonedDate(saved.savedAt, "America/Sao_Paulo")} ·
          America/Sao_Paulo
        </p>
      ) : null}
      {draft.pending ? (
        <>
          <Notice>
            A resposta desta tentativa ainda não foi confirmada. Recupere o
            mesmo comando antes de editar ou descartar.
          </Notice>
          {draft.pending.content ? (
            <DraftContentSummary content={draft.pending.content} kind={draft.kind} purpose={draft.purpose} navigation={draft.pending.navigation} />
          ) : null}
          <ActionButton
            variant="primary"
            disabled={draft.busy || disabled}
            onClick={() => void draft.recover()}
          >
            Recuperar salvamento ou descarte
          </ActionButton>
        </>
      ) : null}
      {draft.consumed ? (
        <>
          <Notice>
            Este rascunho já foi usado em uma ficha. Consulte o resultado antes
            de iniciar outro preenchimento.
          </Notice>
          <Link
            className="ui-button ui-button-primary"
            prefetch={false}
            href={
              (draft.consumed.kind === "REQ" ? "/historico/" : "/documentos/") +
              draft.consumed.consumedDocumentId
            }
          >
            Abrir ficha concluída
          </Link>
          <ActionButton
            disabled={draft.busy || !!draft.pending || disabled}
            onClick={() => void draft.acknowledge()}
          >
            {acknowledgeLabel}
          </ActionButton>
        </>
      ) : null}
      {draft.offered?.state === "active" && !draft.pending ? (
        <>
          <DraftContentSummary content={draft.offered.content} kind={draft.kind} purpose={draft.purpose} navigation={draft.offered.navigation} />
          <div className="hca-toolbar">
            {resumeHref ? (
              <Link
                className="ui-button ui-button-primary"
                href={resumeHref}
                prefetch={false}
              >
                {resumeLabel}
              </Link>
            ) : (
              <ActionButton
                variant="primary"
                disabled={draft.busy || disabled}
                onClick={() => draft.resume()}
              >
                {resumeLabel}
              </ActionButton>
            )}
          </div>
        </>
      ) : null}
      {draft.conflict && !draft.consumed ? (
        <>
          <Notice>
            Outra edição mudou o rascunho. Sua edição foi preservada. Compare os
            valores antes de escolher.
          </Notice>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <section className="min-w-0" aria-label="Minha edição">
              <h3>Minha edição</h3>
              <DraftContentSummary content={current} kind={draft.kind} purpose={draft.purpose} navigation={draft.navigation} />
            </section>
            <section className="min-w-0" aria-label="Versão salva no servidor">
              <h3>Versão salva no servidor</h3>
              {draft.compared ? (
                draft.comparison ? (
                  <>
                    <p>
                      Revisão {draft.comparison.revision} ·{" "}
                      {formatZonedDate(
                        draft.comparison.savedAt,
                        "America/Sao_Paulo",
                      )}
                    </p>
                    <DraftContentSummary content={draft.comparison.content} kind={draft.kind} purpose={draft.purpose} navigation={draft.comparison.navigation} />
                  </>
                ) : (
                  <p>O rascunho foi descartado no servidor.</p>
                )
              ) : (
                <ActionButton
                  disabled={draft.busy}
                  onClick={() => void draft.compare()}
                >
                  Consultar versão para comparar
                </ActionButton>
              )}
            </section>
          </div>
          <div className="hca-toolbar">
            <ActionButton
              disabled={!draft.compared || draft.busy || disabled}
              onClick={draft.keepLocal}
            >
              Manter minha edição para salvar nova revisão
            </ActionButton>
            {draft.comparison?.state === "active" ? (
              <ActionButton
                disabled={draft.busy || disabled}
                onClick={() => draft.resume(draft.comparison)}
              >
                Usar versão salva no servidor
              </ActionButton>
            ) : null}
          </div>
        </>
      ) : null}
      {draft.base?.state === "active" &&
      !draft.blocked &&
      JSON.stringify(current) !== JSON.stringify(draft.base.content) ? (
        <p>Sua edição atual ainda não foi salva no servidor.</p>
      ) : null}
      {saved?.state === "active" && !draft.pending && !draft.conflict ? (
        <ActionButton
          disabled={draft.busy || disabled}
          onClick={(event) => {
            setTrigger(event.currentTarget);
            setConfirmDiscard(true);
          }}
        >
          {discardLabel}
        </ActionButton>
      ) : null}
      {confirmDiscard ? (
        <RecordDrawer
          title="Descartar rascunho privado"
          busy={draft.busy}
          preventClose={!!draft.pending}
          trackChanges={false}
          restoreFocusTo={trigger}
          onClose={() => setConfirmDiscard(false)}
        >
          <div className="hca-form-stack">
            {draft.error ? <Notice error>{draft.error}</Notice> : null}
            {draft.pending ? (
              <Notice>
                A resposta do descarte ainda não foi confirmada.
                <ActionButton
                  disabled={draft.busy || disabled}
                  onClick={async () => {
                    if (await draft.recover()) setConfirmDiscard(false);
                  }}
                >
                  Recuperar descarte
                </ActionButton>
              </Notice>
            ) : null}
            <p>
              Você está descartando somente seu preenchimento privado de{" "}
              {saved?.kind} para {patientName}.
            </p>
            <DraftContentSummary content={saved?.content ?? null} kind={draft.kind} purpose={draft.purpose} navigation={saved?.navigation} />
            <Notice>
              Fichas emitidas, arquivos oficiais e seu histórico serão
              preservados.
            </Notice>
            <ActionButton
              variant="primary"
              disabled={disabled || !!draft.pending}
              onClick={async () => {
                if (await draft.discard()) setConfirmDiscard(false);
              }}
            >
              Confirmar descarte do rascunho
            </ActionButton>
            <ActionButton
              disabled={draft.busy || !!draft.pending}
              onClick={() => setConfirmDiscard(false)}
            >
              Continuar preenchimento
            </ActionButton>
          </div>
        </RecordDrawer>
      ) : null}
    </section>
  );
}

export function BalanceObservationTimes({
  content,
}: {
  content: BalanceDraftContent;
}) {
  return (
    <section
      className="hca-form-stack"
      aria-label="Datas das observações recuperadas"
    >
      <h3>Quando as quantidades foram observadas</h3>
      <p>
        Retomar um preenchimento conserva a data declarada; confira se os
        valores ainda correspondem à contagem física.
      </p>
      {content.materials
        .filter((material) => Object.hasOwn(content.counts, material.id))
        .map((material) => (
          <p className="wrap-anywhere" key={material.id}>
            {material.name}:{" "}
            {content.observationTimes[material.id]
              ? formatZonedDate(
                  content.observationTimes[material.id],
                  "America/Sao_Paulo",
                )
              : "Data não informada"}
          </p>
        ))}
    </section>
  );
}
