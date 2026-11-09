"use client";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { MenuPopup } from "@/components/ui/floating";
import { capabilityLabels } from "@/lib/capability-labels";
import { Dialog, Icon } from "@/components/ui/primitives";
import { roles } from "./admin-fields";
type Definition = { code: string; default_roles: string[]; critical: boolean; allowed_roles?: string[] };
type Override = { capability: string; subject_role: string | null; subject_user: string | null; enabled: boolean };
type Change = { capability: string; subjectRole?: string; subjectUser?: string; enabled: boolean | null };
const groups: Record<string, string> = { req: "Requisições", com: "Compras", ent: "Entregas", bal: "Balanços", stock: "Estoques", catalog: "Catálogo", access: "Acessos", notifications: "Comunicação", audit: "Auditoria", consumption: "Ocorrências", schedule: "Escalas" };
export function PermissionMatrix({ definitions, overrides, directory, busy, configure }: {
  definitions: Definition[]; overrides: Override[]; directory: { id: string; name: string; role: string }[]; busy: boolean;
  configure: (kind: string, change: Record<string, unknown>) => Promise<boolean>;
}) {
  const [person, setPerson] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [confirmation, setConfirmation] = useState<{ change: Change; name: string; before: string; after: string } | null>(null);
  const columns = person ? [[person, directory.find((row) => row.id === person)?.name ?? "Pessoa"]] : Object.entries(roles);
  const filtered = definitions.filter((def) => (!group || def.code.split(".")[0] === group) && (capabilityLabels[def.code] ?? def.code).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const describe = (enabled: boolean | null, inherited: boolean) => enabled === null ? "Herdar · " + (inherited ? "permitido" : "restrito") : enabled ? "Permitir" : "Restringir";
  return <section aria-label="Matriz de permissões">
    <div className="hca-section-heading"><div><h2>Permissões por função e exceções pessoais</h2><p>Exceções pessoais respeitam os limites da função e do paciente.</p></div></div>
    <div className="hca-toolbar"><TextInput type="search" aria-label="Pesquisar permissões" placeholder="Buscar permissão" leading={<Icon name="search" />} value={search} onChange={controlEvent => { const controlValue = controlEvent.currentTarget.value; return setSearch(controlValue); }} /><SelectField aria-label="Grupo de permissões" value={group} onChange={(event) => setGroup(event.target.value)}><option value="">Todos os grupos</option>{[...new Set(definitions.map((def) => def.code.split(".")[0]))].map((code) => <option key={code} value={code}>{groups[code] ?? code}</option>)}</SelectField><SelectField aria-label="Visualizar permissões" value={person} onChange={(event) => setPerson(event.target.value)}><option value="">Todas as funções</option>{directory.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField></div>
    <div className="hca-records hca-matrix-scroll" tabIndex={0} role="region" aria-label="Tabela de permissões; rolagem horizontal por função"><DataTable className="hca-table hca-matrix" aria-label="Permissões efetivas"><DataTableHead><DataTableRow><DataTableHeading>Capacidade</DataTableHeading>{columns.map(([id, label]) => <DataTableHeading key={id}>{label}</DataTableHeading>)}</DataTableRow></DataTableHead><DataTableBody>{filtered.map((def) => <DataTableRow key={def.code}><DataTableCell className="hca-matrix-name"><strong>{capabilityLabels[def.code] ?? def.code}</strong><small className="hca-cell-secondary">{groups[def.code.split(".")[0]] ?? "Operação"}{def.critical ? " · Crítica" : ""}</small></DataTableCell>{columns.map(([id, name]) => {
      const override = overrides.find((row) => row.capability === def.code && (person ? row.subject_user === id : row.subject_role === id));
      const role = person ? directory.find((row) => row.id === person)?.role : id;
      const inherited = person ? (overrides.find((row) => row.capability === def.code && row.subject_role === role)?.enabled ?? def.default_roles.includes(role ?? "")) : def.default_roles.includes(id);
      const eligible=!def.allowed_roles||def.allowed_roles.includes(role??id);
      const enabled = override?.enabled ?? null, allowed = eligible&&(enabled ?? inherited);
      const caption = eligible?describe(enabled, inherited):"Restrito por função", label = capabilityLabels[def.code] ?? def.code;
      return <DataTableCell key={id}><Menu.Root><Menu.Trigger render={<ActionButton className="hca-permission-cell" variant="quiet" aria-label={label + " · " + name + " · " + caption} disabled={busy || def.code === "access.manage"} />}>{<Icon name={allowed ? "check" : "close"} />}<Pill  tone={allowed ? "success" : "neutral"}>{!eligible?"Restrito":enabled === null ? "Herdar" : enabled ? "Permitir" : "Restringir"}</Pill></Menu.Trigger><MenuPopup><Menu.RadioGroup value={enabled === null ? "inherit" : String(enabled)}>{["inherit", "true", "false"].map((value) => <Menu.RadioItem className="hca-menu-item" closeOnClick key={value}  value={value} disabled={!eligible&&value==="true"} onClick={() => { const next = value === "inherit" ? null : value === "true"; const change: Change = { capability: def.code, [person ? "subjectUser" : "subjectRole"]: id, enabled: next }; if (def.critical) setConfirmation({ change, name: label + " · " + name, before: caption, after: describe(next, inherited) }); else void configure("capability", change); }}>{describe(value === "inherit" ? null : value === "true", inherited)}</Menu.RadioItem>)}</Menu.RadioGroup></MenuPopup></Menu.Root></DataTableCell>;
    })}</DataTableRow>)}</DataTableBody></DataTable></div>
    {!filtered.length ? <p className="hca-field-hint">Nenhuma permissão corresponde aos filtros.</p> : null}
    <Dialog open={Boolean(confirmation)} title="Confirmar alteração crítica" onClose={() => { if (!busy) setConfirmation(null); }}>{confirmation ? <><p><strong>{confirmation.name}</strong></p><dl className="hca-change-summary"><dt>Atual</dt><dd>{confirmation.before}</dd><dt>Proposta</dt><dd>{confirmation.after}</dd></dl><p className="hca-field-hint">A mudança vale neste paciente e será auditada. Na atuação global, depende de aprovação local distinta.</p><div className="hca-toolbar"><ActionButton disabled={busy} onClick={() => setConfirmation(null)}>Voltar</ActionButton><ActionButton variant="primary" disabled={busy} onClick={async () => { await configure("capability", confirmation.change); setConfirmation(null); }}>Confirmar permissão</ActionButton></div></> : null}</Dialog>
  </section>;
}
