import { PublicVerification } from "@/components/documents/public-verification";
import { Suspense } from "react";
export default function Page(props: { searchParams: Promise<{ code?: string | string[]; returnTo?: string | string[] }> }) {
  return <Suspense><VerificationQuery {...props} /></Suspense>;
}
async function VerificationQuery({ searchParams }: { searchParams: Promise<{ code?: string | string[]; returnTo?: string | string[] }> }) { const { code, returnTo } = await searchParams; return <PublicVerification initialCode={typeof code === "string" ? code : ""} returnTo={typeof returnTo === "string" ? returnTo : undefined} />; }
