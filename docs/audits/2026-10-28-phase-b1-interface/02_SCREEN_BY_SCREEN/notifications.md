# SC-037 — Central de notificações

Rota: `/notificacoes` . Situação: ACTIVE.
Fonte principal:
[src/components/notifications/notification-center.tsx](../../../../src/components/notifications/notification-center.tsx)
.

## Intenção e contexto

Reencontrar aviso e abrir tarefa relacionada; marcar vista independente de
provedor.

Perfis/capacidades: identidade; contexto autorizado. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 78; **Controle:** button; **Texto/nome ou expressão:** Atualizar;
**Pré-condição e efeito verificável:** {loading}.
- **Linha:** 89; **Controle:** Checkbox; **Texto/nome ou expressão:** "Somente
não vistas"; **Pré-condição e efeito verificável:** Consultar ramo condicional
na fonte.
- **Linha:** 136; **Controle:** Link; **Texto/nome ou expressão:** Abrir
documento; **Pré-condição e efeito verificável:** {notificationHref(row)}.
- **Linha:** 141; **Controle:** button; **Texto/nome ou expressão:** Marcar como
vista; **Pré-condição e efeito verificável:** {async () => { try { await
api("/api/notifications", { id: row.id }); setAttempt((value) => value + 1); }
catch (rea.
- **Linha:** 177; **Controle:** button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {page === 1 || loading}.
- **Linha:** 190; **Controle:** button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {page * 20 >= total || loading}.

Fontes de interface relacionadas:
`src/components/notifications/notification-center.tsx` ,
`src/components/workspace.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Paginação, somente não vistas, estados interno/externo distintos.

## Atritos e contraditório

Abrir documento também rotula ocorrência/escala; lista pode mostrar vazio com
erro; marcar vista sem busy por linha repete clique.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

CTA por tipo de alvo, erro sem ausência afirmada, feedback por linha e link para
preferências pessoais.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, notifications](../evidence/b11-adminA-notifications-390.png):
top 1030/3722 source pixels; navegação e leitura, comandos não confirmados.

Não confundir vista no app com ciência ou leitura de WhatsApp.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-037.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [notifications](../evidence/b11-adminA-notifications-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/3722 source pixels.

Campos deste consumidor: FLD-0134. Controles de ação relacionados: 6 callsites;
inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-NAV-001](../12_FINDINGS_MASTER.md#b1-nav-001) —
Alguns nomes de destino não correspondem à tarefa aberta;
[B1-ERR-002](../12_FINDINGS_MASTER.md#b1-err-002) — Adaptador de erro mistura
recuperação de leitura com resultado incerto de escrita;
[B1-STATE-001](../12_FINDINGS_MASTER.md#b1-state-001) — Consultas sem estado
próprio afirmam vazio/configuração ausente antes do resultado.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
