# SC-015 — Acompanhamento BAL

Rota: `/balancos` . Situação: ACTIVE.
Fonte principal:
[src/components/balances/balance-console.tsx](../../../../src/components/balances/balance-console.tsx)
.

## Intenção e contexto

Reconhecer obrigação, responsável, janela, atraso, revisão e próxima ação.

Perfis/capacidades: bal.read; família decide adiamento. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 40; **Controle:** Button; **Texto/nome ou expressão:** Recuperar a
mesma tentativa; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 41; **Controle:** Button; **Texto/nome ou expressão:** Tentar
novamente; **Pré-condição e efeito verificável:** {reload}.
- **Linha:** 48; **Controle:** Button; **Texto/nome ou expressão:** Configurar
dia e plantão; **Pré-condição e efeito verificável:** {!data.types.some(t =>
t.is_active)}.
- **Linha:** 48; **Controle:** Link; **Texto/nome ou expressão:** Nova contagem;
**Pré-condição e efeito verificável:** "/fichas/bal".
- **Linha:** 48; **Controle:** Link; **Texto/nome ou expressão:** Consultar
escala; **Pré-condição e efeito verificável:** "/escalas".
- **Linha:** 48; **Controle:** Link; **Texto/nome ou expressão:** Histórico de
fichas BAL; **Pré-condição e efeito verificável:** "/historico?type=BAL".
- **Linha:** 52; **Controle:** Link; **Texto/nome ou expressão:** Fazer balanço;
**Pré-condição e efeito verificável:** {"/fichas/bal" +
(data.eligibility.documentId ? "?documentId=" + data.eligibility.documentId +
(a.kind === "recount" ? "&recount=true" : "") : "")}.
- **Linha:** 52; **Controle:** Button; **Texto/nome ou expressão:** {approve ?
"Adiar com decisão familiar" : "Solicitar adiamento"}; **Pré-condição e efeito
verificável:** {e => open({ kind: "defer", family: approve },
e.currentTarget)}.
- **Linha:** 52; **Controle:** Button; **Texto/nome ou expressão:** Resolver
atribuição; **Pré-condição e efeito verificável:** {e => open({ kind:
"assign", cycleId: cycle,allowDeferral:approve }, e.currentTarget)}.
- **Linha:** 53; **Controle:** Button; **Texto/nome ou expressão:** Aprovar
adiamento; **Pré-condição e efeito verificável:** {e => open({ kind: "decide",
deferral: d, approve: true }, e.currentTarget)}.
- **Linha:** 53; **Controle:** Button; **Texto/nome ou expressão:** Rejeitar
adiamento; **Pré-condição e efeito verificável:** {e => open({ kind: "decide",
deferral: d, approve: false }, e.currentTarget)}.
- **Linha:** 54; **Controle:** Link; **Texto/nome ou expressão:** Abrir BAL;
**Pré-condição e efeito verificável:** {"/documentos/" + (o.count_document_id
?? o.regularized_by)}.
- **Linha:** 55; **Controle:** Link; **Texto/nome ou expressão:** {d.code} ·
consultar revisão; **Pré-condição e efeito verificável:** {"/documentos/" +
d.id}.
- **Linha:** 55; **Controle:** Button; **Texto/nome ou expressão:** Designar
reconto; **Pré-condição e efeito verificável:** {e => open({ kind: "recount",
documentId: d.id, version: d.version, code: d.code ?? "BAL" },
e.currentTarget)}.
- **Linha:** 59; **Controle:** Button; **Texto/nome ou expressão:** Voltar;
**Pré-condição e efeito verificável:** {busy || uncertain}.
- **Linha:** 59; **Controle:** Button; **Texto/nome ou expressão:** {uncertain ?
"Recuperar confirmação" : "Confirmar decisão"}; **Pré-condição e efeito
verificável:** {busy}.

Fontes de interface relacionadas: `src/components/balances/balance-console.tsx`
, `src/components/workspace.tsx` , `src/components/ui/primitives.tsx` ,
`src/components/forms/record-drawer.tsx` ,
`src/components/balances/balance-forms.tsx` ,
`src/components/balances/use-balance-workspace.ts` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Prazos originais preservados; pedido não suspende prazo; links de ficha e
escala; nenhum responsável inferido em ambiguidade.

## Atritos e contraditório

Confirmações de destino/adiamento repetem motivo mas não plantão selecionado;
dado now capturado na montagem pode afetar frase temporal.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Mostrar responsável e janela anterior/nova em cada decisão; diferenciar consulta
atualizando de tempo da última leitura.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, balances](../evidence/b11-adminA-balances-390.png): top
909/909 source pixels; navegação e leitura, comandos não confirmados.

A regra de prazo permanece no banco; UI temporal não concede elegibilidade.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-013 — {editor.kind === "configure" ? "Programação do BAL" : editor.kind

=== "decide" ? "Decisão familiar" : editor.kind === "recount" ? "Designar
reconto" : editor.kind === "assign" ? "Resolver atribuição" : "Adiamento do
BAL"}

Componente RecordDrawer, origem `src/components/balances/balance-console.tsx:58`
.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmações de destino/adiamento repetem motivo mas não plantão selecionado;
dado now capturado na montagem pode afetar frase temporal.
Preservar: Prazos originais preservados; pedido não suspende prazo; links de
ficha e escala; nenhum responsável inferido em ambiguidade.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-014 — "Revisar decisão do balanço"

Componente Dialog, origem `src/components/balances/balance-console.tsx:59` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo true.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmações de destino/adiamento repetem motivo mas não plantão selecionado;
dado now capturado na montagem pode afetar frase temporal.
Preservar: Prazos originais preservados; pedido não suspende prazo; links de
ficha e escala; nenhum responsável inferido em ambiguidade.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-015.

5 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [balances](../evidence/b11-adminA-balances-390.png): adminA; 390;
READY_VIEW_STATE. top 909/909 source pixels.
- [bal-configure](../evidence/b11-supplement-adminA-bal-configure.png): adminA;
390; READY. top 844/844 source pixels.
- [bal-config-review](../evidence/b11-followup-adminA-bal-config-review.png):
adminA; 390; READY. top 844/844 source pixels.
- [balance-workspace](../evidence/b18-journeys-supervisor-balance-workspace.png)
: supervisor; 390; LOADING. top 844 of 844px; scaled to 360x650.
- [balance-ready](../evidence/b18-ready-supervisor-balance-ready.png):
supervisor; 390; READY. Original image opened; full viewport/image as
displayed.

Campos deste consumidor: FLD-0083; FLD-0084; FLD-0085; FLD-0086; FLD-0087;
FLD-0088; FLD-0089; FLD-0090. Controles de ação relacionados: 16 callsites;
inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-UX-002](../12_FINDINGS_MASTER.md#b1-ux-002) —
Confirmações de estoque, ENT e configuração BAL omitem consequências por
domínio.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
