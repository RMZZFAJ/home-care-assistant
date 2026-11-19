"use client";
import { MaterialVisitReturn } from "./material-visit-return";

import { useCallback, useId, useRef, useState, type RefObject } from "react";
import { Menu } from "@base-ui/react/menu";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { ActionButton, FormField, LoadingIndicator, SelectField, TextInput } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { Dialog } from "@/components/ui/overlays";
import { SearchSelect } from "@/components/ui/search-select";
import { Notice } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
import { can } from "@/lib/client/capabilities";
import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseCatalogueCollectionRead } from "@/lib/validation/catalogue-list";
import { unlinkedArrivalDetails, unlinkedArrivalIntent, unlinkedArrivalPage, unlinkedArrivalReceipt, unlinkedOrigin,
  unlinkedOriginLabel, unlinkedOrigins, type UnlinkedArrival, type UnlinkedArrivalDetails,
  type UnlinkedArrivalIntent } from "@/lib/validation/unlinked-arrival";
import type { PresentationsRead } from "@/types/catalogue";
import type { WorkspaceContext } from "@/types/workspace";
import { PurchaseCoverageFields, type ArrivalPlanningChoices } from "./purchase-coverage-fields";
import { PurchaseArrivalLinks } from "./purchase-arrival-links";

const endpoint = "/api/purchases/arrivals/unlinked";
const statusLabel = { pending: "Aguardando aprovação", approved: "Entrada aprovada",
  correction_requested: "Correção solicitada", rejected: "Chegada recusada" } as const;
const statusTone = { pending: "hca-arrival-attention", approved: "hca-arrival-confirmed",
  correction_requested: "hca-arrival-attention", rejected: "hca-arrival-rejected" } as const;
const originDescription = { external_purchase: "Compra externa recebida na residência", gift: "Presente recebido na residência",
  donation: "Doação recebida na residência" } as const;
const steps = [{ label: "Registrando a chegada", icon: "truck" }, { label: "Conferindo o resultado", icon: "check" }] as const;
type Origin = typeof unlinkedOrigins[number];
type CatalogItem = { id: string; name: string; unit: string; quantity_decimals: number; aliases: string[] };
type Row = Pick<CatalogItem, "id" | "name" | "unit" | "quantity_decimals"> & { amount: string; planning?: ArrivalPlanningChoices };

function ArrivalStatus({ state }: { state: UnlinkedArrival["state"] }) {
  const icon = state === "approved" ? "check" : state === "rejected" ? "close" : "clock";
  return <span className={`hca-purchase-status ${statusTone[state]}`}><Icon name={icon} width={14} height={14} />{statusLabel[state]}</span>;
}

function ableToRead(context: WorkspaceContext) {
  return (context.patient?.role === "family" || context.patient?.role === "admin") && can(context, "com.read");
}

function pendingAttempt(storage: string) {
  try { return sessionStorage.getItem(storage); } catch { return null; }
}

export function UnlinkedArrivalAction({ context }: { context: WorkspaceContext }) {
  if (!context.patient || !ableToRead(context)) return null;
  return <ArrivalAction key={`${context.userId}:${context.patient.id}`} context={context} />;
}

function ArrivalAction({ context }: { context: WorkspaceContext }) {
  const storage = `hca:unlinked-arrival:${context.userId}:${context.patient!.id}`;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(() => pendingAttempt(storage));
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (!pending && !can(context, "com.receive")) return null;
  return <>
    <ActionButton ref={triggerRef} onClick={() => setOpen(true)}><Icon name="truck" />{pending ? "Conferir resultado da chegada" : "Registrar chegada"}</ActionButton>
    {open ? <ArrivalEditor context={context} onClose={() => { setPending(pendingAttempt(storage)); setOpen(false); }} returnFocus={triggerRef} /> : null}
  </>;
}

function ArrivalEditor({ context, correction, onClose, returnFocus }: {
  context: WorkspaceContext; correction?: UnlinkedArrivalDetails; onClose: () => void;
  returnFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const patient = context.patient!;
  const storage = `hca:unlinked-arrival:${context.userId}:${patient.id}`;
  const [key, setKey] = useState(() => pendingAttempt(storage));
  const [origin, setOrigin] = useState<Origin | "">(correction?.origin ?? "");
  const [lines, setLines] = useState<Row[]>(() => correction?.materials.map(item => ({
    id: item.productId, name: item.name, unit: item.unit, quantity_decimals: item.decimals, amount: item.quantity,
    planning: { association: item.association, coverage: item.coverage },
  })) ?? []);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<UnlinkedArrival | null>(null);
  const [dirty, setDirty] = useState(false);
  const [exit, setExit] = useState(false);
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const sendingRef = useRef(false);
  const [scanner, setScanner] = useState(false);
  const scanRevisionRef = useRef(0);
  const [scanned, setScanned] = useState<{ item: CatalogItem; name: string; factor: string } | null>(null);
  const [packages, setPackages] = useState("1");
  const [scanError, setScanError] = useState("");
  const formId = useId();
  const decodeCatalog = useCallback((raw: unknown) => parseCatalogueCollectionRead(raw, patient.id, false), [patient.id]);
  const catalog = useScopedRead(correction || key || result ? null : "/api/catalog?" +
    new URLSearchParams({ careRecipientId: patient.id }), "", decodeCatalog);
  const normalizedFilter = filter.trim().toLocaleLowerCase("pt-BR");
  const choices = (catalog.data?.data ?? []).filter(item => !lines.some(line => line.id === item.id) &&
    [item.name, ...item.aliases].some(value => value.toLocaleLowerCase("pt-BR").includes(normalizedFilter)));
  const direct = patient.role === "admin" && can(context, "com.validate");
  useOperationActivity(busy, { title: "Registrando chegada", steps, stage });

  function add(item: CatalogItem, amount = "") {
    setLines(previous => previous.length >= 100 || previous.some(row => row.id === item.id) ? previous : [...previous, { ...item, amount }]);
    setDirty(true);
    setFilter("");
  }
  function updateAmount(id: string, amount: string) {
    setLines(previous => previous.map(line => line.id === id ? { ...line, amount } : line));
    setDirty(true);
  }
  function closeScanner() { scanRevisionRef.current++; setScanner(false); }
  async function readCode(code: string) {
    const revision = ++scanRevisionRef.current;
    setScanned(null); setScanError("");
    const response = await api<PresentationsRead>("/api/catalog/presentations?" + new URLSearchParams({ careRecipientId: patient.id, barcode: code }));
    if (scanRevisionRef.current !== revision) return;
    const presentation = response.data.find(item => item.active);
    const item = catalog.data?.data.find(row => row.id === presentation?.product_id);
    if (!item || !presentation || !quantity(presentation.base_quantity).gt(0)) {
      setScanError("O código não corresponde a material ativo deste paciente. Você pode escolher o material manualmente.");
      return;
    }
    setPackages("1");
    setScanned({ item, name: presentation.name, factor: quantity(presentation.base_quantity).toFixed() });
  }
  function addScan() {
    if (!scanned || !/^[1-9][0-9]{0,8}$/.test(packages)) return;
    const row = lines.find(item => item.id === scanned.item.id);
    const before = row?.amount || "0";
    if (!validQuantity(before, scanned.item.quantity_decimals, true)) {
      setScanError("Confira a quantidade digitada antes de acrescentar embalagens."); return;
    }
    const after = quantity(before).plus(quantity(scanned.factor).mul(packages)).toFixed();
    if (!validQuantity(after, scanned.item.quantity_decimals)) {
      setScanError("A quantidade convertida excede o limite ou a precisão do material."); return;
    }
    if (row) updateAmount(row.id, after); else add(scanned.item, after);
    closeScanner();
  }
  function requestClose() {
    if (sendingRef.current) return;
    if (dirty && !key && !result) setExit(true); else onClose();
  }
  function forget() {
    setKey(null);
    try { sessionStorage.removeItem(storage); } catch { /* The current view still holds the confirmed result. */ }
  }
  function validIntent(): UnlinkedArrivalIntent | null {
    if (!lines.length || lines.some(line => !validQuantity(line.amount, line.quantity_decimals))) return null;
    const materials = lines.map(line => ({ productId: line.id, quantity: quantity(line.amount).toFixed(), ...line.planning }));
    if (materials.some(line => line.coverage && (!validQuantity(line.coverage.quantity, 6) ||
      quantity(line.coverage.quantity).gt(line.quantity)))) return null;
    const parsed = unlinkedArrivalIntent.safeParse(correction
      ? { arrivalId: correction.id, version: correction.version, lines: materials } : { origin, lines: materials });
    return parsed.success ? parsed.data : null;
  }
  async function submit(recover = false) {
    if (sendingRef.current || (recover ? !key : Boolean(key))) return;
    const intent = recover ? null : validIntent();
    if (!recover && !intent) { setError("Confira a origem, as quantidades recebidas e os planejamentos escolhidos."); return; }
    sendingRef.current = true; setBusy(true); setStage(recover ? 1 : 0); setError("");
    const attempt = key ?? crypto.randomUUID();
    setKey(attempt);
    try { sessionStorage.setItem(storage, attempt); } catch { /* The same key stays in the open operation. */ }
    async function command(body: UnlinkedArrivalIntent | null) {
      const response = await api<{ data: unknown }>(endpoint, { careRecipientId: patient.id, key: attempt, intent: body });
      const receipt = unlinkedArrivalReceipt.parse(response.data);
      if (receipt.key !== attempt || receipt.state === "recorded" && body &&
        ("arrivalId" in body ? receipt.result.id !== body.arrivalId : receipt.result.origin !== body.origin)) {
        throw new Error("A resposta não confirmou esta chegada.");
      }
      return receipt;
    }
    try {
      let receipt, rejection = "";
      try { receipt = await command(intent); }
      catch (cause) {
        if (recover) throw cause;
        if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500) rejection = cause.message;
        setStage(1);
        receipt = await command(null);
      }
      forget();
      if (receipt.state === "recorded") {
        setResult(receipt.result);
        window.dispatchEvent(new Event("hca:data-changed"));
      } else {
        setError([rejection, "A conferência confirmou que nada foi registrado nesta tentativa. Confira os campos antes de tentar novamente."].filter(Boolean).join(" "));
      }
    } catch {
      setError("O resultado ainda não pôde ser confirmado. Confira a mesma tentativa antes de repetir. Se o problema persistir, procure a supervisão.");
    } finally { sendingRef.current = false; setBusy(false); }
  }

  if (result) {
    const approved = result.state === "approved";
    return <Dialog open success title={approved ? "Entrada confirmada" : "Chegada enviada para aprovação"}
      subtitle={approved ? "As quantidades recebidas já estão disponíveis no estoque familiar." : "As quantidades ficam disponíveis após a aprovação."}
      onClose={onClose} finalFocus={returnFocus} footer={<ActionButton variant="primary" onClick={onClose}>Concluir</ActionButton>}>
      <p><strong>{result.code}</strong> · {unlinkedOriginLabel[result.origin]}</p>
    </Dialog>;
  }
  return <>
    <Dialog open title={correction ? "Corrigir chegada" : "Registrar chegada"} kicker={`Chegadas · ${patient.display_name}`}
      subtitle={correction ? `${correction.code} · Confira as quantidades e reenvie a chegada.` : "Informe os materiais recebidos na residência."}
      onClose={requestClose} closeDisabled={busy} finalFocus={returnFocus} footer={<>
        <ActionButton disabled={busy} onClick={requestClose}>Voltar</ActionButton>
        {key ? <ActionButton variant="primary" disabled={busy} onClick={() => void submit(true)}>Conferir mesma tentativa</ActionButton>
          : <ActionButton variant="primary" type="submit" form={formId} disabled={busy || !can(context, "com.receive")}>
            {direct ? "Confirmar entrada" : correction ? "Reenviar para aprovação" : "Enviar para aprovação"}
          </ActionButton>}
      </>}>
      <form id={formId} className="hca-purchase-list" onSubmit={event => { event.preventDefault(); void submit(); }}>
        {error ? <Notice error>{error}</Notice> : null}
        {key ? <p>Consulte o resultado desta tentativa antes de registrar outra chegada.</p> : <>
          {direct ? <p className="hca-purchase-administrator"><Icon name="shield" />Aprovação automática · administrador</p> : null}
          {correction ? <p className="hca-purchase-limit">{correction.reason}</p> : <>
            <FormField label="Origem"><SelectField value={origin} required onChange={event => {
              const parsed = unlinkedOrigin.safeParse(event.currentTarget.value);
              setOrigin(parsed.success ? parsed.data : ""); setDirty(true);
            }}>
              <option value="">Selecione a origem</option>
              {unlinkedOrigins.map(value => <option key={value} value={value}>{unlinkedOriginLabel[value]}</option>)}
            </SelectField></FormField>
            <div className="hca-purchase-line-heading">
              <strong>Materiais recebidos</strong>
              <ActionButton variant="quiet" compact disabled={catalog.loading || !catalog.data || Boolean(catalog.error) || lines.length >= 100}
                onClick={() => { setScanned(null); setScanError(""); setScanner(true); }}><Icon name="camera" />Ler código</ActionButton>
            </div>
            {catalog.loading ? <LoadingIndicator label="Consultando materiais" /> : null}
            {catalog.error ? <><Notice error>{catalog.error}</Notice><ActionButton onClick={catalog.refresh}>Consultar materiais novamente</ActionButton></> : null}
            {catalog.data && !catalog.error ? <FormField label="Adicionar material">
              <SearchSelect options={choices.map(item => ({ value: item.id, label: item.name }))}
                selectedIds={[]} query={filter} onQueryChange={setFilter} disabled={lines.length >= 100}
                onSelectionChange={([id]) => { const item = choices.find(row => row.id === id); if (item) add(item); }} />
            </FormField> : null}
          </>}
          {lines.map(row => <article className="hca-purchase-line" key={row.id}>
            <div className="hca-purchase-line-heading"><h3>{row.name}</h3>
              {!correction ? <ActionButton variant="quiet" compact onClick={() => setLines(previous => previous.filter(item => item.id !== row.id))}
                aria-label={`Remover ${row.name}`}><Icon name="close" /></ActionButton> : null}
            </div>
            <FormField label={`Quantidade recebida · ${row.name} (${row.unit})`}>
              <TextInput required inputMode={row.quantity_decimals ? "decimal" : "numeric"} value={row.amount}
                onChange={event => updateAmount(row.id, event.currentTarget.value)} />
            </FormField>
            <PurchaseCoverageFields patientId={patient.id} productId={row.id} material={row.name} unit={row.unit}
              received={row.amount} value={row.planning ?? {}} onChange={planning => {
                setLines(previous => previous.map(item => item.id === row.id ? { ...item, planning } : item));
                setDirty(true);
              }} />
          </article>)}
          <p className="hca-purchase-limit">{direct ? "Ao confirmar, as quantidades entram no estoque familiar." : "As quantidades entram no estoque familiar após aprovação."}</p>
        </>}
      </form>
    </Dialog>
    <Dialog open={scanner} title="Ler código do material" onClose={closeScanner}
      footer={<><ActionButton onClick={closeScanner}>Voltar ao preenchimento</ActionButton>
        {scanned ? <ActionButton variant="primary" disabled={!/^[1-9][0-9]{0,8}$/.test(packages)} onClick={addScan}>Acrescentar quantidade</ActionButton> : null}</>}>
      {scanner ? <BarcodeScanner onRead={readCode} /> : null}
      {scanError ? <Notice error>{scanError}</Notice> : null}
      {scanned ? <><p>{scanned.name} · {formatQuantity(scanned.factor, scanned.item.unit)} por embalagem</p>
        <FormField label="Embalagens recebidas"><TextInput inputMode="numeric" value={packages} onChange={event => setPackages(event.currentTarget.value)} /></FormField></> : null}
    </Dialog>
    <Dialog open={exit} title="Sair sem concluir?" subtitle="Se sair agora, o preenchimento será descartado."
      onClose={() => setExit(false)} footer={<><ActionButton variant="primary" onClick={() => setExit(false)}>Voltar ao preenchimento</ActionButton>
        <ActionButton onClick={onClose}>Sair e descartar</ActionButton></>}>{null}</Dialog>
  </>;
}

function scopedArrivalData(value: unknown, patientId: string) {
  const read = value as { careRecipientId?: unknown; data?: unknown } | null;
  if (read?.careRecipientId !== patientId) throw new Error("A resposta não corresponde às chegadas deste paciente.");
  return read.data;
}
type Cursor = { at: string; id: string };

export function UnlinkedArrivalHistory({ context, revision, arrivalId }: { context: WorkspaceContext; revision: string; arrivalId?: string | null }) {
  if (!context.patient || !ableToRead(context)) return null;
  return <ArrivalHistory key={`${context.userId}:${context.patient.id}:${context.patient.role}:${can(context, "com.validate")}:${arrivalId ?? ""}`}
    context={context} revision={revision} arrivalId={arrivalId} />;
}

function ArrivalHistory({ context, revision, arrivalId }: { context: WorkspaceContext; revision: string; arrivalId?: string | null }) {
  const patient = context.patient!;
  const [pages, setPages] = useState<Cursor[]>([]);
  const [selected, setSelected] = useState<{ id: string; code?: string } | null>(arrivalId ? { id: arrivalId } : null);
  const [correction, setCorrection] = useState<UnlinkedArrivalDetails | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const headingId = useId();
  const cursor = pages.at(-1);
  const query = new URLSearchParams({ careRecipientId: patient.id });
  if (cursor) { query.set("beforeAt", cursor.at); query.set("beforeId", cursor.id); }
  const selectedId = selected?.id;
  const decodePage = useCallback((value: unknown) => unlinkedArrivalPage.parse(scopedArrivalData(value, patient.id)), [patient.id]);
  const decodeDetail = useCallback((value: unknown) => {
    const data = unlinkedArrivalDetails.parse(scopedArrivalData(value, patient.id));
    if (data.id !== selectedId) throw new Error("A resposta não corresponde à chegada selecionada.");
    return data;
  }, [patient.id, selectedId]);
  const history = useScopedRead(endpoint + "?" + query, revision, decodePage);
  const detail = useScopedRead(selected ? endpoint + "?" + new URLSearchParams({ careRecipientId: patient.id, id: selected.id }) : null,
    revision, decodeDetail);
  const selectedCode = detail.data?.code ?? selected?.code;
  const associated = detail.data?.materials.some(item => item.association);

  return <section className="ui-card space-y-3" aria-labelledby={headingId} aria-busy={history.loading}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={headingId}>Chegadas</h2>
      <ActionButton compact disabled={history.loading} onClick={history.refresh}><Icon name="refresh" />Atualizar chegadas</ActionButton>
    </div>
    {history.loading ? <LoadingIndicator label="Consultando chegadas" /> : null}
    {history.error ? <><Notice error>{history.error}</Notice><ActionButton onClick={history.refresh}>Consultar chegadas novamente</ActionButton></> : null}
    {!history.loading && !history.error && !history.data?.arrivals.length ? <p>Nenhuma chegada avulsa neste período.</p> : null}
    <ul className="hca-purchase-list">
      {history.data?.arrivals.map(row => <li className="hca-purchase-line" key={row.id}>
        <div className="hca-purchase-line-heading"><h3>{row.code} · {unlinkedOriginLabel[row.origin]}</h3><ArrivalStatus state={row.state} /></div>
        <p>{row.author} · Chegada avulsa · {formatBrazilDate(row.createdAt)}</p>
        <ActionButton compact className="justify-self-start" aria-label={`Consultar chegada ${row.code}`} onClick={event => { openerRef.current = event.currentTarget; setSelected(row); }}>
          <Icon name="arrow" />Consultar chegada
        </ActionButton>
      </li>)}
    </ul>
    {pages.length || history.data?.next ? <div className="flex flex-wrap gap-2">
      {pages.length ? <ActionButton disabled={history.loading} onClick={() => setPages(previous => previous.slice(0, -1))}>Chegadas mais recentes</ActionButton> : null}
      {history.data?.next ? <ActionButton disabled={history.loading} onClick={() => {
        const next = history.data?.next; if (next) setPages(previous => [...previous, next]);
      }}>Chegadas anteriores</ActionButton> : null}
    </div> : null}
    <Dialog open={Boolean(selected) && !correction} title="Detalhes da chegada" kicker="Chegada de materiais"
      subtitle={selectedCode && detail.data ? `${selectedCode} · ${associated ? "chegada associada a uma compra." : "chegada avulsa, sem COM vinculada."}` : selectedCode}
      onClose={() => setSelected(null)} finalFocus={openerRef} footer={<>
        <ActionButton variant={detail.data?.canCorrect ? undefined : "primary"} onClick={() => setSelected(null)}>Fechar consulta</ActionButton>
        {detail.data?.canCorrect && !detail.loading && !detail.error ? <ActionButton variant="primary" onClick={() => setCorrection(detail.data)}>Corrigir chegada</ActionButton> : null}
      </>}>
      {detail.loading ? <LoadingIndicator label="Consultando a chegada" /> : null}
      {detail.error ? <><Notice error>{detail.error}</Notice><ActionButton onClick={detail.refresh}>Consultar novamente</ActionButton></> : null}
      {detail.data ? <>
        <MaterialVisitReturn targetId={detail.data.id} patientId={patient.id} />
        <UnlinkedArrivalFacts arrival={detail.data} />
      </> : null}
    </Dialog>
    {correction ? <ArrivalEditor context={context} correction={correction} onClose={() => {
      setCorrection(null); detail.refresh();
    }} /> : null}
  </section>;
}

export function UnlinkedArrivalFacts({ arrival }: { arrival: UnlinkedArrivalDetails }) {
  return <div className="hca-purchase-list">
    <p className="hca-arrival-summary"><Icon name={arrival.state === "approved" ? "check" : arrival.state === "rejected" ? "close" : "clock"} />{statusLabel[arrival.state]}</p>
    <dl className="hca-arrival-facts">
      <div><dt>Origem</dt><dd>{originDescription[arrival.origin]}</dd></div>
      <div><dt>Registrado por</dt><dd>{arrival.author}</dd></div>
      <div><dt>Recebido em</dt><dd>{formatBrazilDate(arrival.createdAt)}</dd></div>
    </dl>
    {arrival.reason ? <p className="hca-purchase-limit">{arrival.reason}</p> : null}
    <ul className="hca-purchase-list">{arrival.materials.map(item =>
      <ArrivalMaterial key={item.lineId} item={item} pending={arrival.state === "pending"} code={arrival.code} />)}</ul>
    {arrival.history.length > 1 ? <details className="hca-arrival-stock">
      <summary><Icon name="history" />Histórico da chegada</summary>
      <ol className="hca-purchase-list">{arrival.history.map(event => <li className="hca-purchase-line" key={event.version}>
        <strong>{statusLabel[event.state]}</strong><p>{event.author} · {formatBrazilDate(event.at)}</p>
        {event.reason ? <p>{event.reason}</p> : null}
        <p>{event.materials.map(item => `${item.name} · ${formatQuantity(item.quantity, item.unit)}`).join(" / ")}</p>
      </li>)}</ol>
    </details> : null}
  </div>;
}

function ArrivalMaterial({ item, pending, code }: { item: UnlinkedArrivalDetails["materials"][number]; pending: boolean; code: string }) {
  const [open, setOpen] = useState(false);
  const optionsRef = useRef<HTMLButtonElement>(null);
  const amount = formatQuantity(item.quantity, item.unit);
  return <li className="hca-purchase-line hca-arrival-material">
    <div className="hca-purchase-line-heading">
      <div><h3>{item.name}</h3><p>Recebidas: {amount}</p></div>
      <Menu.Root modal={false}>
        <Menu.Trigger ref={optionsRef} aria-label={`Opções de ${item.name}`}
          render={<ActionButton variant="quiet" compact className="hca-purchase-options" />}><Icon name="more" /></Menu.Trigger>
        <MenuPopup><Menu.Item className="hca-menu-item" onClick={() => setOpen(true)}><Icon name="eye" />Detalhes do material</Menu.Item></MenuPopup>
      </Menu.Root>
    </div>
    <PurchaseArrivalLinks unit={item.unit} linkedPurchase={item.linkedPurchase} priorPlanning={item.priorPlanning} />
    {item.familyStock === null ? null : <details className="hca-arrival-stock">
      <summary><Icon name="stock" />Estoque familiar<Icon name="down" /></summary>
      <p>Disponíveis hoje: {formatQuantity(item.familyStock, item.unit)}</p>
      {pending ? <p>Após aprovação: {formatQuantity(quantity(item.familyStock).plus(item.quantity).toFixed(), item.unit)}</p> : null}
    </details>}
    <Dialog open={open} title="Detalhes do material" kicker={code} subtitle={item.name} onClose={() => setOpen(false)}
      finalFocus={optionsRef} footer={<ActionButton variant="primary" onClick={() => setOpen(false)}>Fechar consulta</ActionButton>}>
      <dl className="hca-arrival-facts">
        <div><dt>Recebidas</dt><dd>{amount}</dd></div>
        {item.familyStock === null ? null : <div><dt>Estoque familiar hoje</dt><dd>{formatQuantity(item.familyStock, item.unit)}</dd></div>}
      </dl>
    </Dialog>
  </li>;
}
