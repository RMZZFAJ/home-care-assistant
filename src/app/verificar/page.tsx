import { PublicVerification } from "@/components/documents/public-verification";
import { Suspense } from "react";
export default function Page(props: { searchParams: Promise<{ code?: string ;}> ;}) {
  return <Suspense><VerificationQuery {...props} /></Suspense>;
}
async function VerificationQuery({ searchParams }: { searchParams: Promise<{ code?: string ;}> ;}) { const { code } = await searchParams; return <PublicVerification initialCode={code ?? ""} />; }
