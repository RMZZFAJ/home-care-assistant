"use client";
import { useCallback, useState, useSyncExternalStore } from "react";

const serverSnapshot = () => false;

/** Only real overflow joins the tab order; native arrow/Page keys scroll it. */
export function useScrollableRegion<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const subscribe = useCallback((notify: () => void) => {
    if (!node) return () => {};
    const resize = new ResizeObserver(notify);
    resize.observe(node);
    let observed = new Set<Element>();
    const observeChildren = () => {
      const current = new Set(node.children);
      for (const child of observed) if (!current.has(child)) resize.unobserve(child);
      for (const child of current) if (!observed.has(child)) resize.observe(child);
      observed = current;
      notify();
    };
    observeChildren();
    const content = new MutationObserver(observeChildren);
    content.observe(node, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["open", "hidden", "class", "style"] });
    return () => { resize.disconnect(); content.disconnect(); };
  }, [node]);
  const snapshot = useCallback(() => Boolean(node && (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight)), [node]);
  const scrollable = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return { ref: setNode, tabIndex: scrollable ? 0 : undefined };
}
