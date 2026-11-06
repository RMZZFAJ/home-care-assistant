"use client";
import { useLiveRevision } from "@/lib/use-live-revision";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  buttonClass,
  can,
  inputClass,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "@/components/workspace";
import { Attachments } from "@/components/documents/attachments";
import { EmptyState, Icon } from "@/components/ui/primitives";
import { TransitStock, type TransitDocument } from "./transit-stock";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";

import type {
  ProductStock,
  StockMetric,
  StockMovement as Movement,
} from "@/types/stock";
import { StockOverview } from "./stock-overview";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Button } from "@fluentui/react-components";
import { useScopedRead } from "@/lib/use-scoped-read";
import { MovementOrigin } from "./movement-origin";

const locationLabels: Record<string, string> = {
  FAMILY: "Família",
  CARE_TEAM: "Equipe",
  TRANSIT: "Em trânsito",
};
export function StockConsole() {
  const params = useSearchParams();
  return (
    <Workspace title="Gestão dos estoques">
      {(context) =>
        context.patient ? (
          <PatientStock
            key={context.patient.id + params.toString()}
            context={context}
            initialCustody={params.get("custody") ?? ""}
          />
        ) : (
          <Notice>Selecione um paciente para consultar o estoque.</Notice>
        )
      }
    </Workspace>
  );
}
function PatientStock({
  context,
  initialCustody,
}: {
  context: WorkspaceContext;
  initialCustody: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const liveRevision = useLiveRevision();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [custody, setCustody] = useState(initialCustody);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ productId: "", from: "", to: "" });
  const [operation, setOperation] = useState("inbound");
  const [movementEditor, setMovementEditor] = useState<HTMLElement | null>(
    null,
  );
  const [movementProductId, setMovementProductId] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [savedMovement, setSavedMovement] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{
    id: string;
    opener: HTMLElement;
  } | null>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement | null>(null);
  const focusAfterReviewRef = useRef(false);
  useEffect(() => {
    if (review) reviewHeadingRef.current?.focus();
  }, [review]);
  useEffect(() => {
    if (!review && !busy && focusAfterReviewRef.current) {
      focusAfterReviewRef.current = false;
      reasonInputRef.current?.focus();
    }
  }, [review, busy]);
  const hasStock =
    can(context, "stock.family.read") || can(context, "stock.team.read");
  const frozenRef = useRef<Record<string, unknown> | null>(null);
  const patient = context.patient!.id;
  const revision = `${attempt}:${liveRevision}`;
  const stock = useScopedRead<{
    overview: ProductStock[];
    transit: TransitDocument[];
    metrics: StockMetric[];
  }>(
    hasStock || (custody === "TRANSIT" && can(context, "ent.read"))
      ? "/api/stock/balances?" +
          new URLSearchParams({ careRecipientId: patient, custody })
      : null,
    revision,
  );
  const history = useScopedRead<{ data: Movement[]; total: number }>(
    hasStock
      ? "/api/stock/movements?" +
          new URLSearchParams({
            careRecipientId: patient,
            page: String(page),
            location: custody,
            ...filters,
          })
      : null,
    revision,
  );
  const products = stock.data?.overview ?? [];
  const movements = history.data?.data ?? [];
  const total = history.data?.total ?? 0;
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setReview({
      careRecipientId: context.patient!.id,
      productId: form.get("productId"),
      quantity: form.get("quantity"),
      action: operation,
      reason: form.get("reason"),
      idempotencyKey: crypto.randomUUID(),
      ...(form.get("referenceId")
        ? { referenceId: form.get("referenceId") }
        : {}),
    });
  }
  async function save() {
    if (!frozenRef.current) frozenRef.current = review;
    if (!frozenRef.current) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: string }>(
        "/api/stock/movements",
        frozenRef.current,
      );
      frozenRef.current = null;
      setUncertain(false);
      setReview(null);
      setSavedMovement(result.id);
      setMovementEditor(null);
      setMessage(
        "Movimentação familiar confirmada. O histórico original foi preservado.",
      );
      setAttempt((value) => value + 1);
    } catch (reason) {
      const rejected =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status);
      if (rejected) {
        frozenRef.current = null;
        setReview(null);
        focusAfterReviewRef.current = true;
      }
      setUncertain(!rejected);
      setError(
        reason instanceof Error ? reason.message : "Resultado não confirmado.",
      );
    } finally {
      setBusy(false);
    }
  }
  const name = (id: string) =>
    products.find((product) => product.productId === id)?.name ?? "Produto";
  const hasFamily = can(context, "stock.family.read");
  const hasTeam = can(context, "stock.team.read");
  const visible = products.filter((product) =>
    product.name
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className="space-y-5">
      {can(context, "ent.create") && hasStock ? (
        <Link className={buttonClass} href="/transferencias">
          Transferir materiais entre família e equipe
        </Link>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {origin ? (
        <MovementOrigin
          patientId={patient}
          movementId={origin.id}
          opener={origin.opener}
          onClose={() => setOrigin(null)}
          restoreFocusFallbackRef={historyHeadingRef}
        />
      ) : null}
      <section
        className="ui-card"
        aria-labelledby="stock-balances-heading"
        aria-busy={stock.loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="stock-balances-heading" className="font-semibold">
            Saldos e previsões
          </h2>
          <button
            className={buttonClass}
            aria-disabled={stock.loading}
            onClick={() => {
              if (!stock.loading) stock.refresh();
            }}
          >
            Atualizar saldos
          </button>
        </div>
        {stock.loading ? <Notice>Consultando saldos…</Notice> : null}
        {stock.error ? <Notice error>{stock.error}</Notice> : null}
        {stock.queriedAt ? (
          <p className="mt-3 text-xs text-(--muted)">
            {stock.loading || stock.error
              ? "Última consulta válida"
              : "Saldos consultados"}
            : {formatBrazilDate(stock.queriedAt)}
            {stock.loading || stock.error
              ? ". Os valores podem estar desatualizados."
              : "."}
          </p>
        ) : !stock.loading ? (
          <Notice>Saldos ainda não consultados com sucesso.</Notice>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Buscar produto
            <input
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Custódia
            <select
              className={inputClass}
              aria-label="Custódia"
              value={custody}
              onChange={(event) => {
                setCustody(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas autorizadas</option>
              {hasFamily ? <option value="FAMILY">Família</option> : null}
              {hasTeam ? <option value="CARE_TEAM">Equipe</option> : null}
              {can(context, "ent.read") ? (
                <option value="TRANSIT">Materiais em trânsito</option>
              ) : null}
            </select>
          </label>
        </div>
        <p className="mt-4 text-xs leading-5 text-(--muted)">
          Saldo confirmado está disponível na custódia. Trânsito e compras
          pendentes são previsões e dependem de recebimento válido. Somente a
          ENT aceita atende as linhas REQ.
        </p>
        {custody === "TRANSIT" && stock.data ? (
          <TransitStock
            documents={stock.data.transit}
            search={search}
            loading={stock.loading}
          />
        ) : null}
        {custody !== "TRANSIT" && stock.data ? (
          <StockOverview
            products={visible}
            custody={custody}
            allowedCustodies={[
              ...(hasFamily ? ["FAMILY"] : []),
              ...(hasTeam ? ["CARE_TEAM"] : []),
            ]}
            metrics={stock.data.metrics}
          />
        ) : null}
        {custody !== "TRANSIT" &&
        stock.data &&
        !stock.loading &&
        !stock.error &&
        !visible.length ? (
          <EmptyState title="Nenhum produto encontrado">
            Consulte o catálogo ou ajuste a busca.
          </EmptyState>
        ) : null}
      </section>
      {custody !== "TRANSIT" && can(context, "stock.family.manage") ? (
        <div className="hca-toolbar">
          <Button
            appearance="primary"
            icon={<Icon name="plus" />}
            onClick={(event) => {
              setOperation("inbound");
              setMovementProductId("");
              setReferenceId("");
              setMovementEditor(event.currentTarget);
            }}
          >
            Movimentar estoque familiar
          </Button>
        </div>
      ) : null}
      {movementEditor &&
      custody !== "TRANSIT" &&
      can(context, "stock.family.manage") ? (
        <RecordDrawer
          title={
            review
              ? "Confirmar movimentação familiar"
              : "Movimentar estoque familiar"
          }
          busy={busy}
          preventClose={uncertain}
          onClose={() => {
            setMovementEditor(null);
            setReview(null);
            frozenRef.current = null;
          }}
          restoreFocusTo={movementEditor}
          restoreFocusFallbackRef={historyHeadingRef}
        >
          {error ? <Notice error>{error}</Notice> : null}
          {review ? (
            <section
              aria-label="Revisão da movimentação familiar"
              className="space-y-3"
            >
              <h3 ref={reviewHeadingRef} tabIndex={-1}>
                Confira o movimento e sua referência
              </h3>
              <p>Produto: {name(String(review.productId))}</p>
              <p>
                Quantidade:{" "}
                {formatQuantity(
                  String(review.quantity ?? ""),
                  products.find(
                    (product) => product.productId === review.productId,
                  )?.unit,
                )}
              </p>
              <p>
                Operação:{" "}
                {review.action === "inbound"
                  ? "Entrada avulsa"
                  : review.action === "outbound"
                    ? "Retirada"
                    : review.action === "correction_in"
                      ? "Correção compensatória de entrada"
                      : "Correção compensatória de saída"}
                .
              </p>
              {review.referenceId ? (
                <details>
                  <summary>Movimento histórico compensado</summary>
                  <p className="break-all">{String(review.referenceId)}</p>
                </details>
              ) : null}
              <p className="whitespace-pre-wrap">
                Motivo: {String(review.reason ?? "")}
              </p>
              <p>
                Apenas o saldo familiar deste material será atualizado. A
                operação original permanecerá no histórico; não há transferência
                nem consumo inferido.
              </p>
              {uncertain ? (
                <Notice>
                  Resultado ainda não confirmado. Os campos e a chave estão
                  congelados até recuperar a mesma tentativa.
                </Notice>
              ) : null}
              <div className="ui-form-actions">
                <button
                  className={buttonClass}
                  disabled={busy || uncertain}
                  onClick={() => {
                    focusAfterReviewRef.current = true;
                    setReview(null);
                  }}
                >
                  Voltar
                </button>
                <button
                  className={primaryClass}
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy
                    ? "Confirmando…"
                    : uncertain
                      ? "Recuperar tentativa"
                      : "Confirmar"}
                </button>
              </div>
            </section>
          ) : null}
          <form
            hidden={Boolean(review)}
            className={review ? "hidden" : "mt-4 space-y-4"}
            onSubmit={prepare}
          >
            <fieldset
              disabled={busy || uncertain}
              className="grid min-w-0 gap-4 sm:grid-cols-2"
            >
              <label className="text-sm font-semibold">
                Operação
                <select
                  aria-label="Operação"
                  className={inputClass}
                  value={operation}
                  onChange={(event) => {
                    setOperation(event.target.value);
                    setReferenceId("");
                  }}
                >
                  <option value="inbound">Entrada avulsa</option>
                  <option value="outbound">Retirada</option>
                  <option value="correction_in">
                    Correção compensatória de entrada
                  </option>
                  <option value="correction_out">
                    Correção compensatória de saída
                  </option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Produto
                <select
                  aria-label="Produto"
                  className={inputClass}
                  name="productId"
                  required
                  value={movementProductId}
                  onChange={(event) => {
                    setMovementProductId(event.target.value);
                    setReferenceId("");
                  }}
                >
                  <option value="">Selecione</option>
                  {products
                    .filter(
                      (product) =>
                        product.active ||
                        (operation.startsWith("correction") &&
                          Boolean(referenceId) &&
                          product.productId === movementProductId),
                    )
                    .map((product) => (
                      <option key={product.productId} value={product.productId}>
                        {product.name} · {product.unit}
                        {product.active
                          ? ""
                          : " · Inativo, somente compensação referenciada"}
                      </option>
                    ))}
                </select>
              </label>
              {operation.startsWith("correction") &&
              referenceId &&
              products.some(
                (product) =>
                  product.productId === movementProductId && !product.active,
              ) ? (
                <div className="sm:col-span-2">
                  <Notice>
                    Material inativo. Esta ação compensa somente o movimento
                    histórico indicado, preservando sua identidade e sua
                    custódia. Não reativa o cadastro nem transfere o saldo.
                  </Notice>
                </div>
              ) : null}
              <label className="text-sm font-semibold">
                Quantidade
                <input
                  className={inputClass}
                  name="quantity"
                  type="number"
                  inputMode="decimal"
                  min="0.000001"
                  step="any"
                  max="1000000000"
                  required
                />
              </label>
              {operation.startsWith("correction") ? (
                <label className="text-sm font-semibold">
                  Movimento original a compensar
                  <select
                    className={inputClass}
                    name="referenceId"
                    required
                    value={referenceId}
                    onChange={(event) => {
                      setReferenceId(event.target.value);
                      const original = movements.find(
                        (row) => row.id === event.target.value,
                      );
                      if (original) setMovementProductId(original.product_id);
                    }}
                  >
                    <option value="">
                      Selecione uma movimentação do histórico
                    </option>
                    {movements
                      .filter(
                        (row) =>
                          row.reference_type === "family_manual" &&
                          (!movementProductId ||
                            row.product_id === movementProductId) &&
                          (operation === "correction_in"
                            ? row.source_location === "FAMILY" &&
                              !row.destination_location
                            : row.destination_location === "FAMILY" &&
                              !row.source_location),
                      )
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {name(row.product_id)} ·{" "}
                          {formatBrazilDate(row.created_at)} ·{" "}
                          {formatQuantity(row.quantity)} ·{" "}
                          {row.source_location === "FAMILY"
                            ? "Retirada"
                            : "Entrada"}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              <label className="text-sm font-semibold sm:col-span-2">
                Motivo
                <textarea
                  ref={reasonInputRef}
                  className={inputClass}
                  name="reason"
                  minLength={3}
                  maxLength={1000}
                  rows={3}
                  required
                />
              </label>
            </fieldset>
            <button className={primaryClass} disabled={busy || uncertain}>
              Revisar movimentação
            </button>
          </form>
          {savedMovement ? (
            <p className="mt-4 break-all text-xs text-(--muted)">
              Movimentação registrada: {savedMovement}
            </p>
          ) : null}
        </RecordDrawer>
      ) : null}
      {savedMovement ? (
        <Attachments
          patientId={context.patient!.id}
          movementId={savedMovement}
          writable
        />
      ) : null}
      <section
        className="ui-card"
        aria-labelledby="stock-history-heading"
        aria-busy={history.loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="stock-history-heading"
            className="font-semibold"
            ref={historyHeadingRef}
            tabIndex={-1}
          >
            Histórico auditável
          </h2>
          <button
            className={buttonClass}
            aria-disabled={history.loading || !hasStock}
            onClick={() => {
              if (!history.loading && hasStock) history.refresh();
            }}
          >
            Atualizar histórico
          </button>
          <button
            className={buttonClass}
            aria-expanded={showFilters}
            onClick={() => setShowFilters((value) => !value)}
          >
            <Icon name="search" />
            Filtrar
          </button>
        </div>
        {history.loading ? <Notice>Consultando movimentações…</Notice> : null}
        {history.error ? <Notice error>{history.error}</Notice> : null}
        {history.queriedAt ? (
          <p className="mt-3 text-xs text-(--muted)">
            {history.loading || history.error
              ? "Última consulta válida"
              : "Histórico consultado"}
            : {formatBrazilDate(history.queriedAt)}
            {history.loading || history.error
              ? ". A lista pode estar desatualizada."
              : "."}
          </p>
        ) : !history.loading ? (
          <Notice>
            {hasStock
              ? "Histórico ainda não consultado com sucesso."
              : "Histórico de movimentos indisponível nas suas permissões."}
          </Notice>
        ) : null}
        {showFilters ? (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setFilters({
                productId: String(form.get("productId")),
                from: String(form.get("from")),
                to: String(form.get("to")),
              });
              setPage(1);
            }}
          >
            <label className="text-sm">
              Produto
              <select
                className={inputClass}
                name="productId"
                defaultValue={filters.productId}
              >
                <option value="">Todos</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              De
              <input
                className={inputClass}
                type="date"
                name="from"
                defaultValue={filters.from}
              />
            </label>
            <label className="text-sm">
              Até
              <input
                className={inputClass}
                type="date"
                name="to"
                defaultValue={filters.to}
              />
            </label>
            <button className={primaryClass}>Aplicar filtros</button>
          </form>
        ) : null}
        <ul className="mt-4 space-y-3">
          {movements.map((movement) => (
            <li
              key={movement.id}
              className="rounded-lg border border-(--line) p-3 text-sm"
            >
              <p className="font-semibold">
                {name(movement.product_id)} ·{" "}
                {formatQuantity(movement.quantity)}
              </p>
              <p className="mt-1">
                {movement.source_location
                  ? locationLabels[movement.source_location]
                  : "Entrada"}{" "}
                →{" "}
                {movement.destination_location
                  ? locationLabels[movement.destination_location]
                  : "Retirada / consumo"}
              </p>
              <p className="mt-1">{movement.justification}</p>
              <p className="mt-2 text-xs text-(--muted)">
                {formatBrazilDate(movement.created_at)}
              </p>
              <Button
                className="mt-2"
                onClick={(event) =>
                  setOrigin({ id: movement.id, opener: event.currentTarget })
                }
              >
                Consultar origem
              </Button>
              {movement.reference_type === "document" &&
              movement.reference_id ? (
                <Link
                  className="mt-2 inline-block underline"
                  href={"/fichas/" + movement.reference_id}
                >
                  Abrir ficha
                </Link>
              ) : null}
              {movement.reference_type === "delivery_regularization" &&
              movement.reference_document_id ? (
                <Link
                  className="mt-2 inline-block underline"
                  href={"/fichas/" + movement.reference_document_id}
                >
                  Abrir dossiê administrativo
                </Link>
              ) : null}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs">
                  Referência da movimentação
                </summary>
                <p className="break-all text-xs">{movement.id}</p>
              </details>
              {can(context, "stock.family.manage") &&
              movement.reference_type === "family_manual" &&
              (movement.source_location === "FAMILY" ||
                movement.destination_location === "FAMILY") ? (
                <Button
                  className="mt-3"
                  onClick={(event) => {
                    setOperation(
                      movement.source_location === "FAMILY"
                        ? "correction_in"
                        : "correction_out",
                    );
                    setMovementProductId(movement.product_id);
                    setReferenceId(movement.id);
                    setMovementEditor(event.currentTarget);
                  }}
                >
                  Corrigir este movimento
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {history.data &&
        !history.loading &&
        !history.error &&
        !movements.length ? (
          <EmptyState title="Sem movimentações neste filtro" />
        ) : null}
        {total > 20 ? (
          <nav
            className="mt-4 flex items-center justify-between gap-3"
            aria-label="Páginas das movimentações"
          >
            <button
              className={buttonClass}
              disabled={page === 1 || history.loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </button>
            <span className="text-sm">
              {page} / {Math.ceil(total / 20)}
            </span>
            <button
              className={buttonClass}
              disabled={page * 20 >= total || history.loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Próxima
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
