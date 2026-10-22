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
      context.patient
        ? api<{ data: CatalogProduct[] }>(
            "/api/catalog?careRecipientId=" + context.patient.id,
            undefined,
            controller.signal,
          )
        : Promise.resolve({ data: [] }),
    ])
      .then(([u, p]) => {
        setUnits(u.data);
        setProducts(p.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [context.patient, attempt]);
  async function save(url: string, payload: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(url, payload);
      setMessage("Configuração salva.");
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
      <section className="ui-card">
        <h2 className="font-semibold">Unidades disponíveis</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <li
              key={unit.id}
              className="rounded border border-(--line) p-3 text-sm"
            >
              <strong>{unit.name}</strong>
              <p className="mt-1 text-xs text-(--muted)">
                {unit.code} · até {unit.decimals} casa(s) ·{" "}
                {unit.care_recipient_id ? "Paciente" : "Global"}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {context.isGlobalAdmin || can(context, "catalog.manage") ? (
        <section className="ui-card">
          <h2 className="font-semibold">Nova unidade</h2>
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
                {context.patient ? (
                  <option value="patient">Paciente selecionado</option>
                ) : null}
                {context.isGlobalAdmin ? (
                  <option value="global">Global</option>
                ) : null}
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
        </section>
      ) : null}
      {context.patient && can(context, "catalog.manage") ? (
        <section className="ui-card">
          <h2 className="font-semibold">Unidade base e código de embalagem</h2>
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
        </section>
      ) : null}
    </div>
  );
}
