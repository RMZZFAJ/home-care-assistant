"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Icon, type IconName } from "./icon";

type OverlayProps = {
  open: boolean;
  title: string;
  kicker?: string;
  subtitle?: string;
  headingIcon?: IconName;
  children: ReactNode;
  navigation?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  dismissOnOutsideClick?: boolean;
  closeLabel?: string;
  finalFocus?: ComponentProps<typeof BaseDialog.Popup>["finalFocus"];
  id?: string;
  keyboardScrollable?: boolean;
  keepMounted?: boolean;
  showNestedBackdrop?: boolean;
  success?: boolean;
  failure?: "rejected" | "uncertain";
  popupClassName?: string;
  contentRef?: ComponentProps<"div">["ref"];
};

function Overlay({ open, title, kicker, subtitle, headingIcon, children, navigation, footer, onClose, closeDisabled = false, dismissOnOutsideClick = true, closeLabel = "Fechar diálogo", finalFocus, id, side, keyboardScrollable = false, keepMounted = false, showNestedBackdrop, success = false, failure, popupClassName, contentRef }: OverlayProps & { side?: "start" | "end" }) {
  const titleId = useId();
  const outcome = success ? "success" : failure;
  return <BaseDialog.Root open={open} disablePointerDismissal={closeDisabled || !dismissOnOutsideClick} onOpenChange={(next, details) => {
    if (next) return;
    if (closeDisabled) details.cancel(); else onClose();
  }}>
    <BaseDialog.Portal keepMounted={keepMounted}>
      <div className="hca-overlay hca-l1" hidden={keepMounted && !open}>
        <BaseDialog.Backdrop className="hca-modal-backdrop" forceRender={showNestedBackdrop} />
        <BaseDialog.Viewport className={side ? "hca-drawer-viewport" : "hca-modal-viewport"} data-side={side}>
          <BaseDialog.Popup id={id} aria-labelledby={titleId} className={[side ? "hca-modal hca-drawer" : outcome ? "hca-modal hca-modal-success" : "hca-modal", popupClassName].filter(Boolean).join(" ")} data-outcome={outcome} finalFocus={finalFocus}>
            <header className={kicker || subtitle || headingIcon ? "hca-modal-head hca-modal-context-head" : "hca-modal-head"}>
              {!outcome && headingIcon ? <span className="hca-modal-heading-icon"><Icon name={headingIcon} width={22} height={22} /></span> : null}
              {outcome ? null : kicker || subtitle || headingIcon ? (
                <div>
                  {kicker ? <p className="hca-modal-kicker">{kicker}</p> : null}
                  <BaseDialog.Title id={titleId}>{title}</BaseDialog.Title>
                  {subtitle ? <BaseDialog.Description className="hca-modal-subtitle">{subtitle}</BaseDialog.Description> : null}
                </div>
              ) : <BaseDialog.Title id={titleId}>{title}</BaseDialog.Title>}
              <button type="button" className="hca-control hca-control-icon" aria-label={closeLabel} disabled={closeDisabled} onClick={onClose}><Icon name="close" /></button>
            </header>
            {navigation}
            <div ref={contentRef} className={keyboardScrollable ? "hca-modal-content hca-scroll-content" : "hca-modal-content"} tabIndex={keyboardScrollable ? 0 : undefined} role={keyboardScrollable ? "region" : undefined} aria-label={keyboardScrollable ? `Conteúdo de ${title}` : undefined}>
              {outcome ? <div className="hca-modal-success-copy">
                <span className="hca-modal-success-icon"><Icon name={success ? "check" : failure === "uncertain" ? "alert" : "close"} width={32} height={32} /></span>
                <BaseDialog.Title id={titleId}>{title}</BaseDialog.Title>
                {subtitle ? <BaseDialog.Description>{subtitle}</BaseDialog.Description> : null}
              </div> : null}
              {children}
            </div>
            {footer ? <footer className="hca-modal-footer">{footer}</footer> : null}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </div>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}

export function Dialog(props: OverlayProps) { return <Overlay {...props} />; }
export function Drawer({ side = "end", ...props }: OverlayProps & { side?: "start" | "end" }) { return <Overlay {...props} side={side} />; }
