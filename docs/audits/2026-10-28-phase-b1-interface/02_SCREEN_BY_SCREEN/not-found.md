# SC-006 — Página inexistente

Rota: `/_not-found`. Situação: ACTIVE.
Fonte principal: [src/app/layout.tsx](../../../../src/app/layout.tsx).

## Intenção e contexto

Recuperar navegação quando URL não corresponde a tela.

Perfis/capacidades: público/autenticado. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |


Fontes de interface relacionadas: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/design-system.css`, `src/components/live-session.tsx`, `src/components/workspace-sync.tsx`, `src/theme/providers.tsx`, `src/theme/tokens.css`, `src/components/layout/workspace-context.tsx`, `src/components/layout/workspace-shell.tsx`, `src/components/ui/primitives.tsx`, `src/components/notifications/notification-bell.tsx`, `src/components/workspace.tsx`, `src/components/auth/logout-button.tsx`, `src/components/navigation/workspace-navigation.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

HTTP 404 preserva separação de recurso inexistente.

## Atritos e contraditório

Página padrão observada em inglês, sem main próprio e sem CTA contextual; shell aparece sem orientação.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Página em português com voltar, início/entrar e preservação do retorno seguro; nunca revelar existência privada.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, not-found](../evidence/b11-public-not-found-390.png): top 908/908 source pixels; navegação e leitura, comandos não confirmados.

Fallback global de exceção não induzido por crash de produção.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
