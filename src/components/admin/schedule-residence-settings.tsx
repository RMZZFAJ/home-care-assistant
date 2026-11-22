"use client";

import { useState, type FormEvent } from "react";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { useResidenceHours } from "@/components/schedules/use-residence-hours";
import { useCommandIntent } from "@/lib/client/use-command-intent";
import { parseResidenceHours, residenceHoursChange, type ResidenceHours } from "@/lib/schedules/residence-hours";
import type { z } from "zod";

type Packet = z.infer<typeof residenceHoursChange>;
type Result = ReturnType<typeof parseResidenceHours>;

function confirmed(value: unknown, packet: Packet) {
  try {
    const { hours } = parseResidenceHours(value, packet.careRecipientId);
    return hours?.version === (packet.expectedVersion ?? 0) + 1
      && hours.timezone === packet.hours.timezone && hours.dayStart === packet.hours.dayStart
      && hours.nightStart === packet.hours.nightStart;
  } catch { return false; }
}

export function ScheduleResidenceSettings({ patientId }: { patientId: string }) {
  const read = useResidenceHours(patientId, true);
  const command = useCommandIntent<Packet, Result>(confirmed);
  const [editor, setEditor] = useState<{ base: ResidenceHours | null; opener: HTMLButtonElement } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function finish() {
    setEditor(null);
    setMessage("Horários da residência atualizados.");
    read.refresh();
    window.dispatchEvent(new Event("hca:data-changed"));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || command.busy || command.uncertain) return;
    const values = new FormData(event.currentTarget);
    const packet = residenceHoursChange.safeParse({
      careRecipientId: patientId,
      idempotencyKey: crypto.randomUUID(),
      expectedVersion: editor.base?.version ?? null,
      hours: { timezone: values.get("timezone"), dayStart: values.get("dayStart"), nightStart: values.get("nightStart") },
    });
    if (!packet.success) {
      setError("Confira o fuso da residência e os horários de início.");
      return;
    }
    setError("");
    try { await command.send(read.endpoint, packet.data); finish(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível confirmar a alteração."); }
  }

  const hours = read.data?.hours;
  return <section aria-label="Horários dos plantões" className="ui-card hca-admin-card">
    <div className="hca-section-heading"><div><h2>Horários da residência</h2>
      {read.loading ? <p role="status">Consultando horários…</p>
        : hours ? <p>Diurno {hours.dayStart} · Noturno {hours.nightStart} · {hours.timezone}</p>
          : read.data ? <p>Defina o fuso e o início dos plantões diurnos e noturnos.</p> : null}
    </div><ActionButton disabled={read.loading || Boolean(read.error) || !read.data}
      onClick={event => { setMessage(""); setError(""); setEditor({ base: hours ?? null, opener: event.currentTarget }); }}>
      Editar horários
    </ActionButton></div>
    {read.error ? <Notice error>{read.error}<ActionButton onClick={read.refresh}>Consultar novamente</ActionButton></Notice> : null}
    {message ? <Notice>{message}</Notice> : null}
    {editor ? <RecordDrawer title="Horários da residência" subtitle="Padrões para os próximos cadastros"
      onClose={() => setEditor(null)} restoreFocusTo={editor.opener} busy={command.busy} preventClose={command.uncertain} exitDialog>
      <form className="hca-form-stack" onSubmit={event => void submit(event)}>
        <fieldset className="hca-form-stack" disabled={command.uncertain}>
          <FormField label="Fuso da residência" required helpText="Exemplo: America/Manaus.">
            <TextInput name="timezone" defaultValue={editor.base?.timezone} required maxLength={80} />
          </FormField>
          <div className="hca-compact-grid">
            <FormField label="Início diurno" required><TextInput type="time" name="dayStart" defaultValue={editor.base?.dayStart} required /></FormField>
            <FormField label="Início noturno" required><TextInput type="time" name="nightStart" defaultValue={editor.base?.nightStart} required /></FormField>
          </div>
          <p>Plantões já registrados conservam seus intervalos.</p>
          <ActionButton type="submit" variant="primary">Registrar horários</ActionButton>
        </fieldset>
      </form>
      {error ? <Notice error>{error}</Notice> : null}
      {command.uncertain ? <ActionButton variant="primary" onClick={async () => {
        setError("");
        try { await command.recover(); finish(); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Consulte o resultado novamente."); }
      }}>Recuperar a mesma alteração</ActionButton> : null}
    </RecordDrawer> : null}
  </section>;
}
