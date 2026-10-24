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

/** Each server render owns its registry; streamed boundaries can add styles. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());
  const emittedRef = useRef(new Map<string, string>());
  useServerInsertedHTML(() => {
    const styles = renderToStyleElements(renderer).filter((element) => {
      const key = String(element.key);
      const content = JSON.stringify(element.props);
      if (emittedRef.current.get(key) === content) return false;
      emittedRef.current.set(key, content);
      return true;
    });
    return <>{styles}</>;
  });
  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme} className="hca-theme" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
