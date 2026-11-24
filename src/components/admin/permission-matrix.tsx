"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ActionButton, CheckboxField, DataTable, DefinitionGrid, FormField, Pill, SelectField, TextInput } from "@/components/ui/controls";
import { FeedbackBanner } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { useOperationActivity } from "@/components/ui/operation-activity";
import { TableFrame } from "@/components/ui/table-frame";
import { Notice } from "@/components/workspace";
import { capabilityLabels } from "@/lib/capability-labels";
import { roleLabel } from "@/lib/role-labels";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parsePermissionSnapshot, type PersonalPermission } from "@/lib/validation/permission-snapshot";
import "../guides/guides.css";
import "./permission-matrix.css";

type Definition = { code: string; default_roles: string[]; critical: boolean; allowed_roles?: string[] };
type Override = { capability: string; subject_role: string | null; subject_user: string | null; enabled: boolean };
type Member = { id: string; name: string; role: string };
type Edit = {
  code: string; scope: "person" | "role"; id: string; name: string; critical: boolean;
  editable: boolean; inherited: boolean; current: boolean | null; version: number; opener: HTMLElement; personRole?: string;
  familyReportingConfirmed?: boolean;
};
const groups: Record<string, string> = {
  req: "Requisições", com: "Compras", ent: "Entregas", bal: "Balanços", stock: "Estoques", schedule: "Escalas",
  document: "Fichas e Andamentos", contingency: "Contingências", consumption: "Faltas e consumo", catalog: "Catálogo",
  access: "Acessos", notifications: "Avisos", audit: "Auditoria",
};
const groupOrder = new Map(Object.keys(groups).map((key, index) => [key, index]));
const roles = [["admin", "Admin."], ["family", "Família"], ["professional", "Profiss."], ["supervisor", "Superv."], ["reader", "Leitura"]] as const;
const originLabels = { default: "Padrão da função", profile: "Configuração da função", personal: "Exceção pessoal", limited: "Limite da função" };
const area = (code: string) => code.split(".")[0];
const label = (code: string) => capabilityLabels[code] ?? code;
const areaLabel = (code: string) => groups[code] ?? code;
const caption = (value: boolean | null, inherited: boolean) => value === null ? "Herdar · " + (inherited ? "permitido" : "restrito") : value ? "Permitir" : "Restringir";
function groupPermissions<T extends { code: string }>(items: T[]) {
  const result = new Map<string, T[]>();
  for (const item of items) {
    const key = area(item.code);
    const group = result.get(key);
    if (group) group.push(item); else result.set(key, [item]);
  }
  for (const group of result.values()) group.sort((left, right) => Number(right.code.endsWith(".read")) - Number(left.code.endsWith(".read")));
  return new Map([...result].sort(([left], [right]) => (groupOrder.get(left) ?? groupOrder.size) - (groupOrder.get(right) ?? groupOrder.size)));
}

export function PermissionMatrix({ patientId, patientName, version, revision, globalMode, definitions, overrides, directory, busy, configure }: {
  patientId: string; patientName: string; version: number; revision: number; globalMode: boolean;
  definitions: Definition[]; overrides: Override[]; directory: Member[]; busy: boolean;
  configure: (change: Record<string, unknown>, version: number) => Promise<boolean>;
}) {
  const [personId, setPersonId] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const person = directory.find(row => row.id === personId);
  const decode = useCallback((value: unknown) => parsePermissionSnapshot(value, patientId, personId, version), [patientId, personId, version]);
  const details = useScopedRead(person ? "/api/patient-settings?" + new URLSearchParams({ careRecipientId: patientId, permissionPerson: person.id }) : null, String(revision), decode);
  useOperationActivity(details.loading && !edit, { title: "Consultando permissões da pessoa" });
  const snapshot = !details.loading && !details.error ? details.data : null;
  const definitionsByGroup = groupPermissions(definitions);
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const matches = (code: string) => (!group || area(code) === group) && [label(code), areaLabel(area(code)), code].some(value => value.toLocaleLowerCase("pt-BR").includes(query));
  const filtered = definitions.filter(row => matches(row.code));
  const personalRows = snapshot?.permissions.filter(row => matches(row.code)) ?? [];
  const roleSettings = new Map(overrides.filter(row => row.subject_role).map(row => [row.capability + ":" + row.subject_role, row.enabled]));
  const history = "/configuracoes?" + new URLSearchParams({ area: "people", careRecipientId: patientId, proposalKind: "capability", proposalStatus: "all" });

  function openPerson(row: PersonalPermission, opener: HTMLElement) {
    if (!person || !snapshot) return;
    setEdit({ code: row.code, scope: "person", id: person.id, name: person.name, critical: row.critical || row.code === "access.manage",
      editable: true, inherited: row.inherited, current: row.exception, version: snapshot.policyVersion, opener,
      personRole: snapshot.role, familyReportingConfirmed: row.familyReportingConfirmed });
  }

  return <section aria-label="Matriz de permissões" className="hca-permission-page hca-form">
    <div className="ui-card hca-permission-controls">
      <FormField label="Visualizar"><SelectField aria-label="Visualizar permissões" value={person?.id ?? ""} onChange={event => setPersonId(event.target.value)}>
        <option value="">Matriz de todos os perfis</option>
        {directory.map(row => <option key={row.id} value={row.id}>{row.name} · {roleLabel(row.role)}</option>)}
      </SelectField></FormField>
      <TextInput type="search" aria-label="Pesquisar permissões" placeholder="Buscar permissão" leading={<Icon name="search" />} value={search} onChange={event => setSearch(event.target.value)} />
      <FormField label="Área do sistema"><SelectField value={group} onChange={event => setGroup(event.target.value)}>
        <option value="">Todas as áreas</option>
        {Array.from(definitionsByGroup.keys()).map(key => <option key={key} value={key}>{areaLabel(key)}</option>)}
      </SelectField></FormField>
    </div>
    {person ? <>
      {details.error && <Notice error>{details.error} <ActionButton onClick={details.refresh}>Consultar permissões novamente</ActionButton></Notice>}
      {snapshot && <>
        <div className="ui-card hca-permission-person hca-guide-reading">
          <span><Icon name="user" /></span><div><h2>{person.name}</h2>
            <p>{roleLabel(snapshot.role)} · {snapshot.permissions.filter(row => row.origin === "personal").length} exceções pessoais</p>
          </div>
        </div>
        <p className="hca-field-hint">Herdar volta à configuração atual da função. Uma exceção se aplica ao vínculo exibido.</p>
        {Array.from(groupPermissions(personalRows), ([key, rows]) => <section className="ui-card hca-permission-group" key={key}>
          <h3>{areaLabel(key)}</h3>
          <ul>{rows.map(row => <li key={row.code}>
            <button type="button" className="hca-guide-row" disabled={busy} onClick={event => openPerson(row, event.currentTarget)}>
              <span className="hca-guide-row-icon" data-allowed={row.effective}><Icon name={row.effective ? "check" : "close"} width={16} /></span>
              <span className="hca-guide-row-label"><strong>{label(row.code)}</strong><small>{originLabels[row.origin]}{row.critical ? " · Crítica" : ""}</small></span>
              <Pill tone={row.effective ? "success" : "neutral"}>{row.effective ? "Permite" : "Restrito"}</Pill><Icon name="chevron" width={14} />
            </button>
          </li>)}</ul>
        </section>)}
      </>}
    </> : filtered.length > 0 && <div className="hca-form">
      <header className="hca-permission-heading"><div><h2>Permissões por perfil</h2><p>{filtered.length} de {definitions.length} permissões · {roles.length} perfis</p></div><Icon name="shield" width={20} /></header>
      <p className="hca-field-hint">Deslize a tabela para ver todos os perfis. Abra uma célula para conferir ou alterar.</p>
      <TableFrame className="hca-permission-scroll" label="Tabela de permissões por perfil com rolagem horizontal e vertical">
        <DataTable className="hca-permission-matrix" aria-label="Permissões efetivas">
          <thead><tr><th scope="col">Permissão</th>{roles.map(([id, short]) => <th scope="col" key={id} title={roleLabel(id)}><span aria-hidden="true">{short}</span><span className="sr-only">{roleLabel(id)}</span></th>)}</tr></thead>
          {Array.from(groupPermissions(filtered), ([key, rows]) => <tbody key={key}>
            <tr className="hca-permission-area"><th scope="rowgroup" colSpan={roles.length + 1}>{areaLabel(key)}</th></tr>
            {rows.map(def => <tr key={def.code}>
              <th scope="row"><strong>{label(def.code)}</strong>{def.critical && <small><Icon name="shield" width={12} />Crítica</small>}</th>
              {roles.map(([id]) => {
                const eligible = !def.allowed_roles || def.allowed_roles.includes(id);
                const inherited = eligible && def.default_roles.includes(id);
                const editable = eligible && def.code !== "access.manage";
                const current = editable ? roleSettings.get(def.code + ":" + id) ?? null : null;
                const allowed = eligible && (current ?? inherited);
                return <td key={id}><button type="button" className="hca-permission-cell" data-allowed={allowed} disabled={busy}
                  aria-label={label(def.code) + " · " + roleLabel(id) + " · " + (editable ? caption(current, inherited) : "Conferir por pessoa")}
                  onClick={event => setEdit({ code: def.code, scope: "role", id, name: roleLabel(id), critical: def.critical, editable, inherited, current, version, opener: event.currentTarget })}>
                  <Icon name={allowed ? "check" : "close"} width={17} />
                  <span>{editable ? (current === null ? "Padrão" : "Ajustado") : "Por pessoa"}</span>
                </button></td>;
              })}
            </tr>)}
          </tbody>)}
        </DataTable>
      </TableFrame>
      <p className="hca-permission-legend"><span><Icon name="check" width={14} />Permitido</span><span><Icon name="close" width={14} />Restrito</span><span>Padrão = herdado</span></p>
    </div>}
    {(!person ? !filtered.length : Boolean(snapshot && !personalRows.length)) && <div className="ui-card hca-permission-person">
      <p>Nenhuma permissão corresponde aos filtros.</p><ActionButton compact onClick={() => { setGroup(""); setSearch(""); }}>Limpar filtros</ActionButton>
    </div>}
    <div className="ui-card hca-permission-group">
      <h3>Acompanhar alterações</h3>
      <Link className="hca-guide-row" href={history} prefetch={false}>
        <span className="hca-guide-row-icon"><Icon name="history" /></span><span className="hca-guide-row-label"><strong>Histórico de permissões</strong><small>Responsáveis e alterações registradas</small></span><Icon name="chevron" width={14} />
      </Link>
    </div>
    {edit && <PermissionEditor edit={edit} patientName={patientName} version={version} globalMode={globalMode} busy={busy} configure={configure}
      people={edit.scope === "role" ? directory.filter(row => row.role === edit.id) : []}
      close={() => setEdit(null)} viewPerson={id => { setPersonId(id); setEdit(null); }} />}
  </section>;
}

function PermissionEditor({ edit, patientName, version, globalMode, busy, configure, people, viewPerson, close }: {
  edit: Edit; patientName: string; version: number; globalMode: boolean; busy: boolean; people: Member[];
  configure: (change: Record<string, unknown>, version: number) => Promise<boolean>;
  viewPerson: (id: string) => void; close: () => void;
}) {
  const [value, setValue] = useState(edit.current === null ? "inherit" : String(edit.current));
  const [review, setReview] = useState(false);
  const [selected, setSelected] = useState(people[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const next = value === "inherit" ? null : value === "true";
  const person = edit.scope === "person";
  const familyConsumption = edit.code === "consumption.report" && !["admin", "family"].includes(edit.personRole ?? "");
  const beyond = person && next === true && (!edit.inherited || familyConsumption);
  const managesAccess = person && edit.code === "access.manage";
  const requiresAcknowledgment = beyond || managesAccess;
  const changed = next !== edit.current || (person && familyConsumption && next === true && !edit.familyReportingConfirmed);
  const stale = version > edit.version;
  const title = !edit.editable ? "Definir uma exceção individual" :
    review ? (beyond ? "Permitir além da função?" : edit.critical ? "Confirmar permissão crítica" : "Confirmar alteração de permissão") : label(edit.code);

  async function confirm() {
    if (!changed || saving || busy || stale || requiresAcknowledgment && !acknowledged) return;
    setSaving(true);
    try {
      await configure({
        capability: edit.code, [person ? "subjectUser" : "subjectRole"]: edit.id, enabled: next,
        ...(person ? { reviewedRole: edit.personRole } : {}),
        ...(requiresAcknowledgment ? { confirmIndividual: true } : {}),
      }, edit.version);
    } finally { close(); }
  }

  return <Dialog open title={title} headingIcon="shield" keyboardScrollable onClose={close} closeDisabled={saving} finalFocus={() => edit.opener.isConnected ? edit.opener : false}
    footer={<><ActionButton disabled={saving} onClick={review && !stale ? () => { setReview(false); setAcknowledged(false); } : close}>{review && !stale ? "Voltar à alteração" : "Voltar"}</ActionButton>
      {edit.editable ? <ActionButton variant="primary" disabled={busy || saving || stale || !changed || review && requiresAcknowledgment && !acknowledged}
        onClick={review ? () => void confirm() : () => setReview(true)}>{review ? (globalMode ? "Registrar proposta" : beyond ? "Confirmar ampliação" : "Confirmar permissão") : "Revisar alteração"}</ActionButton> :
        !person && selected && <ActionButton variant="primary" onClick={() => viewPerson(selected)}>Conferir exceção pessoal</ActionButton>}
    </>}>
    <div className="hca-form">
      <DefinitionGrid items={[
        { label: "Residência", value: patientName }, { label: person ? "Pessoa" : "Perfil", value: edit.name },
        { label: "Permissão", value: label(edit.code) }, { label: "Atual", value: caption(edit.current, edit.inherited) },
        ...(review ? [{ label: "Proposta", value: caption(next, edit.inherited), wide: true }] : []),
      ]} />
      {stale ? <Notice>A configuração mudou. Volte e abra a permissão atual para revisar novamente.</Notice> :
        edit.editable && !review ? <FormField label={person ? "Exceção pessoal" : "Configuração deste perfil"}>
          <SelectField value={value} onChange={event => setValue(event.target.value)}>
            <option value="inherit">{caption(null, edit.inherited)}</option><option value="true">Permitir</option><option value="false">Restringir</option>
          </SelectField>
        </FormField> : null}
      {review && !stale && requiresAcknowledgment && <>
        {beyond && <FeedbackBanner tone="warning" heading="Acesso fora do padrão">
          <p>{familyConsumption
            ? `${edit.name} poderá relatar faltas e consumo da família se também puder consultar o estoque familiar. A exceção se limita a esta pessoa nesta residência.`
            : `${edit.name} poderá exercer esta permissão além da configuração da função ${roleLabel(edit.personRole).toLocaleLowerCase("pt-BR")}. A exceção se limita a esta pessoa nesta residência.`}</p>
        </FeedbackBanner>}
        {managesAccess && <p>{(next ?? edit.inherited)
          ? "Com este acesso, a pessoa pode gerir permissões e participantes e decidir propostas da residência."
          : "Esta alteração retira a gestão de permissões e participantes e a decisão de propostas desta pessoa."}</p>}
        <CheckboxField label={beyond ? "Confirmo a ampliação deste acesso" : "Confirmo a alteração deste acesso crítico"} checked={acknowledged} disabled={saving}
          onChange={event => setAcknowledged(event.currentTarget.checked)} />
      </>}
      {!edit.editable && <p className="hca-field-hint">A configuração coletiva desta capacidade é restrita. Consulte as permissões da pessoa vinculada.</p>}
      {!edit.editable && people.length > 0 && <FormField label="Pessoa vinculada">
        <SelectField value={selected} onChange={event => setSelected(event.target.value)}>{people.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField>
      </FormField>}
      {edit.editable && <p className="hca-field-hint">{person ? "A exceção vale para esta pessoa nesta residência." : "A configuração vale para o perfil nesta residência. As exceções pessoais têm prioridade."} {globalMode ? "A proposta precisa de aprovação local independente." : "A confirmação registra a decisão no histórico."}</p>}
    </div>
  </Dialog>;
}
