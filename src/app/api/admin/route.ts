import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), userId: z.string().uuid(), fullName: z.string().trim().min(2).max(160), role: z.enum(["admin", "supervisor", "professional", "reader"]), status: z.enum(["active", "revoked"]), globalScope: z.boolean() }),
  z.object({ action: z.literal("recipient"), id: z.string().uuid().nullable(), displayName: z.string().trim().min(2).max(160), isActive: z.boolean(), isDevelopment: z.boolean() }),
  z.object({ action: z.literal("product"), id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,119}$/), name: z.string().trim().min(2).max(160), category: z.enum(["medicamentos", "higiene", "dieta"]), unit: z.string(), aliases: z.array(z.string().trim().min(1).max(160)).max(30), isActive: z.boolean() }),
  z.object({ action: z.literal("membership"), careRecipientId: z.string().uuid(), userId: z.string().uuid(), role: z.enum(["admin", "supervisor", "professional", "reader"]), canManageStock: z.boolean(), canCountStock: z.boolean() }),
  z.object({ action: z.literal("historicalImport"), rows: z.array(z.object({
    physicalProtocol: z.number().int().min(1).max(11),
    careRecipientId: z.string().uuid(),
    createdAt: z.string().datetime().optional(),
    lines: z.array(z.object({ productId: z.string().min(1), currentStock: z.number().int().nonnegative(), urgent: z.boolean() })).min(1),
    observations: z.array(z.string().trim().min(1).max(1000)).default([]),
  })).max(1000) }),
]);

async function authorizedClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, response: NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 }) };
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, response: NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 }) };
  const { data: admin, error: adminError } = await supabase.rpc("is_global_administrator");
  if (adminError || !admin) return { supabase: null, response: NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 403 }) };
  return { supabase, response: null };
}

export async function GET(request: Request) {
  const auth = await authorizedClient();
  if (!auth.supabase) return auth.response;
  const section = new URL(request.url).searchParams.get("section") ?? "profiles";
  const calls = {
    profiles: auth.supabase.rpc("admin_list_profiles"),
    recipients: auth.supabase.rpc("admin_list_recipients"),
    products: auth.supabase.rpc("admin_list_products"),
  } as const;
  const call = calls[section as keyof typeof calls];
  if (!call) return NextResponse.json({ error: "Seção administrativa inválida." }, { status: 400 });
  const { data, error } = await call;
  if (error) {
    console.error("Failed to load admin data.", error);
    return NextResponse.json({ error: "Não foi possível carregar os dados administrativos." }, { status: 503 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authorizedClient();
  if (!auth.supabase) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados administrativos inválidos." }, { status: 400 });
  const value = parsed.data;
  if (value.action === "historicalImport") {
    const canonical = JSON.stringify(value.rows);
    const sourceHash = createHash("sha256").update(canonical).digest("hex");
    const { data, error } = await auth.supabase.rpc("import_historical_requisitions", { p_source_hash: sourceHash, p_rows: value.rows });
    if (error) {
      console.error("Failed to import historical requisitions.", error);
      return NextResponse.json({ error: "Não foi possível processar a importação histórica." }, { status: 400 });
    }
    return NextResponse.json({ data });
  }
  const rpc = value.action === "profile"
    ? auth.supabase.rpc("admin_set_profile", { p_user_id: value.userId, p_full_name: value.fullName, p_role: value.role, p_status: value.status, p_global_scope: value.globalScope })
    : value.action === "recipient"
      ? auth.supabase.rpc("admin_upsert_recipient", { p_id: value.id, p_display_name: value.displayName, p_is_active: value.isActive, p_is_development: value.isDevelopment })
      : value.action === "product"
        ? auth.supabase.rpc("admin_upsert_product", { p_id: value.id, p_name: value.name, p_category: value.category, p_unit: value.unit, p_aliases: value.aliases, p_is_active: value.isActive })
        : auth.supabase.rpc("admin_upsert_membership", { p_care_recipient_id: value.careRecipientId, p_user_id: value.userId, p_role: value.role, p_can_manage_stock: value.canManageStock, p_can_count_stock: value.canCountStock });
  const { data, error } = await rpc;
  if (error) {
    console.error("Failed to execute admin operation.", error);
    return NextResponse.json({ error: "Não foi possível concluir a operação administrativa." }, { status: 400 });
  }
  return NextResponse.json({ data });
}
