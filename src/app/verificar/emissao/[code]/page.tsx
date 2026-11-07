import { Suspense } from "react";
import { PublicVerification } from "@/components/documents/public-verification";
export default function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Abrindo verificação…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
async function Content({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PublicVerification key={code} initialCode={code.slice(0, 65)} />;
}
