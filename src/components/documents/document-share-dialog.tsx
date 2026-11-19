"use client";

import { useState, type RefObject } from "react";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";

export function documentShareUrl(id: string) {
  return new URL("/fichas/" + id, window.location.origin).href;
}

export function DocumentShareDialog({ id, code, patientName, onClose, finalFocus }: {
  id: string;
  code: string;
  patientName?: string;
  onClose: () => void;
  finalFocus: RefObject<HTMLElement | null>;
}) {
  const url = documentShareUrl(id);
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link da ficha copiado.");
    } catch {
      setMessage("Não foi possível copiar. Selecione o link apresentado acima.");
    }
  }
  return (
    <Dialog open onClose={onClose} title="Compartilhar ficha" finalFocus={finalFocus}>
      <div className="share-heading"><span className="share-icon"><Icon name="link" width={25} height={25} /></span><div><strong>{code}</strong><p>{patientName}</p></div></div>
      <p>Quem receber o link precisa ter acesso a este paciente.</p>
      <FormField label="Link da ficha"><TextInput value={url} readOnly /></FormField>
      {message ? <p role="status">{message}</p> : null}
      <div className="hca-toolbar">
        <ActionButton onClick={onClose}>Fechar</ActionButton>
        <ActionButton variant="primary" onClick={() => void copy()}><Icon name="copy" />Copiar link</ActionButton>
      </div>
    </Dialog>
  );
}
