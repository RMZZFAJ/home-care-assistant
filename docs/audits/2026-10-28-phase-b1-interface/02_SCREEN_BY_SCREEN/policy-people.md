# SC-034 — Pessoas e propostas

Rota: `/configuracoes?area=people` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/policy-console.tsx](../../../../src/components/admin/policy-console.tsx)
.

## Intenção e contexto

Alterar função e decidir propostas de configuração.

Perfis/capacidades: admin local distinto decide proposta global. O menu não
concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 235; **Controle:** input; **Texto/nome ou expressão:** "Convite
aprovado"; **Pré-condição e efeito verificável:** Consultar ramo condicional
na fonte.
- **Linha:** 244; **Controle:** Button; **Texto/nome ou expressão:** {label};
**Pré-condição e efeito verificável:** {(event) => { if (!event.ctrlKey &&
!event.metaKey && !event.shiftKey && event.button === 0) {
event.preventDefault(); setTab(area); } }}.
- **Linha:** 283; **Controle:** select; **Texto/nome ou expressão:**
{data.directory.map((person) => ( &lt;option key={person.id}
value={person.id}&gt; {person.name} &lt;/option&gt; ))}; **Pré-condição e
efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 293; **Controle:** select; **Texto/nome ou expressão:**
{Object.entries(roles).map(([key, label]) => ( &lt;option key={key}
value={key}&gt; {label} &lt;/option&gt; ))}; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 301; **Controle:** button; **Texto/nome ou expressão:** Registrar
alteração; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 332; **Controle:** button; **Texto/nome ou expressão:** Aprovar
proposta; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 346; **Controle:** button; **Texto/nome ou expressão:** Rejeitar;
**Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/admin/policy-console.tsx` ,
`src/components/workspace.tsx` , `src/components/admin/permission-matrix.tsx` ,
`src/components/ui/primitives.tsx` , `src/components/admin/admin-fields.tsx` ,
`src/components/admin/notification-matrix.tsx` ,
`src/components/forms/record-drawer.tsx` ,
`src/components/admin/policy-rules.tsx` ,
`src/components/admin/reminder-settings.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Servidor exige contexto, versão e pessoa distinta; aceite futuro não concede
vínculo antecipadamente.

## Atritos e contraditório

JSON e kind expostos; ação Aprovar não tem resumo humano; mensagem nenhuma
proposta pendente pode coexistir com awaiting_acceptance.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Diff de negócio com nomes autorizados, antes/depois e estado Aguardando aceite;
contador por responsabilidade.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy-people](../evidence/b11-supplement-adminA-policy-people.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Não aprovar proposta existente apenas para produzir captura.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-034.

2 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [policy-people](../evidence/b11-supplement-adminA-policy-people.png): adminA;
390; READY. top 844/844 source pixels.
- [proposal-json](../evidence/b13-text-adminA-proposal-json.png): adminA; 390;
READY. top 908 of 908px; scaled to 360x650.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0034; FLD-0035;
FLD-0036; FLD-0037; FLD-0038; FLD-0039; FLD-0040; FLD-0051; FLD-0052; FLD-0053;
FLD-0054; FLD-0055; FLD-0056; FLD-0057; FLD-0058; FLD-0059; FLD-0060; FLD-0061;
FLD-0062; FLD-0063; FLD-0064; FLD-0065; FLD-0066; FLD-0067; FLD-0068; FLD-0069;
FLD-0070; FLD-0071; FLD-0072. Controles de ação relacionados: 5 callsites;
inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-UX-003](../12_FINDINGS_MASTER.md#b1-ux-003) —
Decisão de proposta administrativa exige ler JSON e identificadores;
[B1-TEXT-001](../12_FINDINGS_MASTER.md#b1-text-001) — Códigos de filtros, ações
e papéis escapam à linguagem humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
