"use client";

import { useRef, useState } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { WizardQuantityInput } from "@/components/forms/wizard-material-tools";
import { ActionButton, FormField, SelectField, TextAreaField } from "@/components/ui/controls";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
import { teamConsumptionCommand, teamConsumptionReceipt, type TeamConsumptionCommand } from "@/lib/validation/consumption";
import type { ConsumptionReport } from "@/types/consumption";
import type { CatalogProduct } from "@/types/documents";

type Command = Exclude<TeamConsumptionCommand, { action: "issue" }>;
export type TeamConsumptionActionKind = Command["action"];
const labels = { shortage: "Avisar falta", correct: "Corrigir consumo", cancel: "Cancelar consumo" };
const route = "/api/consumption/records";

export function TeamConsumptionAction({ context, kind, report, products, opener, onClose, onSaved }: {
  context: WorkspaceContext;
  kind: TeamConsumptionActionKind;
  report?: ConsumptionReport;
  products: CatalogProduct[];
  opener: HTMLElement;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const patient = context.patient!.id;
  const cache = `hca:official-team-consumption:${context.userId}:${patient}:${kind}:${report?.id ?? "new"}`;
  const [pending, setPending] = useState<Command | null>(() => {
    try {
      const stored = teamConsumptionCommand.safeParse(JSON.parse(sessionStorage.getItem(cache) ?? "null"));
      return stored.success && stored.data.action === kind && stored.data.careRecipientId === patient ? stored.data : null;
    } catch { return null; }
  });
  const [observation, setObservation] = useState(kind === "correct" ? report?.revisions.at(-1)?.body ?? report?.body ?? "" : "");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState(kind === "correct" ? report?.current_lines ?? [] : []);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [absent, setAbsent] = useState(false);
  const [error, setError] = useState("");
  const submitLockRef = useRef(false);
  useOperationActivity(busy, { title: pending ? "Conferindo o resultado" : "Registrando a decisão" });

  function remember(packet: Command | null) {
    setPending(packet);
    try {
      if (packet) sessionStorage.setItem(cache, JSON.stringify(packet));
      else sessionStorage.removeItem(cache);
    } catch { /* The open form still retains the confirmed intent. */ }
  }
  function confirmed(raw: unknown, packet: Command) {
    const receipt = teamConsumptionReceipt.parse(raw);
    if (receipt.idempotencyKey !== packet.idempotencyKey || receipt.careRecipientId !== patient ||
      receipt.action !== packet.action || ("reportId" in packet && receipt.id !== packet.reportId))
      throw new Error("A confirmação pertence a outra tentativa.");
    remember(null);
    onSaved(receipt.id);
  }
  async function send() {
    if (submitLockRef.current) return;
    let packet = pending;
    setError("");
    if (!packet) {
      const scope = { careRecipientId: patient, idempotencyKey: crypto.randomUUID(), action: kind };
      const materials = lines.map(({ productId, quantity, unit }) => ({ productId, quantity, unit }));
      const parsed = teamConsumptionCommand.safeParse(kind === "shortage"
        ? { ...scope, observation, lines: materials, repeatedReportId: report?.id }
        : { ...scope, reportId: report?.id, expectedVersion: report?.version, reason,
            ...(kind === "correct" ? { observation, lines: materials } : {}) });
      if (!parsed.success || parsed.data.action === "issue") {
        setError(parsed.success ? "Confira os dados." : parsed.error.issues[0]?.message === "Selecione pelo menos um material."
          ? "Selecione pelo menos um material." : "Confira o motivo, a descrição e as quantidades informadas.");
        return;
      }
      packet = parsed.data;
    }
    submitLockRef.current = true; setBusy(true);
    try {
      if (pending && !absent) {
        const { data } = await api<{ data: unknown }>(route + "?" + new URLSearchParams({
          careRecipientId: patient, idempotencyKey: packet.idempotencyKey,
        }));
        if (data === null) { setAbsent(true); return; }
        confirmed(data, packet);
      } else {
        remember(packet);
        confirmed((await api<{ data: unknown }>(route, packet)).data, packet);
      }
    } catch (failure) {
      if (failure instanceof ApiError && failure.status > 0 && failure.status < 500 && (!pending || absent)) {
        remember(null);
        setAbsent(false);
      }
      setError(failure instanceof Error ? failure.message : "Não foi possível confirmar a operação.");
    } finally { submitLockRef.current = false; setBusy(false); }
  }
  return <RecordDrawer title={labels[kind]} subtitle={context.patient?.display_name} onClose={onClose} busy={busy}
    restoreFocusTo={opener} exitDialog uncertainOutcome={Boolean(pending)}
    footer={close => <div className="hca-toolbar">
      <ActionButton disabled={busy} onClick={close}>Voltar</ActionButton>
      <ActionButton variant="primary" disabled={busy} onClick={() => void send()}>
        {pending ? absent ? "Reenviar a mesma tentativa" : "Conferir resultado" : kind === "shortage" ? "Enviar aviso" : "Confirmar"}
      </ActionButton>
    </div>}>
    <div className="hca-form-stack">
      {error ? <Notice error>{error}</Notice> : null}
      {pending ? <Notice>Confira o resultado antes de iniciar outro registro.</Notice> : <>
        {kind === "shortage" ? <p>O aviso aparece para a família e mantém os saldos atuais.</p> : null}
        {kind === "cancel" ? <p>A confirmação registra a compensação no estoque da equipe e preserva o histórico do consumo.</p> : null}
        {kind !== "cancel" ? <FormField label={kind === "shortage" ? "O que está faltando?" : "Observações"}>
          <TextAreaField value={observation} maxLength={2000} rows={4} onChange={event => setObservation(event.currentTarget.value)} />
        </FormField> : null}
        {kind !== "shortage" ? <FormField label="Motivo da alteração">
          <TextAreaField value={reason} maxLength={1000} rows={3} onChange={event => setReason(event.currentTarget.value)} />
        </FormField> : null}
        {kind !== "cancel" ? <>
          {lines.map(line => <div className="ui-card hca-form-stack" key={line.productId}>
            <FormField label={(kind === "shortage" ? "Quantidade em falta · " : "Quantidade consumida · ") + (line.name ?? line.productId)}>
              <WizardQuantityInput unit={line.unit} inputMode="decimal" value={line.quantity} maxLength={64}
                onChange={event => {
                  const quantity = event.currentTarget.value;
                  setLines(current => current.map(item => item.productId === line.productId ? { ...item, quantity } : item));
                }} />
            </FormField>
            <ActionButton variant="quiet" onClick={() => setLines(current => current.filter(item => item.productId !== line.productId))}>
              Remover {line.name ?? "material"}
            </ActionButton>
          </div>)}
          <FormField label="Material">
            <SelectField value={choice} onChange={event => setChoice(event.currentTarget.value)}>
              <option value="">Selecionar material do catálogo</option>
              {products.filter(item => item.active !== false && !lines.some(line => line.productId === item.id))
                .map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
          </FormField>
          <ActionButton disabled={!choice} onClick={() => {
            const product = products.find(item => item.id === choice);
            if (product) setLines(current => [...current, { productId: product.id, name: product.name, unit: product.unit, quantity: "" }]);
            setChoice("");
          }}>Adicionar material</ActionButton>
        </> : null}
      </>}
    </div>
  </RecordDrawer>;
}
