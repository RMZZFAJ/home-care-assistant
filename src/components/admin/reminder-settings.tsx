"use client";
import { inputClass } from "../workspace";

type Person = { id: string; name: string; role: string };
export function ReminderSettings({
  settings,
  directory,
}: {
  settings: Record<string, unknown>;
  directory: Person[];
}) {
  const shift = (settings.shiftReminder ?? {}) as {
    enabled?: boolean;
    hour?: number;
    days?: string[];
    userIds?: string[];
  };
  const balUsers = (settings.balReminderUsers ?? []) as string[];
  return (
    <details className="rounded-lg border border-(--line) p-3 sm:col-span-2">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        Destinatários e lembretes programados
      </summary>
      <p className="my-3 text-xs text-(--muted)">
        Somente pessoas selecionadas recebem lembretes. Permissão atual, canais
        e preferências são conferidos a cada envio.
      </p>
      <fieldset>
        <legend className="text-sm font-semibold">
          Lembrete BAL · 09h no dia configurado
        </legend>
        {directory.map((person) => (
          <label
            key={person.id}
            className="flex min-h-11 items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              name="balReminderUsers"
              value={person.id}
              defaultChecked={balUsers.includes(person.id)}
            />
            {person.name}
          </label>
        ))}
      </fieldset>
      <label className="my-3 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="shiftEnabled"
          defaultChecked={shift.enabled === true}
        />
        Lembrar comunicação de materiais ao fim do período
      </label>
      <label className="block text-sm">
        Horário de Brasília
        <select
          name="shiftHour"
          className={inputClass}
          defaultValue={shift.hour ?? 19}
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {hour}:00
            </option>
          ))}
        </select>
      </label>
      <fieldset className="mt-3">
        <legend className="text-sm">Dias da semana</legend>
        <div className="flex flex-wrap gap-3">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
            (day, index) => (
              <label
                key={day}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  name="shiftDays"
                  type="checkbox"
                  value={index}
                  defaultChecked={(shift.days ?? []).includes(String(index))}
                />
                {day}
              </label>
            ),
          )}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">
          Destinatários do período
        </legend>
        {directory.map((person) => (
          <label
            key={person.id}
            className="flex min-h-11 items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              name="shiftUsers"
              value={person.id}
              defaultChecked={(shift.userIds ?? []).includes(person.id)}
            />
            {person.name}
          </label>
        ))}
      </fieldset>
    </details>
  );
}
