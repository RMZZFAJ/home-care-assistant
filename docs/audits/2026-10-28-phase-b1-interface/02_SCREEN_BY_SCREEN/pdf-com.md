# SC-046 — PDF COM

Rota: `/api/documents/[id]/pdf (COM)`. Situação: DOCUMENT_INTERFACE.
Fonte principal: [src/lib/server/operational-pdf.ts](../../../../src/lib/server/operational-pdf.ts).

## Intenção e contexto

Conferir a aquisição e seus itens sem declarar entrega.

Perfis/capacidades: com.read. O menu não concede autoridade; sessão, API e
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

Origem privada autorizada, hash e cadeia de eventos; dois materiais sem corte nas duas páginas.

## Atritos e contraditório

Título Compra na COM de doação pode exigir leitura de notas para entender origem; PDF não tem idioma/estrutura.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Título e resumo com origem Compra ou Doação; manter COM distinta de ENT e estoque confirmado.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

Renderização desta variante: **NOT_VERIFIED** até exploração suplementar.

Impressão, cenários de cem itens e tecnologia assistiva NOT_VERIFIED.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
