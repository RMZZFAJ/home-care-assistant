import { AuthenticatedPage } from "@/components/authenticated-page";
import { TransferConsole } from "@/components/documents/transfer-console";
import { Suspense } from "react";
import { z } from "zod";

type SearchParams = Promise<{ originId?: string | string[] }>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <AuthenticatedPage><Suspense><ReturnWizard searchParams={searchParams} /></Suspense></AuthenticatedPage>;
}

async function ReturnWizard({ searchParams }: { searchParams: SearchParams }) {
  const origin = z.uuid().safeParse((await searchParams).originId);
  return <TransferConsole source="CARE_TEAM" routedOriginId={origin.success ? origin.data : undefined} />;
}
