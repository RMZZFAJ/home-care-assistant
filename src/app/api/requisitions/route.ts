import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get("pageSize") ?? "20", 10) || 20));
  const protocol = params.get("protocol")?.trim();
  const status = params.get("status")?.trim();
  const from = params.get("from");
  const to = params.get("to");
  let query = supabase
    .from("requisitions")
    .select("id, protocol, care_recipient_id, status, created_at, profiles!requisitions_created_by_fkey(full_name), care_recipients(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (protocol) query = query.ilike("protocol", `%${protocol}%`);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) {
    const end = new Date(`${to}T00:00:00.000Z`);
    if (!Number.isNaN(end.getTime())) {
      end.setUTCDate(end.getUTCDate() + 1);
      query = query.lt("created_at", end.toISOString());
    }
  }
  const { data, error, count } = await query;
  if (error) {
    console.error("Failed to load requisition history.", error);
    return NextResponse.json({ error: "Não foi possível carregar o histórico." }, { status: 503 });
  }
  return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0 });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 100_000) return NextResponse.json({ error: "Requisição acima do tamanho permitido." }, { status: 413 });
  const body = await request.text();
  if (body.length > 100_000) return NextResponse.json({ error: "Requisição acima do tamanho permitido." }, { status: 413 });
  let json: unknown = null;
  try { json = JSON.parse(body); } catch { /* tratado como payload inválido abaixo */ }
  const parsed = requisitionInputSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado. Configure as variáveis do servidor para registrar uma requisição oficial." }, { status: 503 });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Failed to resolve authenticated user.", userError);
    return NextResponse.json({ error: "Não foi possível validar sua sessão. Entre novamente." }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente para continuar." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).eq("status", "active").maybeSingle();
  if (profileError) {
    console.error("Failed to load authenticated profile.", profileError);
    return NextResponse.json({ error: "Não foi possível validar seu perfil. Tente novamente." }, { status: 503 });
  }
  if (!profile || !["admin", "supervisor", "professional"].includes(profile.role)) {
    return NextResponse.json({ error: "Seu perfil não tem autorização para registrar requisições." }, { status: 403 });
  }
  const recipientId = process.env.CARE_RECIPIENT_ID;
  if (!recipientId) return NextResponse.json({ error: "A pessoa assistida não está configurada no ambiente." }, { status: 503 });
  const { data: recipient, error: recipientError } = await supabase.from("care_recipients").select("id, display_name").eq("id", recipientId).eq("is_active", true).maybeSingle();
  if (recipientError) {
    console.error("Failed to load configured care recipient.", recipientError);
    return NextResponse.json({ error: "Não foi possível validar a pessoa assistida. Tente novamente." }, { status: 503 });
  }
  if (!profile || !recipient) return NextResponse.json({ error: "Seu perfil ou pessoa assistida não está autorizado para este ambiente." }, { status: 403 });

  const productIds = parsed.data.lines.map((line) => line.productId);
  const { data: products, error: productsError } = productIds.length
    ? await supabase.from("products").select("id, name, category, unit").in("id", productIds).eq("is_active", true)
    : { data: [], error: null };
  if (productsError) {
    console.error("Failed to load active product catalog.", productsError);
    return NextResponse.json({ error: "Não foi possível validar o catálogo. Tente novamente." }, { status: 503 });
  }
  if (!products || products.length !== new Set(productIds).size) {
    return NextResponse.json({ error: "Um ou mais produtos não existem ou estão inativos." }, { status: 400 });
  }
  const extraIds = parsed.data.extraItems.map((item) => item.id);
  if (extraIds.length) {
    const { data: catalogIds, error: catalogError } = await supabase.from("products").select("id").in("id", extraIds);
    if (catalogError) {
      console.error("Failed to validate extra item identifiers.", catalogError);
      return NextResponse.json({ error: "Não foi possível validar os itens extras. Tente novamente." }, { status: 503 });
    }
    if (catalogIds?.length) return NextResponse.json({ error: "Itens do catálogo não podem ser enviados como itens extras." }, { status: 400 });
  }
  const productMap = new Map(products.map((product) => [product.id, product]));
  const lines = parsed.data.lines.map((line) => {
    const product = productMap.get(line.productId);
    return { productId: line.productId, currentStock: line.currentStock, urgent: line.urgent, productName: product?.name, category: product?.category, unit: product?.unit };
  });
  if (lines.some((line) => !line.productName || !line.category || !line.unit)) {
    return NextResponse.json({ error: "O catálogo informado não corresponde ao catálogo ativo." }, { status: 400 });
  }

  const payload = {
    lines,
    extraItems: parsed.data.extraItems.map((item) => ({ customName: item.name, currentStock: item.currentStock, urgent: item.urgent })),
    observations: parsed.data.observations,
  };
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const { data, error } = await supabase.rpc("submit_requisition", {
    p_care_recipient_id: recipient.id,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_payload_hash: payloadHash,
    p_lines: lines,
    p_extra_items: payload.extraItems,
    p_observations: payload.observations,
  }).maybeSingle();
  const requisition = data as { requisition_id: string; protocol: string; created_at: string } | null;
  if (error || !requisition) {
    if (error?.message.includes("idempotency key already used with different content") || error?.message.includes("idempotency conflict")) {
      return NextResponse.json({ error: "Esta chave de envio já foi usada com outro conteúdo. Inicie uma nova submissão." }, { status: 409 });
    }
    console.error("Failed to persist requisition.", error);
    return NextResponse.json({ error: "Não foi possível persistir a requisição. Nenhuma confirmação foi emitida." }, { status: 500 });
  }

  const { data: persisted, error: persistedError } = await supabase
    .from("requisitions")
    .select("protocol, created_at, requisition_items(product_id, custom_name, current_stock, urgent, products(name, category, unit)), requisition_observations(body)")
    .eq("id", requisition.requisition_id)
    .maybeSingle();
  if (persistedError || !persisted) {
    console.error("Failed to read persisted requisition receipt.", persistedError);
    return NextResponse.json({ error: "A requisição foi salva, mas o comprovante não pôde ser carregado. Consulte o histórico." }, { status: 503 });
  }
  const persistedLines = (persisted.requisition_items ?? []).filter((item) => item.product_id).map((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    return { productId: item.product_id, productName: product?.name ?? "Produto arquivado", category: product?.category ?? "higiene", unit: product?.unit ?? "unidade", currentStock: item.current_stock, urgent: item.urgent };
  });
  const persistedExtras = (persisted.requisition_items ?? []).filter((item) => !item.product_id).map((item) => ({ id: `persisted-${item.custom_name}`, name: item.custom_name ?? "Item extra", currentStock: item.current_stock, urgent: item.urgent }));
  return NextResponse.json({
    receipt: {
      lines: persistedLines,
      extraItems: persistedExtras,
      observations: (persisted.requisition_observations ?? []).map((item) => item.body),
      protocol: persisted.protocol,
      requesterName: profile.full_name,
      recipientName: recipient.display_name,
      createdAt: persisted.created_at,
    },
  }, { status: error ? 200 : 201 });
}
