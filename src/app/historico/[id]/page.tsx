import { AuthenticatedPage } from "@/components/authenticated-page";
import { RequisitionDetail } from "@/components/requisitions/requisition-detail";
import { Suspense } from "react";

export default function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AuthenticatedPage><Suspense fallback={<p className="p-6">Carregando comprovante…</p>}><Detail params={params} /></Suspense></AuthenticatedPage>;
}
async function Detail({ params }: { params: Promise<{ id: string }> }) { return <RequisitionDetail id={(await params).id} />; }
