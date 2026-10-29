# SC-042 — Compatibilidade inventários

Rota: `/inventarios` . Situação: REDIRECT.
Fonte principal:
[src/app/inventarios/page.tsx](../../../../src/app/inventarios/page.tsx).

## Intenção e contexto

Levar URLs antigas ao histórico BAL.

Perfis/capacidades: bal.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

Fontes de interface relacionadas: `src/app/inventarios/page.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Redirect explícito mantém contratos sem ativar console aposentado.

## Atritos e contraditório

Destino é histórico, não contagem; pessoa que busca iniciar inventário precisa
nova orientação.

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

- [adminA, 390px, legacy-inventory](../evidence/b11-adminA-legacy-inventory-390.png)
: top 1030/1156 source pixels; navegação e leitura, comandos não confirmados.

InventoryConsole não tem consumidor demonstrado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-042.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [legacy-inventory](../evidence/b11-adminA-legacy-inventory-390.png): adminA;
390; READY_VIEW_STATE. top 1030/1156 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 0 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
