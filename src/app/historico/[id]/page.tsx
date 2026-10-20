import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatBrazilDate } from "@/lib/receipt";
import { PrintButton } from "@/components/requisitions/print-button";
import { Suspense } from "react";

type DetailData = {
  protocol: string;
  status: string;
  created_at: string;
  profiles: { full_name?: string } | { full_name?: string }[] | null;
  care_recipients: { display_name?: string } | { display_name?: string }[] | null;
  requisition_items: Array<{ product_id: string | null; custom_name: string | null; current_stock: number; urgent: boolean; products: { name?: string; unit?: string } | { name?: string; unit?: string }[] | null }>;
  requisition_observations: Array<{ body: string; created_at: string }>;
  requisition_notifications: Array<{ recipient_group: string; recipient_label: string; channel: string; state: string; attempts: number }>;
};

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="p-8">Carregando requisição...</main>}><RequisitionDetailContent params={params} /></Suspense>;
}

async function RequisitionDetailContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="p-8">Configure o Supabase para consultar o detalhe.</main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: rawData, error } = await supabase.from("requisitions").select("id, protocol, status, created_at, profiles!requisitions_created_by_fkey(full_name), care_recipients(display_name), requisition_items(product_id, custom_name, current_stock, urgent, products(name, unit)), requisition_observations(body, created_at), requisition_notifications(recipient_group, recipient_label, channel, state, attempts)").eq("id", (await params).id).maybeSingle();
  if (error) return <main className="p-8">Não foi possível carregar o detalhe.</main>;
  if (!rawData) notFound();
  const data = rawData as unknown as DetailData;
  const requester = Array.isArray(data.profiles) ? data.profiles[0]?.full_name : data.profiles?.full_name;
  const recipient = Array.isArray(data.care_recipients) ? data.care_recipients[0]?.display_name : data.care_recipients?.display_name;
  return <main className="min-h-screen"><div className="mx-auto max-w-3xl space-y-5 px-4 py-6"><div className="flex items-center justify-between gap-3"><div><Link href="/historico" className="text-sm font-semibold text-[var(--brand)]">← Histórico</Link><h1 className="mt-2 text-3xl font-semibold">{data.protocol}</h1></div><PrintButton /></div><section className="rounded-xl border border-[var(--line)] bg-white p-5"><p><strong>Status:</strong> {data.status}</p><p className="mt-2"><strong>Paciente:</strong> {recipient ?? "Sem nome"}</p><p className="mt-2"><strong>Solicitante:</strong> {requester ?? "Sem nome"}</p><p className="mt-2"><strong>Data:</strong> {formatBrazilDate(data.created_at)}</p></section><section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="font-bold">Itens persistidos</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{data.requisition_items.map((item) => <li key={`${item.product_id ?? item.custom_name}-${item.current_stock}`}>{item.product_id ? `${Array.isArray(item.products) ? item.products[0]?.name : item.products?.name} — estoque informado: ${item.current_stock}` : `${item.custom_name} — estoque informado: ${item.current_stock}`}{item.urgent ? " (urgente)" : ""}</li>)}</ul></section><section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="font-bold">Observações</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{data.requisition_observations.length ? data.requisition_observations.map((item) => <li key={`${item.created_at}-${item.body}`}>{item.body}</li>) : <li>Nenhuma observação.</li>}</ul></section><section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="font-bold">Notificações</h2><ul className="mt-3 space-y-2 text-sm">{data.requisition_notifications.length ? data.requisition_notifications.map((item) => <li key={`${item.recipient_label}-${item.channel}`} className="flex justify-between gap-3"><span>{item.recipient_label} · {item.channel}</span><span>{item.state} ({item.attempts})</span></li>) : <li>Nenhuma notificação configurada.</li>}</ul></section></div></main>;
}
