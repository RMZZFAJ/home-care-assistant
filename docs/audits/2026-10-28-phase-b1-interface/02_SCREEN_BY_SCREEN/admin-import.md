# SC-029 — Importação histórica

Rota: `/admin?section=import` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/admin-console.tsx](../../../../src/components/admin/admin-console.tsx)
.

## Intenção e contexto

Pré-validar e incorporar protocolos físicos revisados.

Perfis/capacidades: access.manage conforme API. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 233; **Controle:** Link; **Texto/nome ou expressão:** Unidades e
apresentações / scanner; **Pré-condição e efeito verificável:** "/unidades".
- **Linha:** 234; **Controle:** Link; **Texto/nome ou expressão:** Permissões e
alterações com dupla aprovação; **Pré-condição e efeito verificável:**
"/configuracoes?area=people".
- **Linha:** 238; **Controle:** button; **Texto/nome ou expressão:** Recarregar;
**Pré-condição e efeito verificável:** {() => void load()}.
- **Linha:** 253; **Controle:** input; **Texto/nome ou expressão:** Link
&lt;input readOnly value={invitationUrl} className={inputClass}
onFocus={(event) =&gt; event.target.select()} />; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 306; **Controle:** button; **Texto/nome ou expressão:** Criar
convite; **Pré-condição e efeito verificável:** "submit".
- **Linha:** 327; **Controle:** button; **Texto/nome ou expressão:** Reemitir
link; **Pré-condição e efeito verificável:** {() => void execute( { action:
"resendInvitation", invitationId: row.id,.
- **Linha:** 341; **Controle:** button; **Texto/nome ou expressão:** Revogar;
**Pré-condição e efeito verificável:** {() => void execute( { action:
"revokeInvitation", invitationId: row.id,.
- **Linha:** 384; **Controle:** button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {loading || page <= 1}.
- **Linha:** 397; **Controle:** button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {loading || page * 20 >=
notificationTotal}.
- **Linha:** 452; **Controle:** textarea; **Texto/nome ou expressão:** Lote JSON
&lt;textarea rows={12} value={importText} onChange={(event) =&gt; {
setImportText(event.target.value); setImportReviewed(false); setReport(null);
}} className={inputClass} placeholder='[{"physicalProtocol":1,"careRec;
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 465; **Controle:** button; **Texto/nome ou expressão:** Pré-validar
lote; **Pré-condição e efeito verificável:** {() => { try { const parsed:
unknown = JSON.parse(importText); if (!Array.isArray(parsed)) throw new
Error("O lote preci.
- **Linha:** 492; **Controle:** button; **Texto/nome ou expressão:** Confirmar
importação revisada; **Pré-condição e efeito verificável:** {!importReviewed}.

Fontes de interface relacionadas: `src/components/admin/admin-console.tsx` ,
`src/components/workspace.tsx` ,
`src/components/admin/notification-settings.tsx` ,
`src/components/admin/admin-fields.tsx` ,
`src/components/admin/alert-settings.tsx` ,
`src/components/admin/patient-registration.tsx` ,
`src/components/admin/administration-navigation.tsx` ,
`src/components/ui/primitives.tsx` ,
`src/components/admin/catalogue-management.tsx` ,
`src/components/forms/record-drawer.tsx` ,
`src/components/admin/membership-management.tsx` ,
`src/components/admin/global-accounts.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Preview não grava; alterar JSON invalida aceite; desconhecidos devem permanecer
ausentes.

## Atritos e contraditório

JSON obrigatório e saída JSON; dados inválidos não são associados a campos;
números físicos 1–11 fixos precisam contexto.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Ferramenta assistida por arquivo/grade com preview por registro e erros
localizados, ou manter ferramenta técnica restrita a operador treinado.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-import](../evidence/b11-supplement-adminA-admin-import.png)
: top 945/945 source pixels; navegação e leitura, comandos não confirmados.

Não importar lote para fins estéticos; avaliar fluxo sem confirmação de
gravação.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-029.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [admin-import](../evidence/b11-supplement-adminA-admin-import.png): adminA;
390; READY. top 945/945 source pixels.

Campos deste consumidor: FLD-0004; FLD-0005; FLD-0006; FLD-0007; FLD-0008;
FLD-0009; FLD-0010; FLD-0011; FLD-0012; FLD-0013; FLD-0014; FLD-0015; FLD-0016;
FLD-0017; FLD-0018; FLD-0019; FLD-0020; FLD-0021; FLD-0022; FLD-0023; FLD-0024;
FLD-0025; FLD-0026; FLD-0027; FLD-0028; FLD-0029; FLD-0030; FLD-0031; FLD-0032;
FLD-0033; FLD-0041; FLD-0042; FLD-0043; FLD-0044; FLD-0045; FLD-0046; FLD-0047;
FLD-0048; FLD-0049; FLD-0050. Controles de ação relacionados: 11 callsites;
inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
