"use client";

import { useState } from "react";

type Profile = { id: string; full_name: string; role: string; status: string; global_scope: boolean };
type Recipient = { id: string; display_name: string; is_active: boolean; is_development: boolean };
type Product = { id: string; name: string; category: string; unit: string; is_active: boolean };

export function AdminConsole({ profiles, recipients, products }: { profiles: Profile[]; recipients: Recipient[]; products: Product[] }) {
  const [message, setMessage] = useState("");
  async function saveProfile(profile: Profile, status: string) {
    setMessage("");
    const response = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      action: "profile", userId: profile.id, fullName: profile.full_name, role: profile.role, status, globalScope: profile.global_scope,
    }) });
    const result = await response.json();
    setMessage(response.ok ? "Perfil atualizado." : result.error ?? "Não foi possível atualizar.");
  }
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <header><h1 className="text-2xl font-semibold">Administração</h1><p className="text-sm text-slate-600">Operações protegidas por sessão, perfil global e auditoria.</p></header>
      {message && <p role="status" className="rounded border p-3 text-sm">{message}</p>}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Usuários</h2>
        <div className="overflow-x-auto rounded border"><table className="min-w-full text-left text-sm"><thead><tr><th className="p-2">Nome</th><th className="p-2">Função</th><th className="p-2">Estado</th><th className="p-2">Ação</th></tr></thead><tbody>
          {profiles.map((profile) => <tr key={profile.id} className="border-t"><td className="p-2">{profile.full_name}</td><td className="p-2">{profile.role}</td><td className="p-2">{profile.status}</td><td className="p-2"><button className="rounded border px-2 py-1" onClick={() => saveProfile(profile, profile.status === "active" ? "revoked" : "active")}>{profile.status === "active" ? "Revogar" : "Reativar"}</button></td></tr>)}
        </tbody></table></div>
      </section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Pessoas assistidas</h2><ul className="grid gap-2 sm:grid-cols-2">{recipients.map((recipient) => <li key={recipient.id} className="rounded border p-3">{recipient.display_name}<span className="ml-2 text-xs text-slate-500">{recipient.is_active ? "ativa" : "inativa"}</span></li>)}</ul></section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Catálogo ({products.length})</h2><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <li key={product.id} className="rounded border p-3"><strong>{product.name}</strong><span className="block text-xs text-slate-500">{product.category} · {product.unit} · {product.is_active ? "ativo" : "inativo"}</span></li>)}</ul></section>
    </main>
  );
}
