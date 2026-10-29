# SC-001 — Visão geral

Rota: `/` . Situação: ACTIVE.
Fonte principal:
[src/components/dashboard.tsx](../../../../src/components/dashboard.tsx).

## Intenção e contexto

Priorizar o trabalho atual e permitir reconsulta por documento.

Perfis/capacidades: seis perfis por capacidades. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 27; **Controle:** Button; **Texto/nome ou expressão:** Tentar
novamente; **Pré-condição e efeito verificável:** {() => setAttempt((value) =>
value + 1)}.

Fontes de interface relacionadas: `src/components/dashboard.tsx` ,
`src/components/workspace.tsx` , `src/components/ui/primitives.tsx` ,
`src/components/dashboard/management-dashboard.tsx` ,
`src/components/dashboard/metric-card.tsx` ,
`src/components/dashboard/task-list.tsx` ,
`src/components/dashboard/dashboard-summary.tsx` ,
`src/components/documents/document-history.tsx` ,
`src/components/dashboard/operations-dashboard.tsx` ,
`src/components/dashboard/global-dashboard.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Tarefas têm destino; painel operacional difere da gestão; contexto explícito;
não promete presença.

## Atritos e contraditório

Lista de tarefas resumida em quatro entradas pode ocultar a extensão da fila; o
profissional sem tarefa vê um bloco vazio grande antes da ação principal.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Mostrar total da fila e acesso a todas as tarefas pertinentes; reduzir o vazio
em rotinas sem pendência, mediante teste humano.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, dashboard](../evidence/b11-adminA-dashboard-390.png): top
1030/1807 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 320px, dashboard](../evidence/b11-adminA-dashboard-320.png): top
1030/1967 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 768px, dashboard](../evidence/b11-adminA-dashboard-768.png): top
1393/1393 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 1440px, dashboard](../evidence/b11-adminA-dashboard-1440.png): top
1273/1273 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 1920px, dashboard](../evidence/b11-adminA-dashboard-1920.png): top
1273/1273 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, dashboard](../evidence/b11-professional-dashboard-390.png)
: top 1030/1316 source pixels; navegação e leitura, comandos não confirmados
- [professional, 320px, dashboard](../evidence/b11-professional-dashboard-320.png)
: top 1030/1461 source pixels; navegação e leitura, comandos não confirmados
- [professional, 768px, dashboard](../evidence/b11-professional-dashboard-768.png)
: top 1261/1261 source pixels; navegação e leitura, comandos não confirmados
- [professional, 1440px, dashboard](../evidence/b11-professional-dashboard-1440.png)
: top 1261/1261 source pixels; navegação e leitura, comandos não confirmados
- [professional, 1920px, dashboard](../evidence/b11-professional-dashboard-1920.png)
: top 1261/1261 source pixels; navegação e leitura, comandos não confirmados.

- [supervisor, 390px, dashboard](../evidence/b11-supervisor-dashboard-390.png):
top 1030/1455 source pixels; navegação e leitura, comandos não confirmados.
- [family, 390px, dashboard](../evidence/b11-family-dashboard-390.png): top
1030/1807 source pixels; navegação e leitura, comandos não confirmados.
- [reader, 390px, dashboard](../evidence/b11-reader-dashboard-390.png): top
1030/1490 source pixels; navegação e leitura, comandos não confirmados.
- [global, 390px, dashboard](../evidence/b11-global-dashboard-390.png): top
1030/8964 source pixels; navegação e leitura, comandos não confirmados.

Ordenação percebida, atualização temporal real e compreensão humana não
homologadas.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-001.

25 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [dashboard](../evidence/b11-adminA-dashboard-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/1807 source pixels.
- [dashboard](../evidence/b11-adminA-dashboard-320.png): adminA; 320;
READY_VIEW_STATE. top 1030/1967 source pixels.
- [dashboard](../evidence/b11-adminA-dashboard-768.png): adminA; 768;
READY_VIEW_STATE. top 1393/1393 source pixels.
- [dashboard](../evidence/b11-adminA-dashboard-1440.png): adminA; 1440;
READY_VIEW_STATE. top 1273/1273 source pixels.
- [dashboard](../evidence/b11-adminA-dashboard-1920.png): adminA; 1920;
READY_VIEW_STATE. top 1273/1273 source pixels.
- [dashboard](../evidence/b11-professional-dashboard-390.png): professional;
390; READY_VIEW_STATE. top 1030/1316 source pixels.
- [dashboard](../evidence/b11-professional-dashboard-320.png): professional;
320; READY_VIEW_STATE. top 1030/1461 source pixels.
- [dashboard](../evidence/b11-professional-dashboard-768.png): professional;
768; READY_VIEW_STATE. top 1261/1261 source pixels.
- [dashboard](../evidence/b11-professional-dashboard-1440.png): professional;
1440; READY_VIEW_STATE. top 1261/1261 source pixels.
- [dashboard](../evidence/b11-professional-dashboard-1920.png): professional;
1920; READY_VIEW_STATE. top 1261/1261 source pixels.
- [dashboard](../evidence/b11-supervisor-dashboard-390.png): supervisor; 390;
READY_VIEW_STATE. top 1030/1455 source pixels.
- [dashboard](../evidence/b11-family-dashboard-390.png): family; 390;
READY_VIEW_STATE. top 1030/1807 source pixels.
- [dashboard](../evidence/b11-reader-dashboard-390.png): reader; 390;
READY_VIEW_STATE. top 1030/1490 source pixels.
- [dashboard](../evidence/b11-global-dashboard-390.png): global; 390;
READY_VIEW_STATE. top 1030/8964 source pixels.
- [profile-menu](../evidence/b11-supplement-adminA-profile-menu.png): adminA;
390; READY. top 844/844 source pixels.
- [context-menu](../evidence/b11-supplement-adminA-context-menu.png): adminA;
390; READY. top 844/844 source pixels.
- [notification-bell](../evidence/b11-supplement-adminA-notification-bell.png):
adminA; 390; READY. top 844/844 source pixels.
- [dashboard-320](../evidence/b12-visual-adminA-dashboard-320.png): adminA;
320; READY. top 844 of 844px; scaled to 360x650.
- [dashboard-390](../evidence/b12-visual-adminA-dashboard-390.png): adminA;
390; READY. top 844 of 844px; scaled to 360x650.
- [dashboard-768](../evidence/b12-visual-adminA-dashboard-768.png): adminA;
768; READY. top 950 of 1000px; scaled to 360x650.
- [dashboard-1440](../evidence/b12-visual-adminA-dashboard-1440.png): adminA;
1440; READY. Original image opened; full viewport/image as displayed.
- [dashboard-1920](../evidence/b12-visual-adminA-dashboard-1920.png): adminA;
1920; READY. top 950 of 1000px; scaled to 360x650.
- [bell-pending](../evidence/b15-states-adminA-bell-pending.png): adminA; 390;
LOADING. top 844 of 844px; scaled to 360x650.
- [bell-error](../evidence/b15-states-adminA-bell-error.png): adminA; 390;
ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.

[offline-cached-dashboard](../evidence/b15-states-professional-offline-cached-dashboard.png)
: professional; 390; OFFLINE. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0108; FLD-0109; FLD-0110; FLD-0111; FLD-0112.
Controles de ação relacionados: 1 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-ERR-002](../12_FINDINGS_MASTER.md#b1-err-002) —
Adaptador de erro mistura recuperação de leitura com resultado incerto de
escrita; [B1-STATE-005](../12_FINDINGS_MASTER.md#b1-state-005) — Leitura sem
rede mantém aparência atual sem indicação visível de desatualização;
[B1-VIS-001](../12_FINDINGS_MASTER.md#b1-vis-001) — Fundação visual precisa de
consolidação orientada pelo resultado, com exceções explícitas.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
