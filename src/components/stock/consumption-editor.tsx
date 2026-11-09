"use client";
import { SearchSelect } from "@/components/ui/search-select";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  api,
  ApiError,
  can,
  inputClass,
  Notice,
  type WorkspaceContext,
} from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { formatQuantity, validQuantity } from "@/lib/quantity";
import { consumptionCommand,consumptionResultConfirmed } from "@/lib/validation/consumption";
import {TransportError} from "@/lib/client/api";
import {useNotificationReference} from "@/lib/notifications/use-notification-reference";
import type {ReminderOrigin} from "@/components/notifications/notification-reference";
import type { CatalogProduct } from "@/types/documents";
import type { ConsumptionReport } from "@/types/consumption";
import { ConsumptionLines } from "./consumption-lines";

type Prepared = Extract<
  ReturnType<typeof consumptionCommand.parse>,
  { action: "report" | "supplement" }
>;
export function ConsumptionEditor({
  context,
  report,
  products,
  catalogError,
  catalogLoading,
  onCatalogRetry,
  onClose,
  onSaved,
  restoreFocusTo,
  sourceReminder,
}: {
  context: WorkspaceContext;
  report?: ConsumptionReport;
  products: CatalogProduct[];
  catalogError: string;
  catalogLoading: boolean;
  onCatalogRetry: () => void;
  onClose: () => void;
  onSaved: (id: string, data?: ConsumptionReport) => void;
  restoreFocusTo?: HTMLElement | null;
  sourceReminder?:ReminderOrigin;
}) {
  const [origin]=useState(()=>report?null:sourceReminder??null);
  const originRead=useNotificationReference(context.patient!.id,"consumption",origin?.id??null,"reminder");
  const [baseline, setBaseline] = useState(report),
    [text, setText] = useState(""),
    [kind, setKind] = useState(""),
    [location, setLocation] = useState(origin?"CARE_TEAM":"");
  const [lines, setLines] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (report?.current_lines ?? []).map((line) => [
        line.productId,
        line.quantity,
      ]),
    ),
  );
  const [search, setSearch] = useState(""),
    [review, setReview] = useState<Prepared | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [current, setCurrent] = useState<ConsumptionReport | null>(null);
  const frozenRef = useRef<Prepared | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null),
    textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (review) reviewHeadingRef.current?.focus();
  }, [review]);
  const choices = products
    .filter(
      (product) =>
        !Object.hasOwn(lines, product.id) &&
        (product.name + " " + (product.aliases ?? []).join(" "))
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
    )
    .slice(0, 20);
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    for (const [id, value] of Object.entries(lines)) {
      if (
        !validQuantity(
          value,
          products.find((product) => product.id === id)?.quantity_decimals ?? 6,
        )
      ) {
        setError("Confira a quantidade e a precisão do material indicado.");
        (
          event.currentTarget.elements.namedItem(id) as HTMLInputElement | null
        )?.focus();
        return;
      }
    }
    const result = consumptionCommand.safeParse({
      ...(baseline
        ? {
            action: "supplement",
            id: baseline.id,
            expectedVersion: baseline.version,
          }
        : {
            action: "report",
            careRecipientId: context.patient!.id,
            kind,
            location,
            ...(origin?{reminderId:origin.id}:{}),
          }),
      text,
      lines: Object.entries(lines).map(([productId, quantity]) => ({
        productId,
        quantity,
        unit: products.find((product) => product.id === productId)?.unit,
      })),
      idempotencyKey: crypto.randomUUID(),
    });
    if (!result.success || result.data.action === "confirm") {
      setError(
        "Escolha tipo e custódia, descreva o fato e confira as quantidades selecionadas.",
      );
      return;
    }
    setReview(result.data);
    setConflict(false);
    setCurrent(null);
  }
  async function send() {
    if (!review) return;
    setBusy(true);
    setError("");
    frozenRef.current ??= review;
    try {
      const result = await api<{ id?: string; data?: ConsumptionReport }>(
        "/api/consumption",
        frozenRef.current,
      );
      const id = result.id ?? result.data?.id;
      if (!id||!consumptionResultConfirmed(result,frozenRef.current,context.patient!.id))throw new TransportError("Não foi possível reconhecer a confirmação. Recupere a mesma tentativa.","command","INVALID_CONFIRMATION",undefined);
      frozenRef.current = null;
      setUncertain(false);
      onSaved(id, result.data);
    } catch (reason) {
      const refused =
        reason instanceof ApiError &&
        [400, 401, 403, 404, 409].includes(reason.status);
      if (refused&&!uncertain) frozenRef.current = null;
      setUncertain(uncertain||!refused);
      setConflict(!uncertain&&reason instanceof ApiError && reason.status === 409);
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar o resultado.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    if (!baseline) return;
    setBusy(true);
    setError("");
    try {
      setCurrent(
        (
          await api<{ data: ConsumptionReport }>(
            "/api/consumption/" + baseline.id,
          )
        ).data,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível consultar o relato.",
      );
    } finally {
      setBusy(false);
    }
  }
  if(origin&&(originRead.loading||originRead.error||originRead.data?.kind!=="shift_reminder"||!originRead.data.canReport))return <RecordDrawer title="Registrar relato" onClose={onClose} restoreFocusTo={restoreFocusTo} busy={busy} preventClose={uncertain}><Notice error={Boolean(originRead.error)}>Revalide o acesso ao lembrete antes de exibir o preenchimento preservado. {originRead.error}</Notice><ActionButton type="button" onClick={originRead.refresh}>Revalidar acesso ao lembrete</ActionButton>{uncertain?<ActionButton type="button" disabled={busy} onClick={()=>void send()}>Recuperar tentativa</ActionButton>:null}</RecordDrawer>;
  return (
    <RecordDrawer
      title={baseline ? "Complementar relato" : "Registrar relato"}
      onClose={onClose}
      restoreFocusTo={restoreFocusTo}
      busy={busy}
      preventClose={uncertain}
    >
      {error ? <Notice error>{error}</Notice> : null}
      {origin?<section aria-label="Origem preservada do relato"><h3 className="font-semibold">Lembrete de origem</h3><p>Referência de {origin.period.split("-").reverse().join("/")}. O relato registra sua declaração atual, sem comprovar presença no plantão.</p><p>Custódia: equipe. A referência não pode ser trocada neste preenchimento.</p></section>:null}
      {baseline ? (
        <section className="my-4">
          <h3 className="font-semibold">
            Referência preservada · versão {baseline.version}
          </h3>
          <p className="mt-2 whitespace-pre-wrap wrap-break-word">
            {baseline.body}
          </p>
          <ConsumptionLines lines={baseline.current_lines} />
        </section>
      ) : null}
      {review ? (
        <section className="space-y-4" aria-label="Revisão do relato">
          <h3
            className="text-lg font-semibold"
            tabIndex={-1}
            ref={reviewHeadingRef}
          >
            {baseline ? "Revisar complemento" : "Revisar novo relato"}
          </h3>
          <p>
            {(baseline?.kind ?? kind) === "shortage"
              ? "Falta de material"
              : "Consumo extraordinário"}{" "}
            ·{" "}
            {(baseline?.location ?? location) === "FAMILY"
              ? "Família"
              : "Equipe"}
          </p>
          <p className="whitespace-pre-wrap wrap-break-word">{review.text}</p>
          <ul>
            {review.lines.map((line) => {
              const product = products.find(
                (item) => item.id === line.productId,
              );
              return (
                <li key={line.productId}>
                  {product?.name ?? line.productId} ·{" "}
                  {formatQuantity(line.quantity, product?.unit)}
                </li>
              );
            })}
          </ul>
          <Notice>
            {baseline
              ? "O complemento preserva o original e a autoria, cria uma nova versão para conferência e não desconta estoque."
              : "O relato será registrado para conferência, sem desconto no estoque."}
          </Notice>
          {uncertain ? (
            <Notice>
              O resultado ainda não foi confirmado. O conteúdo e a chave estão
              preservados; recupere esta tentativa antes de editar ou fechar.
            </Notice>
          ) : null}
          {conflict && baseline ? (
            <div className="space-y-3">
              <ActionButton disabled={busy} onClick={() => void compare()}>
                Consultar versão atual do relato
              </ActionButton>
              {current ? (
                <>
                  <p>
                    Versão revisada: {baseline.version} · Atual:{" "}
                    {current.version} ·{" "}
                    {current.status === "reported"
                      ? "Aguardando conferência"
                      : current.status === "confirmed"
                        ? "Confirmado"
                        : "Rejeitado"}
                  </p>
                  <ConsumptionLines lines={current.current_lines} />
                  {current.status === "reported" ? (
                    <ActionButton
                      onClick={() => {
                        setBaseline(current);
                        setCurrent(null);
                        setReview(null);
                        setConflict(false);
                        setError("");
                        requestAnimationFrame(() => textRef.current?.focus());
                      }}
                    >
                      Usar referência atual e revisar complemento
                    </ActionButton>
                  ) : (
                    <Notice>
                      Este relato já foi decidido. Consulte o resultado; novos
                      esclarecimentos não substituem essa decisão.
                    </Notice>
                  )}
                </>
              ) : null}
            </div>
          ) : null}
          <div className="hca-toolbar">
            <ActionButton
              disabled={busy || uncertain}
              onClick={() => {
                setReview(null);
                setConflict(false);
                requestAnimationFrame(() => textRef.current?.focus());
              }}
            >
              Voltar à edição
            </ActionButton>
            <ActionButton
              variant="primary"
              disabled={busy || conflict}
              onClick={() => void send()}
            >
              {uncertain
                ? "Recuperar tentativa"
                : baseline
                  ? "Salvar complemento sem desconto"
                  : "Registrar relato sem desconto"}
            </ActionButton>
          </div>
        </section>
      ) : (
        <form className="space-y-4" onSubmit={prepare}>
          {!baseline ? (
            <>
              <label className="block text-sm font-semibold">
                Tipo
                <select
                  aria-label="Tipo"
                  className={inputClass}
                  value={kind}
                  required
                  onChange={(event) => setKind(event.target.value)}
                >
                  <option value="">Escolha o tipo</option>
                  <option value="consumption">Consumo extraordinário</option>
                  <option value="shortage">Falta de material</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Custódia
                <select
                  aria-label="Custódia"
                  className={inputClass}
                  value={location}
                  required
                  disabled={Boolean(origin)}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="">Escolha a custódia</option>
                  {can(context, "stock.team.read") ? (
                    <option value="CARE_TEAM">Equipe</option>
                  ) : null}
                  {["admin", "family"].includes(context.patient!.role) &&
                  can(context, "stock.family.read") ? (
                    <option value="FAMILY">Família</option>
                  ) : null}
                </select>
              </label>
            </>
          ) : null}
          <label className="block text-sm font-semibold">
            {baseline ? "Esclarecimento do complemento" : "O que aconteceu?"}
            <textarea
              ref={textRef}
              className={inputClass}
              rows={3}
              minLength={3}
              maxLength={2000}
              required
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <p className="hca-field-hint">
            {text.length}/2000 caracteres. Relato e complemento não movimentam
            estoque.
          </p>
          {catalogLoading ? <Notice>Carregando materiais…</Notice> : null}
          {catalogError ? (
            <Notice error>
              {catalogError}{" "}
              <ActionButton onClick={onCatalogRetry}>Atualizar materiais</ActionButton>
            </Notice>
          ) : null}
          <label
            className="block text-sm font-semibold"
            htmlFor="consumption-material"
          >
            Adicionar material
          </label>
          <SearchSelect
            id="consumption-material"
            triggerLabel={"Abrir ou fechar opções de material"}
            query={search}
            selectedIds={[]}
            placeholder="Busque e selecione um material"
            disabled={
              catalogLoading ||
              Boolean(catalogError) ||
              Object.keys(lines).length >= 100
            }
            onQueryChange={queryValue => setSearch(queryValue)}
            onSelectionChange={nextIds => {
              if (
                nextIds[0] &&
                products.some((product) => product.id === nextIds[0])
              ) {
                setLines((values) => ({ ...values, [nextIds[0]!]: "" }));
                setSearch("");
              }
            }}
            options={(choices.map((product) => (
              ({ value: product.id, label: product.name, content: <>
                {product.name} · {product.unit}
              </> })
            ))) ?? []}
          />
          <p className="hca-field-hint">
            O texto livre pode ser registrado sem quantidade. Para confirmar
            consumo, inclua materiais e quantidades exatas. Materiais inativos
            só podem consumir saldo existente.
          </p>
          {Object.entries(lines).map(([id, value]) => {
            const product = products.find((item) => item.id === id),
              decimals = product?.quantity_decimals ?? 6;
            return (
              <div className="rounded border border-(--line) p-3" key={id}>
                <label
                  className="block text-sm font-semibold"
                  htmlFor={"quantity-" + id}
                >
                  {product?.name ?? id} · quantidade em{" "}
                  {product?.unit ?? "unidade da referência"}
                </label>
                <input
                  id={"quantity-" + id}
                  name={id}
                  className={inputClass}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={value}
                  aria-describedby={"precision-" + id}
                  onChange={(event) =>
                    setLines((current) => ({
                      ...current,
                      [id]: event.target.value,
                    }))
                  }
                />
                <p id={"precision-" + id} className="hca-field-hint">
                  Quantidade positiva; até {decimals} casas decimais. Aceita
                  vírgula ou ponto.
                </p>
                <ActionButton
                  onClick={() =>
                    setLines((current) => {
                      const next = { ...current };
                      delete next[id];
                      return next;
                    })
                  }
                >
                  Remover {product?.name ?? "material"}
                </ActionButton>
              </div>
            );
          })}
          <ActionButton
            type="submit"
            variant="primary"
            disabled={Boolean(
              Object.keys(lines).length && (catalogLoading || catalogError),
            )}
          >
            Revisar {baseline ? "complemento" : "relato"}
          </ActionButton>
        </form>
      )}
    </RecordDrawer>
  );
}
