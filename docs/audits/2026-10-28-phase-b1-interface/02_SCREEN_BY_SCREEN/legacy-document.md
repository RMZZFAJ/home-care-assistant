# SC-040 — URL anterior REQ

Rota: `/historico/[id]` . Situação: COMPATIBILITY.
Fonte principal:
[src/app/historico/[id]/page.tsx](../../../../src/app/historico/[id]/page.tsx).

## Intenção e contexto

Preservar links antigos e acesso ao visualizador comum.

Perfis/capacidades: leitura por tipo/paciente. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

Fontes de interface relacionadas: `src/app/historico/[id]/page.tsx` ,
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

Reutiliza autorização e conteúdo, sem duplicar domínio.

## Atritos e contraditório

Fallback de loading difere no role de /documentos; voltar ao histórico não
conserva filtros da origem.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Uniformizar estado acessível e preservar retorno seguro e filtros.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, legacy-req](../evidence/b11-followup-adminA-legacy-req.png):
top 1030/2203 source pixels; navegação e leitura, comandos não confirmados.

Compatibilidade não significa componente antigo ativo.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-040.

6 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [legacy-req](../evidence/b11-followup-adminA-legacy-req.png): adminA; 390;
READY. top 1030/2203 source pixels.
- [req-requery](../evidence/b18-journeys-professional-req-requery.png):
professional; 390; READY. top 844 of 844px; scaled to 360x650.

[science-and-fulfillment](../evidence/b18-journeys-family-science-and-fulfillment.png)
: family; 390; REFRESHING_AFTER_PERSISTED. top 950 of 1960px; scaled to
360x650

[science-requery-ready](../evidence/b18-ready-family-science-requery-ready.png)
: family; 390; READY. Original image opened; full viewport/image as displayed.

- [req-cancel-review](../evidence/b18-overlays-adminA-req-cancel-review.png):
adminA; 390; READY. top 844 of 844px; scaled to 360x650.

[extra-association-review](../evidence/b18-overlays-adminA-extra-association-review.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0105; FLD-0113; FLD-0114; FLD-0115; FLD-0116;
FLD-0117; FLD-0118; FLD-0119; FLD-0120; FLD-0121; FLD-0122; FLD-0123; FLD-0124;
FLD-0133; FLD-0144; FLD-0159; FLD-0160; FLD-0161. Controles de ação
relacionados: 0 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-TEXT-001](../12_FINDINGS_MASTER.md#b1-text-001) —
Códigos de filtros, ações e papéis escapam à linguagem humana;
[B1-ERR-001](../12_FINDINGS_MASTER.md#b1-err-001) — Anexo com resposta perdida
deixa arquivo editável apesar de persistência confirmada;
[B1-UX-006](../12_FINDINGS_MASTER.md#b1-ux-006) — Histórico tem versões e
integridade, mas exige tradução manual de mudanças de negócio;
[B1-UX-008](../12_FINDINGS_MASTER.md#b1-ux-008) — Ciência automática continua
ligada à exposição do cabeçalho.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
