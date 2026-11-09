"use client";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { api, ApiError, inputClass, Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { catalogueIdentityCommandSchema } from "@/lib/validation/catalogue";
import type {
  CatalogueIdentity,
  CatalogueIdentityContext,
  CatalogueIdentityResult,
} from "@/types/catalogue";

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
  writable,
  patientId,
  productId,
  products,
  opener,
  onClose,
  onSaved,
  restoreFocusFallbackRef,
}: {
  writable: boolean;
  patientId: string;
  productId: string;
  products: { id: string; name: string; unit: string }[];
  opener: HTMLElement;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  restoreFocusFallbackRef: RefObject<HTMLElement | null>;
}) {
  const [action, setAction] = useState<Packet["action"] | "">("");
  const [successorId, setSuccessorId] = useState("");
  const [reason, setReason] = useState("");
  const [adopted, setAdopted] = useState<CatalogueIdentityContext | null>(null);
  const [comparison, setComparison] = useState<CatalogueIdentityContext | null>(
    null,
  );
  const [conflict, setConflict] = useState(false);
  const [prepared, setPrepared] = useState<{
    packet: Packet;
    context: CatalogueIdentityContext;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const reasonId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null),
    reviewRef = useRef<HTMLHeadingElement>(null),
    focusAfterRefusalRef = useRef(false);
  const url =
    "/api/catalog/identities?" +
    new URLSearchParams({
      careRecipientId: patientId,
      productId,
      ...(action === "retire" && successorId ? { successorId } : {}),
    });
  const source = useScopedRead<{ data: CatalogueIdentityContext }>(url);
  const older = useScopedRead<{ data: CatalogueIdentityContext }>(
    page > 1 ? url + "&page=" + page : null,
  );
  const reference = adopted ?? source.data?.data;
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
    setError("");
    setPage(1);
  }
  function prepare() {
    if (!writable || !reference || source.loading || source.error || conflict)
      return;
    const result = catalogueIdentityCommandSchema.safeParse({
      careRecipientId: patientId,
      productId,
      successorId: action === "retire" && successorId ? successorId : null,
      referenceHash: reference.referenceHash,
      action,
      reason,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Confira o ato e o motivo.");
      reasonRef.current?.focus();
      return;
    }
    setError("");
    setPrepared({ packet: result.data, context: reference });
  }
  async function consultConflict() {
    try {
      const current = await api<{ data: CatalogueIdentityContext }>(url);
      setComparison(current.data);
    } catch {
      setError(
        "A referência atual está indisponível. Seu motivo e sua escolha foram preservados; consulte novamente.",
      );
    }
  }
  async function save() {
    if (!prepared || (!writable && !uncertain)) return;
    setBusy(true);
    setError("");
    try {
      const response = await api<{ data: CatalogueIdentityResult }>(
        "/api/catalog/identities",
        prepared.packet,
      );
      setUncertain(false);
      await onSaved(
        `${labels[response.data.result.event.action]} registrado por ${response.data.result.event.actor_name}. Saldos, documentos e identidades anteriores preservados.${response.data.replayed ? " A mesma intenção foi recuperada." : ""}`,
      );
      onClose();
    } catch (failure) {
      const rejected =
        failure instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(failure.status);
      setError(
        failure instanceof Error
          ? failure.message
          : "Resultado não confirmado.",
      );
      setUncertain(!rejected);
      if (rejected) {
        setPrepared(null);
        focusAfterRefusalRef.current = true;
      }
      if (failure instanceof ApiError && failure.status === 409) {
        setConflict(true);
        await consultConflict();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <RecordDrawer
      title="Situação e sucessor do material"
      onClose={onClose}
      busy={busy}
      preventClose={uncertain}
      restoreFocusTo={opener}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
    >
      <div className="space-y-4">
        {error ? <Notice error>{error}</Notice> : null}
        {uncertain ? (
          <Notice>
            O resultado ainda não foi confirmado. A escolha, o motivo e a chave
            estão congelados; recupere a mesma intenção antes de continuar.
          </Notice>
        ) : null}
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
              <ActionButton
                variant="primary"
                disabled={busy || (!writable && !uncertain)}
                onClick={() => void save()}
              >
                {uncertain
                  ? "Recuperar mesma intenção"
                  : "Confirmar mudança no catálogo"}
              </ActionButton>
            </div>
          </section>
        ) : !writable ? (
          <Notice error>
            A permissão de alterar o catálogo não está mais disponível. Feche
            esta consulta para continuar.
          </Notice>
        ) : (
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
                {conflict ? (
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
                            setError("");
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
                <label className="block text-sm font-semibold">
                  Ato no catálogo
                  <select
                    className={inputClass}
                    value={action}
                    onChange={(event) => {
                      setAction(event.target.value as typeof action);
                      setSuccessorId("");
                      changed();
                    }}
                  >
                    <option value="">Escolha o ato</option>
                    <option value="retire">Inativar, mantendo os saldos</option>
                    <option value="reactivate">
                      Reativar a mesma identidade
                    </option>
                    <option value="clear_successor">
                      Remover indicação de sucessor
                    </option>
                  </select>
                </label>
                {action === "retire" ? (
                  <label className="block text-sm font-semibold">
                    Sucessor para novas escolhas, opcional
                    <select
                      className={inputClass}
                      value={successorId}
                      onChange={(event) => {
                        setSuccessorId(event.target.value);
                        changed();
                      }}
                    >
                      <option value="">Sem indicar sucessor</option>
                      {products
                        .filter((row) => row.id !== productId)
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name} · {row.unit}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <div>
                  <label
                    htmlFor={reasonId}
                    className="block text-sm font-semibold"
                  >
                    Motivo próprio da escolha
                  </label>
                  <textarea
                    id={reasonId}
                    ref={reasonRef}
                    className={inputClass}
                    value={reason}
                    minLength={3}
                    maxLength={1000}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
                <ActionButton
                  variant="primary"
                  disabled={
                    !writable ||
                    !action ||
                    source.loading ||
                    Boolean(source.error) ||
                    conflict
                  }
                  onClick={prepare}
                >
                  Revisar mudança no catálogo
                </ActionButton>
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
        )}
      </div>
    </RecordDrawer>
  );
}
