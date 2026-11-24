"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode, type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, CheckboxField, DefinitionGrid, FormField, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { SearchSelect } from "@/components/ui/search-select";
import { Notice } from "@/components/workspace";
import { contingencyContent, contingencyProcesses, emptyContingency, type ContingencyContent } from "@/lib/validation/contingency";
import { ContingencyFacts } from "./contingency-facts";

type Process = keyof typeof contingencyProcesses;
type ContingencyProduct = { id: string; name: string; unit: string; quantity_decimals: number; is_active: boolean };
type Material = ContingencyContent["materials"][number];
type Communication = ContingencyContent["communications"][number];
type MaterialRow = { key: string; name: string; value: Material };
type CommunicationRow = { key: string; value: Communication };

const channels = { paper: "Registro físico", phone: "Telefone", internal: "Aplicativo", other: "Outro canal" };
const communicationStates = { pending: "Pendente", attempted: "Tentativa declarada", reported_sent: "Envio declarado", reported_read: "Leitura declarada" };
const custodyOptions = { FAMILY: "Família", CARE_TEAM: "Equipe", TRANSIT: "Em trânsito" };

export function ContingencyForm({
  opener, headingRef, patientName, actorName, process, processes, supplement, catalogue, busy, pending, onRecover, onClose, onConfirm,
}: {
  opener: HTMLElement;
  headingRef: RefObject<HTMLHeadingElement | null>;
  patientName: string;
  actorName: string;
  process: Process;
  processes: Process[];
  supplement: boolean;
  catalogue: { data: ContingencyProduct[] | null; loading: boolean; error: string; refresh: () => void };
  busy: boolean;
  pending: boolean;
  onRecover: () => void;
  onClose: () => void;
  onConfirm: (content: ContingencyContent, process: Process) => Promise<void>;
}) {
  const [fields, setFields] = useState(emptyContingency);
  const [selectedProcess, setSelectedProcess] = useState(process);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [communications, setCommunications] = useState<CommunicationRow[]>([]);
  const [review, setReview] = useState<ContingencyContent | null>(null);
  const [validation, setValidation] = useState("");
  const [picker, setPicker] = useState(false);
  const [compare, setCompare] = useState(false);
  const formId = useId();
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const locked = busy || pending;
  const catalogueReady = !catalogue.loading && !catalogue.error && catalogue.data !== null;
  const changed = catalogueReady ? materials.flatMap(row => {
    if (!row.value.productId) return [];
    const product = catalogue.data?.find(item => item.id === row.value.productId);
    return product?.unit !== row.value.reviewedUnit || product?.quantity_decimals !== row.value.reviewedDecimals ? [{ row, product }] : [];
  }) : [];
  const hasCatalogueMaterials = materials.some(row => row.value.productId !== null);
  const summary = [{ label: "Paciente", value: patientName }, { label: "Quem declara", value: actorName }];

  useEffect(() => {
    if (!review) return;
    const heading = reviewHeadingRef.current;
    heading?.closest(".hca-modal-content")?.scrollTo(0, 0);
    heading?.focus({ preventScroll: true });
  }, [review]);

  function patch<K extends keyof ContingencyContent>(key: K, value: ContingencyContent[K]) {
    setFields(previous => ({ ...previous, [key]: value }));
  }

  function addMaterial(product?: ContingencyProduct) {
    setMaterials(previous => [...previous, {
      key: crypto.randomUUID(),
      name: product?.name ?? "Material não identificado",
      value: {
        productId: product?.id ?? null, description: null, quantity: product ? "" : null,
        custody: null, reviewedUnit: product?.unit ?? null, reviewedDecimals: product?.quantity_decimals ?? null,
      },
    }]);
    setPicker(false);
  }

  function updateMaterial(key: string, patch: Partial<Material>) {
    setMaterials(previous => previous.map(row => row.key === key ? { ...row, value: { ...row.value, ...patch } } : row));
  }

  function updateCommunication(key: string, patch: Partial<Communication>) {
    setCommunications(previous => previous.map(row => row.key === key ? { ...row, value: { ...row.value, ...patch } } : row));
  }

  function adoptCatalogueUnits() {
    setMaterials(previous => previous.map(row => {
      const product = changed.find(item => item.row.key === row.key)?.product;
      if (!product) return row;
      return { ...row, name: product.name, value: {
        ...row.value, reviewedUnit: product.unit, reviewedDecimals: product.quantity_decimals,
        quantity: row.value.quantity === null ? null : "",
      } };
    }));
    setReview(null);
    setCompare(false);
  }

  function reviewDeclaration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    if (changed.length) {
      setCompare(true);
      return;
    }
    if (hasCatalogueMaterials && !catalogueReady) return;
    const parsed = contingencyContent.safeParse({
      ...fields, materials: materials.map(row => row.value), communications: communications.map(row => row.value),
    });
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? "Confira o preenchimento.");
      return;
    }
    setValidation("");
    setReview(parsed.data);
  }

  return <RecordDrawer
    title={review ? "Confira a declaração" : supplement ? "Acrescentar informações" : "Declarar um fato"}
    kicker={supplement ? "Complemento de contingência" : "Contingência física"}
    headingIcon="note" popupClassName="hca-guide-topic-sheet hca-contingency-editor"
    restoreFocusTo={opener} restoreFocusFallbackRef={headingRef} busy={busy} uncertainOutcome={pending} exitDialog
    hasUnsavedChanges={Object.values(fields).some(value => typeof value === "string") || materials.length > 0 || communications.length > 0}
    onClose={onClose} footer={requestClose => <>
      <ActionButton disabled={busy} onClick={review && !pending ? () => setReview(null) : requestClose}>
        {review && !pending ? "Voltar ao preenchimento" : "Fechar"}
      </ActionButton>
      {pending ? <ActionButton variant="primary" disabled={busy} onClick={onRecover}>
        <Icon name="search" />Conferir resultado
      </ActionButton> : changed.length ? <ActionButton variant="primary" disabled={locked} onClick={() => setCompare(true)}>
        <Icon name="box" />Conferir unidade
      </ActionButton> : review ? <ActionButton variant="primary" disabled={locked || hasCatalogueMaterials && !catalogueReady} onClick={() => void onConfirm(review, selectedProcess)}>
        <Icon name="check" />Confirmar declaração
      </ActionButton> : <ActionButton variant="primary" type="submit" form={formId} disabled={locked || hasCatalogueMaterials && !catalogueReady}>
        <Icon name="arrow" />Revisar declaração
      </ActionButton>}
    </>}
  >
    {hasCatalogueMaterials && !catalogueReady && <CatalogueStatus catalogue={catalogue} />}
    {review ? <div className="hca-form">
      <h3 className="sr-only" ref={reviewHeadingRef} tabIndex={-1}>Confira os fatos conhecidos e os desconhecidos</h3>
      <DefinitionGrid className="hca-contingency-summary" items={[
        ...summary, { label: "Processo", value: contingencyProcesses[selectedProcess] },
        { label: "Referência", value: review.knownReference ?? "Desconhecida" },
      ]} />
      <ContingencyFacts value={{
        ...review,
        materials: review.materials.map((row, index) => ({ ...row, productName: row.productId ? materials[index]?.name : null, unit: row.reviewedUnit })),
      }} scope="review" layout="review" />
      <p className="hca-contingency-hint"><Icon name="info" width={16} />Confirmar preserva a declaração. Não movimenta estoque nem registra recebimento ou ciência.</p>
    </div> : <form id={formId} className="hca-form" onSubmit={reviewDeclaration} onInvalid={event => {
      const details = (event.target as HTMLElement).closest("details");
      if (details) details.open = true;
    }}>
      <DefinitionGrid className="hca-contingency-summary" items={supplement ? [...summary, { label: "Processo", value: contingencyProcesses[process] }] : summary} />
      {!supplement && <FormField label="Processo"><SelectField disabled={locked} value={selectedProcess} onChange={event => setSelectedProcess(event.target.value as Process)}>
        {processes.map(item => <option key={item} value={item}>{contingencyProcesses[item]}</option>)}
      </SelectField></FormField>}
      {validation && <Notice error>{validation}</Notice>}
      <FormField label="O que aconteceu?" required helpText="Descreva o fato físico e o que ainda precisa de conferência.">
        <TextAreaField value={fields.fact} maxLength={4000} required minLength={3} disabled={locked} onChange={event => patch("fact", event.target.value)} />
      </FormField>
      <DeclarationDisclosure title="Referência, data e pessoas">
        <KnownText label="Referência física" value={fields.knownReference} onChange={value => patch("knownReference", value)} />
        <KnownText label="Data do fato" type="date" value={fields.occurredOn} onChange={value => patch("occurredOn", value)} />
        <KnownText label="Hora do fato" type="time" value={fields.occurredTime} onChange={value => patch("occurredTime", value)} />
        <KnownZone value={fields.timeZone} onChange={value => patch("timeZone", value)} />
        <KnownText label="Quem realizou" value={fields.performer} onChange={value => patch("performer", value)} />
        <KnownText label="Quem recebeu" value={fields.receiver} onChange={value => patch("receiver", value)} />
      </DeclarationDisclosure>
      <section className="hca-form" aria-label="Materiais declarados">
        <div className="hca-section-heading">
          <h3>Materiais declarados</h3>
          <ActionButton compact disabled={locked || materials.length >= 100} onClick={() => setPicker(true)}>
            <Icon name="plus" />Adicionar
          </ActionButton>
        </div>
        {materials.map(({ key, name, value }) => <div key={key} className="hca-contingency-editor-card hca-form">
          <div className="hca-contingency-lead">
            <span className="hca-guide-row-icon"><Icon name="box" /></span>
            <span className="hca-guide-row-label"><strong>{name}</strong><small>{value.reviewedUnit ?? "Unidade desconhecida"}</small></span>
            <ActionButton variant="quiet" compact aria-label={"Retirar " + name} onClick={() => setMaterials(previous => previous.filter(row => row.key !== key))}><Icon name="close" /></ActionButton>
          </div>
          {!value.productId && <FormField label="Referência histórica do material">
            <TextInput value={value.description ?? ""} maxLength={300} onChange={event => updateMaterial(key, { description: event.target.value || null })} />
          </FormField>}
          {value.quantity !== null && <FormField label="Quantidade física" required>
            <TextInput required inputMode="decimal" value={value.quantity} onChange={event => updateMaterial(key, { quantity: event.target.value })} />
          </FormField>}
          <CheckboxField label="Não sei informar a quantidade" checked={value.quantity === null} onChange={event => updateMaterial(key, { quantity: event.target.checked ? null : "" })} />
          <FormField label="Custódia física"><SelectField value={value.custody ?? ""} onChange={event => updateMaterial(key, { custody: (event.target.value || null) as Material["custody"] })}>
            <option value="">Desconhecida</option>
            {Object.entries(custodyOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField></FormField>
        </div>)}
      </section>
      <DeclarationDisclosure title="Ressalvas e comunicações">
        <FormField label="Ressalva — se conhecida">
          <TextAreaField value={fields.notes ?? ""} maxLength={2000} onChange={event => patch("notes", event.target.value || null)} />
        </FormField>
        {communications.map(({ key, value }) => <div key={key} className="hca-contingency-editor-card hca-form">
          <FormField label="Pessoa ou referência histórica" required>
            <TextInput value={value.person} required maxLength={300} onChange={event => updateCommunication(key, { person: event.target.value })} />
          </FormField>
          <FormField label="Canal"><SelectField value={value.channel} onChange={event => updateCommunication(key, { channel: event.target.value as Communication["channel"] })}>
            {Object.entries(channels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField></FormField>
          <FormField label="Estado declarado"><SelectField value={value.state} onChange={event => updateCommunication(key, { state: event.target.value as Communication["state"] })}>
            {Object.entries(communicationStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField></FormField>
          <FormField label="Base da declaração" required>
            <TextAreaField value={value.basis} minLength={3} required maxLength={1000} onChange={event => updateCommunication(key, { basis: event.target.value })} />
          </FormField>
          <ActionButton compact onClick={() => setCommunications(previous => previous.filter(row => row.key !== key))}><Icon name="trash" />Retirar comunicação</ActionButton>
        </div>)}
        <ActionButton compact disabled={locked || communications.length >= 30} onClick={() => setCommunications(previous => [...previous, {
          key: crypto.randomUUID(), value: { person: "", channel: "paper", state: "pending", basis: "" },
        }])}><Icon name="plus" />Acrescentar comunicação</ActionButton>
        <p className="hca-field-hint">A comunicação declarada não envia mensagem nem produz ciência ou recebimento.</p>
      </DeclarationDisclosure>
      <p className="hca-field-hint">Após confirmar, você pode anexar a evidência ao dossiê.</p>
    </form>}
    {picker && <MaterialPicker catalogue={catalogue} onPick={addMaterial} onClose={() => setPicker(false)} />}
    {compare && <Dialog open title="Confira a unidade atual" headingIcon="box" kicker="Catálogo atualizado" onClose={() => setCompare(false)}
      footer={<>
        <ActionButton onClick={() => { setCompare(false); setReview(null); }}>Voltar ao preenchimento</ActionButton>
        <ActionButton variant="primary" disabled={!catalogueReady || !changed.length || changed.some(item => !item.product)} onClick={adoptCatalogueUnits}>Usar unidade atual</ActionButton>
      </>}>
      <div className="hca-form">
        {changed.map(({ row, product }) => <section className="hca-contingency-editor-card hca-form" key={row.key}>
          <h3>{row.name}</h3>
          <DefinitionGrid items={[
            { label: "Unidade anterior", value: row.value.reviewedUnit ?? "Desconhecida" },
            { label: "Unidade atual", value: product?.unit ?? "Referência indisponível" },
            { label: "Casas decimais anteriores", value: row.value.reviewedDecimals ?? "Desconhecidas" },
            { label: "Casas decimais atuais", value: product?.quantity_decimals ?? "Indisponíveis" },
          ]} />
        </section>)}
        <p className="hca-field-hint">{changed.some(item => !item.product)
          ? "Volte ao preenchimento para substituir o material que saiu do catálogo."
          : "Informe novamente a quantidade física dos materiais alterados. O sistema não faz conversão automática."}</p>
      </div>
    </Dialog>}
  </RecordDrawer>;
}

function DeclarationDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="hca-contingency-disclosure">
    <summary>{title}<Icon name="down" width={16} /></summary>
    <div className="hca-form">{children}</div>
  </details>;
}

function KnownText({ label, value, onChange, type = "text" }: {
  label: string; value: string | null; onChange: (value: string | null) => void; type?: "text" | "date" | "time";
}) {
  return <div className="hca-contingency-known">
    {value === null ? <strong>{label}</strong> : <FormField label={label} required>
      <TextInput type={type} value={value} required maxLength={300} onChange={event => onChange(event.target.value)} />
    </FormField>}
    <CheckboxField label={"Não sei informar: " + label} checked={value === null} onChange={event => onChange(event.target.checked ? null : "")} />
  </div>;
}

function KnownZone({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const [query, setQuery] = useState<string | null>(null);
  const id = useId();
  const zones = [...Intl.supportedValuesOf("timeZone"), "UTC"];
  return <div className="hca-contingency-known">
    {value === null ? <strong>Fuso do fato</strong> : <>
      <label id={id} htmlFor={id + "-input"}>Fuso do fato</label>
      <SearchSelect id={id + "-input"} aria-labelledby={id} required query={query ?? value} selectedIds={value ? [value] : []}
        onQueryChange={text => { setQuery(text); onChange(""); }}
        onSelectionChange={ids => { onChange(ids[0] ?? ""); setQuery(null); }}
        options={zones.filter(zone => !query || zone.toLowerCase().includes(query.toLowerCase())).slice(0, 40).map(zone => ({ value: zone, label: zone }))} />
    </>}
    <CheckboxField label="Não sei informar: Fuso do fato" checked={value === null}
      onChange={event => { setQuery(null); onChange(event.target.checked ? null : ""); }} />
  </div>;
}

type Catalogue = ComponentProps<typeof ContingencyForm>["catalogue"];

function CatalogueStatus({ catalogue }: { catalogue: Catalogue }) {
  if (catalogue.loading) return <p role="status">Consultando materiais de referência…</p>;
  if (!catalogue.error) return null;
  return <Notice error>{catalogue.error}<ActionButton compact onClick={catalogue.refresh}>Consultar materiais novamente</ActionButton></Notice>;
}

function MaterialPicker({ catalogue, onPick, onClose }: {
  catalogue: Catalogue; onPick: (product?: ContingencyProduct) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = catalogue.data?.filter(product => product.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))) ?? [];
  return <Dialog open title="Adicionar material declarado" headingIcon="box" onClose={onClose}
    footer={<><ActionButton onClick={onClose}>Voltar</ActionButton><ActionButton onClick={() => onPick()}>Material não identificado</ActionButton></>}>
    <FormField label="Buscar material"><TextInput value={query} onChange={event => setQuery(event.target.value)} /></FormField>
    <CatalogueStatus catalogue={catalogue} />
    {!catalogue.loading && !catalogue.error && (filtered.length ? filtered.map(product => <button key={product.id} type="button" className="hca-guide-row" onClick={() => onPick(product)}>
      <span className="hca-guide-row-icon"><Icon name="box" /></span>
      <span className="hca-guide-row-label"><strong>{product.name}</strong><small>{product.unit}{product.is_active ? "" : " · Inativo"}</small></span>
      <Icon name="chevron" width={16} />
    </button>) : <p>Nenhum material encontrado.</p>)}
  </Dialog>;
}
