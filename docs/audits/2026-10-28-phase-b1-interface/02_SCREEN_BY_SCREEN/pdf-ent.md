# SC-047 — PDF ENT

Rota: `/api/documents/[id]/pdf (ENT)`. Situação: DOCUMENT_INTERFACE.
Fonte principal: [src/lib/server/operational-pdf.ts](../../../../src/lib/server/operational-pdf.ts).

## Intenção e contexto

Conferir expedição e estados de recebimento.

Perfis/capacidades: ent.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |


Fontes de interface relacionadas: .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Identifica destinatário e snapshot; quantidades e trilha visíveis; nenhum corte neste cenário.

## Atritos e contraditório

Versão expedida não prova recebimento posterior; estrutura acessível ausente no arquivo.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Destacar situação e data da versão; instruir reconsulta atual sem desvalorizar validade histórica.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

Renderização desta variante: **NOT_VERIFIED** até exploração suplementar.

Não confundir arquivo expedido com confirmação; recibos de novos estados e impressão NOT_VERIFIED.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
