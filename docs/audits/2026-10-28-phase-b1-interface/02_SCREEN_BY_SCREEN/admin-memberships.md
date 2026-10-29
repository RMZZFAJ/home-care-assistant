# SC-022 — Pessoas e vínculos

Rota: `/admin?section=memberships` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/membership-management.tsx](../../../../src/components/admin/membership-management.tsx)
.

## Intenção e contexto

Vincular conta existente, editar função e revogar/reativar vínculo.

Perfis/capacidades: access.manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 18; **Controle:** Button; **Texto/nome ou expressão:** Vincular
conta; **Pré-condição e efeito verificável:** {(event) => setEditor({ row:
null, opener: event.currentTarget })}.
- **Linha:** 19; **Controle:** Input; **Texto/nome ou expressão:** "Pesquisar
pessoas"; **Pré-condição e efeito verificável:** "search".
- **Linha:** 20; **Controle:** Button; **Texto/nome ou expressão:** {"Editar
vínculo de " + name(row)}; **Pré-condição e efeito verificável:** {(event) =>
setEditor({ row, opener: event.currentTarget })}.
- **Linha:** 20; **Controle:** Button; **Texto/nome ou expressão:** {row.status
=== "revoked" ? "Reativar" : "Revogar"}; **Pré-condição e efeito
verificável:** {() => setChange(row)}.
- **Linha:** 22; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Selecione uma conta&lt;/option&gt; {directory.map((person) =>
&lt;option key={text(person, "user_id") || text(person, "id")}
value={text(person, "user_id") || text(person, "id")}&gt;{text(person,
"full_name")}</; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 22; **Controle:** Button; **Texto/nome ou expressão:** Salvar
vínculo; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 24; **Controle:** Button; **Texto/nome ou expressão:** Voltar;
**Pré-condição e efeito verificável:** {busy}.
- **Linha:** 24; **Controle:** Button; **Texto/nome ou expressão:** Confirmar
alteração; **Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas:
`src/components/admin/membership-management.tsx` ,
`src/components/forms/record-drawer.tsx` , `src/components/ui/primitives.tsx` ,
`src/components/workspace.tsx` , `src/components/admin/admin-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Busca por nome/função, confirmação de revogação e distinção de conta global.

## Atritos e contraditório

Editar deixa trocar Conta vinculada, mas payload não identifica o vínculo
antigo; nomes repetidos dificultam escolha; vazio prematuro.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Identidade não editável no drawer de edição; nova associação em ação explícita;
distinguir nomes homônimos sem expor contato indevido.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-memberships](../evidence/b11-adminA-admin-memberships-390.png)
: top 1030/1965 source pixels; navegação e leitura, comandos não confirmados.

Não executar revogação de conta compartilhada para testar apresentação.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-005 — {editor.row ? "Editar vínculo" : "Vincular conta existente"}

Componente RecordDrawer, origem
`src/components/admin/membership-management.tsx:21` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Editar deixa trocar Conta vinculada, mas payload não identifica o vínculo
antigo; nomes repetidos dificultam escolha; vazio prematuro.
Preservar: Busca por nome/função, confirmação de revogação e distinção de conta
global.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-006 — {change?.status === "revoked" ? "Reativar vínculo" : "Revogar

vínculo"}

Componente Dialog, origem `src/components/admin/membership-management.tsx:24` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(change)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Editar deixa trocar Conta vinculada, mas payload não identifica o vínculo
antigo; nomes repetidos dificultam escolha; vazio prematuro.
Preservar: Busca por nome/função, confirmação de revogação e distinção de conta
global.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-022.

3 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [admin-memberships](../evidence/b11-adminA-admin-memberships-390.png):
adminA; 390; READY_VIEW_STATE. top 1030/1965 source pixels.
- [membership-new](../evidence/b11-supplement-adminA-membership-new.png):
adminA; 390; READY. top 844/844 source pixels.

[membership-revoke-review](../evidence/b18-overlay-followup-adminA-membership-revoke-review.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0031; FLD-0032;
FLD-0033. Controles de ação relacionados: 7 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-FORM-006](../12_FINDINGS_MASTER.md#b1-form-006) —
Editor de vínculo permite trocar pessoa sem explicar destino do vínculo
anterior.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
