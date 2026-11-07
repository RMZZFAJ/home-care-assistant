"use client";
import { useId, useState } from "react";
import { Button, Combobox, Option } from "@fluentui/react-components";
import { inputClass, Notice } from "@/components/workspace";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { CatalogProduct } from "@/types/documents";
import type {
  PresentationSelection,
  ProductPresentation,
} from "@/types/catalogue";

export function presentationTotal(
  selections: PresentationSelection[],
  manual: string,
) {
  if (
    !/^\d+(?:[.,]\d+)?$/.test(manual) ||
    selections.some((row) => !/^[1-9][0-9]{0,8}$/.test(row.packages))
  )
    return "";
  return selections
    .reduce(
      (sum, row) => sum.plus(quantity(row.packages).times(row.baseQuantity)),
      quantity(manual),
    )
    .toFixed();
}
export function PresentationQuantity({
  product,
  selections,
  manual,
  source,
  error,
  loading,
  refresh,
  onChange,
  validationError,
}: {
  product: CatalogProduct;
  selections: PresentationSelection[];
  manual: string;
  source: ProductPresentation[];
  error: string;
  loading: boolean;
  refresh: () => void;
  onChange: (selections: PresentationSelection[], manual: string) => void;
  validationError?: string;
}) {
  const [chosen, setChosen] = useState("");
  const [search, setSearch] = useState("");
  const errorId = useId();
  const available = source.filter(
    (row) =>
      row.product_id === product.id &&
      row.active &&
      quantity(row.base_quantity).isFinite() &&
      quantity(row.base_quantity).gt(0),
  );
  return (
    <div
      className="mt-3 min-w-0 space-y-3 rounded-lg border border-(--line) p-3 text-sm"
      style={{ overflowWrap: "anywhere" }}
      role="group"
      aria-label={`Embalagens de ${product.name}`}
    >
      <h4 className="font-semibold">Apresentações e equivalência</h4>
      {validationError ? (
        <p id={errorId} className="ui-field-error" role="alert">
          {validationError}
        </p>
      ) : null}
      {loading ? <p>Consultando apresentações…</p> : null}
      {error ? (
        <Notice error>
          {error} A entrada manual na unidade base continua disponível. Escolhas
          anteriores foram preservadas.
        </Notice>
      ) : null}
      <Button
        aria-label={"Atualizar embalagens de " + product.name}
        onClick={refresh}
      >
        Atualizar embalagens
      </Button>
      {selections.map((selected) => {
        const current = available.find((row) => row.id === selected.id);
        const changed = current?.version !== selected.version;
        return (
          <div
            className="space-y-2 rounded border border-(--line) p-3"
            key={selected.id}
          >
            <p className="font-semibold">
              {selected.name} · v{selected.version}
            </p>
            <p className="break-all">Código: {selected.barcode}</p>
            <p>
              1 embalagem ={" "}
              {formatQuantity(selected.baseQuantity, selected.unit)}
            </p>
            <label className="block">
              Embalagens — {selected.name}
              <input
                className={inputClass}
                inputMode="numeric"
                value={selected.packages}
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? errorId : undefined}
                onChange={(event) =>
                  onChange(
                    selections.map((row) =>
                      row.id === selected.id
                        ? { ...row, packages: event.target.value }
                        : row,
                    ),
                    manual,
                  )
                }
                required
                pattern="[1-9][0-9]{0,8}"
              />
            </label>
            {changed && !loading && !error ? (
              <Notice>
                {current
                  ? `Cadastro atual v${current.version}: ${current.name}, código ${current.barcode}, fator ${formatQuantity(current.base_quantity, product.unit)}. Sua escolha anterior não foi alterada.`
                  : "Esta apresentação não está disponível na fonte consultada. A escolha anterior foi preservada; revise antes de emitir."}
                {current ? (
                  <Button
                    aria-label={"Adotar fator atual de " + selected.name}
                    onClick={() =>
                      onChange(
                        selections.map((row) =>
                          row.id === selected.id
                            ? {
                                ...row,
                                version: current.version,
                                name: current.name,
                                barcode: current.barcode,
                                baseQuantity: quantity(
                                  current.base_quantity,
                                ).toFixed(),
                              }
                            : row,
                        ),
                        manual,
                      )
                    }
                  >
                    Adotar fator atual
                  </Button>
                ) : null}
              </Notice>
            ) : null}
            <Button
              aria-label={"Remover " + selected.name}
              onClick={() =>
                onChange(
                  selections.filter((row) => row.id !== selected.id),
                  manual,
                )
              }
            >
              Remover embalagem
            </Button>
          </div>
        );
      })}
      {selections.length ? (
        <>
          <label className="block">
            Quantidade adicional em {product.unit}
            <input
              className={inputClass}
              inputMode="decimal"
              value={manual}
              onChange={(event) => onChange(selections, event.target.value)}
              required
            />
          </label>
          <p>
            Quantidade total calculada:{" "}
            <strong>
              {presentationTotal(selections, manual)
                ? formatQuantity(
                    presentationTotal(selections, manual),
                    product.unit,
                  )
                : "Preencha as quantidades"}
            </strong>
          </p>
        </>
      ) : null}
      <label className="block">
        Escolher apresentação de {product.name}
        <Combobox
          style={{ minWidth: 0, width: "100%" }}
          aria-label={`Apresentação de ${product.name}`}
          value={
            search || available.find((row) => row.id === chosen)?.name || ""
          }
          selectedOptions={chosen ? [chosen] : []}
          onChange={(event) => {
            setSearch(event.target.value);
            setChosen("");
          }}
          onOptionSelect={(_, data) => {
            setChosen(data.optionValue ?? "");
            setSearch("");
          }}
        >
          {available
            .filter(
              (row) =>
                !selections.some((s) => s.id === row.id) &&
                (row.name + " " + row.barcode)
                  .toLocaleLowerCase("pt-BR")
                  .includes(search.toLocaleLowerCase("pt-BR")),
            )
            .map((row) => (
              <Option value={row.id} key={row.id} text={row.name}>
                {row.name} · {formatQuantity(row.base_quantity, product.unit)} ·{" "}
                {row.barcode}
              </Option>
            ))}
        </Combobox>
      </label>
      <Button
        aria-label={"Adicionar embalagem de " + product.name}
        disabled={
          !chosen ||
          loading ||
          Boolean(error) ||
          selections.some((row) => row.id === chosen)
        }
        onClick={() => {
          const row = available.find((item) => item.id === chosen);
          if (!row) return;
          onChange(
            [
              ...selections,
              {
                id: row.id,
                version: row.version,
                packages: "",
                name: row.name,
                barcode: row.barcode,
                baseQuantity: quantity(row.base_quantity).toFixed(),
                unit: product.unit,
              },
            ],
            manual || "0",
          );
          setChosen("");
        }}
      >
        Adicionar embalagem
      </Button>
      {!loading && !error && !available.length ? (
        <p>
          Sem apresentação ativa para este material. Informe diretamente em{" "}
          {product.unit}.
        </p>
      ) : null}
    </div>
  );
}
