"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DocumentOperationFailureDialog, operationRecoveryLimit } from "@/components/documents/document-operation-failure-dialog";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { api, ApiError, TransportError } from "@/lib/client/api";
import { balanceApplicationStorageKey, parseBalanceApplicationIntent } from "@/lib/balances/application-intent";
import { balanceApplicationFacts, balanceApplicationResult, type BalanceApplicationFacts, type BalanceApplicationPacket } from "@/lib/validation/balance-application";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";

type Applied = Extract<BalanceApplicationFacts, { state: "applied" }>;
const applicationSteps = [
  { label: "Conferindo as revisões", icon: "checklist" },
  { label: "Registrando ajuste de balanço", icon: "box" },
  { label: "Concluindo aplicação", icon: "check" },
] as const;

export function BalanceApplication({ data, userId, patientActive, onRefresh, onEditingChange }: {
  data: SupplyDocument; userId: string; patientActive: boolean; onRefresh: () => void; onEditingChange: (value: boolean) => void;
}) {
  const scope = { userId, patientId: data.care_recipient_id, documentId: data.id };
  const key = balanceApplicationStorageKey(scope);
  const [ready, setReady] = useState(false), [pending, setPending] = useState<BalanceApplicationPacket | null>(null);
  const [group, setGroup] = useState<"family" | "supervisor" | null>(null);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [reading, setReading] = useState(false), [stage, setStage] = useState<number | null>(null);
  const [accepted, setAccepted] = useState<Applied | null>(null);
  const [completion, setCompletion] = useState<"registered" | "recovered" | null>(null);
  const [failure, setFailure] = useState<{ cause: unknown } | null>(null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [absent, setAbsent] = useState(false), [obsolete, setObsolete] = useState(false);
  const inFlightRef = useRef(false), openerRef = useRef<HTMLButtonElement | null>(null), headingRef = useRef<HTMLHeadingElement>(null);
  const finalFocus = useCallback(() => {
    if (inFlightRef.current) return false;
    const opener = openerRef.current;
    return opener?.isConnected && opener.getClientRects().length && !opener.matches(":disabled") ? opener : headingRef.current;
  }, []);
  const facts = balanceApplicationFacts.safeParse(accepted && data.version < accepted.documentVersion ? accepted : data.balanceReview?.application);
  const adjustments = group === null ? [] : data.lines.flatMap(line => {
    const expected = line.metadata.expectedQuantity;
    if ((typeof expected !== "string" && typeof expected !== "number") || !/^\d+([.,]\d+)?$/.test(String(expected)) || quantity(expected).eq(line.quantity)) return [];
    return [{ line, expected }];
  });
  function adjustment({ line, expected }: typeof adjustments[number]) {
    return <article key={line.id} className="hca-family-stock-review-item">
      <h4>{line.name_snapshot}</h4>
      <dl className="hca-family-stock-effect">
        <div><dt>Estoque de referência</dt><dd>{formatQuantity(expected)}</dd><Icon name="chevron" width={17} height={17} /></div>
        <div><dt>Após o balanço</dt><dd>{formatQuantity(line.quantity)}</dd></div>
      </dl>
      <p className="hca-muted">{line.unit_snapshot} · estoque da equipe</p>
    </article>;
  }
  function confirmedApplication(value: unknown, packet: BalanceApplicationPacket): Applied | null {
    const result = requireSupplyConfirmation(value, { id: data.id, patientId: data.care_recipient_id, type: "BAL", minimumVersion: packet.expectedVersion + 1 });
    const applied = balanceApplicationFacts.safeParse(result.balanceReview?.application);
    return result.status === "approved" && applied.success && applied.data.state === "applied"
      && applied.data.actorId === userId && applied.data.documentVersion === packet.expectedVersion + 1 ? applied.data : null;
  }
  const busy = reading || stage !== null;
  useOperationActivity(busy, stage !== null
    ? { title: "Aplicando contagem", detail: "Aguarde a confirmação do ajuste no estoque.", steps: applicationSteps, stage }
    : { title: "Conferindo a aplicação", detail: "Consultando o recibo da tentativa preservada." });
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(key);
        setPending(raw ? parseBalanceApplicationIntent(raw, { userId, patientId: data.care_recipient_id, documentId: data.id }) : null);
        setReady(true);
      } catch {
        setError("Não foi possível conferir a referência preservada neste aparelho. Ela foi mantida; nenhuma aplicação foi enviada.");
      }
    });
    return () => { active = false; };
  }, [key, userId, data.care_recipient_id, data.id]);
  useEffect(() => { onEditingChange(Boolean(group || completion) || busy); }, [group, completion, busy, onEditingChange]);
  function retain(packet: BalanceApplicationPacket | null, expectedKey = (pending ?? packet)?.idempotencyKey) {
    const current = localStorage.getItem(key);
    if (current) {
      const other = parseBalanceApplicationIntent(current, scope);
      if (other.idempotencyKey !== expectedKey) {
        setPending(other);
        throw new Error("Há outra tentativa preservada neste aparelho. Consulte-a antes de continuar.");
      }
    }
    if (packet) localStorage.setItem(key, JSON.stringify({ ...scope, packet }));
    else localStorage.removeItem(key);
    setPending(packet);
  }
  async function lookup(packet: BalanceApplicationPacket, confirmed?: Applied) {
    const query = new URLSearchParams({
      careRecipientId: scope.patientId, documentId: data.id,
      idempotencyKey: packet.idempotencyKey, expectedVersion: String(packet.expectedVersion), ...packet.body,
    });
    const response = await api<{ data: unknown }>("/api/balances/application?" + query, undefined, undefined, "GET",
      confirmed ? { timeoutMs: 5_000 } : undefined).catch(reason => {
      if (!confirmed || !(reason instanceof TransportError || (reason instanceof ApiError && reason.status >= 500))) throw reason;
      return null;
    });
    if (!response) return null;
    const result = balanceApplicationResult.parse(response.data);
    if (result.documentId !== data.id || result.idempotencyKey !== packet.idempotencyKey)
      throw new Error("A consulta não corresponde à tentativa preservada.");
    if (result.state === "found" && (result.version !== packet.expectedVersion + 1 || result.application.documentVersion !== result.version || result.application.actorId !== userId))
      throw new Error("A consulta não confirmou a autoria e a versão da aplicação preservada.");
    if (confirmed && (result.state !== "found" || result.application.id !== confirmed.id))
      throw new Error("O recibo não corresponde ao ato devolvido pela aplicação. Confira a tentativa preservada.");
    return result;
  }
  function finishReceipt(packet: BalanceApplicationPacket, applied: Applied, result: "registered" | "recovered") {
    retain(null, packet.idempotencyKey);
    setAccepted(applied);
    setGroup(null);
    setCompletion(result);
  }
  function conclude() {
    setMessage(completion === "recovered"
      ? "Aplicação original recuperada por consulta. Nenhum movimento foi repetido."
      : "Aplicação da contagem registrada com autoria própria. A revisão permanece separada.");
    setCompletion(null);
    onRefresh();
  }
  async function send(retry = false) {
    if (inFlightRef.current || !ready || !patientActive || !facts.success) return;
    const selected = retry ? pending?.body.group : group;
    if (!selected || (retry && !absent)) return;
    const packet: BalanceApplicationPacket = pending ?? {
      action: "apply_balance", idempotencyKey: crypto.randomUUID(), expectedVersion: data.version,
      body: { group: selected, reviewReference: data.balanceReview!.referenceHash },
    };
    inFlightRef.current = true; setStage(0); setError(""); setAbsent(false); setObsolete(false); setFailure(null);
    setRecoveryAttempts(retry ? recoveryAttempts + 1 : 0);
    let submitted = false;
    try {
      retain(packet);
      setStage(1);
      submitted = true;
      const result = await api<unknown>("/api/documents/" + data.id, packet);
      const applied = confirmedApplication(result, packet);
      if (!applied) throw new Error("A resposta não confirmou esta aplicação. Consulte a referência preservada antes de reenviar.");
      setStage(2);
      const receipt = await lookup(packet, applied);
      finishReceipt(packet, receipt?.state === "found" ? receipt.application : applied, "registered");
    } catch (reason) {
      setGroup(null); setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a aplicação. Consulte a mesma tentativa.");
      if (submitted) setFailure({ cause: reason });
    } finally { setStage(null); inFlightRef.current = false; }
  }
  async function recover() {
    if (!pending || inFlightRef.current || !patientActive) return;
    inFlightRef.current = true; setReading(true); setError(""); setAbsent(false); setObsolete(false); setFailure(null);
    setRecoveryAttempts(value => value + 1);
    try {
      const result = await lookup(pending);
      if (result?.state === "found") finishReceipt(pending, result.application, "recovered");
      else if (result?.state === "obsolete") setObsolete(true);
      else setAbsent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar a tentativa. Sua referência foi mantida.");
      setFailure({ cause: reason });
    }
    finally { setReading(false); inFlightRef.current = false; }
  }
  return <section className="hca-form-stack" aria-label="Aplicação da contagem ao estoque">
    <h3 ref={headingRef} tabIndex={-1}>Aplicação da contagem ao estoque</h3>
    {!patientActive ? <Notice>Selecione o perfil do paciente desta ficha antes de registrar ou recuperar uma aplicação.</Notice> : null}
    {error ? <Notice error>{error}</Notice> : null}{message ? <Notice>{message}</Notice> : null}
    {facts.success && facts.data.state === "applied" ? <>
      <DefinitionGrid items={[
        { label: "Aplicado por", value: facts.data.actorName },
        { label: "Momento da aplicação", value: formatBrazilDate(facts.data.appliedAt) },
        { label: "Contagem aplicada", value: facts.data.countVersion },
        { label: "Versão do ato", value: facts.data.documentVersion },
      ]} />
      <DefinitionGrid items={facts.data.lines.map(line => {
        const material = data.lines.find(row => row.id === line.lineId);
        return { key: line.lineId, label: "Saldo após balanço — " + (material?.name_snapshot ?? "Material não identificado"), value: line.state === "restricted" ? "Acesso restrito" : formatQuantity(line.quantity, material?.unit_snapshot) };
      })} />
      <p>Esses saldos pertencem ao momento dessa aplicação. Movimentos posteriores não os substituem.</p>
    </> : facts.success ? <p>{facts.data.state === "unavailable" ? "Saldo após balanço: não disponível no registro histórico." : "Contagem ainda não aplicada ao estoque."}</p> : <Notice error>Não foi possível conferir o registro da aplicação. <ActionButton onClick={onRefresh}>Consultar ficha novamente</ActionButton></Notice>}
    {pending ? <Notice>A referência desta tentativa foi preservada. Consulte o resultado antes de outra aplicação.
      <ActionButton disabled={busy || !patientActive} onClick={() => void recover()}>Consultar aplicação desta tentativa</ActionButton>
      {absent ? <><p>Nenhum ato desta tentativa foi encontrado na consulta. Reenviar usa a mesma chave e os mesmos dados.</p><ActionButton disabled={busy || !patientActive} onClick={() => void send(true)}>Reenviar a mesma confirmação</ActionButton></> : null}
      {obsolete ? <><p>A tentativa não foi encontrada e sua versão foi superada. Essa versão antiga não pode mais aplicar a contagem.</p><ActionButton disabled={busy} onClick={() => { try { retain(null); setObsolete(false); onRefresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "A referência foi mantida."); } }}>Voltar à ficha atual</ActionButton></> : null}
    </Notice> : null}
    {!pending && ready && patientActive && facts.success && facts.data.state !== "applied" ? <div className="hca-toolbar">{(data.balanceReview?.applicationGroups ?? []).map(value => <ActionButton key={value} disabled={busy} onClick={event => { openerRef.current = event.currentTarget; setGroup(value); }}>
      Aplicar contagem pelo grupo {value === "family" ? "familiar" : "de supervisão"}
    </ActionButton>)}</div> : null}
    {group !== null && !busy ? <Dialog open title="Aplicar contagem ao estoque" subtitle={`${data.code ?? "BAL"} · contagem ${data.balanceReview?.countVersion ?? "não identificada"}`}
      onClose={() => setGroup(null)} finalFocus={finalFocus} footer={<>
        <ActionButton onClick={() => setGroup(null)}>Voltar sem aplicar</ActionButton>
        <ActionButton variant="primary" disabled={!patientActive} onClick={() => void send()}>Confirmar aplicação da contagem</ActionButton>
      </>}>
      <div className="hca-form-stack"><p>Esta confirmação é o ato que aplica a contagem. Registrar uma revisão não altera o estoque.</p>
        {adjustments[0] ? adjustment(adjustments[0]) : null}
        {adjustments.length > 1 ? <details className="doc-help-details"><summary>Demais ajustes de estoque</summary>
          <div className="hca-form-stack">{adjustments.slice(1).map(adjustment)}</div>
        </details> : null}
        <p>As diferenças serão registradas como ajustes de balanço.</p>
        <DefinitionGrid items={[{ label: "Versão consultada", value: data.version }, { label: "Grupo", value: group === "family" ? "Família" : "Supervisão" }]} />
      </div>
    </Dialog> : null}
    {completion && accepted ? <Dialog open success title={completion === "recovered" ? "Aplicação encontrada" : "Contagem aplicada"}
      subtitle={completion === "recovered" ? "O ajuste já havia sido registrado. O estoque não recebeu um segundo movimento." : "O ajuste do estoque da equipe e a autoria ficaram registrados."}
      onClose={conclude} finalFocus={headingRef}
      footer={<ActionButton variant="primary" onClick={conclude}><Icon name="check" />Concluir</ActionButton>}>
      <DefinitionGrid items={[
        { label: "Ficha", value: data.code ?? "BAL" },
        { label: "Contagem aplicada", value: accepted.countVersion },
        { label: "Aplicado por", value: accepted.actorName },
      ]} />
    </Dialog> : null}
    {failure && pending && !busy ? <DocumentOperationFailureDialog
      title="Vamos conferir a aplicação" description="Consulte a mesma tentativa antes de enviar outra aplicação da contagem."
      outcome="uncertain" cause={failure.cause} operation="Aplicar contagem" fallbackCode="BAL_APLICACAO_INCERTA"
      attempts={recoveryAttempts} onClose={() => setFailure(null)} closeLabel="Voltar às revisões"
      action={recoveryAttempts < operationRecoveryLimit ? { label: "Conferir resultado", onClick: () => void recover() } : undefined}
      exhaustedMessage={recoveryAttempts >= operationRecoveryLimit ? "Copie os detalhes e envie ao responsável pelo sistema para verificar o resultado." : undefined} /> : null}
  </section>;
}
