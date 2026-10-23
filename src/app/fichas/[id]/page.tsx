import { Suspense } from "react";
import { AuthenticatedPage } from "@/components/authenticated-page";
import { SupplyDetail } from "@/components/documents/supply-detail";
import { demoDocuments } from "@/lib/demo-documents";
import { DemoDocument } from "@/components/documents/demo-document";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status">Carregando ficha…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return demoDocuments[id] && demoDocuments[id].type !== "REQ" ? (
    <DemoDocument id={id} />
  ) : (
    <AuthenticatedPage>
      <SupplyDetail id={id} />
    </AuthenticatedPage>
  );
}
