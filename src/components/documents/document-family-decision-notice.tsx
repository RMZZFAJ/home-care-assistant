"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { z } from "zod";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { api, ApiError } from "@/lib/client/api";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { useScopedRead } from "@/lib/use-scoped-read";
import { DocumentChangeFacts } from "./document-freshness";

const decision = z.enum(["partial", "complete"]);
const decisionResponse = z.object({
  data: z.object({
    documentId: z.uuid(), patientId: z.uuid(), actorId: z.uuid(),
    notice: z.object({
      id: z.uuid(), material: z.string().min(1), decision, previous: decision.nullable(),
      author: z.string(), reason: z.string(), recordedAt: z.iso.datetime({ offset: true }),
      acceptedQuantity: z.string().regex(/^\d+(?:\.\d+)?$/), unit: z.string().min(1),
    }).nullable(),
    acknowledgement: z.object({ reviewId: z.uuid(), knownAt: z.iso.datetime({ offset: true }) }).nullable(),
  }),
});
const labels = { partial: "Parcial", complete: "Integral" };
type DecisionRead = z.infer<typeof decisionResponse>["data"];

export function DocumentFamilyDecisionNotice({ id, patientId, userId, code, revision, blocked, returnFocus }: {
  id: string; patientId: string; userId: string; code: string; revision: number;
  blocked: boolean; returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const endpoint = `/api/documents/${id}/fulfillment-review/awareness`;
  const decode = useCallback((raw: unknown) => {
    const value = decisionResponse.parse(raw).data;
    if (value.documentId !== id || value.patientId !== patientId || value.actorId !== userId)
      throw new Error("A resposta pertence a outro contexto.");
    return value;
  }, [id, patientId, userId]);
  const read = useScopedRead(endpoint, String(revision), decode);
  const [firstRead, setFirstRead] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(() => new Set());
  const [refusedRead, setRefusedRead] = useState<DecisionRead | null>(null);
  const sendingRef = useRef(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = read.error || read.data === refusedRead ? null : read.data?.notice;
  const notice = pending && !confirmed.has(pending.id) ? pending : null;
  if (!firstRead && !read.loading && read.data && !read.error) {
    setFirstRead(true);
    if (notice && !blocked) setActiveId(notice.id);
  }

  async function acknowledge() {
    if (!notice || sendingRef.current || blocked) return;
    sendingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = decode(await api(endpoint, { reviewId: notice.id }));
      if (result.acknowledgement?.reviewId !== notice.id)
        throw new Error("A confirmação pertence a outra decisão.");
      setConfirmed(previous => new Set(previous).add(notice.id));
      setActiveId(null);
      read.refresh();
    } catch (cause) {
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) {
        setRefusedRead(read.data);
        setActiveId(null);
        read.refresh();
      } else {
        setError("Ainda não foi possível confirmar seu registro. Tente confirmar esta mesma decisão novamente.");
      }
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  if (!notice) return null;
  const kept = notice.previous === notice.decision;
  const label = labels[notice.decision].toLocaleLowerCase("pt-BR");
  const title = kept ? "A família manteve o atendimento " + label
    : notice.previous ? "A família alterou o atendimento para " + label
    : "A família avaliou o atendimento como " + label;
  return <>
    <aside className="hca-document-freshness">
      <Icon name="check" width={17} height={17} />
      <span role="status">A família respondeu à avaliação da necessidade.</span>
      <ActionButton ref={openerRef} variant="quiet" compact disabled={blocked} onClick={() => {
        setError("");
        setActiveId(notice.id);
      }}>Ver decisão familiar</ActionButton>
    </aside>
    <Dialog open={!blocked && activeId === notice.id} title={title} kicker="Resposta da família"
      subtitle={notice.material + " · " + code} headingIcon="check"
      popupClassName="hca-document-change-dialog" closeDisabled={busy}
      onClose={() => { if (error) setActiveId(null); else void acknowledge(); }}
      finalFocus={() => openerRef.current?.isConnected ? openerRef.current : returnFocus.current}
      footer={<ActionButton variant="primary" disabled={busy} onClick={() => void acknowledge()}>
        {busy ? "Confirmando…" : error ? "Confirmar novamente" : "Entendi"}
      </ActionButton>}>
      <DocumentChangeFacts changes={[{
        id: notice.id, label: kept ? "Decisão familiar" : "Atendimento da necessidade",
        before: !kept && notice.previous ? labels[notice.previous] : undefined,
        after: labels[notice.decision] + (kept ? " mantido" : ""),
      }]} />
      <p className="hca-document-change-note">{notice.author} registrou a avaliação em {formatBrazilDate(notice.recordedAt)} considerando {formatQuantity(notice.acceptedQuantity, notice.unit)} no recebimento.</p>
      {notice.reason ? <p className="hca-document-change-note mt-2 whitespace-pre-wrap">{notice.reason}</p> : null}
      {error ? <Notice error>{error}</Notice> : null}
    </Dialog>
  </>;
}
