import { AuthenticatedPage } from "@/components/authenticated-page";
import { BalanceConsole } from "@/components/balances/balance-console";
import { Suspense } from "react";
export default function Page() { return <AuthenticatedPage><Suspense fallback={<p>Carregando balanços…</p>}><BalanceConsole /></Suspense></AuthenticatedPage>; }
