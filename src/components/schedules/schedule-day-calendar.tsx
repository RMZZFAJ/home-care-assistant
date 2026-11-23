import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";

const monthFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long" });
const fullFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "full" });
const weekdayFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" });
const civilDate = (day: string) => new Date(day + "T12:00:00Z");

export function ScheduleDayCalendar({ selected, days, occupied, onSelect }: {
  selected: string;
  days: string[];
  occupied: ReadonlySet<string>;
  onSelect: (day: string) => void;
}) {
  const active = civilDate(selected);
  function step(direction: -1 | 1) {
    const next = civilDate(selected);
    next.setUTCDate(next.getUTCDate() + direction);
    onSelect(next.toISOString().slice(0, 10));
  }

  return <div className="hca-agenda-calendar" role="group" aria-label="Calendário semanal de plantões">
    <div className="hca-agenda-calendar-heading">
      <ActionButton variant="quiet" compact aria-label="Dia anterior" onClick={() => step(-1)}>
        <Icon name="arrow" className="hca-agenda-previous" />
      </ActionButton>
      <div aria-live="polite" aria-atomic="true">
        <strong>{monthFormat.format(active)}</strong>
        <small>{dayFormat.format(active)}</small>
      </div>
      <ActionButton variant="quiet" compact aria-label="Próximo dia" onClick={() => step(1)}>
        <Icon name="chevron" />
      </ActionButton>
    </div>
    <div className="hca-agenda-calendar-week">
      {days.map(day => {
        const date = civilDate(day);
        const hasShifts = occupied.has(day);
        return <button type="button" key={day} aria-pressed={day === selected}
          aria-label={fullFormat.format(date) + (hasShifts ? ", com plantões" : "")}
          onClick={() => onSelect(day)}>
          <small>{weekdayFormat.format(date).replace(".", "")}</small>
          <strong>{date.getUTCDate()}</strong>
          {hasShifts ? <span aria-hidden="true" /> : null}
        </button>;
      })}
    </div>
  </div>;
}
