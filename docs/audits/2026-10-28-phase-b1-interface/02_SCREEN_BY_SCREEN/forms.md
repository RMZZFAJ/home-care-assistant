# SC-008 — Central de fichas

Rota: `/fichas`. Situação: ACTIVE.
Fonte principal: [src/components/documents/forms-hub.tsx](../../../../src/components/documents/forms-hub.tsx).

## Intenção e contexto

Descobrir a ficha apropriada e consultar histórico.

Perfis/capacidades: leitura/criação por tipo. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 43 | Link | Consultar programação e contagem | "/balancos" |
| 47 | Link | Nova ficha <Icon name="plus" width="16" />  | {"/fichas/" + type.toLowerCase()} |
| 54 | Link | Consultar histórico  | {"/historico?type=" + type} |

Fontes de interface relacionadas: `src/components/documents/forms-hub.tsx`, `src/components/workspace.tsx`, `src/components/ui/primitives.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Explica REQ/COM/ENT/BAL e filtra capacidades; BAL conduz ao acompanhamento.

## Atritos e contraditório

COM nomeado compra apesar de aceitar doação; Nova ficha repetido exige contexto do card; muito espaço vertical no móvel.

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

- [adminA, 390px, forms](../evidence/b11-adminA-forms-390.png): top 1030/1254 source pixels; navegação e leitura, comandos não confirmados.

Não inferir que todos os leitores podem criar.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
