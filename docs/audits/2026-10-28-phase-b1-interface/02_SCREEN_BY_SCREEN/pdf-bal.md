# SC-048 — PDF BAL

Rota: `/api/documents/[id]/pdf (BAL)` . Situação: DOCUMENT_INTERFACE.
Fonte principal:
[src/lib/server/operational-pdf.ts](../../../../src/lib/server/operational-pdf.ts)
.

## Intenção e contexto

Consultar uma contagem e sua trilha sem inferir consumo.

Perfis/capacidades: bal.read. O menu não concede autoridade; sessão, API e
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

Gerador compartilha protocolo, snapshots, paginação e hashes.

## Atritos e contraditório

Na primeira passada não havia BAL novo persistido. B1.6 gerou contagem real
local e PDF; ver reconciliação final.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Verificar PDF da contagem real após comando sintético autorizado, distinguindo
observado, referência e diferença.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

A primeira passada não tinha renderização desta variante; o estado final e as
lacunas estão abaixo.

BAL real foi contado em B1.6; PDF e oito páginas do conjunto foram
inspecionados. Não confundir com demo.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-048.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [current-BAL.pdf](../evidence/current-BAL.pdf): bal.read; A4 PDF render;
sizes in pdf-inspection.json; READY_PDF. All 2 rendered PDF pages opened.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 0 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-A11Y-001](../12_FINDINGS_MASTER.md#b1-a11y-001) —
PDFs não expõem idioma e estrutura de tags no arquivo examinado.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.

## Leitura documental específica

BAL v1 de contagem real local: pessoa/plantão, janela/fuso, semana vinculada e
quantidades10/2 aparecem antes da página de auditoria. Política desta fixture
aprovou automaticamente. Título PDF já é geral de estoque, contraprova do label
HTML semanal. Não confundir referência com contagem copiada nem inferir consumo
automático.

Idioma e tags ausentes são risco separado de aparência. Texto extraível não
certifica ordem de leitura. Arquivo curto não homologa paginação de100 linhas,
papel ou leitor de tela. Guardas de acesso e snapshots continuam a fonte de
verdade.
