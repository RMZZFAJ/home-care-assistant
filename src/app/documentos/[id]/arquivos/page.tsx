import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthenticatedPage } from "@/components/authenticated-page";
import { DocumentFileView } from "@/components/documents/document-file-view";
export default function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; historyBefore?: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Abrindo arquivos…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
async function Content({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; historyBefore?: string }>;
}) {
  const { id } = await params,
    { version, historyBefore } = await searchParams,
    parsed = z
      .object({
        id: z.uuid(),
        version: z.coerce.number().int().positive().max(2147483647).optional(),
        historyBefore: z.coerce.number().int().positive().max(2147483647).optional(),
      })
      .safeParse({ id, version, historyBefore });
  if (!parsed.success) notFound();
  return (
    <AuthenticatedPage>
      <DocumentFileView id={parsed.data.id} version={parsed.data.version} historyBefore={parsed.data.historyBefore} />
    </AuthenticatedPage>
  );
}
