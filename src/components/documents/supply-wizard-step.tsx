"use client";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import {
  inputClass,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { BarcodeScanner } from "@/components/catalog/barcode-scanner";
import { formatQuantity } from "@/lib/quantity";
import type {
  SupplyType,
  CatalogProduct,
  PatientPerson,
  ItemContext,
} from "@/types/documents";
export type WizardState = {
  quantities: Record<string, string>;
  notes: string;
  origin: "purchase" | "donation";
  source: "FAMILY" | "CARE_TEAM";
  recipientId: string;
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
}) {
  const category = ["medicamentos", "higiene", "dieta"][step - 1];
  const selected = catalog.filter((product) =>
    Object.hasOwn(form.quantities, product.id),
  );
  const destination = form.source === "FAMILY" ? "CARE_TEAM" : "FAMILY";
  const recipients = people.filter(
    (person) =>
      person.id !== context.userId &&
      (person.role === "admin" ||
        (destination === "FAMILY"
          ? person.role === "family"
          : ["professional", "supervisor"].includes(person.role))),
  );
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
                onChange={(event) =>
                  setForm({
                    ...form,
                    origin: event.target.value as "purchase" | "donation",
                  })
                }
              >
                <option value="purchase">Compra pela família</option>
                <option value="donation">
                  Doação / incorporação sem pagamento
                </option>
              </select>
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
                  <option value="FAMILY">Família → Equipe</option>
                  <option value="CARE_TEAM">
                    Equipe → Família (devolução)
                  </option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Destinatário designado
                <select
                  className={inputClass}
                  value={form.recipientId}
                  aria-invalid={Boolean(fieldErrors.recipientId)}
                  onChange={(event) =>
                    setForm({ ...form, recipientId: event.target.value })
                  }
                >
                  <option value="">Selecione quem receberá</option>
                  {recipients.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.recipientId ? (
                  <span className="ui-field-error">
                    {fieldErrors.recipientId}
                  </span>
                ) : null}
              </label>
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
                          <Link
                            href={"/historico/" + request.requisitionId}
                            className="ml-auto underline"
                            target="_blank"
                            rel="noopener"
                          >
                            Conferir REQ
                          </Link>
                        </label>
                      ))}
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
          <div className="space-y-3">
            {catalog
              .filter((product) => product.category === category)
              .map((product) => {
                const checked = Object.hasOwn(form.quantities, product.id);
                return (
                  <div
                    className={
                      "product-choice " +
                      (checked ? "product-choice-selected" : "")
                    }
                    key={product.id}
                  >
                    <label className="flex min-w-0 flex-1 items-start gap-3">
                      {type !== "BAL" ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setForm((current) => {
                              const quantities = {
                                ...current.quantities,
                              };
                              if (event.target.checked)
                                quantities[product.id] = "";
                              else delete quantities[product.id];
                              return { ...current, quantities };
                            })
                          }
                        />
                      ) : null}
                      <span>
                        <strong className="block text-sm">
                          {product.name}
                        </strong>
                        <span className="mt-1 block text-xs text-(--muted)">
                          {product.unit}
                          {links[product.id]?.length
                            ? " · Vinculado à REQ"
                            : ""}
                        </span>
                      </span>
                    </label>
                    {checked ? (
                      <label className="product-quantity text-xs font-semibold">
                        {type === "BAL"
                          ? "Contagem física"
                          : type === "COM"
                            ? "Quantidade a adquirir"
                            : "Quantidade expedida"}
                        <input
                          className={inputClass}
                          inputMode="decimal"
                          value={form.quantities[product.id]}
                          aria-label={"Quantidade — " + product.name}
                          aria-invalid={Boolean(fieldErrors[product.id])}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              quantities: {
                                ...current.quantities,
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
                  </div>
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
          <div className="rounded-xl bg-(--background) p-4 text-sm">
            <strong>{context.patient?.display_name}</strong>
            <p className="mt-1 text-xs text-(--muted)">
              Responsável: {context.fullName}
            </p>
            {type === "ENT" ? (
              <p className="mt-2">
                {form.source === "FAMILY"
                  ? "Família → Equipe"
                  : "Equipe → Família"}{" "}
                · Recebedor:{" "}
                {people.find((person) => person.id === form.recipientId)?.name}
              </p>
            ) : null}
          </div>
          <ul className="divide-y divide-(--line)">
            {selected.map((product) => (
              <li
                key={product.id}
                className="flex items-start justify-between gap-4 py-3 text-sm"
              >
                <span>{product.name}</span>
                <strong>
                  {form.quantities[product.id]
                    ? formatQuantity(form.quantities[product.id], product.unit)
                    : "Quantidade pendente"}
                </strong>
              </li>
            ))}
          </ul>
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
