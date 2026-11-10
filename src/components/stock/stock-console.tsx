"use client";
import { FamilyStockPreparation } from "./family-stock-preparation";
import {
  ActionButton,
  FormField,
  SelectField,
  TextInput,
} from "@/components/ui/controls";
import type { StockBalanceFilter } from "@/lib/stock-presentation";
import { useLiveRevision } from "@/lib/use-live-revision";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import {
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

import { useScopedRead } from "@/lib/use-scoped-read";
import { MovementOrigin } from "./movement-origin";
import { useNotificationReference } from "@/lib/notifications/use-notification-reference";
import { NotificationReference } from "@/components/notifications/notification-reference";

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
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const liveRevision = useLiveRevision();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<StockBalanceFilter>("all");
  const [custody, setCustody] = useState(initialCustody);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ productId: "", from: "", to: "" });
  const [operation, setOperation] = useState("inbound");
  const [movementEditor, setMovementEditor] = useState<HTMLElement | null>(
    null,
  );
  const [movementProductId, setMovementProductId] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [savedMovement, setSavedMovement] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{
    id: string;
    opener: HTMLElement;
  } | null>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const hasStock =
    can(context, "stock.family.read") || can(context, "stock.team.read");
  const patient = context.patient!.id;
  const params = useSearchParams(),
    notice = useNotificationReference(
      patient,
      "stock",
      params.get("ref"),
      params.get("refKind") ?? "auto",
    );
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
    <div className="hca-stock-console space-y-5">
      <NotificationReference
        key={patient + ":" + notice.reference}
        read={notice}
        context={context}
        onStockFilter={(productId, location) => {
          setCustody(location);
          setFilters((current) => ({ ...current, productId }));
          setPage(1);
          historyHeadingRef.current?.focus();
        }}
      />
      {can(context, "ent.create") && hasStock ? (
        <Link className={buttonClass} href="/transferencias">
          Transferir materiais entre família e equipe
        </Link>
      ) : null}
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
        <div className="hca-stock-filters">
          <FormField label="Buscar produto">
            <TextInput
              leading={<Icon name="search" />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </FormField>
          <FormField label="Custódia">
            <SelectField
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
            </SelectField>
          </FormField>
          {custody !== "TRANSIT" ? (
            <FormField
              label="Filtro de saldo"
              helpText="Considera somente o saldo confirmado de cada custódia."
            >
              <SelectField
                value={balanceFilter}
                onChange={(event) =>
                  setBalanceFilter(event.target.value as StockBalanceFilter)
                }
              >
                <option value="all">Todos os saldos</option>
                <option value="low">No mínimo ou abaixo</option>
                <option value="zero">Saldo zero</option>
              </SelectField>
            </FormField>
          ) : null}
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
            key={JSON.stringify([custody, search, balanceFilter])}
            products={visible}
            custody={custody}
            allowedCustodies={[
              ...(hasFamily ? ["FAMILY"] : []),
              ...(hasTeam ? ["CARE_TEAM"] : []),
            ]}
            metrics={stock.data.metrics}
            filter={balanceFilter}
            showEmpty={!stock.loading && !stock.error}
          />
        ) : null}
      </section>
      {custody !== "TRANSIT" && can(context, "stock.family.manage") ? (
        <div className="hca-toolbar">
          <ActionButton
            variant="primary"
            onClick={(event) => {
              setOperation("inbound");
              setMovementProductId("");
              setReferenceId("");
              setMovementEditor(event.currentTarget);
            }}
          >
            {<Icon name="plus" />}
            Movimentar estoque familiar
          </ActionButton>
        </div>
      ) : null}
      {(hasFamily || can(context, "stock.family.manage")) &&
      custody !== "TRANSIT" ? (
        <ActionButton
          onClick={(event) => {
            setOperation("inbound");
            setMovementProductId("");
            setReferenceId("");
            setMovementEditor(event.currentTarget);
          }}
        >
          Consultar meu preenchimento familiar
        </ActionButton>
      ) : null}
      {movementEditor &&
      custody !== "TRANSIT" &&
      (hasFamily || can(context, "stock.family.manage")) ? (
        <FamilyStockPreparation
          context={context}
          initialValues={{
            action: operation as
              | "inbound"
              | "outbound"
              | "correction_in"
              | "correction_out",
            productId: movementProductId,
            productLabel:
              products.find((p) => p.productId === movementProductId)?.name ??
              "",
            unit:
              products.find((p) => p.productId === movementProductId)?.unit ??
              "",
            referenceId,
            quantity: "",
            reason: "",
          }}
          products={products}
          movements={movements}
          restoreFocusTo={movementEditor}
          restoreFocusFallbackRef={historyHeadingRef}
          onClose={() => setMovementEditor(null)}
          onCommitted={(id) => {
            setSavedMovement(id);
            setMovementEditor(null);
            setMessage(
              "Movimentação familiar confirmada. O histórico original foi preservado.",
            );
            setAttempt((n) => n + 1);
          }}
        />
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
              <ActionButton
                className="mt-2"
                onClick={(event) =>
                  setOrigin({ id: movement.id, opener: event.currentTarget })
                }
              >
                Consultar origem
              </ActionButton>
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
                <ActionButton
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
                </ActionButton>
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
