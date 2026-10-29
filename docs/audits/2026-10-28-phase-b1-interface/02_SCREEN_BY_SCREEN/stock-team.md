# SC-017 — Estoque da equipe

Rota: `/estoque?custody=CARE_TEAM`. Situação: ACTIVE.
Fonte principal: [src/components/stock/stock-overview.tsx](../../../../src/components/stock/stock-overview.tsx).

## Intenção e contexto

Consultar saldo da equipe separado de previsões.

Perfis/capacidades: stock.team.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 20 | Button | {"Consultar " + product.name + " · " + labels[key]} | {(event) => open(product.productId, key, event.currentTarget)} |
| 21 | Button | {"Consultar " + product.name + " · " + labels[key]} | {(event) => open(product.productId, key, event.currentTarget)} |
| 22 | Button | Anterior | {currentPage <= 1} |
| 22 | Button | Próxima | {currentPage * 15 >= rows.length} |

Fontes de interface relacionadas: `src/components/stock/stock-overview.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/ui/primitives.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Mobile troca tabela por cards; detalhe explica previsão e extraordinário confirmado em 30 dias.

## Atritos e contraditório

Cada linha exige scroll; rótulo No mínimo no desktop também cobre abaixo; data de atualização do saldo não visível.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Comparação da hierarquia confirmado/previsão, texto No mínimo ou abaixo e marca de leitura atual.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, stock-team](../evidence/b11-adminA-stock-team-390.png): top 1030/3881 source pixels; navegação e leitura, comandos não confirmados.

Não oferecer movimento direto de saldo da equipe nem interpretar BAL como consumo.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-040 — {selected.product.name + " · " + labels[selected.custody]}

Componente RecordDrawer, origem `src/components/stock/stock-overview.tsx:23`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Cada linha exige scroll; rótulo No mínimo no desktop também cobre abaixo; data de atualização do saldo não visível.
Preservar: Mobile troca tabela por cards; detalhe explica previsão e extraordinário confirmado em 30 dias.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
