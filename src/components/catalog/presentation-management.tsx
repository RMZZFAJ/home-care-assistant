"use client";
import { SearchSelect } from "@/components/ui/search-select";
import { ActionButton, CheckboxField, DefinitionGrid, FormField, SelectField, TextInput, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, Pill } from "@/components/ui/controls";
import { TableFrame } from "@/components/ui/table-frame";
import { useEffect, useId, useRef, useState } from "react";

import { Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { EmptyState } from "@/components/ui/primitives";
import { useScopedRead } from "@/lib/use-scoped-read";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { presentationCommandSchema } from "@/lib/validation/catalogue";
import type { CatalogProduct } from "@/types/documents";
import type { ProductPresentation, PresentationsRead } from "@/types/catalogue";
import type { CatalogueOutcome, CatalogueScope, PresentationFields } from "@/lib/validation/catalogue-preparation";
import { CatalogueDraftButtons, CataloguePreparationFeedback } from "./catalogue-preparation-controls";
import { useCatalogueProductReference, type CatalogueComplementaryReference } from "./catalogue-complementary-reference";
import { sendPreparedCatalogueCommit, useCataloguePreparation } from "./use-catalogue-preparation";

function presentationOutcome(outcome: CatalogueOutcome) {
  return "presentationId" in outcome ? `Apresentação registrada na versão ${outcome.version}.` : "Apresentação confirmada.";
}

export function PresentationManagement({
  userId,
  patientId,
  writable,
}: {
  userId: string;
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
        <FormField label="Pesquisar apresentações"><TextInput type="search" value={search} onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} /></FormField>
        <FormField label="Situação das apresentações"><SelectField value={status} onChange={event => { setStatus(event.currentTarget.value); setPage(1); }}>
          <option value="active">Ativas</option><option value="inactive">Inativas</option><option value="">Todas</option>
        </SelectField></FormField>
      </div>
      <TableFrame label="Apresentações por material"><DataTable className="hca-table hca-mobile-records" aria-label="Apresentações por material">
        <DataTableHead><DataTableRow>{["Apresentação","Material","Código","Equivalência","Situação","Ações"].map(label => <DataTableHeading key={label} scope="col">{label}</DataTableHeading>)}</DataTableRow></DataTableHead>
        <DataTableBody>{filtered.slice((currentPage-1)*15,currentPage*15).map(row => {
          const product = products.find(p => p.id === row.product_id);
          return <DataTableRow key={row.id} data-presentation-id={row.id}>
            <DataTableCell><strong>{row.name}</strong><small>Versão {row.version}</small></DataTableCell>
            <DataTableCell data-label="Material">{product?.name ?? "Material autorizado"}<small>{product?.unit ?? "Unidade não disponível nesta consulta"}</small></DataTableCell>
            <DataTableCell data-label="Código"><span className="wrap-anywhere">{row.barcode}</span></DataTableCell>
            <DataTableCell data-label="Equivalência">{quantity(row.base_quantity).isFinite() ? "1 embalagem = " + formatQuantity(row.base_quantity,product?.unit) : "Fator legado inválido: requer revisão explícita, sem conversão."}</DataTableCell>
            <DataTableCell data-label="Situação"><Pill tone={row.active ? "success" : "neutral"}>{row.active ? "Ativa" : "Inativa"}</Pill></DataTableCell>
            <DataTableCell data-label="Ações"><ActionButton onClick={event => setEditor({ row,opener:event.currentTarget })} aria-label={"Consultar " + row.name}>Consultar{writable ? " / editar" : ""}</ActionButton></DataTableCell>
          </DataTableRow>;
        })}</DataTableBody>
      </DataTable></TableFrame>
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
          userId={userId}
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
  userId,
  patientId,
  products,
  initial,
  writable,
  opener,
  onClose,
  onSaved,
}: {
  userId: string;
  patientId: string;
  products: CatalogProduct[];
  initial: ProductPresentation | null;
  writable: boolean;
  opener: HTMLElement;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const scope: CatalogueScope = { patientId, mode: "patient", purpose: initial ? "presentation_edit" : "presentation_create", targetId: initial?.id ?? null };
  const [productSearch, setProductSearch] = useState("");
  const [review, setReview] = useState<{ fields: PresentationFields; hash: string } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const fieldId = useId(), fieldRefsRef = useRef<Record<string, HTMLElement | null>>({}), focusFieldRef = useRef<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const editor = useCataloguePreparation<PresentationFields, CatalogueComplementaryReference>({
    scope, userId, separateReference: true,
    defaultFields: reference => ({ productId: reference.presentation?.product_id ?? "", name: reference.presentation?.name ?? "",
      barcode: reference.presentation?.barcode ?? "", factor: reference.presentation ? String(reference.presentation.base_quantity) : "",
      active: reference.presentation?.active ?? true }),
    hashFor: reference => reference.hash,
    sendCommit: attempt => sendPreparedCatalogueCommit("/api/catalog/presentations", attempt),
    onCommit: (outcome, recovered) => {
      onSaved(presentationOutcome(outcome) + (recovered ? " A intenção original foi recuperada." : ""));
      onClose();
    },
    onRejected: () => {
      setReview(null);
      focusFieldRef.current = "name";
      setFieldErrors({});
    },
  });
  useEffect(() => {
    if (focusFieldRef.current && !editor.busy) {
      fieldRefsRef.current[focusFieldRef.current]?.focus();
      focusFieldRef.current = null;
    }
  }, [fieldErrors, editor.busy]);
  const fields = editor.fields;
  const { productId, name, barcode, factor, active } = fields ?? {
    productId: initial?.product_id ?? "", name: "", barcode: "", factor: "", active: true,
  };
  function field<Key extends keyof PresentationFields>(key: Key, value: PresentationFields[Key]) {
    if (fields) editor.setFields({ ...fields, [key]: value });
  }
  const selected = useCatalogueProductReference(scope, productId, editor.snapshot?.reference, editor.referenceAttempt);
  const sourceReference = selected.reference;
  const reference = editor.snapshot?.reference.presentation ?? initial;
  const product = products.find(row => row.id === productId);
  const sourceHash = editor.reviewedHash ?? sourceReference?.hash ?? null;
  const referenceChanged = !!(sourceReference && sourceHash && sourceReference.hash !== sourceHash);
  const history = useScopedRead<PresentationsRead>(initial
    ? `/api/catalog/presentations?careRecipientId=${patientId}&presentationId=${initial.id}&includeInactive=true&historyPage=${historyPage}`
    : null);
  const disabled = editor.busy || editor.locked || !writable || !fields;
  const comparison = referenceChanged ? sourceReference?.presentation : null;
  function chooseProduct(productId: string) {
    field("productId", productId);
    editor.setReviewedHash(null);
  }
  function prepare() {
    if (!fields || !sourceHash || referenceChanged || selected.loading || selected.error || editor.locked) return;
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
      editor.setError(first ? errors[first] : "Confira os campos da apresentação.");
      return;
    }
    setFieldErrors({});
    editor.setError("");
    setReview({ hash: sourceHash, fields: { ...fields, factor: result.data.baseQuantity } });
  }
  return (
    <RecordDrawer
      title={initial ? "Apresentação e histórico" : "Nova apresentação"}
      busy={editor.busy}
      preventClose={!!editor.pending}
      hasUnsavedChanges={editor.dirty}
      onClose={onClose}
      restoreFocusTo={opener}
    >
      <div className="space-y-4">
        <CataloguePreparationFeedback editor={editor} onClose={onClose} outcomeText={presentationOutcome}
          compareFields={values => <DefinitionGrid items={[
            { label: "Material", value: products.find(row => row.id === values.productId)?.name ?? (values.productId || "Em branco") },
            { label: "Nome", value: values.name || "Em branco" },
            { label: "Código", value: values.barcode || "Em branco" },
            { label: "Fator", value: values.factor || "Em branco" },
            { label: "Situação", value: values.active ? "Ativa" : "Inativa" },
          ]} />}retryLabel="Recuperar apresentação" writable={writable} />
        {selected.error ? <Notice error>{selected.error} <ActionButton type="button" onClick={selected.refresh}>Consultar referência novamente</ActionButton></Notice> : null}
        {referenceChanged && sourceReference && writable && !editor.pending ? (
          <div className="hca-attention">
            {comparison && reference?.version !== comparison.version ? <p>Você editou v{reference?.version}; cadastro atual v{comparison.version}.</p>
              : <p>A referência mudou desde o preenchimento.</p>}
            {sourceReference.product ? <p>{sourceReference.product.name} · {sourceReference.product.unit} · {sourceReference.product.decimals} casa(s).</p> : null}
            {comparison ? <>
              <p>Fator informado: {factor}. Fator atual: {formatQuantity(comparison.base_quantity, sourceReference.product?.unit)}.</p>
              <p>Nome atual: {comparison.name}. Código atual: {comparison.barcode}.</p>
            </> : null}
            <ActionButton
              disabled={disabled}
              onClick={() => {
                editor.setReviewedHash(sourceReference.hash);
                setReview(null);
                editor.setError("");
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
        ) : writable && fields && editor.draft?.state !== "consumed" ? (
          <label className="block text-sm font-semibold">
            Material
            <SearchSelect
              ref={node => { fieldRefsRef.current.productId = node?.querySelector<HTMLInputElement>("input") ?? node; }}
              aria-invalid={Boolean(fieldErrors.productId)}
              aria-describedby={fieldErrors.productId ? fieldId + "-productId" : undefined}
              style={{ minWidth: 0, width: "100%" }}
              aria-label="Material da apresentação"
              query={productSearch || product?.name || ""}
              selectedIds={productId ? [productId] : []}
              disabled={disabled || !!review}
              onQueryChange={queryValue => {
                setProductSearch(queryValue);
                chooseProduct("");
              }}
              onSelectionChange={nextIds => {
                chooseProduct(nextIds[0] ?? "");
                setProductSearch("");
              }}
              options={(products
                .filter(
                  (p) =>
                    p.active !== false &&
                    [p.name, ...(p.aliases ?? [])]
                      .join(" ")
                      .toLocaleLowerCase("pt-BR")
                      .includes(productSearch.toLocaleLowerCase("pt-BR")),
                )
                .map((p) => (
                  ({ value: p.id, label: p.name, content: <>
                    {p.name} · {p.unit}
                  </> })
                ))) ?? []}
            />
            {fieldErrors.productId ? <span id={fieldId + "-productId"} className="ui-field-error">{fieldErrors.productId}</span> : null}
          </label>
        ) : null}
        {!initial && product ? (
          <p className="text-sm">
            Unidade base: {product.unit} · {product.quantity_decimals ?? 0}{" "}
            casa(s). Para mudar a precisão sem histórico, use a configuração de
            unidades.
          </p>
        ) : null}
        {!writable && !editor.pending ? (
          <div className="space-y-2 text-sm">
            <Notice>
              Consulta em leitura. Seu vínculo não permite editar esta
              apresentação.
            </Notice>
            <DefinitionGrid items={[
              { label: "Nome", value: reference?.name ?? "Não disponível" },
              { label: "Código", value: reference?.barcode ?? "Não disponível" },
              { label: "Fator", value: reference ? formatQuantity(reference.base_quantity,product?.unit) : "Não disponível" },
              { label: "Situação", value: reference ? reference.active ? "Ativa" : "Inativa" : "Não disponível" },
            ]} />
          </div>
        ) : review && !editor.conflict ? (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Revisar apresentação</h3>
            <DefinitionGrid items={[
              { label: "Material", value: product?.name ?? "Material não disponível nesta consulta" },
              { label: "Nome", value: name },
              { label: "Código", value: barcode },
              { label: "Equivalência", value: "1 embalagem = " + formatQuantity(factor,product?.unit) },
              { label: "Situação", value: active ? "Ativa para novas escolhas" : "Inativa; documentos anteriores preservados" },
            ]} />
            <p>
              O estoque permanece intacto. Documentos emitidos conservam o fator
              original.
            </p>
            <div className="hca-toolbar">
              <ActionButton type="button" disabled={editor.busy || !!editor.pending} onClick={() => setReview(null)}>
                Voltar aos campos
              </ActionButton>
              {!editor.pending ? <ActionButton type="button" variant="primary" disabled={editor.busy || referenceChanged || selected.loading || !!selected.error}
                onClick={() => editor.start("commit", review.hash, review.fields)}>
                Confirmar apresentação
              </ActionButton> : null}
            </div>
          </div>
        ) : fields && editor.draft?.state !== "consumed" && !editor.pending ? (
          <form
            noValidate
            className="hca-form"
            onSubmit={(event) => {
              event.preventDefault();
              prepare();
            }}
          >
            <fieldset className="min-w-0 space-y-4" disabled={disabled}>
              <label className="block text-sm font-semibold">
                <span id={fieldId + "-name-label"}>Nome da apresentação</span>
                <TextInput
                  aria-labelledby={fieldId + "-name-label"}
                  ref={node => { fieldRefsRef.current.name = node; }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? fieldId + "-name" : undefined}
                      value={name}
                  onChange={(event) => field("name", event.target.value)}
                  minLength={2}
                  maxLength={160}
                  required
                />
                {fieldErrors.name ? <span id={fieldId + "-name"} className="ui-field-error">{fieldErrors.name}</span> : null}
              </label>
              <label className="block text-sm font-semibold">
                <span id={fieldId + "-barcode-label"}>Código da apresentação</span>
                <TextInput
                  aria-labelledby={fieldId + "-barcode-label"}
                  ref={node => { fieldRefsRef.current.barcode = node; }}
                  aria-invalid={Boolean(fieldErrors.barcode)}
                  aria-describedby={fieldErrors.barcode ? fieldId + "-barcode" : undefined}
                      value={barcode}
                  onChange={(event) => field("barcode", event.target.value)}
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
                <TextInput
                  aria-labelledby={fieldId + "-baseQuantity-label"}
                  ref={node => { fieldRefsRef.current.baseQuantity = node; }}
                  aria-invalid={Boolean(fieldErrors.baseQuantity)}
                  aria-describedby={fieldErrors.baseQuantity ? fieldId + "-baseQuantity" : undefined}
                                    inputMode="decimal"
                  value={factor}
                  onChange={(event) => field("factor", event.target.value)}
                  maxLength={64}
                  required
                />
                {fieldErrors.baseQuantity ? <span id={fieldId + "-baseQuantity"} className="ui-field-error">{fieldErrors.baseQuantity}</span> : null}
                <span className="block text-xs font-normal">
                  Quantidade de {product?.unit ?? "unidade base"} em uma
                  embalagem; positiva, sem arredondamento.
                </span>
              </label>
              <CheckboxField label="Apresentação ativa para novas escolhas" checked={active}
                onChange={event => field("active", event.target.checked)} />
            </fieldset>
            <div className="hca-toolbar">
              <ActionButton type="submit" variant="primary" disabled={disabled || referenceChanged || selected.loading || !!selected.error}>
                Revisar apresentação
              </ActionButton>
              <CatalogueDraftButtons editor={editor} hash={sourceHash} />
            </div>
          </form>
        ) : null}
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
