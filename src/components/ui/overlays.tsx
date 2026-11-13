"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Icon } from "./icon";

type OverlayProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  finalFocus?: ComponentProps<typeof BaseDialog.Popup>["finalFocus"];
  id?: string;
  keyboardScrollable?: boolean;
};

function Overlay({ open, title, children, onClose, closeDisabled = false, closeLabel = "Fechar diálogo", finalFocus, id, side, keyboardScrollable = false }: OverlayProps & { side?: "start" | "end" }) {
  const titleId = useId();
  return <BaseDialog.Root open={open} disablePointerDismissal={closeDisabled} onOpenChange={(next, details) => {
    if (next) return;
    if (closeDisabled) details.cancel(); else onClose();
  }}>
    <BaseDialog.Portal>
      <div className="hca-overlay">
        <BaseDialog.Backdrop className="hca-modal-backdrop" />
        <BaseDialog.Viewport className={side ? "hca-drawer-viewport" : "hca-modal-viewport"} data-side={side}>
          <BaseDialog.Popup id={id} aria-labelledby={titleId} className={side ? "hca-modal hca-drawer" : "hca-modal"} finalFocus={finalFocus}>
            <header className="hca-modal-head">
              <BaseDialog.Title id={titleId}>{title}</BaseDialog.Title>
              <button type="button" className="hca-control hca-control-icon" aria-label={closeLabel} disabled={closeDisabled} onClick={onClose}><Icon name="close" /></button>
            </header>
            <div className={keyboardScrollable ? "hca-modal-content hca-scroll-content" : "hca-modal-content"} tabIndex={keyboardScrollable ? 0 : undefined} role={keyboardScrollable ? "region" : undefined} aria-label={keyboardScrollable ? `Conteúdo de ${title}` : undefined}>{children}</div>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </div>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}

export function Dialog(props: OverlayProps) { return <Overlay {...props} />; }
export function Drawer({ side = "end", ...props }: OverlayProps & { side?: "start" | "end" }) { return <Overlay {...props} side={side} />; }
