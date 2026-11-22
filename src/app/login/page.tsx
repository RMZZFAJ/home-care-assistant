import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";
import { AccessFrame } from "@/components/auth/access-frame";

export default function LoginPage() {
  return (
    <Suspense fallback={<AccessFrame active="login" title="Entrar"><p role="status">Carregando formulário…</p></AccessFrame>}><LoginForm /></Suspense>
  );
}
