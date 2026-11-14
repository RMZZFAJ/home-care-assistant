"use client";
import { ActionButton } from "@/components/ui/controls";
import { useWorkspaceState } from "@/components/layout/workspace-context";
import { usePresentationMode } from "@/lib/ui/presentation-mode";
export function PresentationPreference() { const { data } = useWorkspaceState(); return data ? <Preference key={data.userId} userId={data.userId} /> : null; }
function Preference({ userId }: { userId: string ;}) { const { mode, setMode } = usePresentationMode(userId); return <section className="hca-form-stack"><h3>Apresentação do início</h3><p>Na visão simples, as áreas complementares começam recolhidas e continuam disponíveis para abrir.</p><div className="hca-toolbar" role="group" aria-label="Apresentação preferida"><ActionButton aria-pressed={mode === "simple"} variant={mode === "simple" ? "primary" : "secondary"} onClick={() => setMode("simple")}>Simples</ActionButton><ActionButton aria-pressed={mode === "complete"} variant={mode === "complete" ? "primary" : "secondary"} onClick={() => setMode("complete")}>Completa</ActionButton></div></section>; }
