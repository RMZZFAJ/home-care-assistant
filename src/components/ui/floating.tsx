"use client";

import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import type { ComponentProps, ReactElement, ReactNode } from "react";

export function MenuPopup({ children, className, ...props }: Omit<ComponentProps<typeof Menu.Popup>, "className"> & { className?: string }) {
  return <Menu.Portal><Menu.Positioner className="hca-floating-positioner hca-l1" sideOffset={6} align="end"><Menu.Popup {...props} className={["hca-menu", className].filter(Boolean).join(" ")}>{children}</Menu.Popup></Menu.Positioner></Menu.Portal>;
}
export function PopoverPopup({ children, className, positionMethod, ...props }: Omit<ComponentProps<typeof Popover.Popup>, "className"> & { className?: string; positionMethod?: ComponentProps<typeof Popover.Positioner>["positionMethod"] }) {
  return <Popover.Portal><Popover.Positioner className="hca-floating-positioner hca-l1" sideOffset={6} align="end" positionMethod={positionMethod}><Popover.Popup {...props} className={["hca-popover", className].filter(Boolean).join(" ")}>{children}</Popover.Popup></Popover.Positioner></Popover.Portal>;
}
export function HelpTooltip({ children, content }: { children: ReactElement; content: ReactNode }) {
  return <Tooltip.Root><Tooltip.Trigger render={children} /><Tooltip.Portal><Tooltip.Positioner className="hca-floating-positioner" sideOffset={6}><Tooltip.Popup className="hca-tooltip">{content}</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root>;
}
