"use client";
import { useEffect, useRef, useState } from "react";
import { api, inputClass, Notice } from "@/components/workspace";
import { documentEventLabel } from "@/lib/notifications/event-labels";
import { roles } from "./admin-fields";
import { Button, Checkbox, Input, Select, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Tooltip } from "@fluentui/react-components";
import { Icon } from "@/components/ui/primitives";
import { RecordDrawer } from "@/components/forms/record-drawer";
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
  eventChannels?: Record<string, string[]>;
};
export function NotificationMatrix({
  patientId,
  version,
  busy,
  configure,
  configurationError = "",
}: {
  patientId: string;
  version: number;
  busy: boolean;
  configure: (
    kind: string,
    change: Record<string, unknown>,
  ) => Promise<boolean>;
  configurationError?: string;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editor, setEditor] = useState<{ event: string; role: string; opener: HTMLElement } | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (savingRef.current) return;
    const controller = new AbortController();
    void api<Data>(
      "/api/notification-rules?careRecipientId=" + patientId,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [patientId, version]);
  if (!data)
    return (
      <Notice error={Boolean(error)}>
        {error || "Carregando matriz de notificações…"}
      </Notice>
    );
  const update = async (
    event: string,
    role: string,
    patch: Record<string, unknown>,
  ) => {
    const current = data.rules.find(
      (row) => row.event === event && row.subject_role === role,
    );
    if (busy || savingRef.current) return;
    savingRef.current = true;
    setPending(true);
    setError("");
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
      ...(patch.cooldownMinutes !== undefined
        ? { cooldown_minutes: Number(patch.cooldownMinutes) }
        : {}),
      ...(patch.quietStart !== undefined
        ? { quiet_start: patch.quietStart as number | null }
        : {}),
      ...(patch.quietEnd !== undefined
        ? { quiet_end: patch.quietEnd as number | null }
        : {}),
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
    try {
      await configure("notification_rule", {
        event,
        role,
        channels: current?.channels ?? ["internal"],
        includePdf: current?.include_pdf ?? true,
        cooldownMinutes: current?.cooldown_minutes ?? 0,
        quietStart: current?.quiet_start ?? null,
        quietEnd: current?.quiet_end ?? null,
        mode: current?.mode ?? "optional",
        ...patch,
      });
      const authoritative = await api<Data>(
        "/api/notification-rules?careRecipientId=" + patientId,
      );
      setData(authoritative);
    } catch {
      setError(
        "Não foi possível confirmar a configuração. Recarregue a matriz antes de continuar.",
      );
    } finally {
      savingRef.current = false;
      setPending(false);
    }
  };
  const columns = Object.entries(roles).filter(([role]) => !roleFilter || role === roleFilter);
  const available = (event: string) => data.channels.filter((channel) => !data.eventChannels || data.eventChannels[event]?.includes(channel.code));
  return <section aria-label="Matriz de notificações">
    {error ? <Notice error>{error}</Notice> : null}
    <div className="hca-section-heading"><div><h2>Eventos × funções · múltiplos canais</h2><p>Canais disponíveis conforme o provedor; destino verificado, consentimento e autorização continuam obrigatórios.</p></div></div>
    <div className="hca-toolbar"><Input type="search" aria-label="Pesquisar eventos de notificação" placeholder="Buscar evento" contentBefore={<Icon name="search" />} value={search} onChange={(_, value) => setSearch(value.value)} /><Select aria-label="Função nas notificações" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">Todas as funções</option>{Object.entries(roles).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select></div>
    <div className="hca-records hca-matrix-scroll" tabIndex={0} role="region" aria-label="Tabela de notificações; rolagem horizontal por função"><Table className="hca-table hca-matrix" aria-label="Canais por evento e função"><TableHeader><TableRow><TableHeaderCell>Evento</TableHeaderCell>{columns.map(([role, label]) => <TableHeaderCell key={role}>{label}</TableHeaderCell>)}</TableRow></TableHeader><TableBody>{data.events.filter((event) => documentEventLabel(event).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).map((event) => <TableRow key={event}><TableCell className="hca-matrix-name"><h3>{documentEventLabel(event)}</h3></TableCell>{columns.map(([role, label]) => {
      const rule = data.rules.find((row) => row.event === event && row.subject_role === role), selected = rule?.channels ?? ["internal"];
      return <TableCell key={role}><div className="hca-channel-cell">{available(event).map((channel) => <Tooltip key={channel.code} content={channel.label} relationship="label"><Checkbox className="hca-channel-checkbox" label={<Icon name={channel.code === "internal" ? "bell" : channel.code === "email" ? "forms" : "team"} />} aria-label={documentEventLabel(event) + " · " + label + " · " + channel.label} disabled={busy || pending} checked={selected.includes(channel.code)} onChange={(_, value) => void update(event, role, { channels: value.checked ? [...selected, channel.code] : selected.filter((code) => code !== channel.code) })} /></Tooltip>)}<Button appearance="subtle" icon={<Icon name="more" />} aria-label={"Opções de " + documentEventLabel(event) + " · " + label} disabled={busy || pending} onClick={(value) => setEditor({ event, role, opener: value.currentTarget })} /></div>
      {editor?.event === event && editor.role === role ? <RecordDrawer title={documentEventLabel(event) + " · " + label} onClose={() => setEditor(null)} busy={busy || pending} restoreFocusTo={editor.opener} trackChanges={false}>{error || configurationError ? <Notice error>{error || configurationError}</Notice> : null}<div className="hca-form"><p className="hca-field-hint">Cada alteração é salva e confirmada pelo servidor.</p>
                      <label className="block text-xs">
                        Comportamento
                        <select
                          className={inputClass}
                          disabled={busy || pending}
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
                          disabled={
                            busy || pending || event === "req.registered_author"
                          }
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
                          disabled={busy || pending}
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
                            disabled={busy || pending}
                            aria-label={index ? "Fim" : "Início"}
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

      </div></RecordDrawer> : null}</TableCell>;
    })}</TableRow>)}</TableBody></Table></div>
  </section>;
}
