"use client";

import { useState } from "react";
import { ActionButton, FormField } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { SearchSelect } from "@/components/ui/search-select";
import { normalizeCatalogText } from "@/lib/catalog-match";

type Material = { id: string; name: string; unit: string; aliases?: string[] };

export function WizardCatalogueExtra({ catalogue, selectedIds, onAdd, label = "Item extra" }: {
  catalogue: readonly Material[];
  selectedIds: readonly string[];
  onAdd: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const candidateQuery = normalizeCatalogText(query);
  const selected = new Set(selectedIds);
  const candidates = open ? catalogue.filter(material =>
    !selected.has(material.id) && [material.name, ...(material.aliases ?? [])].some(name =>
      normalizeCatalogText(name).includes(candidateQuery),
    ),
  ) : [];
  return <>
    <ActionButton type="button" onClick={() => { setQuery(""); setOpen(true); }}>
      <Icon name="plus" />{label}
    </ActionButton>
    <Dialog open={open} onClose={() => setOpen(false)} title="Adicionar item extra">
      <FormField label="Material do catálogo">
        <SearchSelect query={query} selectedIds={[]} onQueryChange={setQuery}
          options={candidates.slice(0, 30).map(material => ({
            value: material.id, label: material.name, content: `${material.name} · ${material.unit}`,
          }))}
          onSelectionChange={([id]) => {
            if (!id || !candidates.some(material => material.id === id)) return;
            onAdd(id);
            setOpen(false);
          }} />
      </FormField>
      {candidates.length > 30 ? <p className="hca-field-help">Digite parte do nome para localizar o material.</p> : null}
    </Dialog>
  </>;
}
