# SC-045 — PDF REQ

Rota: `/api/documents/[id]/pdf (REQ)` . Situação: DOCUMENT_INTERFACE.
Fonte principal:
[src/lib/server/operational-pdf.ts](../../../../src/lib/server/operational-pdf.ts)
.

## Intenção e contexto

Reconsultar e imprimir uma requisição versionada.

Perfis/capacidades: req.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

Fontes de interface relacionadas: .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Duas páginas renderizadas sem corte no cenário de dois materiais; protocolo e
trilha presentes.

## Atritos e contraditório

Estoque observado não aparece no PDF; árvore de estrutura e idioma ausentes no
arquivo inspecionado.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Preservar estoque observado com unidade e marcar versão; estruturar PDF
acessível após prova com leitor.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

A primeira passada não tinha renderização desta variante; o estado final e as
lacunas estão abaixo.

QR físico, impressão e leitor de tela NOT_VERIFIED. PDF GET pode preparar recibo
sintético local.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-045.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [current-REQ.pdf](../evidence/current-REQ.pdf): req.read; A4 PDF render;
sizes in pdf-inspection.json; READY_PDF. All 2 rendered PDF pages opened.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 0 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-DOC-001](../12_FINDINGS_MASTER.md#b1-doc-001) — PDF
da REQ omite estoque observado presente na ficha;
[B1-A11Y-001](../12_FINDINGS_MASTER.md#b1-a11y-001) — PDFs não expõem idioma e
estrutura de tags no arquivo examinado.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.

## Leitura documental específica

REQ v3: duas páginas com protocolo, material, apresentação/prioridade,
atendimento, ciência e trilha. A ausência de quantidade solicitada está correta;
estoque observado não aparece na tabela, embora esteja no HTML. Comparar somente
a mesma versão. Nomes e dados desta prova são fictícios; nenhuma linha cortada
no caso de dois materiais.

Idioma e tags ausentes são risco separado de aparência. Texto extraível não
certifica ordem de leitura. Arquivo curto não homologa paginação de100 linhas,
papel ou leitor de tela. Guardas de acesso e snapshots continuam a fonte de
verdade.
