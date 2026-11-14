import { Suspense } from "react";
import { PublicVerification } from "@/components/documents/public-verification";
export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p role="status">Abrindo verificação…</p>}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}
async function Content({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const { code } = await params;
  const { returnTo } = await searchParams;
  return <PublicVerification key={code} initialCode={code.slice(0, 65)} returnTo={typeof returnTo === "string" ? returnTo : undefined} />;
}
