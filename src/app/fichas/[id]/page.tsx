import { Suspense } from "react";
import { AuthenticatedPage } from "@/components/authenticated-page";
import { SupplyDetail } from "@/components/documents/supply-detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AuthenticatedPage>
      <Suspense fallback={<p role="status">Carregando ficha…</p>}>
        <Detail params={params} />
      </Suspense>
    </AuthenticatedPage>
  );
}
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  return <SupplyDetail id={(await params).id} />;
}
