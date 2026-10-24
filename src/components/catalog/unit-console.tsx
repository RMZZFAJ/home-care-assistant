"use client";
import { useEffect, useState } from "react";
import {
  api,
  can,
  inputClass,
  Notice,
  primaryClass,
  Workspace,
  type WorkspaceContext,
} from "../workspace";
import { Button, Input, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@fluentui/react-components";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { Icon, EmptyState } from "@/components/ui/primitives";
import type { CatalogProduct } from "@/types/documents";
type Unit = {
  id: string;
  code: string;
  name: string;
  dimension: string;
  decimals: number;
  care_recipient_id: string | null;
};
export function UnitConsole() {
  return (
    <Workspace title="Unidades e apresentações">
      {(context) => <Units context={context} />}
    </Workspace>
  );
}
function Units({ context }: { context: WorkspaceContext }) {
  const globalMode =
    context.activeContext?.mode === "global" &&
    context.globalAdministrationAllowed === true;
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editor, setEditor] = useState<{ mode: "unit" | "presentation"; opener: HTMLElement } | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<{ data: Unit[] }>("/api/units", undefined, controller.signal),
      context.patient && !globalMode
        ? api<{ data: CatalogProduct[] }>(
            "/api/catalog?careRecipientId=" + context.patient.id,
            undefined,
            controller.signal,
          )
        : Promise.resolve({ data: [] }),
    ])
      .then(([u, p]) => {
        if (controller.signal.aborted) return;
        setLoaded(true);
        setUnits(u.data);
        setProducts(p.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [context.patient, attempt, globalMode]);
  async function save(url: string, payload: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(url, payload);
      setMessage("Configuração salva.");
      setEditor(null);
      setAttempt((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível configurar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const product = products.find((product) => product.id === selected);
  return (
    <div className="space-y-5">
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      <section><div className="hca-section-heading"><div><h2>Unidades disponíveis</h2><p className="hca-field-hint">Unidades base e precisão dos produtos.</p></div><div className="hca-toolbar">{globalMode || can(context, "catalog.manage") ? <Button appearance="primary" icon={<Icon name="plus" />} onClick={(event) => setEditor({ mode: "unit", opener: event.currentTarget })}>Nova unidade</Button> : null}{context.patient && can(context, "catalog.manage") ? <Button onClick={(event) => setEditor({ mode: "presentation", opener: event.currentTarget })}>Configurar apresentação</Button> : null}</div></div>
      <div className="hca-toolbar"><Input type="search" contentBefore={<Icon name="search" />} aria-label="Pesquisar unidades" value={search} onChange={(_, value) => setSearch(value.value)} placeholder="Nome ou código" /></div>
      {!loaded && !error ? <Notice>Carregando unidades…</Notice> : null}
      <div className="hca-records hca-table-container"><Table className="hca-table" aria-label="Unidades base"><TableHeader><TableRow><TableHeaderCell>Unidade</TableHeaderCell><TableHeaderCell>Precisão</TableHeaderCell><TableHeaderCell>Âmbito</TableHeaderCell></TableRow></TableHeader><TableBody>{units.filter((unit) => (unit.name + " " + unit.code).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).map((unit) => <TableRow key={unit.id}><TableCell><strong>{unit.name}</strong><small className="hca-cell-secondary">{unit.code}</small></TableCell><TableCell>{unit.decimals} casa(s)</TableCell><TableCell>{unit.care_recipient_id ? "Paciente" : "Global"}</TableCell></TableRow>)}</TableBody></Table>{loaded && !units.length ? <EmptyState title="Nenhuma unidade disponível" /> : null}</div></section>
      {(globalMode || can(context, "catalog.manage")) && editor?.mode === "unit" ? (
        <RecordDrawer title="Nova unidade" busy={busy} onClose={() => setEditor(null)} restoreFocusTo={editor.opener}>
          {error ? <Notice error>{error}</Notice> : null}
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void save("/api/units", {
                careRecipientId:
                  form.get("scope") === "global"
                    ? null
                    : (context.patient?.id ?? null),
                code: form.get("code"),
                name: form.get("name"),
                dimension: form.get("dimension"),
                decimals: Number(form.get("decimals")),
              });
            }}
          >
            <label className="text-sm font-semibold">
              Âmbito
              <select name="scope" className={inputClass}>
                {context.patient && !globalMode ? (
                  <option value="patient">Paciente selecionado</option>
                ) : null}
                {globalMode ? <option value="global">Global</option> : null}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Código
              <input
                name="code"
                className={inputClass}
                maxLength={30}
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Nome
              <input
                name="name"
                className={inputClass}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Dimensão
              <select name="dimension" className={inputClass}>
                <option value="count">Contagem</option>
                <option value="volume">Volume</option>
                <option value="mass">Massa</option>
                <option value="package">Embalagem</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Casas decimais
              <input
                name="decimals"
                className={inputClass}
                type="number"
                min="0"
                max="6"
                defaultValue="0"
                required
              />
            </label>
            <button className={primaryClass} disabled={busy}>
              Criar unidade
            </button>
          </form>
        </RecordDrawer>
      ) : null}
      {context.patient && can(context, "catalog.manage") && editor?.mode === "presentation" ? (
        <RecordDrawer title="Unidade base e código de embalagem" busy={busy} onClose={() => setEditor(null)} restoreFocusTo={editor.opener}>
          {error ? <Notice error>{error}</Notice> : null}
          <p className="mt-2 text-sm text-(--muted)">
            Uma apresentação converte cada leitura para a unidade base. A
            unidade de um produto com movimentações fica preservada.
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Produto
            <select
              className={inputClass}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          {product ? (
            <form
              key={product.id}
              className="mt-4 grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void save("/api/catalog/presentations", {
                  careRecipientId: context.patient!.id,
                  productId: product.id,
                  unit: form.get("unit"),
                  decimals: Number(form.get("decimals")),
                  ...(form.get("barcode")
                    ? {
                        barcode: form.get("barcode"),
                        name: form.get("name"),
                        baseQuantity: form.get("baseQuantity"),
                      }
                    : {}),
                });
              }}
            >
              <label className="text-sm font-semibold">
                Unidade base
                <select
                  name="unit"
                  className={inputClass}
                  defaultValue={product.unit}
                >
                  {units
                    .filter(
                      (unit) =>
                        !unit.care_recipient_id ||
                        unit.care_recipient_id === context.patient?.id,
                    )
                    .map((unit) => (
                      <option key={unit.id} value={unit.code}>
                        {unit.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Precisão do produto
                <input
                  name="decimals"
                  type="number"
                  min="0"
                  max="6"
                  className={inputClass}
                  defaultValue={product.quantity_decimals ?? 0}
                  required
                />
              </label>
              <label className="text-sm font-semibold">
                EAN / GTIN / UPC opcional
                <input
                  name="barcode"
                  inputMode="numeric"
                  pattern="[0-9]{8,14}"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold">
                Nome da apresentação
                <input
                  name="name"
                  className={inputClass}
                  placeholder="Caixa com 20 unidades"
                />
              </label>
              <label className="text-sm font-semibold">
                Quantidade base por embalagem
                <input
                  name="baseQuantity"
                  type="number"
                  min="0.000001"
                  step="any"
                  className={inputClass}
                />
              </label>
              <button className={primaryClass} disabled={busy}>
                Salvar unidade / apresentação
              </button>
            </form>
          ) : null}
        </RecordDrawer>
      ) : null}
    </div>
  );
}
