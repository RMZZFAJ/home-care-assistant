import { NextResponse } from "next/server";
import { api, authenticate, databaseError, patientContext, rpc } from "@/lib/server/api";
import { quantity } from "@/lib/quantity";
import type { DashboardTask, CriticalStock } from "@/types/dashboard";
import type { DocumentSummary } from "@/types/documents";
import type { BalanceWorkspace } from "@/types/balances";

type Stock = { productId: string; name: string; unit: string; active: boolean; family: { confirmed: string; minimum: string | number | null } | null; team: { confirmed: string; minimum: string | number | null } | null };
type TaskCounts = { requests: number; balOverdue: boolean; balDue: string; drafts: number; consumptionPending: number; sciencePending: number; archivePending: number };
export async function GET(request: Request) {
  return api("dashboard.read", async () => {
    const auth = await authenticate();
    const patient = await patientContext(auth, new URL(request.url).searchParams.get("careRecipientId"));
    const can = (cap: string) => patient.capabilities[cap] === true;
    const base = () => auth.client.from("operational_documents").select("id", { head: true, count: "exact" }).eq("care_recipient_id", patient.id);
    const list = async (type: string, status: string) => await rpc(auth.client, "operational_document_list", { p_patient: patient.id, p_type: type, p_status: status, p_size: 4 }) as { data: DocumentSummary[] };
    let deliveryQuery = auth.client.from("operational_documents").select("id,code,recipient_id").eq("care_recipient_id", patient.id).eq("type", "ENT").eq("status", "pending_receipt");
    if (patient.role === "professional") deliveryQuery = deliveryQuery.eq("recipient_id", auth.userId);
    let shiftQuery = auth.client.from("scheduled_shifts").select("id,professional_id,starts_at,ends_at,timezone,shift_types(name)").eq("care_recipient_id",patient.id).eq("status","published").gt("ends_at",new Date().toISOString());
    if (patient.role === "professional") shiftQuery=shiftQuery.eq("professional_id",auth.userId);
    const [receipts, purchases, disputes, balances, recent, settings, counts, teamReceipts, stock, science, archive, purchaseTasks, balanceTasks, deliveries, directory, balanceState, nextShifts] = await Promise.all([
      base().eq("type", "ENT").eq("recipient_id", auth.userId).eq("status", "pending_receipt"),
      base().eq("type", "COM").eq("status", "pending_approval"),
      base().eq("type", "ENT").eq("status", "disputed"),
      base().eq("type", "BAL").eq("status", "submitted"),
      rpc(auth.client, "operational_document_list", { p_patient: patient.id, p_size: 6 }),
      auth.client.from("patient_settings").select("settings").eq("care_recipient_id", patient.id).maybeSingle(),
      rpc(auth.client, "operational_tasks", { p_patient: patient.id }),
      base().eq("type", "ENT").eq("status", "pending_receipt"),
      can("stock.family.read") || can("stock.team.read") ? rpc(auth.client, "stock_overview", { p_patient: patient.id }) : Promise.resolve([]),
      can("req.read") ? list("REQ", "science_required") : Promise.resolve({ data: [] }),
      can("req.read") ? list("REQ", "archive_pending") : Promise.resolve({ data: [] }),
      can("com.approve") ? list("COM", "pending_approval") : Promise.resolve({ data: [] }),
      can("bal.approve.family") || can("bal.approve.supervisor") ? list("BAL", "submitted") : Promise.resolve({ data: [] }),
      can("ent.read") ? deliveryQuery.order("created_at", { ascending: false }).limit(4) : Promise.resolve({ data: [], error: null }),
      can("ent.read") ? rpc(auth.client, "patient_directory", { p_patient: patient.id }) : Promise.resolve([]),
      can("bal.read") ? rpc(auth.client,"balance_workspace",{p_patient:patient.id}) as Promise<BalanceWorkspace> : Promise.resolve(null),
      can("schedule.read.own") || can("schedule.read.team") ? shiftQuery.order("starts_at").limit(1) : Promise.resolve({data:[],error:null}),
    ]);
    for (const result of [receipts, purchases, disputes, balances, settings, teamReceipts, deliveries,nextShifts]) if (result.error) databaseError(result.error);
    const tasks = counts as TaskCounts;
    const pendingTasks: DashboardTask[] = [];
    const add = (kind: DashboardTask["kind"], row: { id: string; code?: string | null }, title: string, description: string, priority: DashboardTask["priority"] = "normal") => pendingTasks.push({ id: kind + ":" + row.id, kind, title: `${row.code ?? "Ficha"} · ${title}`, description, priority, href: kind === "science" || kind === "archive" ? "/historico/" + row.id : "/fichas/" + row.id });
    for (const row of science.data) add("science", row, "Ciência familiar", "Consulte a requisição e registre sua ciência autorizada.", "attention");
    const names = new Map((directory as { id: string; name: string }[]).map((person) => [person.id, person.name]));
    if (balanceState?.eligibility.available) pendingTasks.unshift({id:"scheduled-balance",kind:"balance",title:"Balanço do seu plantão",description:"Contagem disponível até "+new Intl.DateTimeFormat("pt-BR",{timeZone:balanceState.regime?.timezone??"America/Sao_Paulo",timeStyle:"short"}).format(new Date(balanceState.eligibility.dueAt!)),href:"/balancos",priority:"attention"});
    if (balanceState?.regime?.activated_at) {
      tasks.balOverdue=balanceState.obligations.some(o=>o.state==="pending"&&Boolean(o.missed_at));
      tasks.balDue=balanceState.eligibility.dueAt??balanceState.obligations.find(o=>o.state==="pending")?.original_due??"";
      if (["admin","family"].includes(patient.role)&&can("bal.defer.approve")&&balanceState.deferrals.some(d=>d.status==="pending")) pendingTasks.unshift({id:"balance-deferral",kind:"balance",title:"Adiamento aguardando decisão familiar",description:"A solicitação mantém o prazo original até sua decisão.",href:"/balancos",priority:"attention"});
      if (!balanceState.eligibility.assignment&&balanceState.obligations.some(o=>o.state==="pending")&&(can("bal.schedule.manage")||patient.role==="supervisor")) pendingTasks.unshift({id:"unassigned-balance",kind:"balance",title:"Balanço sem plantão elegível",description:"Consulte a escala e resolva a atribuição autorizada.",href:"/balancos",priority:"attention"});
    }
    for (const row of deliveries.data ?? []) add("delivery", row, row.recipient_id === auth.userId && can("ent.receive") ? "Conferir materiais" : "Acompanhar entrega", row.recipient_id === auth.userId ? "Entrega destinada a você; aguardando conferência." : "Destinatário: " + (names.get(row.recipient_id) ?? "profissional designado"), "attention");
    for (const row of purchaseTasks.data) add("purchase", row, "Compra aguardando aprovação", "Revise os itens e as quantidades da aquisição familiar.");
    for (const row of balanceTasks.data) add("balance", row, "Acompanhar revisão", "Contagem registrada; consulte as revisões ainda necessárias.");
    for (const row of archive.data) add("archive", row, "Revisar encerramento", "Consulte o atendimento e a situação de arquivamento.");
    if (tasks.consumptionPending && can("consumption.confirm")) pendingTasks.push({ id: "occurrences", kind: "occurrence", title: "Relatos para conferir", description: `${tasks.consumptionPending} registros aguardam confirmação autorizada.`, href: "/consumo", priority: "normal" });
    const criticalStock: CriticalStock[] = [];
    for (const item of stock as Stock[]) if (item.active) for (const [key, custody] of [["family", "FAMILY"], ["team", "CARE_TEAM"]] as const) {
      const balance = item[key];
      if (balance && balance.minimum !== null && quantity(balance.confirmed).lt(balance.minimum)) criticalStock.push({ productId: item.productId, name: item.name, unit: item.unit, custody, confirmed: balance.confirmed, minimum: String(balance.minimum) });
    }
    return NextResponse.json({ data: {
      ...tasks, receipts: receipts.count ?? 0, purchases: purchases.count ?? 0, disputes: disputes.count ?? 0,
      balances: balances.count ?? 0, teamReceipts: teamReceipts.count ?? 0,
      recent: (recent as { data?: DocumentSummary[] }).data ?? [],
      balDay: (settings.data as { settings?: { balDay?: number } } | null)?.settings?.balDay ?? null,
      pendingTasks: pendingTasks.slice(0, 12), criticalStock,
      balanceEligibility: balanceState?.eligibility??{ available: false, href: "/balancos", dueAt: null },
      nextShift: nextShifts.data?.[0] ? {...nextShifts.data[0],professionalName:names.get(nextShifts.data[0].professional_id)??"Profissional escalado",active:new Date(nextShifts.data[0].starts_at).getTime()<=Date.now()} : null,
    } });
  });
}
