# SC-045 — PDF REQ

Rota: `/api/documents/[id]/pdf (REQ)`. Situação: DOCUMENT_INTERFACE.
Fonte principal: [src/lib/server/operational-pdf.ts](../../../../src/lib/server/operational-pdf.ts).

## Intenção e contexto

Reconsultar e imprimir uma requisição versionada.

Perfis/capacidades: req.read. O menu não concede autoridade; sessão, API e
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

Duas páginas renderizadas sem corte no cenário de dois materiais; protocolo e trilha presentes.

## Atritos e contraditório

Estoque observado não aparece no PDF; árvore de estrutura e idioma ausentes no arquivo inspecionado.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Preservar estoque observado com unidade e marcar versão; estruturar PDF acessível após prova com leitor.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

Renderização desta variante: **NOT_VERIFIED** até exploração suplementar.

QR físico, impressão e leitor de tela NOT_VERIFIED. PDF GET pode preparar recibo sintético local.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
