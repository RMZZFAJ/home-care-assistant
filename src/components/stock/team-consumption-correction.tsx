"use client";

import { useRef, useState } from "react";
import { MaterialReview } from "@/components/documents/material-review";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { materialCategories } from "@/components/forms/supply-wizard-stages";
import { SupplyWizardFooter } from "@/components/forms/wizard-actions";
import { SupplyWizardIdentity, SupplyWizardReviewIdentity } from "@/components/forms/supply-wizard-identity";
import { ActionButton, FormField, TextAreaField } from "@/components/ui/controls";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { StepNavigator } from "@/components/ui/primitives";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
import { formatQuantity, quantity } from "@/lib/quantity";
import { teamConsumptionCommand, teamConsumptionReceipt, teamCorrectionReference, type TeamConsumptionCommand } from "@/lib/validation/consumption";
import { exactQuantity } from "@/lib/validation/exact-quantity";
import type { ConsumptionReport } from "@/types/consumption";
import type { CatalogProduct } from "@/types/documents";
import { TeamConsumptionMaterials, teamConsumptionStages as stages, type TeamConsumptionLine } from "./team-consumption-materials";

type Command = Extract<TeamConsumptionCommand, { action: "correct" }>;
type Reference = ReturnType<typeof teamCorrectionReference.parse>;
type Baseline = Pick<Reference, "version" | "observation" | "original">;
const endpoint = "/api/consumption/records";

function amounts(lines: readonly TeamConsumptionLine[]) {
  return new Map(lines.map(line => [line.productId, line]));
}

function baseline(report: ConsumptionReport, version: number): Baseline {
  const revision = report.revisions.find(item => item.version === version);
  const historical = version === 1 || Boolean(revision);
  const lines = historical ? revision?.lines ?? report.lines : report.current_lines;
  return {
    version: historical ? version : report.version,
    observation: historical ? revision?.body ?? report.body : report.revisions.at(-1)?.body ?? report.body,
    original: lines.map(line => ({ ...line, name: line.name ?? line.productId })),
  };
}

function changedLines(original: TeamConsumptionLine[], edited: TeamConsumptionLine[]) {
  const originalById = amounts(original), editedById = amounts(edited);
  const adjustments = new Map<string, TeamConsumptionLine | null>();
  for (const id of new Set([...originalById.keys(), ...editedById.keys()])) {
    const before = originalById.get(id), after = editedById.get(id);
    if (!before || !after || exactQuantity.safeParse(before.quantity).data !== exactQuantity.safeParse(after.quantity).data)
      adjustments.set(id, after ?? null);
  }
  return adjustments;
}

export function TeamConsumptionCorrection({ context, report, products, balances, loading, materialError, retry, opener, onClose, onSaved }: {
  context: WorkspaceContext;
  report: ConsumptionReport;
  products: CatalogProduct[];
  balances: ReadonlyMap<string, string>;
  loading: boolean;
  materialError: string;
  retry: () => void;
  opener: HTMLElement;
  onClose: () => void;
  onSaved: (recordId: string) => void;
}) {
  const patient = context.patient!;
  const key = `hca:official-team-consumption:${context.userId}:${patient.id}:correct:${report.id}`;
  const [pending, setPending] = useState<Command | null>(() => {
    try {
      const stored = teamConsumptionCommand.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "null"));
      return stored.success && stored.data.action === "correct" && stored.data.careRecipientId === patient.id
        && stored.data.reportId === report.id ? stored.data : null;
    } catch { return null; }
  });
  const [base, setBase] = useState(() => baseline(report, pending?.expectedVersion ?? report.version));
  const [lines, setLines] = useState(base.original), [observation, setObservation] = useState(base.observation);
  const [reason, setReason] = useState(""), [query, setQuery] = useState("");
  const [category, setCategory] = useState(() => materialCategories.find(entry =>
    products.some(product => product.id === base.original[0]?.productId && product.category === entry.id),
  )?.id ?? "medicamentos");
  const [step, setStep] = useState(pending ? 4 : 0);
  const [review, setReview] = useState<Reference | null>(null), [conflict, setConflict] = useState<Reference | null>(null);
  const [previousReview, setPreviousReview] = useState<Reference | null>(null);
  const [busy, setBusy] = useState(false), [absent, setAbsent] = useState(false), [error, setError] = useState("");
  const activeRef = useRef(false);
  useOperationActivity(busy, { title: pending ? "Conferindo a correção" : step === 4 ? "Registrando correção" : "Conferindo o estoque da equipe" });

  const adjustments = changedLines(base.original, lines);
  const baseById = amounts(base.original), editedById = amounts(lines);
  const dirty = adjustments.size > 0 || observation !== base.observation || Boolean(reason.trim());
  const effects = review?.materials.map(material => {
    const prior = quantity(baseById.get(material.productId)?.quantity ?? "0");
    const next = quantity(editedById.get(material.productId)?.quantity ?? "0");
    const balance = quantity(material.quantity);
    const delta = prior.minus(next);
    return { material, prior, next, delta, after: balance.plus(delta),
      invalid: next.gt(prior) && next.decimalPlaces() > material.decimals };
  }) ?? [];
  const cannotConfirm = !review || effects.some(effect => effect.invalid || effect.after.lt(0));

  function retain(packet: Command | null) {
    setPending(packet);
    try {
      if (packet) sessionStorage.setItem(key, JSON.stringify(packet));
      else sessionStorage.removeItem(key);
    } catch { /* The open assistant still holds the attempt. */ }
  }
  function navigate(next: number) {
    setReview(null);
    setConflict(null);
    setError("");
    setQuery("");
    setStep(next);
  }
  async function readReview() {
    if (activeRef.current) return;
    if (!lines.length || lines.some(line => !exactQuantity.safeParse(line.quantity).success || !quantity(line.quantity).gt(0))) {
      setError("Selecione pelo menos um material e informe quantidades positivas.");
      return;
    }
    if (reason.trim().length < 3) { setError("Informe o motivo da correção."); return; }
    setBusy(true); activeRef.current = true; setError(""); setReview(null); setConflict(null);
    try {
      const params = new URLSearchParams({ careRecipientId: patient.id, reportId: report.id });
      lines.forEach(line => params.append("productId", line.productId));
      const current = teamCorrectionReference.parse((await api<{ data: unknown }>(endpoint + "?" + params)).data);
      if (current.reportId !== report.id || current.careRecipientId !== patient.id || current.version < base.version)
        throw new Error("A consulta não corresponde a este consumo.");
      if (current.version !== base.version) setConflict(current);
      else setReview(current);
      setStep(4);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível consultar a correção.");
    } finally { setBusy(false); activeRef.current = false; }
  }
  function adoptVersion(current: Reference) {
    const latest = amounts(current.original);
    for (const [id, edit] of adjustments) {
      if (edit) latest.set(id, edit);
      else latest.delete(id);
    }
    setLines([...latest.values()]);
    if (observation === base.observation) setObservation(current.observation);
    setBase(current);
    navigate(3);
  }
  function restoreFields(packet: Command) {
    setLines(packet.lines.map(line => {
      const material = products.find(product => product.id === line.productId), original = baseById.get(line.productId);
      return { productId: line.productId, quantity: line.quantity,
        name: original?.name ?? material?.name ?? line.productId, unit: line.unit ?? material?.unit ?? original?.unit ?? "" };
    }));
    setObservation(packet.observation ?? "");
    setReason(packet.reason);
  }
  async function send() {
    if (activeRef.current || (!pending && (cannotConfirm || !review))) return;
    let packet = pending;
    let posted = false;
    setBusy(true); activeRef.current = true; setError("");
    try {
      if (!packet && review) {
        const parsed = teamConsumptionCommand.parse({
          action: "correct", careRecipientId: patient.id, reportId: report.id, expectedVersion: review.version,
          referenceHash: review.referenceHash, idempotencyKey: crypto.randomUUID(),
          reason, observation, lines: lines.map(({ productId, quantity, unit }) => ({ productId, quantity, unit })),
        });
        if (parsed.action !== "correct") return;
        packet = parsed;
      }
      if (!packet) return;
      let raw: unknown;
      if (pending && !absent) {
        raw = (await api<{ data: unknown }>(endpoint + "?" + new URLSearchParams({
          careRecipientId: patient.id, idempotencyKey: packet.idempotencyKey,
        }))).data;
        if (raw === null) {
          if (!packet.referenceHash) {
            restoreFields(packet);
            retain(null); setStep(3);
            setError("A correção anterior não foi registrada. Confira a versão e os saldos atuais antes de enviar.");
          } else setAbsent(true);
          return;
        }
      } else {
        retain(packet);
        posted = true;
        raw = (await api<{ data: unknown }>(endpoint, packet)).data;
      }
      const receipt = teamConsumptionReceipt.parse(raw);
      if (receipt.action !== "correct" || receipt.id !== report.id || receipt.careRecipientId !== patient.id
        || receipt.idempotencyKey !== packet.idempotencyKey || receipt.version !== packet.expectedVersion + 1)
        throw new Error("A confirmação pertence a outra tentativa.");
      retain(null);
      onSaved(receipt.id);
    } catch (failure) {
      if (posted && failure instanceof ApiError && failure.status >= 400 && failure.status < 500
        && failure.code !== "PERSISTENCE_UNCONFIRMED") {
        if (packet && pending) restoreFields(packet);
        if (review && failure.code === "VERSION_CONFLICT") setPreviousReview(review);
        retain(null); setAbsent(false); setReview(null); setStep(3);
      }
      setError(failure instanceof Error ? failure.message : "Não foi possível confirmar a correção.");
    } finally { setBusy(false); activeRef.current = false; }
  }
  const currentProducts = products.concat(base.original.filter(line => !products.some(product => product.id === line.productId)).map(line => ({
    id: line.productId, name: line.name, unit: line.unit, category: "extra",
  })));
  return <RecordDrawer title="Corrigir consumo" kicker="Consumo do plantão" subtitle={patient.display_name}
    onClose={onClose} restoreFocusTo={opener} busy={busy} uncertainOutcome={Boolean(pending)}
    hasUnsavedChanges={dirty} trackChanges={false} exitDialog keyboardScrollable
    popupClassName="hca-wizard-dialog hca-team-consumption-wizard"
    footer={close => <SupplyWizardFooter back={<ActionButton variant="quiet" disabled={busy || Boolean(pending)}
      onClick={() => step > 0 ? navigate(step - 1) : close()}>{step ? "Voltar" : "Cancelar preenchimento"}</ActionButton>}>
      {pending ? <ActionButton variant="primary" disabled={busy} onClick={() => void send()}>
        {absent ? "Reenviar a mesma tentativa" : "Conferir resultado"}
      </ActionButton> : conflict ? <ActionButton variant="primary" disabled={busy} onClick={() => adoptVersion(conflict)}>
        Aplicar meus ajustes à versão atual
      </ActionButton> : step === 4 ? <ActionButton variant="primary" disabled={busy || cannotConfirm} onClick={() => void send()}>
        Registrar correção
      </ActionButton> : <ActionButton variant="primary" disabled={busy} onClick={() => {
        if (step === 3) void readReview();
        else navigate(step + 1);
      }}>{step === 0 ? "Selecionar materiais" : step === 3 ? "Revisar correção" : "Continuar"}</ActionButton>}
    </SupplyWizardFooter>}>
    {error ? <Notice error>{error}</Notice> : null}
    {pending ? <Notice>{absent
      ? "A correção não foi localizada. Você pode reenviar a mesma tentativa."
      : "Confira o resultado desta correção antes de tentar novamente."}</Notice> : <>
      <StepNavigator steps={stages} active={step} onChange={navigate} compact label="Etapas da correção" disabled={busy || Boolean(conflict)} />
      {step === 0 ? <>
        <SupplyWizardIdentity context={context} kind="CON" />
        <p>Você está corrigindo a versão {base.version}. Somente as diferenças vão movimentar o estoque da equipe.</p>
      </> : null}
      {step === 1 || step === 2 ? <TeamConsumptionMaterials context={context} products={currentProducts}
        balances={balances} original={base.original} lines={lines} extras={step === 2} category={category}
        query={query} loading={loading} error={materialError} retry={retry}
        onCategory={setCategory} onQuery={setQuery} onChange={value => { setLines(value); setError(""); }} /> : null}
      {step === 3 ? <div className="hca-form-stack">
        <FormField label="Observações" helpText="Opcional"><TextAreaField rows={4} maxLength={2000}
          value={observation} onChange={event => setObservation(event.currentTarget.value)} /></FormField>
        <FormField label="Motivo da correção" required><TextAreaField rows={3} maxLength={1000}
          value={reason} onChange={event => setReason(event.currentTarget.value)} /></FormField>
      </div> : null}
      {step === 4 && conflict ? <section className="hca-form-stack" aria-label="Comparar versões do consumo">
        <Notice>A versão {conflict.version} foi registrada em outro preenchimento. Confira as quantidades antes de reaplicar seus ajustes.</Notice>
        <MaterialReview rows={conflict.materials.map(material => {
          const previous = baseById.get(material.productId), latest = conflict.original.find(line => line.productId === material.productId);
          const edited = adjustments.get(material.productId);
          return { id: material.productId, name: material.name, details: <div>
            <p>Versão {base.version} · {formatQuantity(previous?.quantity ?? "0", material.unit)}</p>
            <p>Versão {conflict.version} · {formatQuantity(latest?.quantity ?? "0", material.unit)}</p>
            {edited !== undefined ? <p>Seu ajuste · {formatQuantity(edited?.quantity ?? "0", material.unit)}</p> : null}
          </div> };
        })} />
        {base.observation !== conflict.observation ? <p>Observações na versão atual · {conflict.observation || "Sem observações."}</p> : null}
        <p>Seus ajustes serão aplicados à versão atual. Você ainda terá de revisar e confirmar a correção.</p>
      </section> : null}
      {step === 4 && review ? <section className="hca-form-stack" aria-label="Impacto da correção no estoque">
        <SupplyWizardReviewIdentity context={context} kind="CON" />
        <h3>Impacto no estoque</h3>
        <MaterialReview rows={effects.map(({ material, prior, next, delta, after, invalid }) => {
          const beforeReview = previousReview?.materials.find(item => item.productId === material.productId);
          return { id: material.productId, name: material.name, details: <div>
            <p>Consumo registrado · {formatQuantity(prior.toFixed(), material.unit)}</p>
            <p>Consumo corrigido · {formatQuantity(next.toFixed(), material.unit)}</p>
            {beforeReview && beforeReview.quantity !== material.quantity
              ? <p>Saldo na revisão anterior · {formatQuantity(beforeReview.quantity, beforeReview.unit)}</p> : null}
            <p>Saldo atual · {formatQuantity(material.quantity, material.unit)}</p>
            {!delta.isZero() ? <p>{delta.gt(0) ? "Retorno ao saldo" : "Baixa adicional"} · {formatQuantity(delta.abs().toFixed(), material.unit)}</p>
              : <p>Sem movimentação</p>}
            <p>Saldo após a correção · {formatQuantity(after.toFixed(), material.unit)}</p>
            {invalid ? <p>Confira a precisão da unidade deste material.</p> : null}
          </div> };
        })} />
        {cannotConfirm ? <Notice error>Confira o saldo e a precisão dos materiais antes de registrar a correção.</Notice> : null}
        {observation.trim() ? <p>Observações · {observation}</p> : null}
        <p>Motivo da correção · {reason}</p>
      </section> : null}
    </>}
  </RecordDrawer>;
}
