"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { api } from "@/lib/client/api";
import { balanceApplicationStorageKey, parseBalanceApplicationIntent } from "@/lib/balances/application-intent";
import { balanceApplicationFacts, balanceApplicationResult, type BalanceApplicationPacket } from "@/lib/validation/balance-application";
import { requireSupplyConfirmation } from "@/lib/validation/supply-confirmation";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";

export function BalanceApplication({ data, userId, patientActive, onRefresh, onEditingChange }: {
  data: SupplyDocument; userId: string; patientActive: boolean; onRefresh: () => void; onEditingChange: (value: boolean) => void;
}) {
  const scope = { userId, patientId: data.care_recipient_id, documentId: data.id };
  const key = balanceApplicationStorageKey(scope);
  const [ready, setReady] = useState(false), [pending, setPending] = useState<BalanceApplicationPacket | null>(null);
  const [group, setGroup] = useState<"family" | "supervisor" | null>(null);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [reading, setReading] = useState(false), [sending, setSending] = useState(false);
  const [absent, setAbsent] = useState(false), [obsolete, setObsolete] = useState(false);
  const inFlightRef = useRef(false), openerRef = useRef<HTMLButtonElement | null>(null), headingRef = useRef<HTMLHeadingElement>(null);
  const confirmedFocusRef = useRef(false), recoveryFocusRef = useRef(false);
  const finalFocus = useCallback(() => !confirmedFocusRef.current && openerRef.current?.isConnected
    && openerRef.current.getClientRects().length && !openerRef.current.matches(":disabled")
    ? openerRef.current : headingRef.current, []);
  const facts = balanceApplicationFacts.safeParse(data.balanceReview?.application);
  function confirmsApplication(value: unknown, packet: BalanceApplicationPacket) {
    const result = requireSupplyConfirmation(value, { id: data.id, patientId: data.care_recipient_id, type: "BAL", minimumVersion: packet.expectedVersion + 1 });
    const applied = balanceApplicationFacts.safeParse(result.balanceReview?.application);
    return result.status === "approved" && applied.success && applied.data.state === "applied"
      && applied.data.actorId === userId && applied.data.documentVersion === packet.expectedVersion + 1;
  }
  const busy = reading || sending;
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
  useEffect(() => { onEditingChange(Boolean(group) || busy); }, [group, busy, onEditingChange]);
  useEffect(() => {
    if (recoveryFocusRef.current && !pending && !busy) {
      recoveryFocusRef.current = false; headingRef.current?.focus();
    }
  }, [pending, busy]);
  function retain(packet: BalanceApplicationPacket | null) {
    const current = localStorage.getItem(key);
    if (current) {
      const other = parseBalanceApplicationIntent(current, scope);
      if (other.idempotencyKey !== (pending ?? packet)?.idempotencyKey) {
        setPending(other);
        throw new Error("Há outra tentativa preservada neste aparelho. Consulte-a antes de continuar.");
      }
    }
    if (packet) localStorage.setItem(key, JSON.stringify({ ...scope, packet }));
    else localStorage.removeItem(key);
    setPending(packet);
  }
  async function send(retry = false) {
    if (inFlightRef.current || !ready || !patientActive || !facts.success) return;
    const selected = retry ? pending?.body.group : group;
    if (!selected || (retry && !absent)) return;
    const packet: BalanceApplicationPacket = pending ?? {
      action: "apply_balance", idempotencyKey: crypto.randomUUID(), expectedVersion: data.version,
      body: { group: selected, reviewReference: data.balanceReview!.referenceHash },
    };
    inFlightRef.current = true; setSending(true); setError(""); setAbsent(false); setObsolete(false);
    try {
      retain(packet);
      const result = await api<unknown>("/api/documents/" + data.id, packet);
      if (!confirmsApplication(result, packet)) throw new Error("A resposta não confirmou esta aplicação. Consulte a referência preservada antes de reenviar.");
      // retain() precedes transmission; use the same key for this render's CAS.
      const saved = localStorage.getItem(key);
      if (saved && parseBalanceApplicationIntent(saved, scope).idempotencyKey === packet.idempotencyKey) localStorage.removeItem(key);
      confirmedFocusRef.current = true;
      setPending(null); setGroup(null); setMessage("Aplicação da contagem registrada com autoria própria. A revisão permanece separado."); onRefresh();
    } catch (reason) {
      setGroup(null); setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a aplicação. Consulte a mesma tentativa.");
    } finally { setSending(false); inFlightRef.current = false; }
  }
  async function recover() {
    if (!pending || inFlightRef.current || !patientActive) return;
    inFlightRef.current = true; setReading(true); setError(""); setAbsent(false); setObsolete(false);
    try {
      const query = new URLSearchParams({
        careRecipientId: scope.patientId, documentId: data.id,
        idempotencyKey: pending.idempotencyKey, expectedVersion: String(pending.expectedVersion), ...pending.body
      });
      const response = await api<{ data: unknown; }>("/api/balances/application?" + query);
      const result = balanceApplicationResult.parse(response.data);
      if (result.documentId !== data.id || result.idempotencyKey !== pending.idempotencyKey)
        throw new Error("A consulta não corresponde à tentativa preservada.");
      if (result.state === "found") {
        if (result.version !== pending.expectedVersion + 1 || result.application.actorId !== userId)
          throw new Error("A consulta não confirmou a autoria e a versão da aplicação preservada.");
        retain(null); recoveryFocusRef.current = true; setMessage("Aplicação original recuperada por consulta. Nenhum movimento foi repetido."); onRefresh();
      } else if (result.state === "obsolete") setObsolete(true);
      else setAbsent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível consultar a tentativa. Sua referência foi mantida."); }
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
    {!pending && ready && patientActive && facts.success ? <div className="hca-toolbar">{(data.balanceReview?.applicationGroups ?? []).map(value => <ActionButton key={value} disabled={busy} onClick={event => { openerRef.current = event.currentTarget; confirmedFocusRef.current = false; setGroup(value); }}>
      Aplicar contagem pelo grupo {value === "family" ? "familiar" : "de supervisão"}
    </ActionButton>)}</div> : null}
    <Dialog open={group !== null} title="Aplicar contagem ao estoque" closeDisabled={busy} onClose={() => setGroup(null)} finalFocus={finalFocus}>
      <div className="hca-form-stack"><p>Esta confirmação é o ato que aplica a contagem. Registrar uma revisão não altera o estoque.</p>
        <DefinitionGrid items={[{ label: "Ficha", value: data.code ?? "BAL" }, { label: "Contagem", value: data.balanceReview?.countVersion ?? "Não identificada" }, { label: "Versão consultada", value: data.version }, { label: "Grupo", value: group === "family" ? "Família" : "Supervisão" }]} />
        <div className="hca-toolbar"><ActionButton disabled={busy} onClick={() => setGroup(null)}>Voltar sem aplicar</ActionButton><ActionButton variant="primary" disabled={busy || !patientActive} onClick={() => void send()}>Confirmar aplicação da contagem</ActionButton></div>
      </div>
    </Dialog>
  </section>;
}
