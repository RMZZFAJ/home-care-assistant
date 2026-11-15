"use client";
import { useLayoutEffect, useState } from "react";

/** Only real overflow joins the tab order; native arrow/Page keys scroll it. */
export function useScrollableRegion<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  useLayoutEffect(() => {
    if (!node) return;
    let active = true;
    // This hook owns the attribute. Update it in the browser's layout callback,
    // without waiting for another React commit after an overflow appears.
    const measure = () => {
      if (!active) return;
      const scrollable = !node.closest('[inert],[hidden],[aria-hidden="true"],[data-hidden]')
        && (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight);
      if (scrollable) node.setAttribute("tabindex", "0");
      else node.removeAttribute("tabindex");
    };
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    let observed = new Set<Element>();
    const observeChildren = () => {
      const current = new Set(node.children);
      for (const child of observed) if (!current.has(child)) resize.unobserve(child);
      for (const child of current) if (!observed.has(child)) resize.observe(child);
      observed = current;
      measure();
    };
    observeChildren();
    const content = new MutationObserver(observeChildren);
    content.observe(node, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["open", "hidden", "class", "style"] });
    // Kept-mounted panels and modal isolation can change visibility without
    // resizing this box. Fonts can change scroll extent without changing it too.
    const visibility = new MutationObserver(measure);
    for (let parent = node.parentElement; parent; parent = parent.parentElement)
      visibility.observe(parent, { attributes: true, attributeFilter: ["open", "hidden", "inert", "aria-hidden", "data-hidden", "class", "style"] });
    window.addEventListener("resize", measure);
    document.fonts.addEventListener("loadingdone", measure);
    void document.fonts.ready.then(measure);
    return () => {
      active = false;
      resize.disconnect(); content.disconnect(); visibility.disconnect();
      window.removeEventListener("resize", measure);
      document.fonts.removeEventListener("loadingdone", measure);
      node.removeAttribute("tabindex");
    };
  }, [node]);
  return { ref: setNode };
}
