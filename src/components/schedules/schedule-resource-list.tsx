"use client";
import { useCallback, useState } from "react";
import { z } from "zod";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { Notice, type WorkspaceContext } from "@/components/workspace";
import { useClientReady } from "@/lib/use-client-ready";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import {
  scheduleResourcePurposeSchema,
  scheduleResourceLabels,
  scheduleResourceOutcomeLabel,
  type ScheduleResourcePurpose,
} from "@/lib/schedules/resource-preparations";
import { formatZonedDate } from "@/lib/schedules/time";
import { ScheduleResourceSummary } from "./schedule-resource-summary";
import { localScheduleResourceScopes } from "@/lib/schedules/resource-local";
type Cursor = { before: string; beforeId: string };
export function ScheduleResourcePreparationsList({
  context,
  disabled,
  refreshToken,
  onOpen,
}: {
  context: WorkspaceContext;
  disabled: boolean;
  refreshToken: number;
  onOpen: (
    purpose: ScheduleResourcePurpose,
    target: string,
    day: string,
    opener: HTMLElement,
  ) => void;
}) {
  const patient = context.patient!,
    scope = JSON.stringify([
      context.userId,
      patient.id,
      patient.capabilities,
      patient.is_active,
      patient.active,
      context.activeContext?.mode,
    ]);
  const [navigation, setNavigation] = useState<{
    scope: string;
    cursors: Cursor[];
  }>({ scope, cursors: [] });
  const cursors = navigation.scope === scope ? navigation.cursors : [],
    cursor = cursors.at(-1),
    revision = useLiveRevision();
  const query = new URLSearchParams({ careRecipientId: patient.id, ...cursor });
  const decode = useCallback(
    (value: unknown) =>
      z
        .object({ data: z.array(z.unknown()) })
        .parse(value)
        .data.map((item) => {
          const target = z
            .object({
              purpose: scheduleResourcePurposeSchema,
              targetResourceId: z.uuid(),
            })
            .parse(item);
          return parsePrivateDraft(item, {
            userId: context.userId,
            patientId: patient.id,
            kind: "SCHEDULE",
            purpose: target.purpose,
            targetDocumentId: null,
            targetResourceId: target.targetResourceId,
          })!;
        }),
    [context.userId, patient.id],
  );
  const read = useScopedRead(
    `/api/schedules/resource-preparations/list?${query}`,
    scope + ":" + revision + ":" + refreshToken,
    decode,
  );
  const rows = !read.loading && !read.error ? read.data : null;
  const ready = useClientReady();
  const open = (
    purpose: ScheduleResourcePurpose,
    target: string,
    opener: HTMLElement,
  ) =>
    onOpen(
      purpose,
      target,
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date()),
      opener,
    );
  return (
    <section
      className="hca-form-stack"
      aria-label="Meus preenchimentos de alterações e decisões"
    >
      <h3>Alterações e decisões guardadas</h3>
      <p>
        Somente seus preenchimentos e resultados privados. É possível
        consultá-los mesmo quando o recurso saiu da lista operacional; uma nova
        confirmação depende do estado e da permissão atuais.
      </p>
      <ActionButton
        disabled={read.loading}
        onClick={() => {
          setNavigation({ scope, cursors: [] });
          read.refresh();
        }}
      >
        Atualizar meus preenchimentos da agenda
      </ActionButton>
      {read.loading ? (
        <LoadingIndicator label="Consultando meus preenchimentos da agenda" />
      ) : null}
      {read.error ? <Notice error>{read.error}</Notice> : null}
      {ready ? (
        <DeviceReferences
          key={scope + ":" + revision + ":" + refreshToken}
          user={context.userId}
          patient={patient.id}
          disabled={disabled}
          open={open}
        />
      ) : null}
      {rows?.length === 0 ? <p>Nenhum preenchimento nesta página.</p> : null}
      {rows?.map((row) => (
        <article className="ui-card hca-form-stack" key={row.id}>
          <h4>
            {
              scheduleResourceLabels[
                scheduleResourcePurposeSchema.parse(row.purpose)
              ]
            }
          </h4>
          <p>
            {
              {
                active: "Preenchimento privado salvo",
                consumed: "Resultado confirmado, ainda não reconhecido",
                completed: "Resultado reconhecido",
                discarded: "Preenchimento descartado",
              }[row.state]
            }{" "}
            · {formatZonedDate(row.savedAt)}
          </p>
          {row.content && "scheduleAction" in row.content ? (
            <ScheduleResourceSummary content={row.content} />
          ) : null}
          {row.consumedResult && "sourceTimezone" in row.consumedResult ? (
            <>
              <p>
                {scheduleResourceOutcomeLabel(row.consumedResult.nativeResult)}
              </p>
              <ScheduleResourceSummary
                content={{
                  scheduleAction: row.consumedResult.fields,
                  referenceHash: row.consumedResult.referenceHash,
                  referenceVersion: row.consumedResult.expectedVersion,
                }}
                sourceTimezone={row.consumedResult.sourceTimezone}
              />
            </>
          ) : null}
          {row.state === "active" || row.state === "consumed" ? (
            <ActionButton
              disabled={disabled}
              onClick={(e) =>
                open(
                  scheduleResourcePurposeSchema.parse(row.purpose),
                  row.targetResourceId!,
                  e.currentTarget,
                )
              }
            >
              Consultar ou retomar este preenchimento
            </ActionButton>
          ) : null}
        </article>
      ))}
      <div
        className="hca-toolbar"
        aria-label="Paginação dos meus preenchimentos"
      >
        <ActionButton
          disabled={read.loading || cursors.length === 0}
          onClick={() =>
            setNavigation({ scope, cursors: cursors.slice(0, -1) })
          }
        >
          Página anterior de preenchimentos
        </ActionButton>
        <span>Página {cursors.length + 1}</span>
        <ActionButton
          disabled={read.loading || !rows || rows.length < 20}
          onClick={() => {
            const last = rows?.at(-1);
            if (last)
              setNavigation({
                scope,
                cursors: [
                  ...cursors,
                  { before: last.savedAt, beforeId: last.id },
                ],
              });
          }}
        >
          Próxima página de preenchimentos
        </ActionButton>
      </div>
    </section>
  );
}

function DeviceReferences({
  user,
  patient,
  disabled,
  open,
}: {
  user: string;
  patient: string;
  disabled: boolean;
  open: (
    purpose: ScheduleResourcePurpose,
    target: string,
    opener: HTMLElement,
  ) => void;
}) {
  const [rows] = useState(() => {
    try {
      return localScheduleResourceScopes(sessionStorage, user, patient);
    } catch {
      return [];
    }
  });
  return (
    <>
      {" "}
      {rows.length > 0 ? (
        <section
          className="hca-form-stack"
          aria-label="Referências de recuperação neste aparelho"
        >
          <h4>Recuperação neste aparelho</h4>
          <p>
            Estas referências permitem consultar um envio ou retomar seus
            campos. Abrir uma referência não reenvia uma operação.
          </p>
          {rows.map((item) => (
            <article
              key={item.purpose + item.target}
              className="ui-card hca-form-stack"
            >
              <p>
                {scheduleResourceLabels[item.purpose]}
                {item.damaged
                  ? " · A cópia precisa de conferência"
                  : " · Há uma referência preservada"}
              </p>
              <ActionButton
                disabled={disabled}
                onClick={(e) =>
                  open(item.purpose, item.target, e.currentTarget)
                }
              >
                Consultar recuperação neste aparelho
              </ActionButton>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
