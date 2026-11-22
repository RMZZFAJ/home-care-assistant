"use client";
import {
  CheckboxField,
  FormField,
  SelectField,
  TextAreaField,
  TextInput,
} from "@/components/ui/controls";
import { SelectedShiftDates } from "./selected-shift-dates";
import type { ScheduleCreationFields as Fields } from "@/lib/schedules/creation";
import { shiftDayPeriod, timeAfter } from "@/lib/schedules/residence-hours";
import { Icon } from "@/components/ui/icon";
import type { ScheduleWorkspace } from "@/types/schedules";

/** The ordinary form and its private preparation share the same controlled fields. */
export function ScheduleCreationFields({
  value,
  onChange,
  data,
  ownId,
  team,
  publishOwn = false,
  datesMonth,
  onDatesMonthChange,
}: {
  value: Fields;
  onChange: (value: Fields) => void;
  data: ScheduleWorkspace;
  ownId: string;
  team: boolean;
  publishOwn?: boolean;
  datesMonth?: string | null;
  onDatesMonthChange?: (month: string) => void;
}) {
  if (value.form === "type") {
    const patch = (p: Partial<typeof value>) => onChange({ ...value, ...p });
    return (
      <>
        <FormField label="Nome do plantão">
          <TextInput
            name="name"
            required
            minLength={2}
            maxLength={100}
            value={value.name}
            onChange={(e) => patch({ name: e.currentTarget.value })}
          />
        </FormField>
        <FormField label="Início local">
          <TextInput
            name="start"
            type="time"
            step={1}
            required
            value={value.start}
            onChange={(e) => patch({ start: e.currentTarget.value })}
          />
        </FormField>
        <FormField label="Duração em minutos">
          <TextInput
            name="duration"
            type="number"
            min={15}
            max={1440}
            step={1}
            required
            value={value.duration}
            onChange={(e) => patch({ duration: e.currentTarget.value })}
          />
          <small>720 minutos = 12 horas; 1440 minutos = 24 horas.</small>
        </FormField>
        <CheckboxField
          name="active"
          label="Disponível para novas escalas"
          checked={value.active}
          onChange={(e) => patch({ active: e.currentTarget.checked })}
        />
      </>
    );
  }
  const patch = (p: Partial<typeof value>) => onChange({ ...value, ...p }),
    selected = data.types.find((t) => t.id === value.shiftTypeId),
    persons = data.professionals.filter((p) => team || p.id === ownId),
    types = data.types.filter((t) => t.is_active);
  const stale =
    Boolean(value.shiftTypeId) &&
    (!selected ||
      !selected.is_active ||
      selected.version !== value.shiftTypeVersion);
  const residence = value.residence;
  const standard = residence?.period === "night" ? residence.nightStart : residence?.dayStart;
  const starts = residence?.special ? residence.specialStart : standard;
  const ends = residence?.special
    ? { time: residence.specialEnd, nextDay: Boolean(starts && residence.specialEnd && residence.specialEnd <= starts) }
    : starts && selected ? timeAfter(starts, selected.duration_minutes) : null;
  const dateControl = <FormField label={residence ? value.recurrence === "once" ? "Data do plantão" : "Primeiro dia" : "Primeiro dia / âncora"}>
    <TextInput name="from" type="date" required value={value.from}
      onChange={e => patch({ from: e.currentTarget.value })} />
  </FormField>;
  const adjustableEnd = Boolean(residence && value.recurrence !== "once" && value.recurrence !== "dates");
  return (
    <>
      <FormField label="Profissional">
        <SelectField
          name="person"
          required
          value={value.professionalId}
          onChange={(e) => patch({ professionalId: e.currentTarget.value })}
        >
          <option value="">Selecione o profissional</option>
          {value.professionalId &&
          !persons.some((p) => p.id === value.professionalId) ? (
            <option value={value.professionalId}>
              Seleção preservada, indisponível para nova programação
            </option>
          ) : null}
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
      </FormField>
      {residence ? dateControl : null}
      {residence ? <CheckboxField role="switch" label="Com repetição" checked={value.recurrence !== "once"}
        onChange={event => patch({ recurrence: event.currentTarget.checked ? "cycle" : "once" })} /> : null}
      <FormField label={residence && value.recurrence !== "once" ? "Tipo da escala" : "Tipo de plantão"}>
        <SelectField
          name="type"
          required
          value={value.shiftTypeId}
          onChange={(e) => {
            const id = e.currentTarget.value;
            patch({
              shiftTypeId: id,
              shiftTypeVersion:
                data.types.find((t) => t.id === id)?.version ?? null,
            });
          }}
        >
          <option value="">Selecione o tipo</option>
          {value.shiftTypeId &&
          !types.some((t) => t.id === value.shiftTypeId) ? (
            <option value={value.shiftTypeId}>
              Tipo preservado, indisponível para nova programação
            </option>
          ) : null}
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {residence ? "" : t.starts_local.slice(0, 5) + " · "}
              {t.duration_minutes / 60}h
            </option>
          ))}
        </SelectField>
      </FormField>
      {stale ? (
        <section className="hca-attention" role="status">
          <p>
            O tipo selecionado mudou ou deixou de estar disponível. A referência
            preservada é a versão {value.shiftTypeVersion ?? "não conferida"}.
            Compare o cadastro atual antes de continuar.
          </p>
          {selected?.is_active ? (
            <>
              <p>
                Cadastro atual: {selected.name} ·{" "}
                {residence ? "" : selected.starts_local.slice(0, 5) + " · "}
                {selected.duration_minutes} minutos · versão {selected.version}.
              </p>
              <button
                type="button"
                className="hca-control"
                onClick={() => patch({ shiftTypeVersion: selected.version })}
              >
                Adotar versão atual do tipo, mantendo meu preenchimento
              </button>
            </>
          ) : null}
        </section>
      ) : null}
      {!residence || value.recurrence !== "once" ? <FormField label="Repetição">
        <SelectField
          name="recurrence"
          value={value.recurrence}
          onChange={(e) =>
            patch({
              recurrence: e.currentTarget.value as typeof value.recurrence,
            })
          }
        >
          <option value="weekly">Dias da semana</option>
          {!residence ? <option value="once">Data específica</option> : null}
          <option value="dates">Datas escolhidas</option>
          <option value="cycle">Ciclo de trabalho e descanso</option>
        </SelectField>
      </FormField> : null}
      {value.recurrence === "weekly" ? (
        <fieldset className="hca-weekdays">
          <legend>Dias da semana</legend>
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, n) => (
            <CheckboxField
              key={d}
              label={d}
              name="day"
              value={String(n)}
              checked={value.weekdays.includes(n)}
              onChange={(e) =>
                patch({
                  weekdays: e.currentTarget.checked
                    ? [...value.weekdays, n].sort((left, right) => left - right)
                    : value.weekdays.filter((x) => x !== n),
                })
              }
            />
          ))}
        </fieldset>
      ) : null}
      {value.recurrence === "cycle" ? (
        <FormField label="Regime">
          <SelectField
            name="cycle"
            value={value.cycle}
            onChange={(e) =>
              patch({ cycle: e.currentTarget.value as typeof value.cycle })
            }
          >
            {["12x36", "24x48", "24x24"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <small>
            Use um tipo com a mesma duração de trabalho. O ciclo mantém horas
            corridas a partir da data de início.
          </small>
        </FormField>
      ) : null}
      {!residence ? dateControl : <>
        <FormField label="Período">
          <SelectField value={residence.period} onChange={event => {
            patch({ residence: { ...residence, period: shiftDayPeriod.parse(event.currentTarget.value) } });
          }}><option value="day">Diurno</option><option value="night">Noturno</option></SelectField>
        </FormField>
        <div className="hca-schedule-hours" aria-label="Horário do plantão">
          <Icon name="clock" width={22} height={22} />
          <div><small>{residence.special ? "Horário especial deste cadastro" : "Padrão da residência"}</small>
            <strong>{starts && ends?.time ? `${starts} às ${ends.time}` : "Informe o intervalo"}</strong>
            {ends?.nextDay ? <span>Término no dia seguinte.</span> : null}
          </div>
        </div>
        <CheckboxField role="switch" label="Horário especial" checked={residence.special} onChange={event => patch({
          residence: { ...residence, special: event.currentTarget.checked },
        })} />
        {residence.special ? <div className="hca-compact-grid">
          <FormField label="Início"><TextInput type="time" required value={residence.specialStart}
            onChange={event => patch({ residence: { ...residence, specialStart: event.currentTarget.value } })} /></FormField>
          <FormField label="Término"><TextInput type="time" required value={residence.specialEnd}
            onChange={event => patch({ residence: { ...residence, specialEnd: event.currentTarget.value } })} /></FormField>
        </div> : null}
      </>}
      {adjustableEnd ? <CheckboxField role="switch" label="Definir data de término" checked={Boolean(value.until)}
        onChange={event => patch({ until: event.currentTarget.checked ? value.from : "" })} /> : null}
      {value.recurrence !== "once" && (!adjustableEnd || value.until) ? (
        <FormField label={residence ? "Último dia" : "Válida até"}>
          <TextInput
            name="until"
            type="date"
            required
            value={value.until}
            onChange={(e) => patch({ until: e.currentTarget.value })}
          />
          <small>
            Até 366 dias após a âncora. Todas as ocorrências são verificadas
            antes da gravação.
          </small>
        </FormField>
      ) : null}
      {value.recurrence === "dates" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.from) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.until) ? (
        <SelectedShiftDates
          key={value.from.slice(0, 7)}
          from={value.from}
          until={value.until}
          selected={value.dates}
          month={datesMonth}
          onMonthChange={onDatesMonthChange}
          onChange={(dates) => patch({ dates })}
        />
      ) : null}
      {residence ? null : <FormField label="Fuso horário">
        <SelectField
          name="zone"
          value={value.timezone}
          onChange={(e) => patch({ timezone: e.currentTarget.value })}
        >
          {[
            "America/Sao_Paulo",
            "America/Manaus",
            "America/Belem",
            "America/Fortaleza",
            "America/Cuiaba",
            "America/Rio_Branco",
            "America/Noronha",
            "UTC",
          ].map((z) => (
            <option key={z}>{z}</option>
          ))}
        </SelectField>
      </FormField>}
      <FormField label={residence ? "Informação adicional" : "Observações"}>
        <TextAreaField
          name="notes"
          maxLength={2000}
          value={value.notes}
          onChange={(e) => patch({ notes: e.currentTarget.value })}
        />
      </FormField>
      <FormField label="Motivo de registro retroativo, quando necessário">
        <TextInput
          name="reason"
          maxLength={1000}
          value={value.reason}
          onChange={(e) => patch({ reason: e.currentTarget.value })}
        />
      </FormField>
      {!team && !publishOwn ? (
        <p className="hca-muted">
          Sua programação será proposta para aprovação.
        </p>
      ) : null}
    </>
  );
}
