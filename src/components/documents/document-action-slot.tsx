"use client";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Reparent the actual control; its intent, permissions and recovery stay owned by its feature. */
export function DocumentActionSlot({
  target,
  children,
}: {
  target?: HTMLElement | null;
  children: ReactNode;
}) {
  return target ? createPortal(children, target) : children;
}
