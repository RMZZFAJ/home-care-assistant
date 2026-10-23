"use client";
import { useEffect, useState } from "react";
import { api, inputClass, Notice } from "@/components/workspace";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { roles } from "./admin-fields";
type Rule = {
  event: string;
  subject_role: string;
  channels: string[];
  include_pdf: boolean;
  cooldown_minutes: number;
  quiet_start: number | null;
  quiet_end: number | null;
  mode: string;
};
type Data = {
  rules: Rule[];
  channels: { code: string; label: string }[];
  events: string[];
};
export function NotificationMatrix({
  patientId,
  version,
  busy,
  configure,
}: {
  patientId: string;
  version: number;
  busy: boolean;
  configure: (
    kind: string,
    change: Record<string, unknown>,
  ) => Promise<boolean>;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api<Data>(
      "/api/notification-rules?careRecipientId=" + patientId,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [patientId, version]);
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Notice>Carregando matriz de notificações…</Notice>;
  const update = (
    event: string,
    role: string,
    patch: Record<string, unknown>,
  ) => {
    const current = data.rules.find(
      (row) => row.event === event && row.subject_role === role,
    );
    const snapshot = data;
    const optimistic: Rule = {
      event,
      subject_role: role,
      channels: current?.channels ?? ["internal"],
      include_pdf: current?.include_pdf ?? true,
      cooldown_minutes: current?.cooldown_minutes ?? 0,
      quiet_start: current?.quiet_start ?? null,
      quiet_end: current?.quiet_end ?? null,
      mode: current?.mode ?? "optional",
      ...current,
      ...(patch.channels ? { channels: patch.channels as string[] } : {}),
      ...(patch.includePdf !== undefined
        ? { include_pdf: Boolean(patch.includePdf) }
        : {}),
      ...(patch.mode ? { mode: String(patch.mode) } : {}),
    };
    setData({
      ...data,
      rules: [
        ...data.rules.filter(
          (row) => row.event !== event || row.subject_role !== role,
        ),
        optimistic,
      ],
    });
    void configure("notification_rule", {
      event,
      role,
      channels: current?.channels ?? ["internal"],
      includePdf: current?.include_pdf ?? true,
      cooldownMinutes: current?.cooldown_minutes ?? 0,
      quietStart: current?.quiet_start ?? null,
      quietEnd: current?.quiet_end ?? null,
      mode: current?.mode ?? "optional",
      ...patch,
    }).then((applied) => {
      if (!applied) setData(snapshot);
    });
  };
  return (
    <section className="ui-card" aria-label="Matriz de notificações">
      <h2 className="font-semibold">Eventos × funções · múltiplos canais</h2>
      <p className="my-3 text-xs text-(--muted)">
        Cada célula permite vários canais disponíveis. Destino verificado,
        consentimento e autorização atual continuam obrigatórios. Canais sem
        provedor habilitado não aparecem como disponíveis.
      </p>
      <div className="divide-y divide-(--line)">
        {data.events.map((event) => (
          <div key={event} className="py-4">
            <h3 className="mb-3 text-sm font-semibold">
              {documentEventLabel(event)}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {Object.entries(roles).map(([role, label]) => {
                const rule = data.rules.find(
                  (row) => row.event === event && row.subject_role === role,
                );
                const selected = rule?.channels ?? ["internal"];
                return (
                  <div
                    key={role}
                    className="min-w-0 rounded-lg border border-(--line) p-2"
                  >
                    <p className="mb-2 text-xs font-semibold">{label}</p>
                    {data.channels.map((channel) => (
                      <label
                        key={channel.code}
                        className="flex min-h-11 items-center gap-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          aria-label={`${documentEventLabel(event)} · ${label} · ${channel.label}`}
                          disabled={busy}
                          checked={selected.includes(channel.code)}
                          onChange={(change) =>
                            update(event, role, {
                              channels: change.target.checked
                                ? [...selected, channel.code]
                                : selected.filter(
                                    (code) => code !== channel.code,
                                  ),
                            })
                          }
                        />
                        {channel.label}
                      </label>
                    ))}
                    <details>
                      <summary className="min-h-11 cursor-pointer pt-3 text-xs">
                        Opções
                      </summary>
                      <label className="block text-xs">
                        Comportamento
                        <select
                          className={inputClass}
                          disabled={busy}
                          value={rule?.mode ?? "optional"}
                          onChange={(change) =>
                            update(event, role, { mode: change.target.value })
                          }
                        >
                          <option value="optional">
                            Conforme preferências pessoais
                          </option>
                          <option value="required">
                            Obrigatório no aplicativo
                          </option>
                          <option value="silent">
                            Silencioso no aplicativo
                          </option>
                        </select>
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          disabled={busy || event === "req.registered_author"}
                          checked={
                            event !== "req.registered_author" &&
                            (rule?.include_pdf ?? true)
                          }
                          onChange={(change) =>
                            update(event, role, {
                              includePdf: change.target.checked,
                            })
                          }
                        />
                        Incluir PDF compatível
                      </label>
                      <label className="block text-xs">
                        Intervalo mínimo (min)
                        <input
                          type="number"
                          className={inputClass}
                          min={0}
                          max={10080}
                          disabled={busy}
                          key={rule?.cooldown_minutes ?? 0}
                          defaultValue={rule?.cooldown_minutes ?? 0}
                          onBlur={(change) => {
                            if (
                              change.target.checkValidity() &&
                              Number(change.target.value) !==
                                (rule?.cooldown_minutes ?? 0)
                            )
                              update(event, role, {
                                cooldownMinutes: Number(change.target.value),
                              });
                          }}
                        />
                      </label>
                      <p className="mt-2 text-xs">
                        Silêncio externo (hora de Brasília). Avisos no
                        aplicativo continuam disponíveis.
                      </p>
                      {["quiet_start", "quiet_end"].map((field, index) => (
                        <label className="block text-xs" key={field}>
                          {index ? "Fim" : "Início"}
                          <select
                            className={inputClass}
                            disabled={busy}
                            value={
                              rule?.[field as "quiet_start" | "quiet_end"] ?? ""
                            }
                            onChange={(change) =>
                              update(event, role, {
                                [index ? "quietEnd" : "quietStart"]:
                                  change.target.value === ""
                                    ? null
                                    : Number(change.target.value),
                              })
                            }
                          >
                            <option value="">Não configurado</option>
                            {Array.from({ length: 24 }, (_, hour) => (
                              <option key={hour} value={hour}>
                                {hour}:00
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </details>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
