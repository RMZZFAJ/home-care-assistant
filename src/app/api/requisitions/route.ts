import { NextResponse } from "next/server";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { data: existing, error: existingError } = await supabase.from("requisitions").select("id, protocol, created_at").eq("created_by", user.id).eq("idempotency_key", parsed.data.idempotencyKey).maybeSingle();
  if (existingError) {
    console.error("Failed to check requisition idempotency.", existingError);
    return NextResponse.json({ error: "Não foi possível verificar o envio anterior. Tente novamente." }, { status: 503 });
  }
  if (existing) return NextResponse.json({ receipt: { ...parsed.data, protocol: existing.protocol, requesterName: profile.full_name, recipientName: recipient.display_name, createdAt: existing.created_at } });

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
    return { productId: line.productId, currentStock: line.currentStock, requestedQuantity: line.requestedQuantity, urgent: line.urgent, productName: product?.name, category: product?.category, unit: product?.unit };
  });
  if (lines.some((line) => !line.productName || !line.category || !line.unit)) {
    return NextResponse.json({ error: "O catálogo informado não corresponde ao catálogo ativo." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("submit_requisition", {
    p_care_recipient_id: recipient.id,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_lines: lines,
    p_extra_items: parsed.data.extraItems.map((item) => ({ customName: item.name, currentStock: item.currentStock, requestedQuantity: item.requestedQuantity, urgent: item.urgent })),
    p_observations: parsed.data.observations,
  }).maybeSingle();
  const requisition = data as { protocol: string; created_at: string } | null;
  if (error || !requisition) return NextResponse.json({ error: "Não foi possível persistir a requisição. Nenhuma confirmação foi emitida." }, { status: 500 });
  return NextResponse.json({ receipt: { ...parsed.data, lines, protocol: requisition.protocol, requesterName: profile.full_name, recipientName: recipient.display_name, createdAt: requisition.created_at } }, { status: 201 });
}
