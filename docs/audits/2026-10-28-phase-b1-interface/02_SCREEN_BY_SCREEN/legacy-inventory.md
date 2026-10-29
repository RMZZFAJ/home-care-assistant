# SC-042 — Compatibilidade inventários

Rota: `/inventarios`. Situação: REDIRECT.
Fonte principal: [src/app/inventarios/page.tsx](../../../../src/app/inventarios/page.tsx).

## Intenção e contexto

Levar URLs antigas ao histórico BAL.

Perfis/capacidades: bal.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |


Fontes de interface relacionadas: `src/app/inventarios/page.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Redirect explícito mantém contratos sem ativar console aposentado.

## Atritos e contraditório

Destino é histórico, não contagem; pessoa que busca iniciar inventário precisa nova orientação.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Preservar URL e oferecer ação de balanço conforme capacidade no destino vazio.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, legacy-inventory](../evidence/b11-adminA-legacy-inventory-390.png): top 1030/1156 source pixels; navegação e leitura, comandos não confirmados.

InventoryConsole não tem consumidor demonstrado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
