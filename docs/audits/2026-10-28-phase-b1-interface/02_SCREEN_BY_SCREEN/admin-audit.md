# SC-028 — Auditoria

Rota: `/admin?section=audit`. Situação: ACTIVE.
Fonte principal: [src/components/admin/admin-console.tsx](../../../../src/components/admin/admin-console.tsx).

## Intenção e contexto

Reconstruir ação, momento, ator e referência no contexto.

Perfis/capacidades: audit.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 233 | Link | Unidades e apresentações / scanner | "/unidades" |
| 234 | Link | Permissões e alterações com dupla aprovação | "/configuracoes?area=people" |
| 238 | button | Recarregar  | {() => void load()} |
| 253 | input | Link <input readOnly value={invitationUrl} className={inputClass} onFocus={(event) => event.target.select()} />  | Consultar ramo condicional na fonte |
| 306 | button | Criar convite  | "submit" |
| 327 | button | Reemitir link  | {() =>                           void execute(                             {                               action: "resendInvitation",                               invitationId: row.id,               |
| 341 | button | Revogar  | {() =>                           void execute(                             {                               action: "revokeInvitation",                               invitationId: row.id,               |
| 384 | button | Anterior  | {loading \|\| page <= 1} |
| 397 | button | Próxima  | {loading \|\| page * 20 >= notificationTotal} |
| 452 | textarea | Lote JSON <textarea rows={12} value={importText} onChange={(event) => { setImportText(event.target.value); setImportReviewed(false); setReport(null); }} className={inputClass} placeholder='[{"physicalProtocol":1,"careRec | Consultar ramo condicional na fonte |
| 465 | button | Pré-validar lote  | {() => {                   try {                     const parsed: unknown = JSON.parse(importText);                     if (!Array.isArray(parsed))                       throw new Error("O lote preci |
| 492 | button | Confirmar importação revisada  | {!importReviewed} |

Fontes de interface relacionadas: `src/components/admin/admin-console.tsx`, `src/components/workspace.tsx`, `src/components/admin/notification-settings.tsx`, `src/components/admin/admin-fields.tsx`, `src/components/admin/alert-settings.tsx`, `src/components/admin/patient-registration.tsx`, `src/components/admin/administration-navigation.tsx`, `src/components/ui/primitives.tsx`, `src/components/admin/catalogue-management.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/admin/membership-management.tsx`, `src/components/admin/global-accounts.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Preserva UUID técnico e data para rastreabilidade.

## Atritos e contraditório

Só cem eventos; action/entity_type brutos; ator UUID e referência sem link impedem reconstrução humana simples.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Filtros, paginação, nomes autorizados, rótulos de negócio e links de recurso com fallback seguro.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-audit](../evidence/b11-adminA-admin-audit-390.png): top 1030/11385 source pixels; navegação e leitura, comandos não confirmados.

Sem benchmark de volume e sem inferência de exclusão do banco.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
