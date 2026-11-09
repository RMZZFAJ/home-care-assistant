"use client";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useId, useRef, useState } from "react";
import { Combobox, Option } from "@fluentui/react-components";
import { api, ApiError, inputClass, Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { EmptyState } from "@/components/ui/primitives";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { presentationCommandSchema } from "@/lib/validation/catalogue";
import type { CatalogProduct } from "@/types/documents";
import type { ProductPresentation, PresentationsRead } from "@/types/catalogue";

export function PresentationManagement({
  patientId,
  writable,
}: {
  patientId: string;
  writable: boolean;
}) {
  const source = useScopedRead<PresentationsRead>(
    `/api/catalog/presentations?careRecipientId=${patientId}&includeInactive=true`,
  );
  const catalog = useScopedRead<{ data: CatalogProduct[] }>(
    `/api/catalog?careRecipientId=${patientId}&includeInactive=true`,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{
    row: ProductPresentation | null;
    opener: HTMLElement;
  } | null>(null);
  const [message, setMessage] = useState("");
  const refreshRef = useRef<HTMLButtonElement>(null);
  const focusAfterSaveRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (editor || source.loading || !focusAfterSaveRef.current) return;
    const opener = focusAfterSaveRef.current;
    focusAfterSaveRef.current = null;
    if (!opener.isConnected)
      requestAnimationFrame(() => {
        if (document.activeElement === document.body)
          refreshRef.current?.focus();
      });
  }, [editor, source.data, source.loading]);
  const products = catalog.data?.data ?? [];
  const filtered = (source.data?.data ?? []).filter(
    (row) =>
      (!status || row.active === (status === "active")) &&
      [
        row.name,
        row.barcode,
        products.find((p) => p.id === row.product_id)?.name,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 15)),
  );
  return (
    <section
      className="ui-card space-y-4"
      aria-labelledby="presentations-heading"
    >
      <div className="hca-section-heading">
        <div>
          <h2 id="presentations-heading">Apresentações por material</h2>
          <p>
            Embalagem, código textual e equivalência na unidade base. Alterações
            valem para novas escolhas.
          </p>
        </div>
        <div className="hca-toolbar">
          <ActionButton ref={refreshRef} onClick={() => source.refresh()}>
            Atualizar apresentações
          </ActionButton>
          {writable ? (
            <ActionButton
              variant="primary"
              disabled={!catalog.data}
              onClick={(event) =>
                setEditor({ row: null, opener: event.currentTarget })
              }
            >
              Nova apresentação
            </ActionButton>
          ) : null}
        </div>
      </div>
      {message ? <Notice>{message}</Notice> : null}
      {source.loading || catalog.loading ? (
        <Notice>Consultando apresentações e materiais…</Notice>
      ) : null}
      {source.error ? (
        <Notice error>
          {source.error}
          {source.data
            ? " Última consulta válida preservada; os dados podem estar desatualizados."
            : " Apresentações indisponíveis."}
        </Notice>
      ) : null}
      {catalog.error ? (
        <Notice error>
          {catalog.error} Não foi possível atualizar os materiais.
        </Notice>
      ) : null}
      {source.queriedAt ? (
        <p className="text-xs text-(--muted)">
          Consulta: {formatBrazilDate(source.queriedAt)}
        </p>
      ) : null}
      <div className="hca-toolbar">
        <label>
          Pesquisar apresentações
          <input
            className={inputClass}
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Situação das apresentações
          <select
            className={inputClass}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
            <option value="">Todas</option>
          </select>
        </label>
      </div>
      <ul className="space-y-3">
        {filtered.slice((currentPage - 1) * 15, currentPage * 15).map((row) => {
          const product = products.find((p) => p.id === row.product_id);
          return (
            <li
              className="rounded-lg border border-(--line) p-4 text-sm"
              key={row.id}
            >
              <h3 className="font-semibold">{row.name}</h3>
              <p>
                {product?.name ?? "Material autorizado"} ·{" "}
                {row.active ? "Ativa" : "Inativa"} · v{row.version}
              </p>
              <p className="break-all">Código: {row.barcode}</p>
              <p>
                {quantity(row.base_quantity).isFinite()
                  ? `1 embalagem = ${formatQuantity(row.base_quantity, product?.unit)}`
                  : "Fator legado inválido: requer revisão explícita, sem conversão."}
              </p>
              <ActionButton
                className="mt-2"
                onClick={(event) =>
                  setEditor({ row, opener: event.currentTarget })
                }
                aria-label={`Consultar ${row.name}`}
              >
                Consultar{writable ? " / editar" : ""}
              </ActionButton>
            </li>
          );
        })}
      </ul>
      {source.data && !source.loading && !source.error && !filtered.length ? (
        <EmptyState title="Nenhuma apresentação nesta seleção">
          Ajuste a busca ou cadastre uma embalagem. A entrada manual na unidade
          base continua disponível.
        </EmptyState>
      ) : null}
      {filtered.length > 15 ? (
        <nav aria-label="Páginas das apresentações" className="hca-pagination">
          <ActionButton
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </ActionButton>
          <span>
            {currentPage} / {Math.ceil(filtered.length / 15)}
          </span>
          <ActionButton
            disabled={currentPage * 15 >= filtered.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Próxima
          </ActionButton>
        </nav>
      ) : null}
      {editor ? (
        <PresentationEditor
          key={editor.row?.id ?? "new"}
          patientId={patientId}
          products={products}
          initial={editor.row}
          writable={writable}
          opener={editor.opener}
          onClose={() => setEditor(null)}
          onSaved={(text) => {
            focusAfterSaveRef.current = editor.opener;
            setMessage(text);
            source.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function PresentationEditor({
  patientId,
  products,
  initial,
  writable,
  opener,
  onClose,
  onSaved,
}: {
  patientId: string;
  products: CatalogProduct[];
  initial: ProductPresentation | null;
  writable: boolean;
  opener: HTMLElement;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [reference, setReference] = useState(initial);
  const [productId, setProductId] = useState(initial?.product_id ?? "");
  const [productSearch, setProductSearch] = useState("");
  const [name, setName] = useState(initial?.name ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [factor, setFactor] = useState(
    initial ? String(initial.base_quantity) : "",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<ProductPresentation | null>(
    null,
  );
  const [historyPage, setHistoryPage] = useState(1);
  const packetRef = useRef<ReturnType<
    typeof presentationCommandSchema.parse
  > | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId(), fieldRefsRef = useRef<Record<string, HTMLElement | null>>({}), focusFieldRef = useRef<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (focusFieldRef.current) { fieldRefsRef.current[focusFieldRef.current]?.focus(); focusFieldRef.current = null; }
  }, [fieldErrors]);
  const focusAfterRejectionRef = useRef(false);
  useEffect(() => {
    if (!review && !busy && focusAfterRejectionRef.current) {
      focusAfterRejectionRef.current = false;
      firstInputRef.current?.focus();
    }
  }, [review, busy]);
  const history = useScopedRead<PresentationsRead>(
    reference
      ? `/api/catalog/presentations?careRecipientId=${patientId}&presentationId=${reference.id}&includeInactive=true&historyPage=${historyPage}`
      : null,
  );
  const product = products.find((p) => p.id === productId);
  const disabled = busy || uncertain || !writable;
  function prepare() {
    const result = presentationCommandSchema.safeParse({
      action: "presentation",
      careRecipientId: patientId,
      id: reference?.id ?? null,
      referenceVersion: reference?.version ?? null,
      productId,
      name,
      barcode,
      baseQuantity: factor,
      active,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (["productId", "name", "barcode", "baseQuantity"].includes(key) && !errors[key]) errors[key] = issue.message;
      }
      const first = ["productId", "name", "barcode", "baseQuantity"].find(key => errors[key]);
      setFieldErrors(errors); focusFieldRef.current = first ?? "name";
      setError(first ? errors[first] : "Confira os campos da apresentação.");
      return;
    }
    packetRef.current = result.data;
    setFieldErrors({});
    setError("");
    setReview(true);
  }
  async function save() {
    if (!packetRef.current) return;
    setBusy(true);
    setError("");
    try {
      const response = await api<{
        data: {
          result: ProductPresentation;
          current: ProductPresentation;
          replayed: boolean;
        };
      }>("/api/catalog/presentations", packetRef.current);
      const { result, current } = response.data;
      onSaved(
        `Apresentação registrada na versão ${result.version}.${current.version !== result.version ? ` O cadastro já está na versão ${current.version}; a intenção original foi recuperada.` : ""}`,
      );
      packetRef.current = null;
      setUncertain(false);
      onClose();
    } catch (reason) {
      const rejected =
        reason instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(reason.status);
      setError(
        reason instanceof Error ? reason.message : "Resultado não confirmado.",
      );
      setUncertain(!rejected);
      if (rejected) {
        packetRef.current = null;
        focusAfterRejectionRef.current = true;
        setReview(false);
      }
      if (reason instanceof ApiError && reason.status === 409 && reference) {
        try {
          const fresh = await api<PresentationsRead>(
            `/api/catalog/presentations?careRecipientId=${patientId}&presentationId=${reference.id}&includeInactive=true`,
          );
          setComparison(fresh.data[0] ?? null);
        } catch {
          setError(
            "Conflito confirmado. Os campos foram preservados; a referência atual está indisponível. Consulte novamente.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <RecordDrawer
      title={initial ? "Apresentação e histórico" : "Nova apresentação"}
      busy={busy}
      preventClose={uncertain}
      onClose={onClose}
      restoreFocusTo={opener}
    >
      <div className="space-y-4">
        {error ? <Notice error>{error}</Notice> : null}
        {comparison ? (
          <div className="rounded-lg border border-(--line) p-3 text-sm">
            <p>
              Você editou v{reference?.version}; cadastro atual v
              {comparison.version}.
            </p>
            <p>
              Fator informado: {factor}. Fator atual:{" "}
              {formatQuantity(comparison.base_quantity, product?.unit)}.
            </p>
            <p>
              Nome atual: {comparison.name}. Código atual: {comparison.barcode}.
            </p>
            <ActionButton
              disabled={disabled}
              onClick={() => {
                setReference(comparison);
                setComparison(null);
                history.refresh();
              }}
            >
              Adotar referência atual e manter meus campos
            </ActionButton>
          </div>
        ) : null}
        {initial ? (
          <p className="text-sm">
            Material: <strong>{product?.name ?? initial.product_id}</strong>
            <br />
            Unidade base: {product?.unit ?? "Fonte indisponível"} · referência v
            {reference?.version}
          </p>
        ) : (
          <label className="block text-sm font-semibold">
            Material
            <Combobox
              ref={node => { fieldRefsRef.current.productId = node?.querySelector<HTMLInputElement>("input") ?? node; }}
              aria-invalid={Boolean(fieldErrors.productId)}
              aria-describedby={fieldErrors.productId ? fieldId + "-productId" : undefined}
              style={{ minWidth: 0, width: "100%" }}
              aria-label="Material da apresentação"
              value={productSearch || product?.name || ""}
              selectedOptions={productId ? [productId] : []}
              disabled={disabled || review}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setProductId("");
              }}
              onOptionSelect={(_, data) => {
                setProductId(data.optionValue ?? "");
                setProductSearch("");
              }}
            >
              {products
                .filter(
                  (p) =>
                    p.active !== false &&
                    [p.name, ...(p.aliases ?? [])]
                      .join(" ")
                      .toLocaleLowerCase("pt-BR")
                      .includes(productSearch.toLocaleLowerCase("pt-BR")),
                )
                .map((p) => (
                  <Option key={p.id} value={p.id} text={p.name}>
                    {p.name} · {p.unit}
                  </Option>
                ))}
            </Combobox>
            {fieldErrors.productId ? <span id={fieldId + "-productId"} className="ui-field-error">{fieldErrors.productId}</span> : null}
          </label>
        )}
        {!initial && product ? (
          <p className="text-sm">
            Unidade base: {product.unit} · {product.quantity_decimals ?? 0}{" "}
            casa(s). Para mudar a precisão sem histórico, use a configuração de
            unidades.
          </p>
        ) : null}
        {!writable && !uncertain ? (
          <div className="space-y-2 text-sm">
            <Notice>
              Consulta em leitura. Seu vínculo não permite editar esta
              apresentação.
            </Notice>
            <dl>
              <dt>Nome</dt>
              <dd>{reference?.name}</dd>
              <dt>Código</dt>
              <dd className="break-all">{reference?.barcode}</dd>
              <dt>Fator</dt>
              <dd>
                {reference
                  ? formatQuantity(reference.base_quantity, product?.unit)
                  : "Não disponível"}
              </dd>
              <dt>Situação</dt>
              <dd>{reference?.active ? "Ativa" : "Inativa"}</dd>
            </dl>
          </div>
        ) : review ? (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Revisar apresentação</h3>
            <p>Material: {product?.name}</p>
            <p>Nome: {name}</p>
            <p className="break-all">Código: {barcode}</p>
            <p>1 embalagem = {formatQuantity(factor, product?.unit)}</p>
            <p>
              Situação:{" "}
              {active
                ? "Ativa para novas escolhas"
                : "Inativa; documentos anteriores preservados"}
            </p>
            <p>
              O estoque permanece intacto. Documentos emitidos conservam o fator
              original.
            </p>
            <div className="hca-toolbar">
              <ActionButton
                disabled={busy || uncertain}
                onClick={() => {
                  setReview(false);
                  packetRef.current = null;
                }}
              >
                Voltar aos campos
              </ActionButton>
              <ActionButton
                variant="primary"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy
                  ? "Registrando…"
                  : uncertain
                    ? "Recuperar apresentação"
                    : "Confirmar apresentação"}
              </ActionButton>
            </div>
          </div>
        ) : (
          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              prepare();
            }}
          >
            <fieldset className="min-w-0 space-y-4" disabled={disabled}>
              <label className="block text-sm font-semibold">
                <span id={fieldId + "-name-label"}>Nome da apresentação</span>
                <input
                  aria-labelledby={fieldId + "-name-label"}
                  ref={node => { firstInputRef.current = node; fieldRefsRef.current.name = node; }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? fieldId + "-name" : undefined}
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={160}
                  required
                />
                {fieldErrors.name ? <span id={fieldId + "-name"} className="ui-field-error">{fieldErrors.name}</span> : null}
              </label>
              <label className="block text-sm font-semibold">
                <span id={fieldId + "-barcode-label"}>Código da apresentação</span>
                <input
                  aria-labelledby={fieldId + "-barcode-label"}
                  ref={node => { fieldRefsRef.current.barcode = node; }}
                  aria-invalid={Boolean(fieldErrors.barcode)}
                  aria-describedby={fieldErrors.barcode ? fieldId + "-barcode" : undefined}
                  className={inputClass}
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]{8,14}"
                  maxLength={14}
                  required
                />
                <span className="block text-xs font-normal">
                  Mantenha todos os zeros iniciais.
                </span>
                {fieldErrors.barcode ? <span id={fieldId + "-barcode"} className="ui-field-error">{fieldErrors.barcode}</span> : null}
              </label>
              <label className="block text-sm font-semibold">
                <span id={fieldId + "-baseQuantity-label"}>Fator na unidade base</span>
                <input
                  aria-labelledby={fieldId + "-baseQuantity-label"}
                  ref={node => { fieldRefsRef.current.baseQuantity = node; }}
                  aria-invalid={Boolean(fieldErrors.baseQuantity)}
                  aria-describedby={fieldErrors.baseQuantity ? fieldId + "-baseQuantity" : undefined}
                  className={inputClass}
                  inputMode="decimal"
                  value={factor}
                  onChange={(event) => setFactor(event.target.value)}
                  maxLength={64}
                  required
                />
                {fieldErrors.baseQuantity ? <span id={fieldId + "-baseQuantity"} className="ui-field-error">{fieldErrors.baseQuantity}</span> : null}
                <span className="block text-xs font-normal">
                  Quantidade de {product?.unit ?? "unidade base"} em uma
                  embalagem; positiva, sem arredondamento.
                </span>
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                Apresentação ativa para novas escolhas
              </label>
            </fieldset>
            {writable ? (
              <ActionButton
                type="submit"
                variant="primary"
                disabled={disabled}
              >
                Revisar apresentação
              </ActionButton>
            ) : (
              <Notice>
                Consulta em leitura. Seu vínculo não permite editar esta
                apresentação.
              </Notice>
            )}
          </form>
        )}
        {reference ? (
          <section className="space-y-3" aria-label="Histórico da apresentação">
            <h3 className="font-semibold">Histórico de equivalências</h3>
            <ActionButton onClick={() => history.refresh()}>
              Atualizar histórico da apresentação
            </ActionButton>
            {history.loading ? <Notice>Consultando histórico…</Notice> : null}
            {history.error ? (
              <Notice error>
                {history.error}
                {history.data
                  ? " Última consulta preservada."
                  : " Histórico indisponível."}
              </Notice>
            ) : null}
            <ol className="space-y-3">
              {history.data?.versions?.map((row) => (
                <li
                  key={row.version}
                  className="rounded-lg border border-(--line) p-3 text-sm"
                >
                  <strong>
                    v{row.version} · {row.definition.name}
                  </strong>
                  <p className="break-all">Código: {row.definition.barcode}</p>
                  <p>
                    Fator: {String(row.definition.base_quantity)}{" "}
                    {row.definition.unit} ·{" "}
                    {row.definition.active ? "Ativa" : "Inativa"}
                  </p>
                  <p>
                    {row.definition.capturedExisting
                      ? "Definição legada capturada; autoria e data da edição anterior não preservadas."
                      : `${row.definition.actorName ?? "Autoria não disponível"} · ${formatBrazilDate(row.recorded_at)}`}
                  </p>
                </li>
              ))}
            </ol>
            {(history.data?.versionTotal ?? 0) > 20 ? (
              <nav
                className="hca-pagination"
                aria-label="Páginas do histórico da apresentação"
              >
                <ActionButton
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(historyPage - 1)}
                >
                  Mais recentes
                </ActionButton>
                <span>{historyPage}</span>
                <ActionButton
                  disabled={
                    historyPage * 20 >= (history.data?.versionTotal ?? 0)
                  }
                  onClick={() => setHistoryPage(historyPage + 1)}
                >
                  Mais antigas
                </ActionButton>
              </nav>
            ) : null}
          </section>
        ) : null}
      </div>
    </RecordDrawer>
  );
}
