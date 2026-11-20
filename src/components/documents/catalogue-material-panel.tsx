"use client";

import { useRef, useState, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { ActionButton } from "@/components/ui/controls";
import { MenuPopup } from "@/components/ui/floating";
import { Icon } from "@/components/ui/icon";
import { useLiveRevision } from "@/lib/use-live-revision";
import type { WorkspaceContext } from "@/types/workspace";
import { DocumentMaterialPanel, type MaterialPanelPosition } from "./document-material-panel";

type Material = { id: string; name: string; unit?: string | null };

export function CatalogueMaterialPanel({ context, material, finalFocus, onClose, closeText, detail, detailTitle }: {
  context: WorkspaceContext;
  material: Material;
  finalFocus: () => HTMLElement | false;
  onClose: () => void;
  closeText: string;
  detail?: ReactNode;
  detailTitle?: string;
}) {
  const revision = useLiveRevision();
  const [position, setPosition] = useState<MaterialPanelPosition>(() => ({
    lineId: material.id, section: "stock", page: 1, panelScroll: 0, linked: null,
  }));
  const patient = context.patient;
  if (!patient) return null;
  return <DocumentMaterialPanel patientId={patient.id} row={{ ...material, unit: material.unit ?? null, detail }}
    revision={`${context.userId}:${patient.role}:${revision}`} position={position} onPosition={setPosition}
    inlineContext={context} closeText={closeText} detailTitle={detailTitle} finalFocus={finalFocus} onClose={onClose} />;
}

export function MaterialConsultButton({ context, material, menu = false, onLink, onEditPresentations, presentationErrorId }: {
  context: WorkspaceContext;
  material: Material;
  menu?: boolean;
  onLink?: (returnFocus: () => HTMLButtonElement | null) => void;
  onEditPresentations?: (returnFocus: () => HTMLButtonElement | null) => void;
  presentationErrorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sourceScrollRef = useRef<{ left: number; top: number } | null>(null);
  function openMaterial() {
    sourceScrollRef.current = { left: window.scrollX, top: window.scrollY };
    setOpen(true);
  }
  function closeMaterial() {
    const position = sourceScrollRef.current;
    setOpen(false);
    requestAnimationFrame(() => {
      const button = buttonRef.current;
      if (!button?.isConnected) return;
      button.focus({ preventScroll: true });
      if (position) window.scrollTo({ ...position, behavior: "instant" });
    });
  }
  return <>
    {menu ? <Menu.Root>
      <Menu.Trigger ref={buttonRef} render={<ActionButton compact variant="quiet" className="hca-material-origin-button"
        aria-label={`Mais ações de ${material.name}`} aria-describedby={presentationErrorId}
        data-wizard-quantity-error={presentationErrorId ? "true" : undefined} />}><Icon name="more" /></Menu.Trigger>
      <MenuPopup>
        <Menu.Item className="hca-menu-item" onClick={openMaterial}>
          <Icon name="eye" />Detalhes do material
        </Menu.Item>
        {onLink ? <Menu.Item className="hca-menu-item" onClick={() => onLink(() => buttonRef.current)}>
          <Icon name="link" />Vincular a uma ficha
        </Menu.Item> : null}
        {onEditPresentations ? <Menu.Item className="hca-menu-item" onClick={() => onEditPresentations(() => buttonRef.current)}>
          <Icon name="box" />Editar embalagens
        </Menu.Item> : null}
      </MenuPopup>
    </Menu.Root> : <ActionButton ref={buttonRef} className="hca-material-consult-button" variant="quiet" compact
      aria-label={`Consultar material ${material.name}`} onClick={openMaterial}>
      <Icon name="eye" />Consultar material
    </ActionButton>}
    {open ? <CatalogueMaterialPanel context={context} material={material}
      finalFocus={() => false} onClose={closeMaterial} closeText="Voltar ao preenchimento" /> : null}
  </>;
}
