"use client";
import { RelatedDocument } from "./related-document";
import { MaterialChoice } from "@/components/catalog/material-choice";
import { MaterialReview } from "./material-review";
import { DefinitionGrid } from "@/components/ui/controls";
import {
  DeliveryRecipientField,
  DeliveryRecipientReference,
} from "./delivery-recipient";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  inputClass,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import {
  PresentationQuantity,
  presentationTotal,
} from "./presentation-quantity";
import type {
  PresentationSelection,
  ProductPresentation,
} from "@/types/catalogue";
import { formatQuantity } from "@/lib/quantity";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { presentationCaption } from "@/lib/presentation-conversion";
import type {
  SupplyType,
  CatalogProduct,
  PatientPerson,
  ItemContext,
  DeliveryPreparation,
} from "@/types/documents";
export type WizardState = {
  quantities: Record<string, string>;
  notes: string;
  observationTimes?: Record<string, string | null>;
  origin: "" | "purchase" | "donation";
  source: "FAMILY" | "CARE_TEAM";
  recipientId: string;
  recipientReason?: string;
  sharedNeedReasons?: Record<string, string>;
  presentationSelections?: Record<string, PresentationSelection[]>;
  manualQuantities?: Record<string, string>;
};

export function SupplyWizardStep({
  step,
  type,
  context,
  form,
  setForm,
  fieldErrors,
  catalog,
  people,
  links,
  setLinks,
  requestOptions,
  requisitionId,
  scan,
  recipientContext,
  recipientComparison,
  recipientError,
  recipientLoading,
  previousRecipient,
  refreshRecipients,
  adoptRecipients,
  presentations,
  presentationError,
  presentationLoading,
  refreshPresentations,
}: {
  step: number;
  type: SupplyType;
  context: WorkspaceContext;
  form: WizardState;
  setForm: Dispatch<SetStateAction<WizardState>>;
  fieldErrors: Record<string, string>;
  catalog: CatalogProduct[];
  people: PatientPerson[];
  links: Record<string, string[]>;
  setLinks: Dispatch<SetStateAction<Record<string, string[]>>>;
  requestOptions: ItemContext[];
  requisitionId: string | null;
  scan: (code: string) => Promise<void>;
  recipientContext: DeliveryPreparation | null;
  recipientComparison: DeliveryPreparation | null;
  recipientError: string;
  recipientLoading: boolean;
  previousRecipient?: string | null;
  refreshRecipients: () => void;
  adoptRecipients: () => void;
  presentations: ProductPresentation[];
  presentationError: string;
  presentationLoading: boolean;
  refreshPresentations: () => void;
}) {
  const category = ["medicamentos", "higiene", "dieta"][step - 1] ?? "";
  const [searchByCategory, setSearchByCategory] = useState<
    Record<string, string>
  >({});
  const search = searchByCategory[category] ?? "";
  const visibleProducts = catalog.filter(
    (product) =>
      product.category === category &&
      [
        product.name,
        ...(product.aliases ?? []),
        ...(product.selectionPredecessors ?? []).map((row) => row.name),
      ].some((name) =>
        normalizeCatalogText(name).includes(normalizeCatalogText(search)),
      ),
  );
  const selected = catalog.filter((product) =>
    Object.hasOwn(form.quantities, product.id),
  );
  function updatePackages(
    productId: string,
    selections: PresentationSelection[],
    manual: string,
  ) {
    setForm((current) => ({
      ...current,
      presentationSelections: {
        ...current.presentationSelections,
        [productId]: selections,
      },
      manualQuantities: { ...current.manualQuantities, [productId]: manual },
      quantities: {
        ...current.quantities,
        [productId]: selections.length
          ? presentationTotal(selections, manual)
          : manual,
      },
    }));
  }
  return (
    <>
      {step === 0 ? (
        <>
          <p className="text-sm leading-6 text-(--muted)">
            {type === "COM"
              ? "Solicite os itens necessários à família. Compra ou doação entram pela mesma ficha, sem comprovante de pagamento obrigatório."
              : type === "ENT"
                ? "Selecione as custódias e a pessoa que confirmará o recebimento. A expedição deixa os materiais em trânsito."
                : "Conte todos os produtos sob responsabilidade familiar que estão com a equipe. Materiais de terceiros ficam fora deste controle."}
          </p>
          {type === "COM" ? (
            <label className="block text-sm font-semibold">
              Forma de aquisição
              <select
                className={inputClass}
                value={form.origin}
                required
                aria-invalid={Boolean(fieldErrors.origin)}
                aria-describedby={
                  fieldErrors.origin
                    ? "purchase-origin-hint purchase-origin-error"
                    : "purchase-origin-hint"
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    origin: event.target.value as WizardState["origin"],
                  })
                }
              >
                <option value="">Escolha compra ou doação</option>
                <option value="purchase">Compra pela família</option>
                <option value="donation">
                  Doação / incorporação sem pagamento
                </option>
              </select>
              <span id="purchase-origin-hint" className="hca-field-hint">
                Escolha a origem deste ato. Previsão e emissão ainda não
                incorporam material ao estoque.
              </span>
              {fieldErrors.origin ? (
                <span id="purchase-origin-error" className="ui-field-error">
                  {fieldErrors.origin}
                </span>
              ) : null}
            </label>
          ) : null}
          {type === "ENT" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Origem
                <select
                  className={inputClass}
                  value={form.source}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      source: event.target.value as "FAMILY" | "CARE_TEAM",
                      recipientId: "",
                    })
                  }
                >
                  <option value="FAMILY">Entrega de materiais · Família → Equipe</option>
                  <option value="CARE_TEAM">
                    Devolução de materiais · Equipe → Família
                  </option>
                </select>
              </label>
              <DeliveryRecipientField
                key={form.source}
                data={recipientContext}
                comparison={recipientComparison}
                error={recipientError}
                loading={recipientLoading}
                form={form}
                setForm={setForm}
                fieldErrors={fieldErrors}
                previousRecipient={previousRecipient}
                onRefresh={refreshRecipients}
                onAdopt={adoptRecipients}
              />
            </div>
          ) : null}
          {requisitionId ? (
            <Notice>
              Produtos vinculados à REQ de origem. Informe as quantidades deste
              ato; a requisição não define quantidade solicitada.
            </Notice>
          ) : null}
          {type !== "BAL" &&
          requestOptions.some((option) => option.pending.length) ? (
            <details className="rounded-xl border border-(--line) p-4">
              <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                Vincular requisições pendentes
              </summary>
              <p className="my-3 text-xs text-(--muted)">
                Marque explicitamente as linhas atendidas por esta operação. A
                compra não atende a REQ; somente o aceite positivo da ENT
                vinculada.
              </p>
              <div className="space-y-3">
                {requestOptions
                  .filter((option) => option.pending.length)
                  .map((option) => (
                    <fieldset
                      className="rounded-lg border border-(--line) p-3"
                      key={option.productId}
                    >
                      <legend className="px-1 text-sm font-semibold">
                        {
                          catalog.find(
                            (product) => product.id === option.productId,
                          )?.name
                        }
                      </legend>
                      {option.pending.map((request) => (
                        <label
                          className="flex min-h-11 items-center gap-3 text-sm"
                          key={request.lineId}
                        >
                          <input
                            type="checkbox"
                            checked={
                              links[option.productId]?.includes(
                                request.lineId,
                              ) ?? false
                            }
                            onChange={(event) => {
                              setLinks((current) => ({
                                ...current,
                                [option.productId]: event.target.checked
                                  ? [
                                      ...(current[option.productId] ?? []),
                                      request.lineId,
                                    ]
                                  : (current[option.productId] ?? []).filter(
                                      (id) => id !== request.lineId,
                                    ),
                              }));
                              if (event.target.checked)
                                setForm((current) => ({
                                  ...current,
                                  quantities: {
                                    ...current.quantities,
                                    [option.productId]:
                                      current.quantities[option.productId] ??
                                      "",
                                  },
                                }));
                            }}
                          />
                          {request.code}
                          <RelatedDocument
                            id={request.requisitionId}
                            label="Conferir REQ"
                          />
                        </label>
                      ))}
                      {(links[option.productId]?.length ?? 0) > 1 ? (
                        <label className="mt-3 block text-sm font-semibold">
                          Justificativa da necessidade compartilhada
                          <textarea
                            className={inputClass}
                            required
                            minLength={3}
                            maxLength={500}
                            value={
                              form.sharedNeedReasons?.[option.productId] ?? ""
                            }
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                sharedNeedReasons: {
                                  ...current.sharedNeedReasons,
                                  [option.productId]: event.target.value,
                                },
                              }))
                            }
                          />
                          <span className="block text-xs font-normal text-(--muted)">
                            As REQs representam a mesma necessidade. O estoque
                            recebe a quantidade desta ENT uma única vez.
                          </span>
                          {fieldErrors[option.productId + ":shared"] ? (
                            <span className="ui-field-error">
                              {fieldErrors[option.productId + ":shared"]}
                            </span>
                          ) : null}
                        </label>
                      ) : null}
                    </fieldset>
                  ))}
              </div>
            </details>
          ) : null}
        </>
      ) : null}
      {step >= 1 && step <= 3 ? (
        <>
          {type !== "BAL" ? <BarcodeScanner onRead={scan} /> : null}
          <label className="block text-sm font-semibold">
            Buscar materiais nesta categoria
            <input
              type="search"
              className={inputClass}
              value={search}
              onChange={(event) =>
                setSearchByCategory((current) => ({
                  ...current,
                  [category]: event.target.value,
                }))
              }
            />
          </label>
          <p
            role="status"
            aria-label="Resultado da busca e seleção de materiais"
            className="text-sm"
          >
            {visibleProducts.length}{" "}
            {visibleProducts.length === 1
              ? "material encontrado"
              : "materiais encontrados"}
            . {Object.keys(form.quantities).length}{" "}
            {Object.keys(form.quantities).length === 1
              ? "material selecionado"
              : "materiais selecionados"}
            . As seleções permanecem ao filtrar ou trocar de categoria.
          </p>
          {!visibleProducts.length ? (
            <Notice>
              Nenhum material nesta busca. Ajuste ou limpe o filtro; suas
              seleções continuam preservadas.
            </Notice>
          ) : null}
          <div className="space-y-3">
            {visibleProducts.map((product) => {
              const checked =
                type === "BAL" || Object.hasOwn(form.quantities, product.id);
              return (
                <MaterialChoice
                  selected={checked}
                  quantity
                  className="product-choice"
                  key={product.id}
                >
                  <label className="hca-material-choice-heading">
                    {type !== "BAL" ? (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setForm((current) => {
                            const quantities = {
                              ...current.quantities,
                            };
                            const presentationSelections = {
                              ...current.presentationSelections,
                            };
                            const manualQuantities = {
                              ...current.manualQuantities,
                            };
                            if (event.target.checked)
                              quantities[product.id] = "";
                            else {
                              delete quantities[product.id];
                              delete presentationSelections[product.id];
                              delete manualQuantities[product.id];
                            }
                            return {
                              ...current,
                              quantities,
                              presentationSelections,
                              manualQuantities,
                            };
                          })
                        }
                      />
                    ) : null}
                    <span className="hca-material-choice-copy">
                      <strong>{product.name}</strong>
                      <small>
                        {product.unit}
                        {links[product.id]?.length ? " · Vinculado à REQ" : ""}
                      </small>
                      {product.selectionPredecessors?.length ? (
                        <span className="mt-2 block text-xs">
                          Opção para novas escolhas após{" "}
                          {product.selectionPredecessors
                            .map((row) => `${row.name} (${row.unit})`)
                            .join(", ")}
                          . Confira a unidade {product.unit}; não há conversão
                          do saldo anterior.
                        </span>
                      ) : null}
                    </span>
                  </label>
                  {checked &&
                  !form.presentationSelections?.[product.id]?.length ? (
                    <label className="product-quantity text-xs font-semibold">
                      {type === "BAL"
                        ? "Contagem física"
                        : type === "COM"
                          ? "Quantidade a adquirir"
                          : "Quantidade expedida"}
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={form.quantities[product.id] ?? ""}
                        aria-label={"Quantidade — " + product.name}
                        aria-invalid={Boolean(fieldErrors[product.id])}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            quantities: {
                              ...current.quantities,
                              [product.id]: event.target.value,
                            },
                            manualQuantities: {
                              ...current.manualQuantities,
                              [product.id]: event.target.value,
                            },
                          }))
                        }
                      />
                      {fieldErrors[product.id] ? (
                        <span className="ui-field-error">
                          {fieldErrors[product.id]}
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                  {checked && type !== "BAL" ? (
                    <div className="col-span-full w-full">
                      <PresentationQuantity
                        product={product}
                        selections={
                          form.presentationSelections?.[product.id] ?? []
                        }
                        manual={
                          form.manualQuantities?.[product.id] ??
                          form.quantities[product.id] ??
                          "0"
                        }
                        source={presentations}
                        error={presentationError}
                        loading={presentationLoading}
                        refresh={refreshPresentations}
                        validationError={
                          form.presentationSelections?.[product.id]?.length
                            ? fieldErrors[product.id]
                            : undefined
                        }
                        onChange={(selections, manual) =>
                          updatePackages(product.id, selections, manual)
                        }
                      />
                    </div>
                  ) : null}
                </MaterialChoice>
              );
            })}
          </div>
        </>
      ) : null}
      {step === 4 ? (
        <>
          <label className="block text-sm font-semibold">
            Observações e contexto
            <textarea
              className={inputClass}
              rows={4}
              maxLength={2000}
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Registre apenas exceções e informações necessárias."
            />
          </label>
          <p className="text-xs leading-5 text-(--muted)">
            Fotos e anexos poderão ser adicionados no detalhamento após salvar a
            ficha.
          </p>
        </>
      ) : null}
      {step === 5 ? (
        <>
          {type === "COM" ? <DefinitionGrid items={[
            { label: "Pessoa assistida", value: context.patient?.display_name },
            { label: "Responsável", value: context.fullName },
            { label: "Forma de aquisição", value: form.origin === "donation" ? "Doação" : form.origin === "purchase" ? "Compra pela família" : "Não informada" },
          ]} /> : <div className={type === "ENT" ? "hca-form-stack" : "rounded-xl bg-(--background) p-4 text-sm"}>
            {type === "ENT" ? <DefinitionGrid items={[
              { label: "Pessoa assistida", value: context.patient?.display_name },
              { label: "Responsável", value: context.fullName },
              { label: "Percurso", value: form.source === "FAMILY" ? "Família → Equipe" : "Equipe → Família" },
              { label: "Recebedor", value: recipientContext?.people.find(person => person.id === form.recipientId)?.name ?? people.find(person => person.id === form.recipientId)?.name ?? "Pessoa não disponível na referência atual" },
            ]} /> : <><strong>{context.patient?.display_name}</strong>
            <p className="mt-1 text-xs text-(--muted)">
              Responsável: {context.fullName}
            </p></>}
            {type === "ENT" && recipientContext ? (
              <div className="mt-3 space-y-2">
                <DeliveryRecipientReference data={recipientContext} />
                {form.recipientReason ? (
                  <p className="whitespace-pre-wrap">
                    Justificativa da escolha: {form.recipientReason}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>}
          {type !== "BAL" ? <MaterialReview rows={selected.map(product => ({
            id: product.id, name: product.name,
            details: <><small>{form.quantities[product.id] ? formatQuantity(form.quantities[product.id], product.unit) : "Quantidade pendente"}</small>{form.presentationSelections?.[product.id]?.map(row => <small key={row.id}>{presentationCaption(row)}</small>)}</>,
          }))} /> : <ul className="divide-y divide-(--line)">
            {selected.map((product) => (
              <li
                key={product.id}
                className="flex items-start justify-between gap-4 py-3 text-sm"
              >
                <span
                  className="min-w-0 flex-1"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {product.name}
                  {form.presentationSelections?.[product.id]?.map((row) => (
                    <small className="mt-2 block wrap-break-word" key={row.id}>
                      {presentationCaption(row)}
                    </small>
                  ))}
                </span>
                <strong className="shrink-0">
                  {form.quantities[product.id]
                    ? formatQuantity(form.quantities[product.id], product.unit)
                    : "Quantidade pendente"}
                </strong>
              </li>
            ))}
          </ul>}
          {form.notes ? (
            <p className="whitespace-pre-wrap text-sm">{form.notes}</p>
          ) : null}
          <Notice>
            {type === "ENT"
              ? "Ao concluir, as quantidades serão expedidas e aguardarão recebimento. Confira origem, destinatário e materiais."
              : type === "BAL"
                ? "Ao concluir, os ajustes seguirão a política de aprovação do paciente. Confira todas as contagens."
                : "A aprovação dos itens e o recebimento serão acompanhados nesta ficha. Nenhum pagamento é necessário para registrar uma doação."}
          </Notice>
        </>
      ) : null}
    </>
  );
}
