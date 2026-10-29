# SC-017 — Estoque da equipe

Rota: `/estoque?custody=CARE_TEAM` . Situação: ACTIVE.
Fonte principal:
[src/components/stock/stock-overview.tsx](../../../../src/components/stock/stock-overview.tsx)
.

## Intenção e contexto

Consultar saldo da equipe separado de previsões.

Perfis/capacidades: stock.team.read. O menu não concede autoridade; sessão, API
e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 20; **Controle:** Button; **Texto/nome ou expressão:** {"Consultar
" + product.name + " · " + labels[key]}; **Pré-condição e efeito
verificável:** {(event) => open(product.productId, key, event.currentTarget)}.
- **Linha:** 21; **Controle:** Button; **Texto/nome ou expressão:** {"Consultar
" + product.name + " · " + labels[key]}; **Pré-condição e efeito
verificável:** {(event) => open(product.productId, key, event.currentTarget)}.
- **Linha:** 22; **Controle:** Button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {currentPage <= 1}.
- **Linha:** 22; **Controle:** Button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {currentPage * 15 >= rows.length}.

Fontes de interface relacionadas: `src/components/stock/stock-overview.tsx` ,
`src/components/forms/record-drawer.tsx` , `src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Mobile troca tabela por cards; detalhe explica previsão e extraordinário
confirmado em 30 dias.

## Atritos e contraditório

Cada linha exige scroll; rótulo No mínimo no desktop também cobre abaixo; data
de atualização do saldo não visível.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Comparação da hierarquia confirmado/previsão, texto No mínimo ou abaixo e marca
de leitura atual.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, stock-team](../evidence/b11-adminA-stock-team-390.png): top
1030/3881 source pixels; navegação e leitura, comandos não confirmados.

Não oferecer movimento direto de saldo da equipe nem interpretar BAL como
consumo.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-040 — {selected.product.name + " · " + labels[selected.custody]}

Componente RecordDrawer, origem `src/components/stock/stock-overview.tsx:23` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Cada linha exige scroll; rótulo No mínimo no desktop também cobre abaixo; data
de atualização do saldo não visível.
Preservar: Mobile troca tabela por cards; detalhe explica previsão e
extraordinário confirmado em 30 dias.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-017.

2 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [stock-team](../evidence/b11-adminA-stock-team-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/3881 source pixels.
- [stock-details](../evidence/b11-supplement-adminA-stock-details.png): adminA;
390; READY. top 844/844 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 4 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
