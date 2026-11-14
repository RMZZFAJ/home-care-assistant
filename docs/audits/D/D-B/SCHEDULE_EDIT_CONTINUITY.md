# D3.53 — continuidade da edição de plantões

Ao trocar de Alterar/substituir para Cancelar por ausência e voltar, os campos
condicionais eram desmontados. Profissional, início, fim e observações usavam
valores iniciais e perdiam a edição. Agora pertencem ao estado do formulário;
a justificativa continua mantida. Trocar a operação não envia comando.

A revisão já mantinha o formulário montado, oculto e inerte; essa propriedade
foi preservada e recebeu regressão de retorno e foco. Não foi atribuída à
revisão uma perda que ocorria na alternância de operação.

Outro problema confirmado no código era a conversão do minuto exibido para
um novo instante em qualquer alteração: editar somente observações zerava
segundos/frações e podia trocar o instante de uma hora repetida no fim do
horário de verão. Campo cujo minuto não foi alterado conserva a string do
instante nativo. Campo alterado continua usando o fuso do plantão e recusa
horário inexistente. A mensagem de horário inválido é associada ao início ou
fim efetivamente recusado. Não é uma nova regra de resolução de horas ambíguas.

A edição de tipo conserva segundos não nulos. O controle compartilhado aceita
segundos e mantém o comportamento de horários com minuto completo. Nenhum
comando, capacidade, regra nativa, revisão de origem, idempotência, cache ou
mecanismo de confirmação foi substituído.

## Validação dirigida

34 testes unitários dirigidos passaram, incluindo segundos/frações, os dois
instantes da hora repetida e a recusa de horário inexistente. Tipos e lint dos
fontes afetados passaram. A primeira checagem de tipos apontou somente um
estreitamento ausente no teste novo; corrigido e revalidado.

A primeira coorte teve 10/12 PASS. Os campos e a precisão foram preservados,
mas a nova regressão revelou foco incorreto em Chromium/Android ao reabrir a
revisão. A recuperação de foco do Base UI disputava o foco quando o botão de
origem ficava oculto. Agora a transição ancora o foco no diálogo antes de
ocultar o formulário; o título recebe foco depois da renderização. Não foi
adicionada espera arbitrária nem desativada a recuperação da biblioteca.

Recheck dos três casos afetados:3/3 PASS, nas três engines. São 12 identidades
distintas qualificadas:9 inalteradas da primeira coorte e3 do recheck, sem
contar repetições como cenários novos. Incluem alternância com todos os campos,
retorno/foco, revisão somente leitura, quatro larguras/axe, exceção de um
plantão, corte da série com12 ocorrências, precisão até microssegundos no
banco e dois consumidores de confirmação nativa após resposta perdida,
replay explícito, contexto indisponível, inatividade e recibo divergente.

Relatórios e falhas foram arquivados em output/phase-d-work/ui-canonical,
nas coortes schedule-edit-production e schedule-edit-focus. Os hashes dos
fontes ficaram iguais antes/depois de cada coorte. Nenhuma suíte mutável de
banco correu em paralelo. O runner conferiu a stack local e manteve envio
externo desligado. Chromium/Android/WebKit locais não são prova de S24 Ultra
físico nem homologação de produção. CI do SHA publicado continua gate.

## Limites e continuação

Este ajuste não implementa rascunhos remotos de recursos existentes da agenda.
Continuam pendentes as preparações de edição de tipo, alteração/proposta/cancelamento
de plantão, encerramento e aprovação/rejeição de séries, aprovação/rejeição e
encerramento de propostas de alteração, inclusive os motivos opcionais de
aprovação. O reconhecimento de uma decisão deve ser novo ao retomar.

Remoto conferido:196 migrations, última20261110154616, dry-run sem pendências.
Nenhuma migration foi criada neste lote. Sem reset, fixture ou Auth remoto,
backup pesado redundante, deploy manual ou alteração de produção.

Os 105 critérios e seus estados globais permanecem:56 PASS locais/49 PARTIAL.
Visual≈60%, formulários≈90%, recuperação≈85%, agenda privada≈35%. O quadro
temporário é atualizado antes do próximo lote. PR7 Draft, Sonar adiado,
produção NO-GO e meta ativa.
