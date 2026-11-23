"use client";

import { useState, type FormEvent } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { ApiError, Notice } from "@/components/workspace";
import { useResidenceHours } from "@/components/schedules/use-residence-hours";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { parseResidenceHours, residenceHoursChange, type ResidenceHours } from "@/lib/schedules/residence-hours";
import type { z } from "zod";

type Packet = z.infer<typeof residenceHoursChange>;
type Result = ReturnType<typeof parseResidenceHours>;
const emptyHours: Packet["hours"] = { timezone: "", dayStart: "", nightStart: "" };

function confirmed(value: unknown, packet: Packet) {
  try {
    const { hours } = parseResidenceHours(value, packet.careRecipientId);
    return hours?.version === (packet.expectedVersion ?? 0) + 1
      && hours.timezone === packet.hours.timezone && hours.dayStart === packet.hours.dayStart
      && hours.nightStart === packet.hours.nightStart;
  } catch { return false; }
}

// The residence command checks its receipt under lock before rejecting the version.
function staleResidenceVersion(reason: unknown) {
  return reason instanceof ApiError && reason.status === 409 && reason.code === "VERSION_CONFLICT";
}

export function ScheduleResidenceSettings({ patientId }: { patientId: string }) {
  const read = useResidenceHours(patientId, true);
  const command = useCommandIntent<Packet, Result>(confirmed, staleResidenceVersion);
  const [editor, setEditor] = useState<{ base: ResidenceHours | null; fields: Packet["hours"]; opener: HTMLButtonElement } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function finish() {
    setEditor(null);
    setConflict(false);
    setMessage("Horários da residência atualizados.");
    read.refresh();
    window.dispatchEvent(new Event("hca:data-changed"));
  }
  function change(field: keyof Packet["hours"], value: string) {
    setEditor((open) => open && { ...open, fields: { ...open.fields, [field]: value } });
  }

  function showFailure(reason: unknown, fallback: string) {
    if (staleResidenceVersion(reason)) {
      setConflict(true);
      read.refresh();
    }
    setError(reason instanceof Error ? reason.message : fallback);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || conflict || command.busy || command.uncertain) return;
    const packet = residenceHoursChange.safeParse({
      careRecipientId: patientId,
      idempotencyKey: crypto.randomUUID(),
      expectedVersion: editor.base?.version ?? null,
      hours: editor.fields,
    });
    if (!packet.success) {
      setError("Confira o fuso da residência e os horários de início.");
      return;
    }
    setError("");
    try { await command.send(read.endpoint, packet.data); finish(); }
    catch (reason) { showFailure(reason, "Não foi possível confirmar a alteração."); }
  }

  const hours = read.data?.hours;
  return <section id="horarios-da-residencia" aria-label="Horários dos plantões" className="ui-card hca-admin-card">
    <div className="hca-section-heading"><div><h2>Horários da residência</h2>
      {read.loading ? <p role="status">Consultando horários…</p>
        : hours ? <p>Diurno {hours.dayStart} · Noturno {hours.nightStart} · {hours.timezone}</p>
          : read.data ? <p>Defina o fuso e o início dos plantões diurnos e noturnos.</p> : null}
    </div><ActionButton disabled={read.loading || Boolean(read.error) || !read.data}
      onClick={event => {
        setMessage(""); setError(""); setConflict(false);
        const fields = hours ? { timezone: hours.timezone, dayStart: hours.dayStart, nightStart: hours.nightStart } : emptyHours;
        setEditor({ base: hours ?? null, fields, opener: event.currentTarget });
      }}>
      Editar horários
    </ActionButton></div>
    {read.error ? <Notice error>{read.error}<ActionButton onClick={read.refresh}>Consultar novamente</ActionButton></Notice> : null}
    {message ? <Notice>{message}</Notice> : null}
    {editor ? <RecordDrawer title="Horários da residência" subtitle="Padrões para os próximos cadastros"
      onClose={() => setEditor(null)} restoreFocusTo={editor.opener} busy={command.busy} preventClose={command.uncertain} exitDialog>
      <form className="hca-form-stack" onSubmit={event => void submit(event)}>
        <fieldset className="hca-form-stack" disabled={command.uncertain}>
          <FormField label="Fuso da residência" required helpText="Exemplo: America/Manaus.">
            <TextInput name="timezone" value={editor.fields.timezone} onChange={event => change("timezone", event.currentTarget.value)} required maxLength={80} />
          </FormField>
          <div className="hca-compact-grid">
            <FormField label="Início diurno" required><TextInput type="time" name="dayStart" value={editor.fields.dayStart} onChange={event => change("dayStart", event.currentTarget.value)} required /></FormField>
            <FormField label="Início noturno" required><TextInput type="time" name="nightStart" value={editor.fields.nightStart} onChange={event => change("nightStart", event.currentTarget.value)} required /></FormField>
          </div>
          <p>Plantões já registrados conservam seus intervalos.</p>
          <ActionButton type="submit" variant="primary" disabled={conflict}>Registrar horários</ActionButton>
        </fieldset>
      </form>
      {error ? <Notice error>{error}</Notice> : null}
      {conflict ? <Notice>
        {read.loading ? <p role="status">Consultando horários atuais…</p> : hours && hours.version !== editor.base?.version ? <>
          <p>Horários atuais, versão {hours.version}. Diurno {hours.dayStart} · Noturno {hours.nightStart} · {hours.timezone}</p>
          <ActionButton onClick={() => {
            setEditor({ ...editor, base: hours });
            setConflict(false);
            setError("");
          }}>Adotar versão atual e manter meus horários</ActionButton>
        </> : <ActionButton onClick={read.refresh}>Consultar horários novamente</ActionButton>}
      </Notice> : null}
      {command.uncertain ? <ActionButton variant="primary" onClick={async () => {
        setError("");
        try { await command.recover(); finish(); }
        catch (reason) { showFailure(reason, "Consulte o resultado novamente."); }
      }}>Recuperar a mesma alteração</ActionButton> : null}
    </RecordDrawer> : null}
  </section>;
}
