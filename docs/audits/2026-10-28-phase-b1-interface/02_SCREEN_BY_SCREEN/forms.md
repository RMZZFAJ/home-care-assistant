# SC-008 — Central de fichas

Rota: `/fichas` . Situação: ACTIVE.
Fonte principal:
[src/components/documents/forms-hub.tsx](../../../../src/components/documents/forms-hub.tsx)
.

## Intenção e contexto

Descobrir a ficha apropriada e consultar histórico.

Perfis/capacidades: leitura/criação por tipo. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 43; **Controle:** Link; **Texto/nome ou expressão:** Consultar
programação e contagem; **Pré-condição e efeito verificável:** "/balancos".
- **Linha:** 47; **Controle:** Link; **Texto/nome ou expressão:** Nova ficha
&lt;Icon name="plus" width="16" /&gt;; **Pré-condição e efeito verificável:**
{"/fichas/" + type.toLowerCase()}.
- **Linha:** 54; **Controle:** Link; **Texto/nome ou expressão:** Consultar
histórico; **Pré-condição e efeito verificável:** {"/historico?type=" + type}.

Fontes de interface relacionadas: `src/components/documents/forms-hub.tsx` ,
`src/components/workspace.tsx` , `src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Explica REQ/COM/ENT/BAL e filtra capacidades; BAL conduz ao acompanhamento.

## Atritos e contraditório

COM nomeado compra apesar de aceitar doação; Nova ficha repetido exige contexto
do card; muito espaço vertical no móvel.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Usar verbo de tarefa por tipo e comparar densidade mantendo significado.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, forms](../evidence/b11-adminA-forms-390.png): top 1030/1254
source pixels; navegação e leitura, comandos não confirmados.

Não inferir que todos os leitores podem criar.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-008.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [forms](../evidence/b11-adminA-forms-390.png): adminA; 390; READY_VIEW_STATE.
top 1030/1254 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 3 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
