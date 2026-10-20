"use client";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">Imprimir</button>;
}
