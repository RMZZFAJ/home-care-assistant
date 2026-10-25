import { AuthenticatedPage } from "@/components/authenticated-page";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { Suspense } from "react";
import { demoDocuments } from "@/lib/demo-documents";
import { DemoDocument } from "@/components/documents/demo-document";

export default function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-6">Carregando comprovante…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return demoDocuments[id]?.type === "REQ" ? (
    <DemoDocument id={id} />
  ) : (
    <AuthenticatedPage>
      <DocumentViewer id={id} />
    </AuthenticatedPage>
  );
}
