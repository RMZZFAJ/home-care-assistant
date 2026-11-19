"use client";

import { useEffect, useId, useImperativeHandle, useState, type Ref } from "react";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { api, ApiError } from "@/lib/client/api";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import type { SelectionProduct } from "@/lib/requisitions/recurring-selection";
import { formatBrazilDate } from "@/lib/receipt";
import {
  householdListCommand, householdListConfirmed, readHouseholdLists,
  type HouseholdListCommand, type HouseholdListKind, type HouseholdListReceipt, type HouseholdMaterialList,
} from "@/lib/validation/household-material-lists";

type ListEdit = Pick<HouseholdListCommand, "id" | "expectedRevision" | "name" | "productIds">;
export type HouseholdListSelectionHandle = { apply: () => boolean };
const endpoint = "/api/catalog/material-lists";

export function HouseholdListSelection({
  ref, userId, patientId, kind, catalogue, selectedIds, disabled, onApply,
}: {
  ref: Ref<HouseholdListSelectionHandle>;
  userId: string;
  patientId: string;
  kind: HouseholdListKind;
  catalogue: readonly (Omit<SelectionProduct, "category"> & { selectable?: boolean })[];
  selectedIds: readonly string[];
  disabled: boolean;
  onApply: (productIds: string[]) => void;
}) {
  const bodyId = useId();
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<ListEdit | null>(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<HouseholdMaterialList[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [readError, setReadError] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState<HouseholdListCommand | null>(null);
  const [loadedIntent, setLoadedIntent] = useState(false);
  const [referenceError, setReferenceError] = useState(false);
  const [organizeTrigger, setOrganizeTrigger] = useState<HTMLButtonElement | null>(null);
  const command = useCommandIntent<HouseholdListCommand, HouseholdListReceipt>(householdListConfirmed);
  const storageKey = `hca:household-list:${userId}:${patientId}:${kind}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const parsed = householdListCommand.safeParse(JSON.parse(raw));
          if (!parsed.success || parsed.data.careRecipientId !== patientId || parsed.data.kind !== kind)
            throw new Error("Invalid list command reference");
          setPending(parsed.data);
        }
      } catch {
        setReferenceError(true);
      } finally {
        setLoadedIntent(true);
      }
    });
    return () => window.clearTimeout(timer);
  }, [storageKey, patientId, kind]);

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ careRecipientId: patientId, kind });
    api<{ data: unknown }>(endpoint + "?" + query, undefined, controller.signal)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const entries = readHouseholdLists(data, patientId);
        const available = new Set(entries.map(list => list.id));
        setRows(entries);
        setChecked(previous => previous.filter(id => available.has(id)));
      }).catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setReadError(cause instanceof Error ? cause.message : "Não foi possível consultar as listas da residência.");
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [expanded, attempt, patientId, kind]);

  const activeProducts = catalogue.filter(product => product.active !== false && product.is_active !== false);
  const eligibleIds = new Set(activeProducts.filter(product => product.selectable !== false).map(product => product.id));
  const selected = new Set(selectedIds);
  const fromLists = [...new Set(rows.filter(list => checked.includes(list.id)).flatMap(list => list.productIds))];
  const excludedCount = fromLists.filter(id => !selected.has(id) && !eligibleIds.has(id)).length;
  useImperativeHandle(ref, () => ({
    apply() {
      if (!expanded || !checked.length) return true;
      if (disabled || loading || readError) return false;
      const added = fromLists.filter(id => eligibleIds.has(id) && !selected.has(id));
      if (added.length) onApply(added);
      return true;
    },
  }));

  function refresh() {
    setLoading(true);
    setReadError("");
    setAttempt(previous => previous + 1);
  }

  function setMode(useLists: boolean) {
    if (useLists && !expanded) {
      setLoading(true);
      setReadError("");
    }
    setExpanded(useLists);
  }

  function preserve(packet: HouseholdListCommand | null) {
    setPending(packet);
    try {
      if (packet) sessionStorage.setItem(storageKey, JSON.stringify(packet));
      else sessionStorage.removeItem(storageKey);
    } catch { /* The open form retains the command in memory. */ }
  }

  async function save(packet: HouseholdListCommand, restoring: boolean) {
    setError("");
    preserve(packet);
    try {
      const result = restoring && command.uncertain ? await command.recover() : await command.send(endpoint, packet);
      preserve(null);
      setName("");
      setEditor(null);
      setFeedback(packet.id ? "Lista atualizada." : "Lista criada na residência.");
      if (!packet.id) setChecked(previous => [...new Set([...previous, result.data.list.id])]);
      refresh();
    } catch (cause) {
      // A refusal while checking a previous attempt does not prove absence.
      if (!restoring && cause instanceof ApiError && [400, 401, 403, 404, 409, 413, 422].includes(cause.status)) preserve(null);
      const reason = cause instanceof Error && cause.cause instanceof ApiError ? cause.cause : cause;
      if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) {
        setRows([]);
        setEditor(null);
        setReadError("O acesso às listas precisa ser conferido novamente.");
      }
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a alteração.");
    }
  }

  function submit(change: ListEdit) {
    const parsed = householdListCommand.safeParse({
      ...change, careRecipientId: patientId, kind, idempotencyKey: crypto.randomUUID(),
    });
    if (parsed.success) void save(parsed.data, false);
    else setError("Informe um nome de 2 a 80 caracteres e escolha ao menos um material.");
  }

  function createList() {
    const ownMaterials = selectedIds.filter(id => activeProducts.some(product => product.id === id));
    const candidate = { id: null, expectedRevision: null, name, productIds: ownMaterials };
    if (ownMaterials.length) submit(candidate);
    else {
      setError("");
      setQuery("");
      setEditor(candidate);
    }
  }

  const actionsBlocked = disabled || loading || Boolean(readError) || !loadedIntent;
  const saveDisabled = actionsBlocked || Boolean(pending) || referenceError;
  const editingList = rows.find(list => list.id === editor?.id);
  const dirty = editor
    ? (editor.name !== (editingList?.name ?? name) ||
      editor.productIds.length !== (editingList?.productIds.length ?? 0) ||
      editor.productIds.some(id => !editingList?.productIds.includes(id)))
    : Boolean(name.trim());
  const hiddenEditorIds = editor?.productIds.filter(id => !activeProducts.some(product => product.id === id)) ?? [];
  const activeMatches = activeProducts.filter(product => product.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  return <section className="hca-household-lists" aria-label="Seleção de materiais">
    <h3>Como deseja selecionar os materiais?</h3>
    <div className="hca-household-method">
      <button type="button" aria-pressed={!expanded} onClick={() => setMode(false)} className="hca-household-method-choice">
        <span className="hca-household-method-dot" aria-hidden="true" />
        <span><strong>Selecionar manualmente</strong><small>Escolha os materiais por tipo.</small></span>
        <Icon name="note" width={17} height={17} />
      </button>
    </div>
    <div className="hca-household-method">
      <button type="button" aria-pressed={expanded} aria-expanded={expanded} aria-controls={bodyId}
        onClick={() => setMode(!expanded)} className="hca-household-method-choice">
        <span className="hca-household-method-dot" aria-hidden="true" />
        <span><strong>Usar listas frequentes</strong><small>Escolha as listas da residência.</small></span>
        <Icon name="down" width={17} height={17} />
      </button>
      <div id={bodyId} hidden={!expanded} className="hca-household-list-body">
        {loading ? <p role="status">Consultando listas da casa…</p> : null}
        {readError ? <Notice error>{readError}<ActionButton onClick={refresh}>Consultar listas novamente</ActionButton></Notice> : null}
        {!loading && !readError && !rows.length ? <p>A casa ainda não tem listas frequentes.</p> : null}
        {!loading && !readError ? rows.map(list => <label key={list.id} className="hca-household-list-option" htmlFor={`${bodyId}-list-${list.id}`}>
          <input id={`${bodyId}-list-${list.id}`} type="checkbox" checked={checked.includes(list.id)} disabled={disabled}
            onChange={event => {
              const included = event.currentTarget.checked;
              setChecked(previous => included ? [...previous, list.id] : previous.filter(id => id !== list.id));
            }} />
          <span><strong>{list.name}</strong><small>{list.productIds.length} {list.productIds.length === 1 ? "material" : "materiais"}</small></span>
        </label>) : null}
        {excludedCount && !loading && !readError ? <Notice>{excludedCount === 1 ? "Um material indisponível ficará fora do preenchimento." : `${excludedCount} materiais indisponíveis ficarão fora do preenchimento.`}</Notice> : null}
        <ActionButton compact variant="quiet" disabled={actionsBlocked} onClick={event => {
          setOrganizeTrigger(event.currentTarget);
          setError("");
          setOpen(true);
        }}>
          <Icon name="settings" width={16} height={16} />Organizar listas da casa
        </ActionButton>
        {pending && !open ? <p role="status">Há um salvamento de lista para recuperar.</p> : null}
      </div>
    </div>
    {open ? <RecordDrawer key={editor ? "edit" : "organize"} modal exitDialog
      title={editor ? editor.id ? "Editar lista" : "Materiais da nova lista" : "Organizar listas"}
      kicker="Listas frequentes da casa"
      subtitle="As listas são compartilhadas por quem tem acesso ao paciente."
      popupClassName="hca-household-list-dialog" busy={command.busy}
      restoreFocusTo={editor ? null : organizeTrigger}
      hasUnsavedChanges={dirty} uncertainOutcome={Boolean(pending)}
      onClose={() => {
        setError("");
        if (editor) setEditor(null);
        else { setName(""); setOpen(false); }
      }}
      footer={close => <>
        <ActionButton disabled={command.busy} onClick={close}>{editor ? "Voltar" : "Fechar"}</ActionButton>
        {pending ? <ActionButton variant="primary" disabled={loading || Boolean(readError) || command.busy}
          onClick={() => void save(pending, true)}>Recuperar salvamento</ActionButton>
          : <ActionButton variant="primary" disabled={saveDisabled || command.busy}
            onClick={() => editor ? submit(editor) : createList()}>
            <Icon name={editor ? "check" : "plus"} width={16} height={16} />
            {editor?.id ? "Salvar alterações" : "Criar lista"}
          </ActionButton>}
      </>}
    >
      <div className="hca-form-stack">
        {referenceError ? <Notice error>Não foi possível conferir a referência local do salvamento.</Notice> : null}
        {error ? <Notice error>{error}</Notice> : null}
        {feedback ? <p role="status">{feedback}</p> : null}
        {readError ? <Notice error>{readError}<ActionButton onClick={refresh}>Consultar listas novamente</ActionButton></Notice> : null}
        {loading ? <p role="status">Consultando listas da casa…</p> : null}
        {pending && !readError ? <Notice>Confira o resultado da tentativa anterior antes de salvar outra lista.</Notice> : null}
        {editor && !readError ? <>
          <FormField label="Nome da lista" required>
            <TextInput value={editor.name} maxLength={80} disabled={saveDisabled}
              onChange={event => {
                const name = event.currentTarget.value;
                setEditor(current => current && { ...current, name });
              }} />
          </FormField>
          <FormField label="Buscar material">
            <TextInput value={query} onChange={event => setQuery(event.currentTarget.value)} />
          </FormField>
          <div aria-label="Materiais da lista" role="group" className="hca-household-list-edit">
            {activeMatches.map(product => ({ id: product.id, text: product.name, unit: product.unit }))
              .concat(hiddenEditorIds.map(id => ({ id, text: catalogue.find(product => product.id === id)?.name ?? id, unit: "Indisponível" })))
              .map(product => <label className="hca-household-list-option" key={product.id} htmlFor={`${bodyId}-material-${product.id}`}>
                <input id={`${bodyId}-material-${product.id}`} type="checkbox" checked={editor.productIds.includes(product.id)} disabled={saveDisabled}
                  onChange={event => {
                    const included = event.currentTarget.checked;
                    setEditor(current => current && { ...current, productIds: included
                      ? [...current.productIds, product.id] : current.productIds.filter(id => id !== product.id) });
                  }} />
                <span><strong>{product.text}</strong><small>{product.unit}</small></span>
              </label>)}
          </div>
        </> : null}
        {!editor && !readError ? <>
          <ul className="hca-household-management">{rows.map(list => <li key={list.id}>
            <span className="hca-household-symbol"><Icon name="note" width={17} height={17} /></span>
            <span><strong>{list.name}</strong><small>{list.productIds.length} {list.productIds.length === 1 ? "material" : "materiais"} · {list.updatedBy} · {formatBrazilDate(list.updatedAt)}</small></span>
            <ActionButton compact variant="quiet" aria-label={"Editar " + list.name} disabled={saveDisabled}
              onClick={() => {
                setError("");
                setFeedback("");
                setQuery("");
                setEditor({ id: list.id, expectedRevision: list.revision, name: list.name, productIds: list.productIds });
              }}>
              <Icon name="edit" width={16} height={16} />Editar
            </ActionButton>
          </li>)}</ul>
          <FormField label="Nome da nova lista" required>
            <TextInput value={name} onChange={event => setName(event.currentTarget.value)} maxLength={80}
              placeholder="Ex.: materiais do banho" disabled={saveDisabled} />
          </FormField>
          <p className="hca-field-help"><Icon name="info" width={14} height={14} /> Uma lista guarda apenas os materiais, sem reaproveitar saldos ou justificativas.</p>
        </> : null}
      </div>
    </RecordDrawer> : null}
  </section>;
}
