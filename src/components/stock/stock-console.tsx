"use client";
import { PurchaseArrivalReview, type OpenUnlinkedArrival } from "@/components/documents/purchase-arrival-review";
import { UnlinkedArrivalAction, UnlinkedArrivalHistory } from "@/components/documents/unlinked-arrival";
import { FamilyStockPreparation } from "./family-stock-preparation";
import { FamilyStockOperation } from "./family-stock-operation";
import type { StockOperationInput } from "@/lib/validation/stock-operation";
import type { CatalogProduct } from "@/types/documents";
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
import { useCallback, useRef, useState } from "react";
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
import { TransitStock } from "./transit-stock";
import { formatBrazilDate } from "@/lib/receipt";

import { parseStockBalances, parseStockOperationHistory } from "@/lib/validation/stock-reads";
import { StockOverview } from "./stock-overview";

import { useScopedRead } from "@/lib/use-scoped-read";
import { StockMovementHistory, stockOperationOrigins } from "./stock-movement-history";
import { MovementOrigin } from "./movement-origin";
import { useNotificationReference } from "@/lib/notifications/use-notification-reference";
import { NotificationReference } from "@/components/notifications/notification-reference";

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
  const [transitProduct, setTransitProduct] = useState<string>();
  const [balanceFilter, setBalanceFilter] = useState<StockBalanceFilter>("all");
  const [custody, setCustody] = useState(initialCustody);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ productId: "", from: "", to: "", origin: "", search: "" });
  const [filterFields, setFilterFields] = useState(filters);
  const changeFilter = (field: keyof typeof filters, value: string) =>
    setFilterFields(current => ({ ...current, [field]: value }));
  const [operation, setOperation] = useState<StockOperationInput["action"]>("inbound");
  const [movementEditor, setMovementEditor] = useState<HTMLElement | null>(
    null,
  );
  const [movementProductId, setMovementProductId] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [legacyEditor, setLegacyEditor] = useState(false);
  const [savedMovement, setSavedMovement] = useState<string | null>(null);
  const [savedMovementIds, setSavedMovementIds] = useState<string[]>([]);
  const [origin, setOrigin] = useState<{
    id: string;
    opener: HTMLElement;
  } | null>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const arrivalReviewRef = useRef<OpenUnlinkedArrival>(null);
  const hasStock =
    can(context, "stock.family.read") || can(context, "stock.team.read");
  const hasFamily = can(context, "stock.family.read");
  const canMoveFamily = can(context, "stock.family.manage");
  const patient = context.patient!.id;
  const params = useSearchParams(),
    notice = useNotificationReference(
      patient,
      "stock",
      params.get("ref"),
      params.get("refKind") ?? "auto",
    );
  const revision = `${attempt}:${liveRevision}`;
  const decodeBalances = useCallback((value: unknown) => parseStockBalances(value, { careRecipientId: patient, custody }), [patient, custody]);
  const decodeHistory = useCallback((value: unknown) => parseStockOperationHistory(value, {
    careRecipientId: patient, page, pageSize: 20, location: custody, ...filters,
  }), [patient, page, custody, filters]);
  const stock = useScopedRead(
    hasStock || (custody === "TRANSIT" && can(context, "ent.read"))
      ? "/api/stock/balances?" +
          new URLSearchParams({ careRecipientId: patient, custody })
      : null,
    revision,
    decodeBalances,
  );
  const history = useScopedRead(
    hasStock
      ? "/api/stock/movements?" +
          new URLSearchParams({
            careRecipientId: patient,
            view: "operations",
            page: String(page),
            location: custody,
            ...filters,
          })
      : null,
    revision,
    decodeHistory,
  );
  const products = stock.data?.overview ?? [];
  const operations = history.data?.data ?? [];
  const movements = operations.flatMap(operation => operation.rows);
  const total = history.data?.total ?? 0;
  const legacy = useScopedRead<{ data: { id: string } | null }>(hasFamily || canMoveFamily
    ? "/api/stock/preparations?" + new URLSearchParams({ careRecipientId: patient, targetResourceId: patient, purpose: "family_movement" })
    : null, revision);
  const catalogue = useScopedRead<{ data: CatalogProduct[] }>(canMoveFamily && !hasStock
    ? "/api/catalog?" + new URLSearchParams({ careRecipientId: patient, includeInactive: "true" })
    : null, revision);
  const movementProducts = hasStock ? products : (catalogue.data?.data ?? []).map(item => ({
    productId: item.id, name: item.name, unit: item.unit, active: item.active !== false,
  }));
  const showFamilyArrivals = hasFamily && custody !== "CARE_TEAM" && custody !== "TRANSIT";
  const hasTeam = can(context, "stock.team.read");
  const wantedMaterial = search.trim().toLocaleLowerCase("pt-BR");
  const visible = products.filter(product => [product.name, product.productId].some(value =>
    value.toLocaleLowerCase("pt-BR").includes(wantedMaterial)));
  return (
    <div className="hca-stock-console space-y-5">
      <NotificationReference
        key={patient + ":" + notice.reference}
        read={notice}
        context={context}
        onStockFilter={(productId, location) => {
          setCustody(location);
          setFilters((current) => ({ ...current, productId }));
          setFilterFields((current) => ({ ...current, productId }));
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
          effect={movements.find(row => row.id === origin.id)}
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
          {showFamilyArrivals || params.has("arrival") ? <div className="flex flex-wrap gap-2">
            {showFamilyArrivals ? <UnlinkedArrivalAction context={context} /> : null}
            <PurchaseArrivalReview context={context} unlinkedArrivalRef={arrivalReviewRef} showTrigger={showFamilyArrivals} />
          </div> : null}
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
              onChange={(event) => { setTransitProduct(undefined); setSearch(event.target.value); }}
            />
          </FormField>
          <FormField label="Custódia">
            <SelectField
              aria-label="Custódia"
              value={custody}
              onChange={(event) => {
                setTransitProduct(undefined);
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
                <option value="undefined">Sem mínimo definido</option>
              </SelectField>
            </FormField>
          ) : null}
        </div>
        <p className="mt-4 text-xs leading-5 text-(--muted)">
          Trânsito, compras e chegadas aguardando validação aparecem em separado.
        </p>
        {custody === "TRANSIT" && stock.data ? (
          <TransitStock
            documents={stock.data.transit}
            search={search}
            productId={transitProduct}
            loading={stock.loading}
            showEmpty={!stock.error}
          />
        ) : null}
        {custody !== "TRANSIT" && stock.data ? (
          <StockOverview
            key={JSON.stringify([custody, search, balanceFilter])}
            context={context}
            products={visible}
            custody={custody}
            allowedCustodies={[
              ...(hasFamily ? ["FAMILY"] : []),
              ...(hasTeam ? ["CARE_TEAM"] : []),
            ]}
            metrics={stock.data.metrics}
            queriedAt={stock.queriedAt}
            onTransit={product => { setTransitProduct(product.productId); setSearch(product.name); setCustody("TRANSIT"); setPage(1); }}
            filter={balanceFilter}
            showEmpty={!stock.loading && !stock.error}
          />
        ) : null}
      </section>
      {showFamilyArrivals || params.has("arrival") ? <UnlinkedArrivalHistory context={context} revision={revision} arrivalId={params.get("arrival")}
        onReview={(...args) => arrivalReviewRef.current?.(...args)} /> : null}
      {custody !== "TRANSIT" && canMoveFamily ? (
        <div className="hca-toolbar">
          <ActionButton
            variant="primary"
            onClick={(event) => {
              setOperation("inbound");
              setLegacyEditor(false);
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
      {legacy.data?.data?.id && custody !== "TRANSIT" ? (
        <ActionButton
          onClick={(event) => {
            setOperation("inbound");
            setLegacyEditor(true);
            setMovementProductId("");
            setReferenceId("");
            setMovementEditor(event.currentTarget);
          }}
        >
          Consultar meu preenchimento familiar
        </ActionButton>
      ) : null}
      {movementEditor && custody !== "TRANSIT" && canMoveFamily && !legacyEditor ? <FamilyStockOperation
        context={context} initial={{ action: operation, productId: movementProductId, referenceId }}
        products={movementProducts} movements={movements} opener={movementEditor} fallbackRef={historyHeadingRef}
        onClose={() => setMovementEditor(null)}
        onCommitted={receipt => {
          setSavedMovementIds(receipt.movementIds);
          setSavedMovement(receipt.movementIds[0]);
          setMovementEditor(null);
          setMessage("Movimentação familiar confirmada. O histórico original foi preservado.");
          setAttempt(value => value + 1);
        }} /> : null}
      {movementEditor && legacyEditor && custody !== "TRANSIT" && (hasFamily || canMoveFamily) ? (
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
            setSavedMovementIds([id]);
            setSavedMovement(id);
            setMovementEditor(null);
            setMessage(
              "Movimentação familiar confirmada. O histórico original foi preservado.",
            );
            setAttempt((n) => n + 1);
          }}
        />
      ) : null}
      {savedMovementIds.length > 1 ? <FormField label="Movimento para anexar comprovante">
        <SelectField value={savedMovement ?? ""} onChange={event => setSavedMovement(event.currentTarget.value)}>
          {savedMovementIds.map((id, index) => <option key={id} value={id}>Movimento {index + 1} da operação confirmada</option>)}
        </SelectField>
      </FormField> : null}
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
              setFilters({ ...filterFields, search: String(form.get("search")).trim() });
              setPage(1);
            }}
          >
            <FormField label="Buscar no histórico">
              <TextInput name="search" placeholder="Material, ficha ou movimento" maxLength={160}
                value={filterFields.search} onChange={event => changeFilter("search", event.currentTarget.value)} />
            </FormField>
            <FormField label="Origem">
              <SelectField name="origin" value={filterFields.origin} onChange={event => changeFilter("origin", event.currentTarget.value)}>
                <option value="">Todas</option>
                {Object.entries(stockOperationOrigins).map(([value, entry]) => <option key={value} value={value}>{entry.title}</option>)}
              </SelectField>
            </FormField>
            <label className="text-sm">
              Produto
              <select
                className={inputClass}
                name="productId"
                value={filterFields.productId}
                onChange={event => changeFilter("productId", event.currentTarget.value)}
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
                value={filterFields.from}
                onChange={event => changeFilter("from", event.currentTarget.value)}
              />
            </label>
            <label className="text-sm">
              Até
              <input
                className={inputClass}
                type="date"
                name="to"
                value={filterFields.to}
                onChange={event => changeFilter("to", event.currentTarget.value)}
              />
            </label>
            <button type="submit" className={primaryClass}>Aplicar filtros</button>
          </form>
        ) : null}
        <StockMovementHistory operations={operations} canCorrect={can(context,"stock.family.manage")}
          onOrigin={(movement,target) => setOrigin({ id: movement.id, opener: target })}
          onCorrect={(movement,target) => {
            setLegacyEditor(false);
            setOperation(movement.source_location === "FAMILY" ? "correction_in" : "correction_out");
            setMovementProductId(movement.product_id); setReferenceId(movement.id); setMovementEditor(target);
          }} />
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
