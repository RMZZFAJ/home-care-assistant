# SC-018 — Materiais em trânsito

Rota: `/estoque?custody=TRANSIT` . Situação: ACTIVE.
Fonte principal:
[src/components/stock/transit-stock.tsx](../../../../src/components/stock/transit-stock.tsx)
.

## Intenção e contexto

Localizar expedições ainda sem conferência/resolução.

Perfis/capacidades: ent.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 51; **Controle:** Link; **Texto/nome ou expressão:** {doc.code};
**Pré-condição e efeito verificável:** {"/fichas/" + doc.id}.

Fontes de interface relacionadas: `src/components/stock/transit-stock.tsx` ,
`src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Expedido, aceito, conciliado e pendente separados; documento é acessível por
link.

## Atritos e contraditório

Histórico auditável de trânsito exibe Produto porque resolve nome pelo overview
vazio; busca sem match afirma nenhuma entrega em trânsito.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resolver nome autorizado do ledger e distinguir nenhum resultado da busca de
trânsito inexistente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, stock-transit](../evidence/b11-adminA-stock-transit-390.png):
top 1030/1401 source pixels; navegação e leitura, comandos não confirmados.

Não afirmar saldo negativo ou perda de dados por essa deficiência de
apresentação.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-018.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [stock-transit](../evidence/b11-adminA-stock-transit-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/1401 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 1 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
