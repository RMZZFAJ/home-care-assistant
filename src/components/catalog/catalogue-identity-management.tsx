"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, DefinitionGrid, FormField, LoadingIndicator, Pill, SelectField, TextAreaField } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { CatalogueCollectionItem } from "@/lib/validation/catalogue-list";
import type { IdentityFields } from "@/lib/validation/catalogue-preparation";
import type { CatalogueIdentity, CatalogueIdentityContext, CatalogueIdentityEvent } from "@/types/catalogue";
import type { useReviewedCatalogueOperation } from "./reviewed-catalogue-operation";

type Act = CatalogueIdentityEvent["action"];
type Decision = IdentityFields & { identityAction: Act };

const actLabels = {
  retire: "Inativar material",
  reactivate: "Reativar material",
  clear_successor: "Remover indicação",
} satisfies Record<Act, string>;
const recordedLabels = {
  retire: "Inativação registrada",
  reactivate: "Reativação registrada",
  clear_successor: "Indicação removida",
} satisfies Record<Act, string>;
const custodies = [
  ["FAMILY", "Família", "home"],
  ["CARE_TEAM", "Equipe", "users"],
  ["TRANSIT", "Em trânsito", "truck"],
] as const;

function balances(product: CatalogueIdentity) {
  return custodies.map(([key, label]) => ({
    label, value: product.stock[key] == null ? "Consulta restrita" : formatQuantity(product.stock[key], product.unit),
  }));
}

function MaterialStatus({ product }: { product: CatalogueIdentity }) {
  return <div className="hca-residence-admin-hero">
    <span className="hca-guide-row-icon"><Icon name="box" /></span>
    <div className="hca-guide-row-label"><strong>{product.name}</strong><small>{product.product_id} · {product.unit}</small></div>
    <Pill tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "Ativo" : "Inativo"}</Pill>
  </div>;
}

function IdentityRow({ icon, title, detail, onClick }: { icon: IconName; title: string; detail: string; onClick: () => void }) {
  return <button type="button" className="hca-guide-row" onClick={onClick}>
    <span className="hca-guide-row-icon"><Icon name={icon} /></span>
    <span className="hca-guide-row-label"><strong>{title}</strong><small>{detail}</small></span>
    <Icon name="chevron" width={15} height={15} />
  </button>;
}

export function CatalogueIdentityManagement({ patientId, productId, products, opener, onClose, restoreFocusFallbackRef,
  operation, referenceRevision, onRefreshReference }: {
  patientId: string;
  productId: string;
  products: CatalogueCollectionItem[];
  opener: HTMLElement;
  onClose: () => void;
  restoreFocusFallbackRef: RefObject<HTMLElement | null>;
  operation: ReturnType<typeof useReviewedCatalogueOperation>;
  referenceRevision: number;
  onRefreshReference: () => void;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [prepared, setPrepared] = useState<CatalogueIdentityContext | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [obsoleted, setObsoleted] = useState(false);
  const [dismissedComparisonRevision, setDismissedComparisonRevision] = useState(0);
  const [secondary, setSecondary] = useState<"successor" | "history" | null>(null);
  const [page, setPage] = useState(1);
  const [reasonError, setReasonError] = useState("");
  const actionRef = useRef<HTMLButtonElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const editorId = useId();
  const reasonId = useId();
  const url = "/api/catalog/identities?" + new URLSearchParams({ careRecipientId: patientId, productId });
  const selectedId = decision?.successorId;
  const source = useScopedRead<{ data: CatalogueIdentityContext }>(url, String(referenceRevision));
  const successor = useScopedRead<{ data: CatalogueIdentityContext }>(
    selectedId ? url + "&successorId=" + encodeURIComponent(selectedId) : null, String(referenceRevision),
  );
  const older = useScopedRead<{ data: CatalogueIdentityContext }>(
    secondary === "history" && page > 1 ? url + "&page=" + page : null, String(referenceRevision),
  );
  const snapshot = source.data?.data;
  const referenceRead = selectedId ? successor : source;
  const reference = referenceRead.data?.data;
  const linkedId = snapshot?.guidance?.successor_product_id;
  const linked = products.find(item => item.id === linkedId);
  const linkedLabel = linked ? `${linked.name} · ${linked.unit}` : linkedId ?? "Nenhum sucessor indicado";
  const eligible = products.filter(item => item.id !== productId && item.is_active);
  const history = (page > 1 ? older.data?.data : snapshot)?.events ?? [];
  const canEdit = Boolean(snapshot) && !source.loading && !source.error && !operation.blocked;
  const unsuitableSuccessor = Boolean(selectedId && reference?.successor?.is_active === false);
  const canReview = canEdit && Boolean(reference) && !referenceRead.loading && !referenceRead.error && !obsoleted && !unsuitableSuccessor;
  const comparing = Boolean(decision && obsoleted && referenceRevision > dismissedComparisonRevision);

  function start(action: Act) {
    if (!canEdit) return;
    setDecision({ identityAction: action, successorId: action === "retire" && linked?.is_active ? linked.id : "", reason: "" });
    setReasonError("");
    setPrepared(null);
    setObsoleted(false);
    setDismissedComparisonRevision(referenceRevision);
    setSecondary(null);
  }

  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || !canReview || !reference) return;
    const reason = decision.reason.trim();
    if (Array.from(reason).length < 3 || reason.length > 1000) {
      setReasonError("Informe um motivo próprio de 3 a 1.000 caracteres.");
      reasonRef.current?.focus();
      return;
    }
    setDecision({ ...decision, reason });
    setPrepared(reference);
    setReviewOpen(true);
  }

  function confirm() {
    if (!decision || !prepared || !canReview) return;
    setReviewOpen(false);
    void operation.submit({ patientId, mode: "patient", purpose: "identity", targetId: productId },
      { fields: decision, referenceHash: prepared.referenceHash }, error => {
        if (error.code === "VERSION_CONFLICT") setObsoleted(true);
      });
  }

  function dismissDecision() {
    setDecision(null);
    setReviewOpen(false);
    setPrepared(null);
    setObsoleted(false);
  }

  const mainAction = snapshot?.source.is_active ? "retire" : "reactivate";
  return <>
    <RecordDrawer title="Situação do material" subtitle="Preserve a identidade e oriente as próximas escolhas."
      kicker="Organização da residência" headingIcon="box" popupClassName="hca-preference-sheet hca-residence-settings-sheet"
      onClose={onClose} busy={operation.busy} trackChanges={false} restoreFocusTo={opener}
      restoreFocusFallbackRef={restoreFocusFallbackRef} keyboardScrollable
      footer={close => <><ActionButton onClick={close}>Voltar ao material</ActionButton>
        {operation.pending && !operation.busy && !operation.failure ? <ActionButton variant="primary" onClick={operation.openRecovery}>Conferir resultado pendente</ActionButton>
          : snapshot ? <ActionButton ref={actionRef} variant="primary" disabled={!canEdit} onClick={() => start(mainAction)}>
          <Icon name={mainAction === "retire" ? "archive" : "refresh"} />{actLabels[mainAction]}
        </ActionButton> : null}</>}>
      {source.loading ? <LoadingIndicator label="Consultando material e saldos autorizados" /> : null}
      {source.error ? <FeedbackBanner tone="error">{source.error} <ActionButton onClick={source.refresh}>Consultar material novamente</ActionButton></FeedbackBanner> : null}
      {snapshot ? <div className="hca-form-stack">
        <MaterialStatus product={snapshot.source} />
        {!snapshot.source.is_active ? <p className="hca-residence-admin-subtitle">Fora de novas escolhas. Cadastro, saldos e histórico preservados.</p> : null}
        <section className="hca-residence-admin-section hca-catalogue-balance-section" aria-label="Saldos preservados">
          <header><h3>Saldos preservados</h3></header>
          <div>
            <div className="hca-catalogue-balances">{custodies.map(([key, title, icon]) => {
              const value = snapshot.source.stock[key];
              return <div key={key}><Icon name={icon} width={17} height={17} /><small>{title}</small>
                {value === null ? <span>Consulta restrita</span> : <><strong>{formatQuantity(value)}</strong><span>{snapshot.source.unit}</span></>}
              </div>;
            })}</div>
            <p className="hca-field-hint hca-catalogue-balance-hint"><Icon name="box" width={16} height={16} />Inativar ou indicar um sucessor preserva os saldos.</p>
          </div>
        </section>
        <section className="hca-residence-admin-section hca-residence-rules">
          <header><h3>Próximas escolhas</h3></header>
          <div>
            <IdentityRow icon="arrow" title="Sucessor" detail={linkedLabel} onClick={() => setSecondary("successor")} />
            <IdentityRow icon="history" title="Histórico da situação" detail="Autor, motivo e efeito de cada decisão" onClick={() => { setPage(1); setSecondary("history"); }} />
          </div>
        </section>
      </div> : null}
    </RecordDrawer>
    {secondary && snapshot ? <RecordDrawer title={secondary === "successor" ? "Sucessor do material" : "Histórico da situação"}
      subtitle={secondary === "successor" ? "Orientação para novas escolhas" : snapshot.source.name} headingIcon={secondary === "successor" ? "box" : "history"}
      kicker="Organização da residência" popupClassName="hca-preference-sheet hca-residence-settings-sheet"
      trackChanges={false} keyboardScrollable onClose={() => setSecondary(null)}
      footer={close => <><ActionButton onClick={close}>Voltar</ActionButton>
        {secondary === "successor" && !snapshot.source.is_active ? <ActionButton disabled={!canEdit} onClick={() => start("retire")}>
          {linkedId ? "Alterar indicação" : "Indicar sucessor"}
        </ActionButton> : null}
        {secondary === "successor" && linkedId ? <ActionButton disabled={!canEdit} onClick={() => start("clear_successor")}>Remover indicação</ActionButton> : null}</>}>
      {secondary === "successor" ? <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Material de origem", value: `${snapshot.source.name} · ${snapshot.source.unit}` },
          { label: "Sucessor indicado", value: linkedLabel },
        ]} />
        <FeedbackBanner>A indicação orienta novas escolhas. Cada identidade conserva sua unidade, custódia e saldo.</FeedbackBanner>
        <Link className="hca-control" href={"/transferencias?" + new URLSearchParams({ careRecipientId: patientId })}>Planejar transferência física separadamente</Link>
      </div> : <div className="hca-form-stack">
        {older.loading ? <LoadingIndicator label="Consultando decisões anteriores" /> : null}
        {older.error ? <FeedbackBanner tone="error">{older.error} <ActionButton onClick={older.refresh}>Consultar histórico novamente</ActionButton></FeedbackBanner> : null}
        {history.length ? history.map(event => <section key={event.id} className="hca-residence-admin-section">
          <header><h3>{recordedLabels[event.action]}</h3><p>{event.actor_name} · {formatBrazilDate(event.recorded_at)}</p></header>
          <div><DefinitionGrid items={[
            { label: "Motivo", value: <span className="whitespace-pre-wrap">{event.reason}</span>, wide: true },
            { label: "Identidade anterior", value: `${event.before_state.source.name} · ${event.before_state.source.unit}` },
            { label: "Situação após a decisão", value: event.after_state.source.is_active ? "Ativo" : "Inativo" },
            ...(event.action === "retire" && event.after_state.successor ? [{ label: "Sucessor indicado", value: `${event.after_state.successor.name} · ${event.after_state.successor.unit}` }] : []),
          ]} /></div>
        </section>) : !older.loading && !older.error ? <p>Nenhuma decisão registrada para este material.</p> : null}
        {snapshot.eventTotal > 20 ? <nav aria-label="Páginas das decisões de catálogo" className="hca-pagination">
          <ActionButton disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</ActionButton>
          <span>Página {page} de {Math.ceil(snapshot.eventTotal / 20)}</span>
          <ActionButton disabled={page * 20 >= snapshot.eventTotal} onClick={() => setPage(value => value + 1)}>Próxima</ActionButton>
        </nav> : null}
      </div>}
    </RecordDrawer> : null}
    {decision && snapshot && !operation.blocked && !operation.failure && !comparing && !reviewOpen ? <Dialog
      open title={actLabels[decision.identityAction]} kicker="Organização da residência" headingIcon="box"
      keyboardScrollable onClose={dismissDecision} finalFocus={actionRef}
      footer={<><ActionButton onClick={dismissDecision}>Voltar</ActionButton>
        <ActionButton variant="primary" type="submit" form={editorId} disabled={!canReview}><Icon name="check" />Revisar efeito</ActionButton></>}>
      <form id={editorId} className="hca-form" onSubmit={edit}>
        {obsoleted ? <FeedbackBanner tone="warning"><strong>A referência mudou.</strong> Confira os dados atuais. Seu motivo permanece nesta edição.
          <ActionButton onClick={onRefreshReference}>Conferir atualização</ActionButton>
        </FeedbackBanner> : null}
        <DefinitionGrid items={[{ label: "Material", value: snapshot.source.name }, { label: "Unidade de origem", value: snapshot.source.unit }]} />
        {decision.identityAction === "retire" ? <FormField label="Sucessor para novas escolhas">
          <SelectField value={decision.successorId} disabled={obsoleted} onChange={event => setDecision({ ...decision, successorId: event.currentTarget.value })}>
            <option value="">Sem indicar sucessor</option>
            {decision.successorId && !eligible.some(item => item.id === decision.successorId)
              ? <option value={decision.successorId} disabled>Sucessor indisponível</option> : null}
            {eligible.map(item => <option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}
          </SelectField>
        </FormField> : null}
        {referenceRead.loading ? <LoadingIndicator label="Consultando a referência para a decisão" /> : null}
        {referenceRead.error ? <FeedbackBanner tone="error">{referenceRead.error} <ActionButton onClick={referenceRead.refresh}>Consultar referência novamente</ActionButton></FeedbackBanner> : null}
        {unsuitableSuccessor ? <FeedbackBanner tone="warning">O sucessor está inativo. Selecione um material ativo ou prossiga sem indicação.</FeedbackBanner>
          : reference?.successor && reference.successor.unit !== snapshot.source.unit ? <FeedbackBanner>
          O sucessor usa {reference.successor.unit} e a origem usa {snapshot.source.unit}. Ambas as unidades e seus saldos permanecem separados.
        </FeedbackBanner> : <FeedbackBanner>{decision.identityAction === "reactivate"
          ? "A mesma identidade voltará a ficar ativa. A indicação de sucessor será removida."
          : decision.identityAction === "clear_successor" ? "A situação do material será preservada ao remover a indicação."
            : "O sucessor orienta novas seleções. Os saldos permanecem no material de origem."}</FeedbackBanner>}
        <FormField label="Motivo da decisão" htmlFor={reasonId} helpText="Explique brevemente por que a situação deve mudar." error={reasonError || undefined}>
          <TextAreaField id={reasonId} ref={reasonRef} value={decision.reason} minLength={3} maxLength={1000} required
            onChange={event => { setDecision({ ...decision, reason: event.currentTarget.value }); setReasonError(""); }} />
        </FormField>
      </form>
    </Dialog> : null}
    {decision && prepared && reviewOpen ? <Dialog open title="Confirmar efeito no catálogo?" kicker="Organização da residência" headingIcon="check"
      keyboardScrollable onClose={() => setReviewOpen(false)}
      footer={<><ActionButton onClick={() => setReviewOpen(false)}>Voltar à edição</ActionButton>
        <ActionButton variant="primary" disabled={!canReview} onClick={confirm}>Confirmar decisão</ActionButton></>}>
      <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Ato", value: actLabels[decision.identityAction] },
          { label: "Sucessor", value: prepared.successor ? `${prepared.successor.name} · ${prepared.successor.unit}`
            : decision.identityAction === "retire" ? "Sem indicar sucessor" : "Indicação removida" },
          { label: "Motivo", value: <span className="whitespace-pre-wrap">{decision.reason}</span>, wide: true },
        ]} />
        <section className="hca-form" aria-label="Material de origem">
          <h3>{prepared.source.name} · {prepared.source.unit}</h3><DefinitionGrid items={balances(prepared.source)} />
        </section>
        {prepared.successor ? <section className="hca-form" aria-label="Sucessor para novas escolhas">
          <h3>{prepared.successor.name} · {prepared.successor.unit}</h3><DefinitionGrid items={balances(prepared.successor)} />
        </section> : null}
        <FeedbackBanner>Saldos, custódias e fatos anteriores permanecem associados às identidades originais.</FeedbackBanner>
      </div>
    </Dialog> : null}
    {comparing && snapshot && prepared ? <Dialog open title="Referência atual do material" kicker="Organização da residência" headingIcon="history"
      keyboardScrollable onClose={() => setDismissedComparisonRevision(referenceRevision)}
      footer={<><ActionButton onClick={() => setDismissedComparisonRevision(referenceRevision)}>Voltar</ActionButton>
        <ActionButton variant="primary" disabled={!reference || referenceRead.loading || Boolean(referenceRead.error)}
          onClick={() => { setDismissedComparisonRevision(referenceRevision); setObsoleted(false); }}>Usar referência atual</ActionButton></>}>
      <div className="hca-form-stack">
        {referenceRead.loading ? <LoadingIndicator label="Conferindo a referência do material" /> : null}
        {referenceRead.error ? <FeedbackBanner tone="error">A referência atual está indisponível. Seu motivo permanece na edição.
          <ActionButton onClick={referenceRead.refresh}>Consultar novamente</ActionButton>
        </FeedbackBanner> : null}
        {reference && !referenceRead.error && !referenceRead.loading ? <>
          <section className="hca-form" aria-label="Referência da decisão">
            <h3>{prepared.source.name} · {prepared.source.unit}</h3><DefinitionGrid items={balances(prepared.source)} />
          </section>
          <section className="hca-form" aria-label="Referência atual de origem">
            <h3>{reference.source.name} · {reference.source.unit}</h3><DefinitionGrid items={balances(reference.source)} />
          </section>
          {reference.successor ? <section className="hca-form" aria-label="Referência atual do sucessor">
            <h3>{reference.successor.name} · {reference.successor.unit}</h3><DefinitionGrid items={balances(reference.successor)} />
          </section> : null}
          <FeedbackBanner>Uma nova revisão usará a referência atual. Os dados da sua edição continuam disponíveis.</FeedbackBanner>
        </> : null}
      </div>
    </Dialog> : null}
  </>;
}
