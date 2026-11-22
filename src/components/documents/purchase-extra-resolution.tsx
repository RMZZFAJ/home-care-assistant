"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { readWizardCatalogue } from "@/lib/client/wizard-catalogue";
import { ActionButton, ActionLink, FormField, Pill } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { FeedbackBanner } from "@/components/ui/feedback";
import { SearchSelect } from "@/components/ui/search-select";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { pendingPurchaseItems } from "@/lib/documents/pending-purchase-items";
import { normalizeCatalogText } from "@/lib/catalog-match";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { PendingPurchaseExtra } from "@/lib/validation/pending-purchase-extras";
import type { CatalogProduct, SupplyDocument } from "@/types/documents";

export function PurchaseExtraResolution({ data, mayIdentify, onUpdated }: {
  data: SupplyDocument;
  mayIdentify: boolean;
  onUpdated: (document: SupplyDocument) => void;
}) {
  const [item, setItem] = useState<PendingPurchaseExtra | null>(null);
  const pending = pendingPurchaseItems(data.payload, data.workflow_data);
  if (!pending.length) return null;
  return <section className="hca-form-stack" aria-label="Materiais com cadastro pendente">
    <h3>Materiais com cadastro pendente</h3>
    <p className="doc-subtle">A família precisa identificar estes materiais no catálogo da residência.</p>
    {data.lines.length ? <p className="doc-subtle">Os itens já identificados seguem pelas etapas de aprovação, compra e chegada.</p> : null}
    <ul className="hca-form-stack">{pending.map(extra => <li key={extra.id} className="hca-requisition-extra-row">
      <div className="hca-extra-item-heading"><strong>{extra.name}</strong><Pill tone="warning">Cadastro pendente</Pill></div>
      <p>{formatQuantity(extra.quantity, extra.unit)}</p>
      {extra.details ? <p className="whitespace-pre-wrap">{extra.details}</p> : null}
      {mayIdentify ? <ActionButton compact onClick={() => setItem(extra)}>Identificar {extra.name}</ActionButton> : null}
    </li>)}</ul>
    {item && mayIdentify ? <IdentifyExtra key={item.id} item={item} data={data}
      onClose={() => setItem(null)} onSuccess={document => { setItem(null); onUpdated(document); }} /> : null}
  </section>;
}

function IdentifyExtra({ item, data, onClose, onSuccess }: {
  item: PendingPurchaseExtra;
  data: SupplyDocument;
  onClose: () => void;
  onSuccess: (document: SupplyDocument) => void;
}) {
  const [catalogue, setCatalogue] = useState<CatalogProduct[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [packet, setPacket] = useState<{ idempotencyKey: string; expectedVersion: number; productId: string } | null>(null);
  const [error, setError] = useState("");
  useOperationActivity(saving, { title: "Identificando material" });
  const patientId = data.care_recipient_id;
  useEffect(() => {
    const controller = new AbortController();
    void readWizardCatalogue(patientId, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setCatalogue(data);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError("Não foi possível consultar o catálogo da residência.");
    });
    return () => controller.abort();
  }, [patientId, loadAttempt]);
  const quantityDecimals = quantity(item.quantity).decimalPlaces();
  const existingProducts = new Set(data.lines.map(line => line.product_id));
  const compatible = (catalogue ?? []).filter(product =>
    product.unit.trim().localeCompare(item.unit, "pt-BR", { sensitivity: "base" }) === 0
      && quantityDecimals <= (product.quantity_decimals ?? 0) && !existingProducts.has(product.id));
  const lookup = normalizeCatalogText(query);
  const options = compatible.filter(product => product.id === selected ||
    [product.name, ...(product.aliases ?? [])].some(label => normalizeCatalogText(label).includes(lookup)));

  async function apply() {
    if (!selected || saving) return;
    const frozen = packet ?? { idempotencyKey: crypto.randomUUID(), expectedVersion: data.version, productId: selected };
    setPacket(frozen);
    setSaving(true);
    setError("");
    try {
      const result = await api<{ data: SupplyDocument }>(`/api/documents/${data.id}`, {
        action: "resolve_purchase_extra", idempotencyKey: frozen.idempotencyKey,
        expectedVersion: frozen.expectedVersion, body: { extraId: item.id, productId: frozen.productId },
      });
      onSuccess(result.data);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500) {
        setPacket(null);
        setError(cause.status === 409 ? "A ficha mudou. Confira os materiais atualizados antes de tentar novamente." : cause.message);
      } else {
        setError("Não foi possível confirmar o resultado. Tente novamente para consultar ou concluir a mesma identificação.");
      }
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onClose={onClose} closeDisabled={saving} kicker="Materiais" title="Identificar material extra"
    subtitle="Confira o item e escolha o produto correspondente do catálogo."
    footer={<><ActionButton onClick={onClose} disabled={saving}>Voltar</ActionButton>
      <ActionButton variant="primary" onClick={apply} disabled={!selected || saving}>
        {saving ? "Confirmando…" : packet ? "Tentar novamente" : "Confirmar identificação"}
      </ActionButton></>}>
    <div className="hca-form-stack">
      <p><strong>{item.name}</strong> · {formatQuantity(item.quantity, item.unit)}</p>
      {data.status !== "pending_approval" ? <p className="doc-subtle">Ao confirmar, essa quantidade também ficará disponível para registrar a compra.</p> : null}
      {item.details ? <p className="whitespace-pre-wrap">{item.details}</p> : null}
      {loadError ? <FeedbackBanner tone="error">{loadError} <ActionButton compact onClick={() => {
        setLoadError(""); setLoadAttempt(attempt => attempt + 1);
      }}>Tentar novamente</ActionButton></FeedbackBanner> : catalogue === null ? <p role="status">Consultando o catálogo…</p>
        : <FormField label="Produto correspondente">
          <SearchSelect query={query} selectedIds={selected ? [selected] : []} disabled={Boolean(packet)}
            options={options.slice(0, 30).map(product => ({ value: product.id, label: product.name, content: product.name + " · " + product.unit }))}
            onQueryChange={value => { setQuery(value); setSelected(""); }}
            onSelectionChange={([id]) => {
              const product = compatible.find(row => row.id === id);
              setSelected(product?.id ?? "");
              setQuery(product?.name ?? "");
            }} />
        </FormField>}
      {catalogue && !compatible.length ? <>
        <p className="doc-subtle">Nenhum produto disponível usa esta unidade e aceita a quantidade informada.</p>
        <ActionLink href="/admin?section=catalog">Abrir catálogo</ActionLink>
      </> : null}
      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}
    </div>
  </Dialog>;
}
