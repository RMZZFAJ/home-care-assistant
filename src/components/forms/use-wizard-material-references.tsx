"use client";

import { useState } from "react";
import { SupplySourcePicker } from "@/components/documents/supply-source-picker";
import type { MaterialDocumentReferences } from "@/lib/validation/supply-sources";

type Material = { id: string; name: string };
type FocusTarget = () => HTMLButtonElement | null;

export function useWizardMaterialReferences(patientId: string, kind: "REQ" | "BAL", onEdit: () => void, excludeDocumentId?: string | null) {
  const [links, setLinks] = useState<MaterialDocumentReferences>([]);
  const [pending, setPending] = useState<{ material: Material; returnFocus: FocusTarget } | null>(null);

  const open = (material: Material, returnFocus: FocusTarget) => setPending({ material, returnFocus });
  const remove = (productId: string) => setLinks(current => current.filter(link => link.productId !== productId));
  const count = (productId: string) => links.filter(link => link.productId === productId).length;

  function close() {
    setPending(null);
    requestAnimationFrame(() => pending?.returnFocus()?.focus({ preventScroll: true }));
  }

  const picker = pending ? <SupplySourcePicker patientId={patientId} target={kind} product={pending.material}
    excludeDocumentId={excludeDocumentId}
    currentIds={links.filter(link => link.productId === pending.material.id).map(link => link.documentId)}
    maxReferences={100 - links.length + count(pending.material.id)}
    onClose={close} onApplyReferences={ids => {
      const productId = pending.material.id;
      setLinks(current => [
        ...current.filter(link => link.productId !== productId),
        ...ids.map(documentId => ({ productId, documentId })),
      ]);
      onEdit();
      close();
    }} /> : null;

  return { links, setLinks, open, remove, count, picker };
}
