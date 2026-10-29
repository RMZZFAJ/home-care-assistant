# SC-001 — Visão geral

Rota: `/`. Situação: ACTIVE.
Fonte principal: [src/components/dashboard.tsx](../../../../src/components/dashboard.tsx).

## Intenção e contexto

Priorizar o trabalho atual e permitir reconsulta por documento.

Perfis/capacidades: seis perfis por capacidades. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 27 | Button | Tentar novamente | {() => setAttempt((value) => value + 1)} |

Fontes de interface relacionadas: `src/components/dashboard.tsx`, `src/components/workspace.tsx`, `src/components/ui/primitives.tsx`, `src/components/dashboard/management-dashboard.tsx`, `src/components/dashboard/metric-card.tsx`, `src/components/dashboard/task-list.tsx`, `src/components/dashboard/dashboard-summary.tsx`, `src/components/documents/document-history.tsx`, `src/components/dashboard/operations-dashboard.tsx`, `src/components/dashboard/global-dashboard.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Tarefas têm destino; painel operacional difere da gestão; contexto explícito; não promete presença.

## Atritos e contraditório

Lista de tarefas resumida em quatro entradas pode ocultar a extensão da fila; o profissional sem tarefa vê um bloco vazio grande antes da ação principal.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Mostrar total da fila e acesso a todas as tarefas pertinentes; reduzir o vazio em rotinas sem pendência, mediante teste humano.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, dashboard](../evidence/b11-adminA-dashboard-390.png): top 1030/1807 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 320px, dashboard](../evidence/b11-adminA-dashboard-320.png): top 1030/1967 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 768px, dashboard](../evidence/b11-adminA-dashboard-768.png): top 1393/1393 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 1440px, dashboard](../evidence/b11-adminA-dashboard-1440.png): top 1273/1273 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 1920px, dashboard](../evidence/b11-adminA-dashboard-1920.png): top 1273/1273 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, dashboard](../evidence/b11-professional-dashboard-390.png): top 1030/1316 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 320px, dashboard](../evidence/b11-professional-dashboard-320.png): top 1030/1461 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 768px, dashboard](../evidence/b11-professional-dashboard-768.png): top 1261/1261 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 1440px, dashboard](../evidence/b11-professional-dashboard-1440.png): top 1261/1261 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 1920px, dashboard](../evidence/b11-professional-dashboard-1920.png): top 1261/1261 source pixels; navegação e leitura, comandos não confirmados.
- [supervisor, 390px, dashboard](../evidence/b11-supervisor-dashboard-390.png): top 1030/1455 source pixels; navegação e leitura, comandos não confirmados.
- [family, 390px, dashboard](../evidence/b11-family-dashboard-390.png): top 1030/1807 source pixels; navegação e leitura, comandos não confirmados.
- [reader, 390px, dashboard](../evidence/b11-reader-dashboard-390.png): top 1030/1490 source pixels; navegação e leitura, comandos não confirmados.
- [global, 390px, dashboard](../evidence/b11-global-dashboard-390.png): top 1030/8964 source pixels; navegação e leitura, comandos não confirmados.

Ordenação percebida, atualização temporal real e compreensão humana não homologadas.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
