"use client";

import { Menu } from "@base-ui/react/menu";
import { useRef, useState, type ReactNode, type Ref } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { DocumentMoreActionContext } from "./document-header";

export function DocumentFab({ children, triggerRef }: {
  children: ReactNode;
  triggerRef: Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = useState(false);
  const activatedRef = useRef(false);
  return (
    <Menu.Root open={open} onOpenChange={next => {
      if (next) activatedRef.current = false;
      setOpen(next);
    }}>
      <Menu.Trigger render={<ActionButton ref={triggerRef} className="hca-document-fab" aria-label={open ? "Fechar ações da ficha" : "Ações da ficha"} />}>
        <Icon name={open ? "close" : "plus"} width={24} height={24} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Backdrop className="hca-document-fab-backdrop" />
        <Menu.Positioner className="hca-floating-positioner hca-l1" positionMethod="fixed"
          side="top" sideOffset={8} align="end" collisionAvoidance={{ side: "none", align: "shift" }}>
          <Menu.Popup className="hca-menu hca-document-fab-menu" aria-label="Ações operacionais"
            finalFocus={() => !activatedRef.current}>
            <DocumentMoreActionContext value={() => { activatedRef.current = true; }}>
              {children}
            </DocumentMoreActionContext>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
