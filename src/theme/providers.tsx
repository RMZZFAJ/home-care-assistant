"use client";

import { useRef, useState, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  webLightTheme,
} from "@fluentui/react-components";

const homeCareTheme = { ...webLightTheme, colorNeutralForegroundDisabled: "#616161" };

/** One request owns the registry; SSR styles must not outlive head overrides. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());
  const didRenderRef = useRef(false);
  useServerInsertedHTML(() => {
    // Later streaming flushes land in body. Their reset rules would override
    // runtime rules in head after client navigation, regardless of bucket order.
    if (didRenderRef.current) return;
    didRenderRef.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });
  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={homeCareTheme} className="hca-theme" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
