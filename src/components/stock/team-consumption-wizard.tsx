"use client";

import { useRef, useState } from "react";
import { MaterialReview } from "@/components/documents/material-review";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { SimpleDraftPanel } from "@/components/forms/simple-draft-panel";
import { SupplyWizardIdentity, SupplyWizardReviewIdentity } from "@/components/forms/supply-wizard-identity";
import { materialCategories, type WizardMaterialCategory } from "@/components/forms/supply-wizard-stages";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import { useLongDraftAutosave } from "@/components/forms/use-long-draft-autosave";
import { SupplyWizardFooter } from "@/components/forms/wizard-actions";
import type { ReminderOrigin } from "@/components/notifications/notification-reference";
import { ActionButton, FormField, TextAreaField } from "@/components/ui/controls";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { StepNavigator } from "@/components/ui/primitives";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
import { navigationForStep } from "@/lib/forms/draft-navigation";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useLiveRevision } from "@/lib/use-live-revision";
import { useScopedRead } from "@/lib/use-scoped-read";
import { teamConsumptionCommand, teamConsumptionReceipt, teamConsumptionReference, type TeamConsumptionCommand } from "@/lib/validation/consumption";
import { consumptionPreparationContentSchema, type ConsumptionPreparationContent } from "@/lib/validation/consumption-preparations";
import { exactQuantity } from "@/lib/validation/exact-quantity";
import { parseFlowPage, type FlowSubmission } from "@/lib/validation/flow-reviews";
import type { CatalogProduct } from "@/types/documents";
import { TeamConsumptionMaterials, teamConsumptionStages as stages, type TeamConsumptionLine as Line } from "./team-consumption-materials";

type Issue = Extract<TeamConsumptionCommand, { action: "issue" }>;
type MaterialBalance = ReturnType<typeof teamConsumptionReference.parse>["materials"][number];
const endpoint = "/api/consumption/records";

export function TeamConsumptionWizard({ context, products, balances, materialLoading, materialError, retryMaterials, opener, sourceReminder, sourceFlow, onClose, onSaved }: {
  context: WorkspaceContext;
  products: CatalogProduct[];
  balances: ReadonlyMap<string, string>;
  materialLoading: boolean;
  materialError: string;
  retryMaterials: () => void;
  opener: HTMLElement;
  sourceReminder?: ReminderOrigin;
  sourceFlow?: FlowSubmission;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const patient = context.patient!;
  const storageKey = `hca:official-team-consumption:${context.userId}:${patient.id}`;
  const [pending, setPending] = useState<Issue | null>(() => {
    try {
      const value = teamConsumptionCommand.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
      return value.success && value.data.action === "issue" && value.data.careRecipientId === patient.id ? value.data : null;
    } catch { return null; }
  });
  const suggested = () => {
    const ids = new Set(sourceFlow?.body.products);
    return products.filter(product => ids.has(product.id)).map(product => ({
      productId: product.id, name: product.name, unit: product.unit, quantity: "",
    }));
  };
  const firstCategory = (items: Line[]) => materialCategories.find(entry =>
    products.some(product => product.id === items[0]?.productId && product.category === entry.id),
  )?.id ?? "medicamentos";
  const [step, setStep] = useState(pending ? 4 : sourceFlow ? 1 : 0);
  const [lines, setLines] = useState<Line[]>(suggested);
  const [category, setCategory] = useState<WizardMaterialCategory>(() => firstCategory(lines));
  const [query, setQuery] = useState("");
  const [observation, setObservation] = useState("");
  const [reminder, setReminder] = useState(sourceReminder?.id ?? "");
  const [flowId, setFlowId] = useState(sourceFlow?.id);
  const [reference, setReference] = useState<ReturnType<typeof teamConsumptionReference.parse> | null>(null);
  const [previous, setPrevious] = useState<MaterialBalance[]>([]);
  const [busy, setBusy] = useState(false);
  const [receiptAbsent, setReceiptAbsent] = useState(false);
  const [error, setError] = useState("");
  const activeRef = useRef(false);
  const live = useLiveRevision();
  const flowRead = useScopedRead(flowId && !pending
    ? "/api/whatsapp/flows/submissions?" + new URLSearchParams({ careRecipientId: patient.id, id: flowId })
    : null, JSON.stringify([context.userId, patient.capabilities, live]), parseFlowPage);
  const flow = flowRead.data?.data.find(row => row.id === flowId && row.body.kind === "consumption");
  const sourceReady = !flowId || Boolean(flow && !flowRead.loading && !flowRead.error);
  const draft = useCreationDraft({
    userId: context.userId, patientId: patient.id, kind: "CONSUMPTION",
    purpose: "consumption_report_team", targetResourceId: patient.id,
    navigation: navigationForStep("CONSUMPTION", 0),
    onResume: saved => {
      const parsed = consumptionPreparationContentSchema.safeParse(saved.content);
      if (!parsed.success || parsed.data.consumption.kind === "shortage") return false;
      const stored = parsed.data.consumption;
      setLines(stored.lines);
      setObservation(stored.text);
      setReminder(stored.reminderId);
      setFlowId(stored.flowSubmissionId);
      setCategory(firstCategory(stored.lines));
      setStep(1);
      return true;
    },
    onDiscard: () => {
      const initial = suggested();
      setLines(initial);
      setCategory(firstCategory(initial));
      setObservation("");
      setReminder(sourceReminder?.id ?? "");
      setFlowId(sourceFlow?.id);
      setStep(sourceFlow ? 1 : 0);
    },
  });
  const content: ConsumptionPreparationContent = {
    consumption: { kind: "consumption", location: "CARE_TEAM", text: observation, reason: "", reminderId: reminder,
      ...(flowId ? { flowSubmissionId: flowId } : {}), lines },
    reference: null, referenceHash: null,
  };
  const edited = lines.length > 0 || Boolean(observation.trim() || flowId);
  const sameDraft = draft.base?.state === "active" && JSON.stringify(draft.base.content) === JSON.stringify(content);
  useLongDraftAutosave(draft, content, edited && !busy && !pending && sourceReady);
  useOperationActivity(busy, { title: pending ? "Conferindo o registro" : step === 4 ? "Registrando consumo" : "Conferindo estoque da equipe" });

  function retain(packet: Issue | null) {
    setPending(packet);
    try {
      if (packet) sessionStorage.setItem(storageKey, JSON.stringify(packet));
      else sessionStorage.removeItem(storageKey);
    } catch { /* A live attempt is still retained by the wizard. */ }
  }
  async function getReference() {
    const query = new URLSearchParams({ careRecipientId: patient.id });
    for (const item of lines) query.append("productId", item.productId);
    const { data } = await api<{ data: unknown }>(endpoint + "?" + query);
    const current = teamConsumptionReference.parse(data);
    if (current.careRecipientId !== patient.id || current.materials.length !== lines.length
      || current.materials.some(material => !lines.some(line => line.productId === material.productId)))
      throw new Error("A consulta não corresponde aos materiais selecionados.");
    return current;
  }
  function validLines() {
    if (!lines.length) { setError("Selecione pelo menos um material."); return false; }
    const invalid = lines.find(line => {
      const parsed = exactQuantity.safeParse(line.quantity);
      return !parsed.success || !quantity(parsed.data).gt(0);
    });
    if (invalid) { setError("Informe uma quantidade positiva para " + invalid.name + "."); return false; }
    return true;
  }
  async function review() {
    if (activeRef.current || !sourceReady || !validLines()) return;
    activeRef.current = true; setBusy(true); setError("");
    try {
      setReference(await getReference());
      setPrevious([]);
      setStep(4);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar o estoque.");
    } finally { activeRef.current = false; setBusy(false); }
  }
  function finish(raw: unknown, packet: Issue) {
    const receipt = teamConsumptionReceipt.parse(raw);
    if (receipt.careRecipientId !== patient.id || receipt.idempotencyKey !== packet.idempotencyKey || receipt.action !== "issue")
      throw new Error("A confirmação pertence a outra tentativa.");
    retain(null);
    onSaved(receipt.id);
  }
  async function submit() {
    if (activeRef.current || (!pending && (!sourceReady || !reference || draft.blocked || draft.backgroundBusy))) return;
    activeRef.current = true; setBusy(true); setError("");
    let packet = pending;
    let posted = false;
    try {
      if (!packet) {
        const saved = sameDraft ? draft.draftCommit : await draft.save(content);
        if (!saved || reference === null) { setError("Confira o salvamento do rascunho antes de emitir."); return; }
        const data = teamConsumptionCommand.parse({
          action: "issue", careRecipientId: patient.id, idempotencyKey: crypto.randomUUID(),
          observation, reminderId: reminder || undefined, flowSubmissionId: flowId,
          lines: lines.map(({ productId, quantity, unit }) => ({ productId, quantity, unit })),
          draft: { id: saved.id, revision: saved.revision }, referenceHash: reference.referenceHash,
        });
        if (data.action !== "issue") return;
        packet = data;
        retain(packet);
      } else if (!receiptAbsent) {
        const { data } = await api<{ data: unknown }>(endpoint + "?" + new URLSearchParams({
          careRecipientId: patient.id, idempotencyKey: packet.idempotencyKey,
        }));
        if (data === null) { setReceiptAbsent(true); return; }
        finish(data, packet);
        return;
      }
      posted = true;
      finish((await api<{ data: unknown }>(endpoint, packet)).data, packet);
    } catch (reason) {
      if (posted && reason instanceof ApiError && reason.code === "DRAFT_VERSION_CONFLICT") {
        retain(null);
        setReceiptAbsent(false);
        setReference(null);
        setPrevious([]);
        setStep(pending ? 0 : 1);
        await draft.reportConflict();
        setError("O rascunho foi atualizado. Confira a versão mais recente antes de emitir.");
      } else if (posted && reason instanceof ApiError && reason.code === "VERSION_CONFLICT") {
        retain(null);
        setReceiptAbsent(false);
        if (reference) {
          setPrevious(reference.materials);
          try { setReference(await getReference()); }
          catch { setReference(null); setStep(3); }
        } else setStep(0);
        await draft.reportConflict();
        setError("O estoque ou o rascunho mudou. Confira as referências atualizadas e revise novamente.");
      } else {
        if (posted && reason instanceof ApiError &&
          ["INVALID_OPERATION", "INSUFFICIENT_STOCK", "VALIDATION_ERROR"].includes(reason.code ?? "")) {
          if (flowId && reason.code === "INVALID_OPERATION") flowRead.refresh();
          retain(null);
          setReceiptAbsent(false);
          setReference(null);
          setStep(pending ? 0 : 1);
        }
        setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o registro.");
      }
    } finally { activeRef.current = false; setBusy(false); }
  }
  async function close() {
    if (busy || draft.backgroundBusy) return;
    if (edited && !pending && !draft.blocked && !sameDraft) {
      const saved = await draft.save(content);
      if (!saved) return;
    }
    onClose();
  }
  const cannotIssue = !reference || reference.materials.some(material => {
    const amount = exactQuantity.safeParse(lines.find(line => line.productId === material.productId)?.quantity);
    return !amount.success || quantity(amount.data).gt(material.quantity) || quantity(amount.data).decimalPlaces() > material.decimals;
  });
  const ready = pending || !draft.loading && !draft.offered && !draft.readDenied && !draft.loadError && !draft.protectedReadPending;
  return <RecordDrawer title={flowId ? "Continuar consumo" : "Registrar consumo"} kicker="Consumo do plantão" subtitle={patient.display_name}
    onClose={() => { void close(); }} restoreFocusTo={opener} busy={busy} preventClose={draft.busy || draft.backgroundBusy}
    popupClassName="hca-wizard-dialog hca-team-consumption-wizard" trackChanges={false} keyboardScrollable
    footer={() => <SupplyWizardFooter back={<ActionButton variant="quiet" disabled={busy || Boolean(pending) && step > 0}
      onClick={() => step ? setStep(step - 1) : void close()}>{step ? "Voltar" : "Sair por agora"}</ActionButton>}
    status={pending ? undefined : { draft, current: content, hasEdits: edited }}>
      {step === 4 ? <ActionButton variant="primary" disabled={busy || (!pending && (!sourceReady || cannotIssue || draft.blocked || draft.backgroundBusy))}
        onClick={() => void submit()}>{pending ? receiptAbsent ? "Reenviar a mesma tentativa" : "Conferir resultado" : "Registrar consumo"}</ActionButton>
        : <ActionButton variant="primary" disabled={busy || !ready || !sourceReady || draft.blocked} onClick={() => {
          setError(""); setQuery("");
          if (step === 3) void review();
          else setStep(step + 1);
        }}>{step === 0 ? "Selecionar materiais" : step === 3 ? "Revisar consumo" : "Continuar"}</ActionButton>}
    </SupplyWizardFooter>}>
    {!pending ? <SimpleDraftPanel draft={draft} current={content} disabled={busy} patientName={patient.display_name}
      authorName={context.fullName} documentLabel="Consumo" statusInFooter onExitDraft={onClose} /> : null}
    {error ? <Notice error>{error}</Notice> : null}
    {flowId && !pending && !sourceReady ? <Notice error={Boolean(flowRead.error) || !flowRead.loading}>
      {flowRead.loading ? "Consultando a sugestão do WhatsApp…"
        : "A sugestão do WhatsApp está indisponível ou já foi resolvida."}
      {!flowRead.loading ? <ActionButton onClick={flowRead.refresh}>Consultar sugestão novamente</ActionButton> : null}
    </Notice> : null}
    {pending ? <Notice>{receiptAbsent
      ? "A confirmação ainda não foi encontrada. Você pode reenviar a mesma tentativa com segurança."
      : "Confira o resultado desta tentativa antes de registrar outro consumo."}</Notice> : ready ? <>
      <StepNavigator steps={stages} active={step} onChange={setStep} compact label="Etapas do consumo" disabled={busy || draft.blocked} />
      {flow && step === 1 ? <section className="hca-attention" aria-label="Sugestão do WhatsApp">
        <strong>Sugestão recebida pelo WhatsApp · {formatBrazilDate(flow.created_at)}</strong>
        {flow.body.text ? <p className="whitespace-pre-wrap wrap-break-word">{flow.body.text}</p> : null}
        <p>Confira os materiais e preencha as quantidades usadas no plantão.</p>
        {flow.body.products?.some(id => !products.some(product => product.id === id))
          ? <p>Parte dos materiais da sugestão está indisponível no catálogo atual.</p> : null}
      </section> : null}
      {step === 0 ? <>
        <SupplyWizardIdentity context={context} kind="CON" />
        {reminder ? <Notice>Consumo vinculado ao lembrete do plantão.</Notice> : null}
        <p>As quantidades registradas serão descontadas do estoque da equipe.</p>
      </> : null}
      {step === 1 || step === 2 ? <TeamConsumptionMaterials context={context} products={products}
        balances={balances} lines={lines} extras={step === 2} category={category} query={query}
        loading={materialLoading} error={materialError} retry={retryMaterials}
        onCategory={setCategory} onQuery={setQuery} onChange={value => { setLines(value); setError(""); }} /> : null}
      {step === 3 ? <FormField label="Observações" helpText="Opcional"><TextAreaField rows={5} maxLength={2000}
        value={observation} onChange={event => setObservation(event.currentTarget.value)} /></FormField> : null}
      {step === 4 && reference ? <div className="hca-form-stack">
        <SupplyWizardReviewIdentity context={context} kind="CON" />
        <h3>Impacto no estoque</h3>
        <MaterialReview rows={reference.materials.map(material => {
          const used = quantity(lines.find(item => item.productId === material.productId)?.quantity ?? "0");
          const prior = previous.find(entry => entry.productId === material.productId);
          const after = quantity(material.quantity).minus(used).toFixed();
          return { id: material.productId, name: material.name, details: <div>
            {prior && prior.quantity !== material.quantity ? <small>Saldo na revisão anterior · {formatQuantity(prior.quantity, material.unit)}</small> : null}
            <p>Saldo {formatQuantity(material.quantity, material.unit)} · Uso {formatQuantity(used.toFixed(), material.unit)}</p>
            <small>{quantity(after).isNegative() ? "Saldo insuficiente" : "Após o consumo · " + formatQuantity(after, material.unit)}</small>
          </div> };
        })} />
        {cannotIssue ? <Notice error>Confira o saldo e a precisão da unidade de cada material.</Notice> : null}
        {observation ? <p className="whitespace-pre-wrap">{observation}</p> : null}
      </div> : null}
    </> : <p role="status">Consultando o último preenchimento…</p>}
  </RecordDrawer>;
}
