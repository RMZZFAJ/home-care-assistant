"use client";
import { ActionButton, FormField, LoadingIndicator, SelectField, TextAreaField } from "@/components/ui/controls";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { api, Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { catalogueIdentityCommandSchema } from "@/lib/validation/catalogue";
import type {
  CatalogueIdentity,
  CatalogueIdentityContext,
} from "@/types/catalogue";

import type { CatalogueOutcome, IdentityFields } from "@/lib/validation/catalogue-preparation";
import { CatalogueDraftButtons, CataloguePreparationFeedback } from "./catalogue-preparation-controls";
import { sendPreparedCatalogueCommit, useCataloguePreparation } from "./use-catalogue-preparation";

function identityOutcome(outcome: CatalogueOutcome) {
  return "eventId" in outcome ? `${labels[outcome.identityAction]} registrado por ${outcome.actorName}. Saldos, documentos e identidades anteriores preservados.` : "Alteração confirmada.";
}

const labels = {
  retire: "Inativar",
  reactivate: "Reativar",
  clear_successor: "Remover indicação de sucessor",
};
const locations = {
  FAMILY: "Família",
  CARE_TEAM: "Equipe",
  TRANSIT: "Em trânsito",
};
type Packet = ReturnType<typeof catalogueIdentityCommandSchema.parse>;
function IdentityCard({
  product,
  label,
}: {
  product: CatalogueIdentity;
  label: string;
}) {
  return (
    <section
      className="ui-card min-w-0 space-y-3 wrap-break-word"
      aria-label={label}
    >
      <h3>{label}</h3>
      <p>
        <strong>{product.name}</strong> · {product.unit}
      </p>
      <p>
        {product.is_active ? "Ativo" : "Inativo"} · {product.category} ·
        precisão {product.quantity_decimals}
      </p>
      <p>
        Nomes alternativos: {product.aliases.join(", ") || "Nenhum cadastrado"}.
      </p>
      <dl>
        {Object.entries(locations).map(([key, name]) => (
          <div key={key}>
            <dt>{name}</dt>
            <dd>
              {product.stock[key as keyof typeof locations] == null
                ? "Consulta restrita ao seu acesso"
                : formatQuantity(
                    product.stock[key as keyof typeof locations]!,
                    product.unit,
                  )}
            </dd>
          </div>
        ))}
      </dl>
      <details>
        <summary>Identidade preservada</summary>
        <p className="break-all">{product.product_id}</p>
      </details>
    </section>
  );
}
export function CatalogueIdentityManagement({
  userId,
  writable,
  patientId,
  productId,
  products,
  opener,
  onClose,
  onSaved,
  restoreFocusFallbackRef,
}: {
  userId: string;
  writable: boolean;
  patientId: string;
  productId: string;
  products: { id: string; name: string; unit: string }[];
  opener: HTMLElement;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  restoreFocusFallbackRef: RefObject<HTMLElement | null>;
}) {
  const [adopted, setAdopted] = useState<CatalogueIdentityContext | null>(null);
  const [comparison, setComparison] = useState<CatalogueIdentityContext | null>(
    null,
  );
  const [conflict, setConflict] = useState(false);
  const [prepared, setPrepared] = useState<{
    packet: Packet;
    context: CatalogueIdentityContext;
  } | null>(null);
  const [page, setPage] = useState(1);
  const reasonId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null),
    reviewRef = useRef<HTMLHeadingElement>(null),
    focusAfterRefusalRef = useRef(false);
  const editor = useCataloguePreparation<IdentityFields, { hash: string | null }>({
    scope: { patientId, mode: "patient", purpose: "identity", targetId: productId }, userId,
    separateReference: true,
    defaultFields: () => ({ identityAction: "", successorId: "", reason: "" }),
    hashFor: reference => reference.hash,
    validOutcome: (outcome, attempt) => "eventId" in outcome && outcome.productId === productId
      && (attempt.action !== "commit" || (!!attempt.fields && "identityAction" in attempt.fields && outcome.identityAction === attempt.fields.identityAction)),
    sendCommit: attempt => sendPreparedCatalogueCommit("/api/catalog/identities", attempt),
    onCommit: (outcome, recovered) => {
      onClose();
      void onSaved(identityOutcome(outcome) + (recovered ? " A mesma intenção foi recuperada." : "")).catch(() => undefined);
    },
    onRejected: reason => {
      setPrepared(null);
      focusAfterRefusalRef.current = true;
      if (reason.code === "VERSION_CONFLICT") {
        setConflict(true);
        void consultConflict();
      }
    },
  });
  const fields = editor.fields;
  const { identityAction: action, successorId, reason } = fields ?? { identityAction: "", successorId: "", reason: "" };
  const { busy } = editor;
  const uncertain = !!editor.pending;
  const url =
    "/api/catalog/identities?" +
    new URLSearchParams({
      careRecipientId: patientId,
      productId,
      ...(action === "retire" && successorId ? { successorId } : {}),
    });
  const source = useScopedRead<{ data: CatalogueIdentityContext }>(writable && fields ? url : null);
  const older = useScopedRead<{ data: CatalogueIdentityContext }>(
    writable && page > 1 ? url + "&page=" + page : null,
  );
  const reference = adopted ?? source.data?.data;
  const hash = editor.reviewedHash ?? reference?.referenceHash ?? editor.snapshot?.reference.hash ?? null;
  const referenceChanged = !!(reference && hash && reference.referenceHash !== hash);
  const history = page > 1 ? older.data?.data : reference;
  useEffect(() => {
    if (prepared) reviewRef.current?.focus();
  }, [prepared]);
  useEffect(() => {
    if (!prepared && !busy && focusAfterRefusalRef.current) {
      focusAfterRefusalRef.current = false;
      reasonRef.current?.focus();
    }
  }, [prepared, busy]);
  function changed() {
    setAdopted(null);
    setComparison(null);
    setConflict(false);
    editor.setError("");
    setPage(1);
    editor.setReviewedHash(null);
  }
  function prepare() {
    if (!writable || !fields || !reference || !hash || source.loading || source.error || conflict || referenceChanged || editor.locked)
      return;
    const result = catalogueIdentityCommandSchema.safeParse({
      careRecipientId: patientId,
      productId,
      successorId: action === "retire" && successorId ? successorId : null,
      referenceHash: hash,
      action,
      reason,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!result.success) {
      editor.setError(result.error.issues[0]?.message ?? "Confira o ato e o motivo.");
      reasonRef.current?.focus();
      return;
    }
    editor.setError("");
    setPrepared({ packet: result.data, context: reference });
  }
  async function consultConflict() {
    try {
      const current = await api<{ data: CatalogueIdentityContext }>(url);
      setComparison(current.data);
    } catch {
      editor.setError(
        "A referência atual está indisponível. Seu motivo e sua escolha foram preservados; consulte novamente.",
      );
    }
  }
  return (
    <RecordDrawer
      title="Situação e sucessor do material"
      onClose={onClose}
      busy={busy}
      preventClose={uncertain}
      hasUnsavedChanges={editor.dirty}
      restoreFocusTo={opener}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
    >
      <div className="space-y-4">
        <CataloguePreparationFeedback editor={editor} onClose={onClose} outcomeText={identityOutcome}
          retryLabel="Recuperar mesma intenção" writable={writable}
          uncertaintyText="O resultado ainda não foi confirmado. A escolha, o motivo e a chave estão congelados. Consulte o comprovante ou recupere a mesma intenção."
          compareFields={value => <dl className="hca-summary-grid wrap-anywhere">
            <dt>Ato</dt><dd>{value.identityAction ? labels[value.identityAction] : "Em branco"}</dd>
            <dt>Sucessor</dt><dd>{products.find(row => row.id === value.successorId)?.name ?? (value.successorId || "Sem sucessor")}</dd>
            <dt>Motivo</dt><dd>{value.reason || "Em branco"}</dd>
          </dl>} />
        {prepared ? (
          <section
            className="space-y-4"
            aria-label="Revisão da situação do material"
          >
            <h3 tabIndex={-1} ref={reviewRef}>
              Confira o efeito no catálogo
            </h3>
            <IdentityCard
              product={prepared.context.source}
              label="Material de origem"
            />
            {prepared.context.successor ? (
              <IdentityCard
                product={prepared.context.successor}
                label="Sucessor para novas escolhas"
              />
            ) : null}
            <p>
              Ato: <strong>{labels[prepared.packet.action]}</strong>.
            </p>
            <p>
              {prepared.packet.action === "retire"
                ? prepared.context.successor
                  ? `A origem ficará inativa; ${prepared.context.successor.name} será uma orientação para novas seleções, com sua própria unidade ${prepared.context.successor.unit}.`
                  : "O material ficará inativo e seus saldos permanecerão na mesma custódia, sem indicação de sucessor."
                : prepared.packet.action === "reactivate"
                  ? "O mesmo material ficará ativo novamente; a indicação de sucessor será removida."
                  : "A indicação será removida, mantendo a situação atual do material."}
            </p>
            <p>
              Não haverá transferência, conversão de unidades ou alteração de
              fatos anteriores. Para destinação física, use o processo próprio
              de estoque/ENT.
            </p>
            <p className="whitespace-pre-wrap">
              Motivo próprio: {prepared.packet.reason}
            </p>
            <div className="hca-toolbar">
              <ActionButton
                disabled={busy || uncertain || !writable}
                onClick={() => setPrepared(null)}
              >
                Voltar à escolha
              </ActionButton>
              {!uncertain ? <ActionButton
                variant="primary" disabled={busy || !writable}
                onClick={() => editor.start("commit", prepared.packet.referenceHash, {
                  identityAction: prepared.packet.action, successorId: prepared.packet.successorId ?? "", reason: prepared.packet.reason,
                })}
              >
                Confirmar mudança no catálogo
              </ActionButton> : null}
            </div>
          </section>
        ) : !writable ? (
          <Notice error>
            A permissão de alterar o catálogo não está mais disponível. Feche
            esta consulta para continuar.
          </Notice>
        ) : fields && !uncertain ? (
          <>
            {source.loading ? (
              <LoadingIndicator label="Consultando material, situação e saldos autorizados" />
            ) : null}
            {source.error ? (
              <Notice error>
                {source.error}{" "}
                {source.data
                  ? "Última consulta preservada; confirme a referência vigente antes de agir."
                  : "A consulta não foi concluída."}
                <ActionButton onClick={() => source.refresh()}>
                  Tentar consulta do material novamente
                </ActionButton>
              </Notice>
            ) : null}
            {reference ? (
              <>
                <IdentityCard
                  product={reference.source}
                  label="Material de origem"
                />
                {reference.successor ? (
                  <IdentityCard
                    product={reference.successor}
                    label="Material comparado"
                  />
                ) : null}
                {reference.guidance ? (
                  <p>
                    Sucessor atualmente indicado:{" "}
                    {products.find(
                      (row) =>
                        row.id === reference.guidance?.successor_product_id,
                    )?.name ?? "Identificação indisponível"}
                    .
                  </p>
                ) : null}
                <Notice>
                  Inativar conserva saldo na família, na equipe e em trânsito.
                  Reativar conserva a mesma identidade. Um sucessor orienta
                  novas escolhas; unidades e saldos não são somados ou
                  convertidos.
                </Notice>
                {(conflict || referenceChanged) ? (
                  <section
                    aria-label="Comparação da referência atual"
                    className="ui-card space-y-3"
                  >
                    <h3>O cadastro ou o saldo consultado mudou</h3>
                    {comparison ? (
                      <>
                        <IdentityCard
                          product={comparison.source}
                          label="Referência atual de origem"
                        />
                        {comparison.successor ? (
                          <IdentityCard
                            product={comparison.successor}
                            label="Referência atual do sucessor"
                          />
                        ) : null}
                        <ActionButton
                          onClick={() => {
                            setAdopted(comparison);
                            setComparison(null);
                            setConflict(false);
                            editor.setReviewedHash(comparison.referenceHash);
                            editor.setError("");
                            reasonRef.current?.focus();
                          }}
                        >
                          Adotar referência consultada e manter meu motivo
                        </ActionButton>
                      </>
                    ) : null}
                    <ActionButton onClick={() => void consultConflict()}>
                      Consultar referência para comparação
                    </ActionButton>
                  </section>
                ) : null}
                {editor.draft?.state !== "consumed" ? <>
                  <fieldset className="hca-form" disabled={editor.locked}>
                    <FormField label="Ato no catálogo">
                      <SelectField value={action} onChange={event => {
                        editor.setFields({ ...fields, identityAction: event.target.value as IdentityFields["identityAction"], successorId: "" });
                        changed();
                      }}>
                        <option value="">Escolha o ato</option>
                        <option value="retire">Inativar, mantendo os saldos</option>
                        <option value="reactivate">Reativar a mesma identidade</option>
                        <option value="clear_successor">Remover indicação de sucessor</option>
                      </SelectField>
                    </FormField>
                    {action === "retire" ? <FormField label="Sucessor para novas escolhas, opcional">
                      <SelectField value={successorId} onChange={event => {
                        editor.setFields({ ...fields, successorId: event.target.value });
                        changed();
                      }}>
                        <option value="">Sem indicar sucessor</option>
                        {successorId && !products.some(row => row.id === successorId) ? <option disabled value={successorId}>Sucessor indisponível</option> : null}
                        {products.filter(row => row.id !== productId).map(row =>
                          <option key={row.id} value={row.id}>{row.name} · {row.unit}</option>)}
                      </SelectField>
                    </FormField> : null}
                    <FormField label="Motivo próprio da escolha" htmlFor={reasonId}>
                      <TextAreaField id={reasonId} ref={reasonRef} value={reason} minLength={3} maxLength={1000}
                        onChange={event => editor.setFields({ ...fields, reason: event.target.value })} />
                    </FormField>
                  </fieldset>
                  <div className="hca-toolbar">
                    <ActionButton type="button" variant="primary" disabled={editor.locked || !action || source.loading || !!source.error || conflict || referenceChanged}
                      onClick={prepare}>Revisar mudança no catálogo</ActionButton>
                    <CatalogueDraftButtons editor={editor} hash={hash} />
                  </div>
                </> : null}
                <Link
                  className="ui-button ui-button-secondary"
                  href={
                    "/transferencias?" +
                    new URLSearchParams({ careRecipientId: patientId })
                  }
                >
                  Planejar transferência física separadamente
                </Link>
                <section
                  className="space-y-3"
                  aria-label="Histórico da situação e sucessor"
                >
                  <h3>Escolhas registradas</h3>
                  {older.loading ? (
                    <LoadingIndicator label="Consultando escolhas anteriores" />
                  ) : null}
                  {older.error ? (
                    <Notice error>
                      {older.error}
                      <ActionButton onClick={() => older.refresh()}>
                        Tentar histórico novamente
                      </ActionButton>
                    </Notice>
                  ) : null}
                  {history?.events.length === 0 ? (
                    <p>
                      Nenhuma escolha registrada neste fluxo. Alterações
                      anteriores não foram reconstruídas.
                    </p>
                  ) : null}
                  {history?.events.map((event) => (
                    <article key={event.id} className="ui-card space-y-2">
                      <p>
                        {labels[event.action]} · {event.actor_name} ·{" "}
                        {formatBrazilDate(event.recorded_at)}
                      </p>
                      <p className="whitespace-pre-wrap">{event.reason}</p>
                      <p>
                        Origem preservada: {event.before_state.source.name} ·{" "}
                        {event.before_state.source.unit}.
                      </p>
                      {event.after_state.successor ? (
                        <p>
                          Sucessor indicado no ato:{" "}
                          {event.after_state.successor.name} ·{" "}
                          {event.after_state.successor.unit}.
                        </p>
                      ) : null}
                    </article>
                  ))}
                  {reference.eventTotal > 20 ? (
                    <nav
                      aria-label="Páginas das escolhas de catálogo"
                      className="hca-toolbar"
                    >
                      <ActionButton
                        disabled={page <= 1}
                        onClick={() => setPage((value) => value - 1)}
                      >
                        Escolhas anteriores
                      </ActionButton>
                      <span>
                        Página {page} de {Math.ceil(reference.eventTotal / 20)}
                      </span>
                      <ActionButton
                        disabled={page * 20 >= reference.eventTotal}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        Mais escolhas
                      </ActionButton>
                    </nav>
                  ) : null}
                </section>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </RecordDrawer>
  );
}
