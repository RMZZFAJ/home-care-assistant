"use client";
import { useEffect, useState } from "react";
import {
  consumptionPreparationPendingSchema,
  consumptionPendingConfirmedByRead,
  parseConsumptionPreparationConfirmation,
  type ConsumptionPreparationCommit,
} from "@/lib/validation/consumption-preparations";
import { ActionButton } from "@/components/ui/controls";
import { useCreationDraft } from "@/components/forms/use-creation-draft";
import {
  CreationDraftPanel,
  DraftContentSummary,
} from "@/components/forms/creation-draft-panel";
import { api, Notice, type WorkspaceContext } from "@/components/workspace";
import { navigationForStep } from "@/lib/forms/draft-navigation";
import {
  consumptionPreparationTitles,
  type ConsumptionPreparationPurpose,
} from "@/lib/forms/consumption-preparation-purposes";
import type { CreationDraftContent } from "@/types/creation-drafts";
function PersonalResult({
  context,
  target,
  purpose,
  refreshRevision,
}: {
  context: WorkspaceContext;
  target: string;
  purpose: ConsumptionPreparationPurpose;
  refreshRevision: string;
}) {
  const [content, setContent] = useState<CreationDraftContent | null>(null);
  const [reconciled, setReconciled] = useState<"read" | "manual" | null>(null);
  const [nativePending, setNativePending] =
      useState<ConsumptionPreparationCommit | null>(null),
    [nativeBusy, setNativeBusy] = useState(false),
    [nativeError, setNativeError] = useState("");
  const draft = useCreationDraft({
    userId: context.userId,
    patientId: context.patient!.id,
    kind: "CONSUMPTION",
    purpose,
    targetResourceId: target,
    targetDocumentId: null,
    readScopeRevision: JSON.stringify([
      context.patient!.capabilities?.["stock.family.read"],
      context.patient!.capabilities?.["stock.team.read"],
      refreshRevision,
    ]),
    navigation: navigationForStep("CONSUMPTION", 0),
    onResume: (row) => {
      setContent(row.content);
      return true;
    },
    onDiscard: () => setContent(null),
  });
  const protectedView =
    draft.loading ||
    Boolean(draft.loadError) ||
    draft.readDenied ||
    draft.protectedReadPending;

  const storageKey = `hca:consumption-preparation-confirmation:${context.userId}:${context.patient!.id}:${purpose}:${target}`;
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active || protectedView) return;
      try {
        const raw = sessionStorage.getItem(storageKey),
          v = raw
            ? consumptionPreparationPendingSchema.safeParse(JSON.parse(raw))
            : null;
        if (
          v?.success &&
          v.data.userId === context.userId &&
          v.data.packet.careRecipientId === context.patient!.id &&
          v.data.packet.purpose === purpose &&
          v.data.packet.targetResourceId === target
        ) {
          if (
            consumptionPendingConfirmedByRead(
              draft.consumed,
              v.data.packet,
              context.userId,
            )
          ) {
            sessionStorage.removeItem(storageKey);
            setNativePending(null);
            setReconciled("read");
          } else setNativePending(v.data.packet);
        }
      } catch {
        /* An unverified or unavailable optional envelope stays unchanged. */
      }
    });
    return () => {
      active = false;
    };
  }, [
    draft.consumed,
    protectedView,
    storageKey,
    context.userId,
    context.patient,
    purpose,
    target,
  ]);
  async function recoverNative() {
    if (!nativePending) return;
    setNativeBusy(true);
    setNativeError("");
    try {
      const response = await api<{ data: unknown }>(
        "/api/consumption/preparations/commit",
        nativePending,
      );
      parseConsumptionPreparationConfirmation(
        response.data,
        nativePending,
        context.userId,
      );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Retain the verified server receipt if optional local cleanup is unavailable. */
      }
      setNativePending(null);
      setReconciled("manual");
      draft.reload();
    } catch (cause) {
      setNativeError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível conferir a mesma tentativa preservada.",
      );
    } finally {
      setNativeBusy(false);
    }
  }
  return (
    <section
      className="hca-form-stack"
      aria-label={consumptionPreparationTitles[purpose]}
    >
      <h3>{consumptionPreparationTitles[purpose]}</h3>
      {reconciled && !protectedView ? (
        <Notice>
          {reconciled === "read"
            ? "A tentativa preservada foi conferida pelo resultado pessoal já registrado. Nenhum novo envio foi realizado."
            : "A mesma tentativa preservada foi confirmada. Consulte o resultado pessoal registrado."}
        </Notice>
      ) : null}
      {nativePending && !protectedView ? (
        <>
          <Notice>
            Há uma confirmação preservada neste aparelho que ainda não
            corresponde ao resultado consultado. Recupere a mesma tentativa
            antes de reconhecer ou descartar.
          </Notice>
          {nativeError ? <Notice error>{nativeError}</Notice> : null}
          <ActionButton
            disabled={nativeBusy}
            onClick={() => void recoverNative()}
          >
            Recuperar mesma confirmação preservada
          </ActionButton>
        </>
      ) : null}
      <CreationDraftPanel
        draft={draft}
        disabled={nativeBusy || Boolean(nativePending)}
        current={protectedView ? null : content}
        patientName={context.patient!.display_name}
        resumeLabel="Consultar preenchimento preservado"
        acknowledgeLabel="Reconhecer resultado preservado"
        discardLabel="Descartar este preenchimento privado"
      />
      {!protectedView && content ? (
        <DraftContentSummary
          content={content}
          kind="CONSUMPTION"
          purpose={purpose}
        />
      ) : null}
    </section>
  );
}
export function ConsumptionPrivateResults({
  context,
  target,
  refreshRevision,
}: {
  context: WorkspaceContext;
  target: string;
  refreshRevision: string;
}) {
  return (
    <section
      className="ui-card hca-form-stack"
      aria-label="Recuperação pessoal de relato inativo"
    >
      <h2>Meus preenchimentos e resultados preservados</h2>
      <Notice>
        O paciente está inativo. Consulte ou reconheça seu resultado pessoal;
        novos complementos e decisões permanecem bloqueados.
      </Notice>
      {(
        [
          "consumption_supplement",
          "consumption_accept",
          "consumption_reject",
        ] as const
      ).map((purpose) => (
        <PersonalResult
          key={purpose}
          context={context}
          target={target}
          purpose={purpose}
          refreshRevision={refreshRevision}
        />
      ))}
    </section>
  );
}
