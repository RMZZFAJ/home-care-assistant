import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; hash?: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Verificando integridade…</p>}>
      <Verification {...props} />
    </Suspense>
  );
}
async function Verification({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; hash?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const parsed = z
    .object({
      id: z.string().uuid(),
      version: z.coerce.number().int().positive().max(100000000),
      hash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .safeParse({ id, ...query });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let verified = false,
    available = Boolean(url && key);
  if (parsed.success && url && key) {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await client.rpc("verify_document_integrity", {
      p_id: id,
      p_version: parsed.data.version,
      p_hash: parsed.data.hash,
    });
    verified = result.data === true;
    available = !result.error;
  }
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Verificação do comprovante</h1>
      <p role="status" className="ui-notice">
        {!available
          ? "Verificação temporariamente indisponível."
          : verified
            ? "Hash e versão correspondem ao conteúdo registrado."
            : "Não foi encontrada correspondência para este hash e versão."}
      </p>
      <p className="text-sm">
        Esta consulta não revela dados do paciente. SHA-256 não é assinatura
        digital nem impede alteração por administradores do banco.
      </p>
      <a className="ui-button ui-button-secondary" href="/login">
        Acessar documento com autorização
      </a>
    </main>
  );
}
