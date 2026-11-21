"use client";

import { Combobox } from "@base-ui/react/combobox";
import type { ComponentProps, ReactNode } from "react";
import { useFieldAttributes } from "./controls";
import { Icon } from "./icon";

export type SelectChoice = { value: string; label: string; content?: ReactNode; disabled?: boolean };
type SearchSelectProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "children" | "type" | "size" | "multiple"> & {
  options: SelectChoice[];
  selectedIds: string[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelectionChange: (ids: string[]) => void;
  multiple?: boolean;
  triggerLabel?: string;
};

/** Search text never becomes a selection without an explicit item action. */
export function SearchSelect({ options, selectedIds, query, onQueryChange, onSelectionChange, multiple = false, triggerLabel = "Abrir opções", disabled, className, ...input }: SearchSelectProps) {
  const field = useFieldAttributes(input);
  const labels = new Map(options.map(option => [option.value, option.label]));
  return <Combobox.Root<string, boolean>
    multiple={multiple} disabled={disabled} filter={null}
    items={options.map(option => option.value)}
    value={multiple ? selectedIds : selectedIds[0] ?? null}
    inputValue={query} itemToStringLabel={value => labels.get(value) ?? ""}
    onInputValueChange={(value, details) => {
      // Closing the popup also emits input-clear. Only real input edits may
      // clear the caller's selected ID; an internal query reset must not do so.
      if (details.reason === "input-change") onQueryChange(value);
    }}
    onValueChange={(value, details) => {
      if (details.reason !== "item-press" && details.reason !== "clear-press" && details.reason !== "chip-remove-press") return;
      onSelectionChange(Array.isArray(value) ? value : value === null ? [] : [value]);
    }}>
    <Combobox.InputGroup className="hca-search-select">
      <Combobox.Input {...input} {...field} required={Boolean(field.required && !selectedIds.length)} aria-required={field.required || undefined} disabled={disabled} className={["hca-text-input", className].filter(Boolean).join(" ")} />
      <Combobox.Trigger className="hca-choice-trigger" aria-label={triggerLabel} disabled={disabled}><Icon name="down" /></Combobox.Trigger>
    </Combobox.InputGroup>
    <Combobox.Portal>
      <Combobox.Positioner className="hca-floating-positioner" sideOffset={5}>
        <Combobox.Popup className="hca-choice-popup">
          <Combobox.List className="hca-choice-list">{options.map(option => <Combobox.Item key={option.value} value={option.value} disabled={option.disabled} className="hca-choice-option">
            {multiple ? <Combobox.ItemIndicator className="hca-choice-check"><Icon name="check" /></Combobox.ItemIndicator> : null}
            <span>{option.content ?? option.label}</span>
          </Combobox.Item>)}</Combobox.List>
          <Combobox.Empty className="hca-choice-empty">Nenhuma opção corresponde à consulta.</Combobox.Empty>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  </Combobox.Root>;
}
