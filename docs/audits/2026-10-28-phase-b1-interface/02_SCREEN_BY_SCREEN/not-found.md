# SC-006 — Página inexistente

Rota: `/_not-found` . Situação: ACTIVE.
Fonte principal: [src/app/layout.tsx](../../../../src/app/layout.tsx).

## Intenção e contexto

Recuperar navegação quando URL não corresponde a tela.

Perfis/capacidades: público/autenticado. O menu não concede autoridade; sessão,
API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

Fontes de interface relacionadas: `src/app/layout.tsx` , `src/app/globals.css` ,
`src/app/design-system.css` , `src/components/live-session.tsx` ,
`src/components/workspace-sync.tsx` , `src/theme/providers.tsx` ,
`src/theme/tokens.css` , `src/components/layout/workspace-context.tsx` ,
`src/components/layout/workspace-shell.tsx` , `src/components/ui/primitives.tsx`
, `src/components/notifications/notification-bell.tsx` ,
`src/components/workspace.tsx` , `src/components/auth/logout-button.tsx` ,
`src/components/navigation/workspace-navigation.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

HTTP 404 preserva separação de recurso inexistente.

## Atritos e contraditório

Página padrão observada em inglês, sem main próprio e sem CTA contextual; shell
aparece sem orientação.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Página em português com voltar, início/entrar e preservação do retorno seguro;
nunca revelar existência privada.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, not-found](../evidence/b11-public-not-found-390.png): top
908/908 source pixels; navegação e leitura, comandos não confirmados.

Fallback global de exceção não induzido por crash de produção.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-006.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [not-found](../evidence/b11-public-not-found-390.png): public; 390;
READY_VIEW_STATE. top 908/908 source pixels.

Campos deste consumidor: FLD-0133. Controles de ação relacionados: 0 callsites;
inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-TEXT-003](../12_FINDINGS_MASTER.md#b1-text-003) —
Página pública desconhecida cai em mensagem inglesa sem caminho de recuperação.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
