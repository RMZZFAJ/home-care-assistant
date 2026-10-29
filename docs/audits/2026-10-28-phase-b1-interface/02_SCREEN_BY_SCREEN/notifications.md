# SC-037 — Central de notificações

Rota: `/notificacoes`. Situação: ACTIVE.
Fonte principal: [src/components/notifications/notification-center.tsx](../../../../src/components/notifications/notification-center.tsx).

## Intenção e contexto

Reencontrar aviso e abrir tarefa relacionada; marcar vista independente de provedor.

Perfis/capacidades: identidade; contexto autorizado. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 78 | button | Atualizar  | {loading} |
| 89 | Checkbox | "Somente não vistas" | Consultar ramo condicional na fonte |
| 136 | Link | Abrir documento  | {notificationHref(row)} |
| 141 | button | Marcar como vista  | {async () => {                     try {                       await api("/api/notifications", { id: row.id });                       setAttempt((value) => value + 1);                     } catch (rea |
| 177 | button | Anterior  | {page === 1 \|\| loading} |
| 190 | button | Próxima  | {page * 20 >= total \|\| loading} |

Fontes de interface relacionadas: `src/components/notifications/notification-center.tsx`, `src/components/workspace.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Paginação, somente não vistas, estados interno/externo distintos.

## Atritos e contraditório

Abrir documento também rotula ocorrência/escala; lista pode mostrar vazio com erro; marcar vista sem busy por linha repete clique.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

CTA por tipo de alvo, erro sem ausência afirmada, feedback por linha e link para preferências pessoais.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, notifications](../evidence/b11-adminA-notifications-390.png): top 1030/3722 source pixels; navegação e leitura, comandos não confirmados.

Não confundir vista no app com ciência ou leitura de WhatsApp.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
