# SC-041 — URL anterior suprimento

Rota: `/fichas/[id]` . Situação: COMPATIBILITY.
Fonte principal:
[src/app/fichas/[id]/page.tsx](../../../../src/app/fichas/[id]/page.tsx).

## Intenção e contexto

Preservar links documentais COM/ENT/BAL.

Perfis/capacidades: leitura por tipo/paciente. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

Fontes de interface relacionadas: `src/app/fichas/[id]/page.tsx` ,
`src/components/authenticated-page.tsx` ,
`src/components/documents/document-viewer.tsx` , `src/components/workspace.tsx`
, `src/components/layout/workspace-context.tsx` ,
`src/components/layout/workspace-shell.tsx` , `src/components/ui/primitives.tsx`
, `src/components/notifications/notification-bell.tsx` ,
`src/components/auth/logout-button.tsx` ,
`src/components/navigation/workspace-navigation.tsx` ,
`src/components/requisitions/requisition-detail.tsx` ,
`src/components/forms/settings-section.tsx` ,
`src/components/documents/attachments.tsx` ,
`src/components/documents/document-header.tsx` ,
`src/components/documents/document-actions.tsx` ,
`src/components/documents/document-timeline.tsx` ,
`src/components/documents/related-document.tsx` ,
`src/components/requisitions/resolve-extra-item.tsx` ,
`src/components/documents/supply-detail.tsx` ,
`src/components/documents/supply-line-summary.tsx` ,
`src/components/notifications/document-delivery-status.tsx` ,
`src/components/documents/supply-command-editor.tsx` ,
`src/components/documents/demo-document.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Adaptador compartilha visualizador e valida contexto.

## Atritos e contraditório

Nome ficha/documento variam para a mesma tarefa; demonstração segue lista fixa.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Manter URLs e títulos coerentes; não eliminar rota por duplicidade.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, legacy-ent](../evidence/b11-followup-adminA-legacy-ent.png):
top 1030/2270 source pixels; navegação e leitura, comandos não confirmados.

Não redirecionar identificação sem conservar versão/retorno.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-041.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [legacy-ent](../evidence/b11-followup-adminA-legacy-ent.png): adminA; 390;
READY. top 1030/2270 source pixels.

Campos deste consumidor: FLD-0105; FLD-0113; FLD-0114; FLD-0115; FLD-0116;
FLD-0117; FLD-0118; FLD-0119; FLD-0120; FLD-0121; FLD-0122; FLD-0123; FLD-0124;
FLD-0133; FLD-0144; FLD-0159; FLD-0160; FLD-0161. Controles de ação
relacionados: 0 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
