"use client";
import { useState } from "react";
import { Button } from "@fluentui/react-components";
import { Notice } from "@/components/workspace";

export const selectedDayLabel = (value: string) =>
  value.split("-").reverse().join("/");
export function SelectedShiftDates({
  from,
  until,
  selected,
  onChange,
}: {
  from: string;
  until: string;
  selected: string[];
  onChange: (dates: string[]) => void;
}) {
  const [month, setMonth] = useState(from.slice(0, 7));
  const first = new Date(month + "-01T12:00:00Z");
  const days = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(first);
  function move(delta: number) {
    const date = new Date(first);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(date.toISOString().slice(0, 7));
  }
  function toggle(date: string) {
    onChange(
      selected.includes(date)
        ? selected.filter((value) => value !== date)
        : [...selected, date].sort(),
    );
  }
  const invalid = selected.filter((date) => date < from || date > until);
  return (
    <section
      className="hca-form-stack hca-selected-dates"
      aria-label="Selecionar datas dos plantões"
    >
      <h3>{label}</h3>
      <div className="hca-toolbar">
        <Button
          type="button"
          aria-label="Mês anterior das datas"
          onClick={() => move(-1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          aria-label="Próximo mês das datas"
          onClick={() => move(1)}
        >
          Próximo
        </Button>
      </div>
      <p>
        Selecione os dias desejados. Trocar o mês conserva a seleção e o horário
        do tipo de plantão.
      </p>
      <div
        className="hca-date-grid"
        role="group"
        aria-label={"Dias de " + label}
      >
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <span className="text-center text-xs" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1,
            date = month + "-" + String(day).padStart(2, "0");
          return (
            <button
              key={date}
              type="button"
              className="ui-button"
              style={
                day === 1
                  ? { gridColumnStart: first.getUTCDay() + 1 }
                  : undefined
              }
              aria-label={"Dia " + selectedDayLabel(date)}
              aria-pressed={selected.includes(date)}
              disabled={date < from || date > until}
              onClick={() => toggle(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p role="status">{selected.length} datas selecionadas</p>
      {invalid.length ? (
        <Notice error>
          Há datas fora do período escolhido. Remova-as ou ajuste o período
          antes de revisar.
        </Notice>
      ) : null}
      <div className="hca-toolbar" aria-label="Datas escolhidas">
        {selected.map((date) => (
          <Button
            key={date}
            type="button"
            aria-label={"Remover data " + selectedDayLabel(date)}
            onClick={() => toggle(date)}
          >
            {selectedDayLabel(date)} ×
          </Button>
        ))}
      </div>
    </section>
  );
}
