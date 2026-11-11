"use client";

import { Fragment, useEffect, useRef, useState, type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, CheckboxField, FormField, SelectField, TextInput } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
import {
  catalogueAttempt, catalogueReceipt, type CatalogueAttempt, type CatalogueFields,
  type CatalogueOutcome, type CatalogueReference, type CatalogueScope, type CatalogueSnapshot,
} from "@/lib/validation/catalogue-preparation";
import { bool, text } from "./admin-fields";

const endpoint = "/api/admin/catalogue-preparations";
const productLabels = {
  name: "Nome", category: "Categoria", unit: "Unidade", aliases: "Nomes alternativos, separados por vírgula",
  description: "Descrição operacional", sortOrder: "Ordem", isActive: "Item ativo",
} satisfies Record<keyof CatalogueFields, string>;
const categories = { medicamentos: "Medicamentos", higiene: "Higiene", dieta: "Dieta" };
const stages = { save: "active", commit: "consumed", discard: "discarded", acknowledge: "acknowledged" } as const;
const revisionRejections = new Set(["DRAFT_VERSION_CONFLICT", "VERSION_CONFLICT"]);
const checkedRejections = new Set([...revisionRejections, "INVALID_OPERATION", "AMBIGUOUS_PRODUCT", "DUPLICATE"]);

function defaultFields(reference: CatalogueReference): NonNullable<CatalogueAttempt["fields"]> {
  if ("models" in reference) return { modelId: "" };
  const row = reference.item ?? {};
  const category = row.category === "higiene" || row.category === "dieta" ? row.category : "medicamentos";
  return {
    name: text(row, "name"), category, unit: text(row, "unit") || "unidade",
    aliases: Array.isArray(row.aliases) ? row.aliases.join(", ") : "",
    description: text(row, "description"), sortOrder: String(row.sort_order ?? 0),
    isActive: bool(row, "is_active", true),
  };
}

function fieldHash(reference: CatalogueReference, fields: NonNullable<CatalogueAttempt["fields"]>) {
  if ("models" in reference && "modelId" in fields) return reference.models.find(model => model.id === fields.modelId)?.hash ?? null;
  return "hash" in reference ? reference.hash : null;
}

function sameFields(left: NonNullable<CatalogueAttempt["fields"]>, right: NonNullable<CatalogueAttempt["fields"]>) {
  if ("modelId" in left) return "modelId" in right && left.modelId === right.modelId;
  return !("modelId" in right) && (Object.keys(productLabels) as (keyof CatalogueFields)[]).every(key => left[key] === right[key]);
}

function messageFor(outcome: CatalogueOutcome, purpose: CatalogueScope["purpose"]) {
  if ("proposalId" in outcome) return "Proposta global registrada. Um administrador local distinto deve aprovar em Permissões, comunicação e regras.";
  return purpose === "adopt" ? "Modelo adicionado ao catálogo deste paciente." : "Item salvo e auditado.";
}

function FieldValues({ fields, reference }: { fields: NonNullable<CatalogueAttempt["fields"]>; reference?: CatalogueReference }) {
  const model = "modelId" in fields && reference && "models" in reference ? reference.models.find(option => option.id === fields.modelId) : null;
  return <dl className="hca-summary-grid wrap-anywhere">
    {"modelId" in fields ? <>
      <dt>Modelo</dt><dd>{model?.name ?? (fields.modelId || "Em branco")}</dd>
      {model ? <><dt>Unidade</dt><dd>{model.unit}</dd><dt>Categoria</dt><dd>{categories[model.category]}</dd>
        <dt>Nomes alternativos</dt><dd>{model.aliases.join(", ") || "Em branco"}</dd></> : null}
    </> : (Object.keys(productLabels) as (keyof CatalogueFields)[]).map(key => <Fragment key={key}>
        <dt>{productLabels[key]}</dt>
        <dd>{key === "isActive" ? fields.isActive ? "Sim" : "Não" : key === "category" ? categories[fields.category] : fields[key] || "Em branco"}</dd>
      </Fragment>)}
  </dl>;
}

export function CataloguePreparationEditor({ patientId, mode, purpose, targetId, userId, opener, headingRef, onClose, onSaved }: CatalogueScope & {
  userId: string;
  opener: HTMLElement;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const scope = { patientId, mode, purpose, targetId };
  const query = new URLSearchParams({ patientId, mode, purpose, ...(targetId ? { targetId } : {}) }).toString();
  const storageKey = "hca:catalogue-preparation:" + JSON.stringify([userId, patientId, mode, purpose, targetId]);
  const mountedRef = useRef(false);
  const inFlightRef = useRef(false);
  const [snapshot, setSnapshot] = useState<CatalogueSnapshot | null>(null);
  const [fields, setFields] = useState<NonNullable<CatalogueAttempt["fields"]> | null>(null);
  const [reviewedHash, setReviewedHash] = useState<string | null>(null);
  const [pending, setPending] = useState<CatalogueAttempt | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [comparison, setComparison] = useState<CatalogueSnapshot | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    void api<CatalogueSnapshot>(endpoint + "?" + query, undefined, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      let retained: CatalogueAttempt | null = null;
      try {
        const parsed = catalogueAttempt.safeParse(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
        if (parsed.success && parsed.data.patientId === patientId && parsed.data.mode === mode
          && parsed.data.purpose === purpose && parsed.data.targetId === targetId) retained = parsed.data;
      } catch { /* The server snapshot remains available. */ }
      const recovered = retained?.fields ?? result.draft?.fields ?? defaultFields(result.reference);
      setSnapshot(result);
      setFields(recovered);
      setReviewedHash(retained?.referenceHash ?? result.draft?.referenceHash ?? fieldHash(result.reference, recovered));
      setPending(retained);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Não foi possível consultar o preenchimento.");
    });
    return () => { mountedRef.current = false; controller.abort(); };
  }, [mode, patientId, purpose, query, reload, storageKey, targetId]);

  function forget() {
    setPending(null);
    try { sessionStorage.removeItem(storageKey); } catch { /* The receipt remains on the server. */ }
  }

  function acceptReceipt(attempt: CatalogueAttempt, value: unknown) {
    const parsed = catalogueReceipt.safeParse(value);
    if (!parsed.success) throw new Error("Não foi possível conferir o comprovante desta tentativa.");
    const receipt = parsed.data;
    if (receipt.ownerId !== userId || receipt.patientId !== patientId || receipt.mode !== mode
      || receipt.purpose !== purpose || receipt.targetId !== targetId || receipt.key !== attempt.key
      || receipt.action !== attempt.action || receipt.state !== stages[attempt.action]
      || (attempt.id !== null && attempt.id !== receipt.id) || receipt.revision !== attempt.revision + 1
      || ((attempt.action === "commit" || attempt.action === "acknowledge") !== (receipt.outcome !== null))
      || (receipt.outcome && (("proposalId" in receipt.outcome) !== (mode === "global")))
      || (receipt.outcome && "productId" in receipt.outcome && purpose === "edit" && receipt.outcome.productId !== targetId)
      || (attempt.action === "commit" && purpose === "adopt" && receipt.outcome && "productId" in receipt.outcome
        && attempt.fields && "modelId" in attempt.fields && receipt.outcome.productId !== attempt.fields.modelId)) {
      throw new Error("O comprovante recebido não corresponde a esta tentativa.");
    }

    forget();
    if (attempt.action === "commit" && receipt.outcome) {
      onClose();
      void onSaved(messageFor(receipt.outcome, purpose)).catch(() => undefined);
    } else if (attempt.action === "save" && attempt.fields && attempt.referenceHash) {
      const draft = { state: "active" as const, id: receipt.id, revision: receipt.revision, fields: attempt.fields,
        referenceHash: attempt.referenceHash, savedAt: new Date().toISOString(), outcome: null };
      setSnapshot(current => current && { ...current, draft });
      setMessage("Preenchimento privado salvo. Você pode retomá-lo neste catálogo.");
    } else {
      setConfirmDiscard(false);
      setSnapshot(null);
      setMessage(attempt.action === "discard" ? "Preenchimento privado descartado." : "");
      setReload(value => value + 1);
    }
  }

  async function run(attempt: CatalogueAttempt, operation: "send" | "retry" | "read") {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (operation === "send") {
        try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); }
        catch { setError("O navegador não conseguiu guardar a tentativa. Libere o armazenamento desta aba e tente novamente."); return; }
        setPending(attempt);
      }
      if (operation === "read") {
        const result = await api<{ receipt: unknown }>(endpoint + "?" + query + "&key=" + attempt.key);
        if (!mountedRef.current) return;
        if (result.receipt === null) {
          setMessage("Ainda não há comprovante para esta tentativa. Consulte novamente ou envie a mesma tentativa.");
          return;
        }
        acceptReceipt(attempt, result.receipt);
      } else {
        const receipt = await (attempt.action === "commit"
          ? api("/api/admin", { action: purpose === "adopt" ? "adoptProduct" : "product", cataloguePreparation: attempt })
          : api(endpoint, attempt));
        if (mountedRef.current) acceptReceipt(attempt, receipt);
      }
    } catch (reason) {
      if (!mountedRef.current) return;
      if (operation !== "read" && reason instanceof ApiError && reason.status >= 400 && reason.status < 500
        && (operation === "send" || checkedRejections.has(reason.code ?? ""))) {
        forget();
        if (revisionRejections.has(reason.code ?? "")) {
          setConflict(true);
          setComparison(null);
        }
      }
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a tentativa.");
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }

  function start(action: CatalogueAttempt["action"]) {
    if (!snapshot || !fields || pending || conflict || inFlightRef.current) return;
    const writes = action === "save" || action === "commit";
    if (writes && !reviewedHash) return;
    void run({ ...scope, action, key: crypto.randomUUID(), id: snapshot.draft?.id ?? null,
      revision: snapshot.draft?.revision ?? 0, fields: writes ? fields : null,
      referenceHash: writes ? reviewedHash : null }, "send");
  }

  async function compare() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    try {
      const latest = await api<CatalogueSnapshot>(endpoint + "?" + query);
      if (mountedRef.current) setComparison(latest);
    } catch (reason) {
      if (mountedRef.current) setError(reason instanceof Error ? reason.message : "Não foi possível consultar a revisão atual.");
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }

  function applyComparison(keepFields: boolean) {
    if (!comparison) return;
    if (!keepFields) {
      const latest = comparison.draft?.fields ?? defaultFields(comparison.reference);
      setFields(latest);
      setReviewedHash(comparison.draft?.referenceHash ?? fieldHash(comparison.reference, latest));
    }
    setSnapshot(comparison);
    setConflict(false);
    setComparison(null);
  }

  const reference = snapshot?.reference;
  const draft = snapshot?.draft;
  const currentHash = reference && fields ? fieldHash(reference, fields) : null;
  const referenceChanged = reviewedHash !== null && currentHash !== reviewedHash;
  const dirty = !!(fields && reference && draft?.state !== "consumed" &&
    (!sameFields(fields, draft?.fields ?? defaultFields(reference))
      || (draft?.state === "active" && draft.referenceHash !== reviewedHash)));
  const locked = !!pending || conflict || confirmDiscard;
  const title = purpose === "edit" ? "Editar item" : purpose === "adopt" ? "Adotar modelo existente" : "Adicionar item exclusivo deste paciente";
  return <RecordDrawer title={title} busy={busy} preventClose={!!pending}
    hasUnsavedChanges={dirty} onClose={onClose} restoreFocusTo={opener} restoreFocusFallbackRef={headingRef}>
    {error ? <Notice error>{error}</Notice> : null}
    {message ? <Notice>{message}</Notice> : null}
    {pending ? <div className="hca-attention">
      <p>Há uma tentativa aguardando confirmação. Você pode consultar o comprovante ou enviar a mesma tentativa.</p>
      <div className="hca-toolbar">
        <ActionButton type="button" onClick={() => void run(pending, "read")}>Consultar comprovante</ActionButton>
        <ActionButton type="button" onClick={() => void run(pending, "retry")}>Enviar a mesma tentativa</ActionButton>
        <ActionButton type="button" onClick={onClose}>Fechar e recuperar depois</ActionButton>
      </div>
    </div> : null}
    {!snapshot ? error
      ? <ActionButton type="button" onClick={() => { setError(""); setReload(value => value + 1); }}>Consultar preenchimento novamente</ActionButton>
      : <p role="status">Consultando preenchimento privado…</p> : null}
    {conflict ? <div className="hca-attention">
      <p>Compare a revisão salva com os campos deste editor antes de prosseguir.</p>
      {comparison ? <>
        {comparison.draft?.fields ? <FieldValues fields={comparison.draft.fields} reference={comparison.reference} />
          : <p>{comparison.draft?.state === "consumed" ? "Já existe uma confirmação para este preenchimento." : "Não há preenchimento privado salvo."}</p>}
        <div className="hca-toolbar">
          <ActionButton type="button" onClick={() => applyComparison(false)}>Carregar revisão salva</ActionButton>
          {comparison.draft?.state !== "consumed" ? <ActionButton type="button" onClick={() => applyComparison(true)}>Manter meus campos</ActionButton> : null}
        </div>
      </> : <ActionButton type="button" onClick={() => void compare()}>Comparar com a revisão salva</ActionButton>}
    </div> : null}
    {draft?.state === "consumed" && !pending ? <div className="hca-attention">
      <p>{messageFor(draft.outcome, purpose)}</p>
      <ActionButton type="button" disabled={locked} onClick={() => start("acknowledge")}>Iniciar outro preenchimento</ActionButton>
    </div> : null}
    {confirmDiscard ? <div className="hca-attention">
      <p>Descartar o preenchimento privado salvo neste catálogo?</p>
      <div className="hca-toolbar">
        <ActionButton type="button" onClick={() => setConfirmDiscard(false)}>Continuar preenchendo</ActionButton>
        <ActionButton type="button" disabled={!!pending || conflict} onClick={() => start("discard")}>Confirmar descarte</ActionButton>
      </div>
    </div> : null}
    {reference && fields && draft?.state !== "consumed" ? <form className="hca-form" onSubmit={event => { event.preventDefault(); start("commit"); }}>
      {draft?.state === "active" && !message ? <p role="status">Preenchimento privado recuperado.</p> : null}
      {mode === "global" ? <p>A confirmação registra uma proposta para aprovação local.</p> : null}
      {referenceChanged ? <div className="hca-attention">
        <p>{currentHash ? "A referência do catálogo mudou. Revise os dados atuais para continuar." : "O modelo selecionado deixou de estar disponível. Escolha um dos modelos atuais."}</p>
        {"item" in reference && reference.item ? <FieldValues fields={defaultFields(reference)} /> : null}
        {"models" in reference && currentHash ? <FieldValues fields={fields} reference={reference} /> : null}
        {currentHash ? <ActionButton type="button" disabled={locked} onClick={() => setReviewedHash(currentHash)}>Usar referência atual</ActionButton> : null}
      </div> : null}
      <fieldset className="hca-form" disabled={locked}>
        {"models" in reference && "modelId" in fields ? <>
          <p>A cópia será editável apenas neste paciente.</p>
          <FormField label="Produto modelo">
            <SelectField name="productId" value={fields.modelId} required onChange={event => {
              const updated = { modelId: event.target.value };
              setFields(updated);
              setReviewedHash(fieldHash(reference, updated));
            }}>
              <option value="">Selecione</option>
              {fields.modelId && !currentHash ? <option value={fields.modelId} disabled>Modelo indisponível</option> : null}
              {reference.models.map(model => <option key={model.id} value={model.id}>{model.name} · {model.unit}</option>)}
            </SelectField>
          </FormField>
        </> : "name" in fields ? <ProductFields fields={fields} onChange={setFields} /> : null}
      </fieldset>
      <div className="hca-toolbar">
        <ActionButton type="submit" variant="primary" disabled={locked || !currentHash || referenceChanged}>{purpose === "adopt" ? "Adotar modelo" : "Salvar item"}</ActionButton>
        <ActionButton type="button" disabled={locked || !reviewedHash || !dirty} onClick={() => start("save")}>Salvar preenchimento privado</ActionButton>
        {draft?.state === "active" ? <ActionButton type="button" variant="quiet" disabled={locked} onClick={() => setConfirmDiscard(true)}>Descartar preenchimento salvo</ActionButton> : null}
      </div>
    </form> : null}
  </RecordDrawer>;
}

function ProductFields({ fields, onChange }: { fields: CatalogueFields; onChange: (fields: CatalogueFields) => void }) {
  function input(key: "name" | "unit" | "aliases" | "description" | "sortOrder", maxLength: number, required = false) {
    return <FormField label={productLabels[key]}>
      <TextInput name={key} value={fields[key]} maxLength={maxLength} required={required}
        inputMode={key === "sortOrder" ? "numeric" : undefined}
        pattern={key === "sortOrder" ? "(?:[0-9]{1,6}|1000000)" : undefined}
        onChange={event => onChange({ ...fields, [key]: event.target.value })} />
    </FormField>;
  }
  return <>
    {input("name", 160, true)}
    <FormField label="Categoria">
      <SelectField name="category" value={fields.category}
        onChange={event => onChange({ ...fields, category: event.target.value as CatalogueFields["category"] })}>
        {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
    </FormField>
    {input("unit", 30, true)}
    {input("aliases", 4900)}
    {input("description", 2000)}
    {input("sortOrder", 24, true)}
    <CheckboxField name="isActive" label="Item ativo" checked={fields.isActive}
      onChange={event => onChange({ ...fields, isActive: event.target.checked })} />
    <p className="hca-field-hint">A unidade de itens com histórico é preservada. Para outra unidade, cadastre um novo item.</p>
  </>;
}
