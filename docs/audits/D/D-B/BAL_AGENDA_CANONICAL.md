# Balanços e agenda — fechamento local de 06.3

D3.82 conclui as nove composições BAL/ESC previstas no ponto06.3, no escopo
local. A etapa06 continua com06.4–06.6 e a conferência conjunta pendentes.
[Resultados dirigidos](BAL_AGENDA_CANONICAL_VALIDATION.json).

| Composição C8 | Implementação conferida |
| --- | --- |
| BAL-01 Organizar contagens | Programação, responsabilidade e fatos próprios. |
| BAL-02 Contar materiais | Campos físicos vazios e revisão separada. |
| BAL-03 Consultar/revisar | Autoria, notas, referência e parecer distintos. |
| BAL-04 Designar reconto | Contagem anterior, alvo e adoção explícita. |
| BAL-05 Decidir adiamento | Destino congelado, comparação e decisão própria. |
| ESC-01 Consultar escala | Calendário/lista, período completo e ações reais. |
| ESC-02 Preparar série | Tipo, datas, duração, fuso e prévia preservados. |
| ESC-03 Decidir alteração | Antes/depois completos e versão apresentada. |
| ESC-04 Alterar ocorrência | Edição e intenção retomadas em outra sessão. |

BalanceMaterials usa a tabela/cartão comum com busca reversível. Quantidade
física, referência original e diferença mantêm unidade e precisão decimal.
Ausência de referência não vira zero nem diferença calculada. A observação
inicial continua sem saldo teórico e exige zero digitado explicitamente.
Programação, responsabilidade, referência consultada e fatos dos adiamentos
usam DefinitionGrid, preservando autores, instantes, versões e motivos.

ScheduleShift usa pessoa, tipo, intervalo completo, fuso, situação, notas e
ação nativa. O celular segue o registro do modelo. O calendário, inventariado
mas representado parcialmente no HTML, conserva sete colunas e todo o período;
rolagem horizontal fica no contêiner acessível por teclado. Antes/depois e
revisões usam a grade compartilhada. As regras antigas desses cartões e da
contagem foram removidas do CSS de tokens; a fonte visual é canonical-ui.css.

## Qualificação e contraprovas

Foram qualificados46 cenários distintos, sem contar repetições:30 aprovações
iniciais inalteradas, sete da segunda rodada, oito da terceira e uma final.
Os42 casos iniciais percorrem três perfis. Quatro consumidores adicionais
foram conferidos em Chromium; os componentes compartilhados têm comparação
nos três perfis. Passaram também três unitários, tipos e lint dos afetados.

Os casos preservam autenticação real, referência própria sem permissão de
saldo geral, autoria da contagem anterior, revisão facultativa, reconto,
conflito, adoção explícita, confirmação perdida, prazos, saldo e versões.
A alteração de plantão retomada em outra sessão aplica a intenção revisada.
Asserções nativas de documentos e movimentos continuam presentes.

As cinco larguras320/390/768/1024/1440px comparam a tabela/cartão e o registro
ao HTML isolado, sem rede. Axe permanece completo; teclado, nomes extensos,
cores forçadas e movimento reduzido foram conferidos. As capturas320 de
material e agenda foram inspecionadas, com rolagem real e hit-test, sem ocultar
navegação ou modificar CSS para capturar.

As três rodadas anteriores permanecem nos artefatos ignorados. Seletores
antigos esperavam texto corrido; agora conferem célula ou par rótulo/valor.
A comparação de um cartão final usa a mesma posição final do modelo. A
geometria de reconto usa rolagem real, limites completos e hit-tests nas bordas
úteis do campo/opção; considera o gatilho próprio do controle e seus cantos
arredondados. Isso evita a razão arredondada do IntersectionObserver, mantendo
a exigência de controle visível e desobstruído. Nenhum timeout foi ampliado.

## Banco e limites

Sem SQL novo. O remoto autorizado permanece em207 migrations; dry-run final
vazio, sem sincronização do Vault, reset, Auth ou fixtures remotas. Não foi
necessário repetir instalação limpa/evolução legada por estas mudanças de UI;
essas verificações continuam na CI do SHA publicado.

Os105 estados originais permanecem57PASS/48PARTIAL, e os18 estados de UI foram
preservados. A estimativa visual global75% não aprova individualmente as66
composições. DOC-A/B/C/D têm blocos próprios: a nova separação integral entre
parecer BAL e efeito de estoque permanece em DOC-B. Os testes deste incremento
preservam o comportamento nativo anterior, sem duplicar movimentos.

Conferência conjunta, AT, zoom nativo400%, aparelho físico e provedores mantêm
seus gates. Sonar permanece OWNER_DEFERRED_SONAR_CONFIGURATION, sem aprovação
do Quality Gate. PR7 Draft; sem merge ou produção. Próximo:06.4, estoque,
catálogo e consumo.
