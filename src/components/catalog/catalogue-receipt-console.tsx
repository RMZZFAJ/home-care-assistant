"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { Notice, Workspace, buttonClass } from "@/components/workspace";
import { api } from "@/lib/client/api";
import { forgetRetainedCatalogueAttempt, readRetainedCatalogueAttempts } from "@/lib/client/catalogue-attempt-storage";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import {
  catalogueReceiptHistory, verifyCatalogueReceipt, type CatalogueAttempt, type CatalogueOutcome,
  type CatalogueReceiptHistory, type CatalogueReceiptScope, type CatalogueScope,
} from "@/lib/validation/catalogue-preparation";
import { cataloguePreparationUrl } from "./use-catalogue-preparation";

const labels: Record<CatalogueScope["purpose"], string> = {
  create: "Novo item", edit: "Edição de item", adopt: "Adoção de modelo",
  unit_create: "Nova unidade", unit_configure: "Unidade base e precisão",
  presentation_create: "Nova apresentação", presentation_edit: "Edição de apresentação",
  identity: "Situação e sucessor",
};

function outcomeText(result: CatalogueOutcome) {
  if ("proposalId" in result) return "Proposta registrada para aprovação local.";
  if ("presentationId" in result) return `Apresentação registrada na versão ${result.version}.`;
  if ("eventId" in result) {
    const action = { retire: "Inativação registrada", reactivate: "Reativação registrada", clear_successor: "Indicação de sucessor removida" }[result.identityAction];
    return `${action} por ${result.actorName}.`;
  }
  if ("unitId" in result) return "Unidade criada.";
  return "Alteração do material confirmada.";
}

export function CatalogueReceiptConsole() {
  const globalPatient = useSearchParams().get("paciente");
  return <Workspace title="Comprovantes do catálogo">{context => {
    const mode = context.activeContext?.mode;
    if (mode === "global" && !context.globalAdministrationAllowed) return null;
    const patient = mode === "global"
      ? context.patients.find(row => row.id === globalPatient && row.is_active)
      : context.patient;
    if (mode === "global" && globalPatient && !patient)
      return <Notice error>O paciente indicado está indisponível na administração global.</Notice>;
    if (mode !== "global" && (mode !== "patient" || !patient?.hasMembership)) return null;
    const scope: CatalogueReceiptScope = { mode, patientId: patient?.id ?? null };
    return <ReceiptHistory key={JSON.stringify([context.userId, scope])}
      userId={context.userId} mode={mode} patientId={scope.patientId}
      scopeName={patient?.display_name ?? "Unidades globais"} />;
  }}</Workspace>;
}

function ReceiptHistory({ userId, mode, patientId, scopeName }: CatalogueReceiptScope & { userId: string; scopeName: string }) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors.at(-1);
  const query = new URLSearchParams({ mode, ...(patientId ? { patientId } : {}), ...(cursor ? { before: cursor } : {}) });
  const decode = useCallback((value: unknown) => {
    const result = catalogueReceiptHistory.parse(value);
    if (result.ownerId !== userId || result.mode !== mode || result.patientId !== patientId)
      throw new Error("A consulta retornou outro contexto. Atualize para continuar.");
    return result;
  }, [userId, mode, patientId]);
  const history = useScopedRead<CatalogueReceiptHistory>("/api/admin/catalogue-preparations/receipts?" + query, "", decode);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [attempts, setAttempts] = useState<CatalogueAttempt[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; text: string; error: boolean } | null>(null);
  const lookupRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setAttempts(readRetainedCatalogueAttempts(userId, { mode, patientId }));
    });
    return () => { active = false; lookupRef.current?.abort(); };
  }, [userId, mode, patientId]);

  async function consult(attempt: CatalogueAttempt) {
    if (lookupRef.current) return;
    const controller = new AbortController();
    lookupRef.current = controller;
    setSelected(attempt.key);
    setResult(null);
    try {
      const response = await api<{ receipt: unknown }>(cataloguePreparationUrl(attempt, { key: attempt.key }), undefined, controller.signal);
      if (controller.signal.aborted) return;
      if (response.receipt === null) {
        setResult({ key: attempt.key, text: "O comprovante ainda não foi localizado. A tentativa continua disponível para nova consulta.", error: false });
        return;
      }
      const receipt = verifyCatalogueReceipt(userId, attempt, response.receipt);
      const text = receipt.action === "commit" && receipt.outcome ? outcomeText(receipt.outcome)
        : { save: "Preenchimento privado salvo.", discard: "Descarte privado confirmado.",
          acknowledge: "Comprovante anterior reconhecido.", commit: "Alteração confirmada." }[receipt.action];
      forgetRetainedCatalogueAttempt(userId, attempt);
      setAttempts(current => current.filter(row => row.key !== attempt.key));
      setResult({ key: attempt.key, text, error: false });
      if (receipt.action === "commit") history.refresh();
      headingRef.current?.focus();
    } catch (reason) {
      if (!controller.signal.aborted) setResult({
        key: attempt.key, text: reason instanceof Error ? reason.message : "A consulta não foi concluída.", error: true,
      });
    } finally {
      if (!controller.signal.aborted) {
        lookupRef.current = null;
        setSelected(null);
      }
    }
  }

  function changePage(next: string | null) {
    setCursors(current => next ? [...current, next] : current.slice(0, -1));
    headingRef.current?.focus();
  }

  return <div className="space-y-5">
    {mode === "global" ? <div className="hca-toolbar">
      {patientId
        ? <Link className={buttonClass} href="/comprovantes-catalogo">Comprovantes de unidades globais</Link>
        : <Link className={buttonClass} href="/admin?section=catalog">Abrir catálogo de paciente</Link>}
    </div> : null}
    {attempts.length ? <section className="hca-attention" aria-labelledby="catalogue-retained-attempts">
      <h2 id="catalogue-retained-attempts">Tentativas aguardando confirmação</h2>
      <p>Consulte o resultado de tentativas guardadas neste navegador.</p>
      <ul className="space-y-3">
        {attempts.map(attempt => <li key={attempt.key} className="hca-toolbar">
          <strong>{labels[attempt.purpose]}</strong>
          <ActionButton type="button" disabled={selected !== null}
            aria-label={`Consultar tentativa de ${labels[attempt.purpose]} (${attempt.key.slice(-6)})`}
            onClick={() => void consult(attempt)}>{selected === attempt.key ? "Consultando…" : "Consultar tentativa"}</ActionButton>
          {result?.key === attempt.key ? <Notice error={result.error}>{result.text}</Notice> : null}
        </li>)}
      </ul>
    </section> : null}
    {result && !attempts.some(attempt => attempt.key === result.key) ? <Notice error={result.error}>{result.text}</Notice> : null}
    <section aria-labelledby="catalogue-confirmed-receipts">
      <div className="hca-section-heading">
        <div>
          <h2 ref={headingRef} tabIndex={-1} id="catalogue-confirmed-receipts">Comprovantes confirmados</h2>
          <p>{scopeName} · operações registradas por você</p>
        </div>
        <ActionButton type="button" onClick={history.refresh}>Atualizar comprovantes</ActionButton>
      </div>
      {history.loading ? <LoadingIndicator label="Consultando comprovantes" /> : null}
      {history.error ? <Notice error>{history.error}</Notice> : null}
      {history.data?.entries.length ? <ul className="hca-records">
        {history.data.entries.map(receipt => <li key={receipt.id} className="hca-record">
          <span className="hca-task-icon"><Icon name="history" /></span>
          <div className="hca-record-main min-w-0 wrap-anywhere">
            <strong>{labels[receipt.purpose]}</strong>
            {receipt.currentName ? <small>{receipt.currentName}</small> : null}
            <p>{outcomeText(receipt.outcome)}</p>
            <small>{receipt.confirmedAt ? formatBrazilDate(receipt.confirmedAt) : "Data original indisponível"}</small>
            <details>
              <summary>Referência do comprovante</summary>
              <code className="wrap-anywhere">{receipt.id}</code>
            </details>
          </div>
        </li>)}
      </ul> : !history.loading && !history.error ? <EmptyState title="Nenhum comprovante neste contexto" /> : null}
      {cursors.length > 1 || history.data?.next ? <nav className="hca-pagination" aria-label="Páginas dos comprovantes">
        <ActionButton type="button" disabled={cursors.length <= 1 || history.loading} onClick={() => changePage(null)}>Mais recentes</ActionButton>
        <span>Página {cursors.length}</span>
        <ActionButton type="button" disabled={!history.data?.next || history.loading} onClick={() => {
          if (history.data?.next) changePage(history.data.next);
        }}>Mais antigos</ActionButton>
      </nav> : null}
    </section>
  </div>;
}
