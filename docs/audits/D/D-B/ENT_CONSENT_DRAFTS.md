# Consentimento ENT e recuperação pessoal após encerramento

D3.37, baseadc4353. [Provas dirigidas](ENT_CONSENT_DRAFTS_VALIDATION.json),
[reconciliação remota](ENT_CONSENT_DRAFTS_REMOTE.json),
[CI anterior](CI_ADC4353_OBSERVATION.json). Incremento operacional; D-B continua
em execução, com PR7 Draft e produção NO-GO.

## Comportamento implementado

Consentimento de cancelamento ENT usa o kernel privado existente. Preserva
devoluções digitadas, inclusive incompletas, motivo, materiais, pedido e hash
da fonte consultada. O preenchimento não copia o conjunto de movimentos de
consumo. Salvar não altera documento, estoque ou alocações. Retomada exige ação
explícita do próprio usuário; outro administrador não recebe seu rascunho.

Consumo confirmado pode mudar sem incrementar a versão da ENT. A revisão
privada vincula pedido, hash e devolução de cada linha ao corpo confirmado.
O RPC oficial existente continua validando a fonte e executando a reconciliação
na mesma transação. Divergência, falta ou duplicação de linha, mudança da fonte
e perda de autoridade negam o ato; não geram conciliação parcial.

Comparação consulta novamente com Auth e confere documento, paciente, versão,
pedido, hash, linhas e campos obrigatórios. Erro,403,200 inválido e fonte sem
acesso impedem adoção e suprimem os fatos de consumo anteriormente consultados.
O usuário adota expressamente a referência atual; suas devoluções e motivo
continuam preservados para nova revisão. Isso não confirma o consentimento.

Em Mais, a consulta pessoal dos sete propósitos COM e oito ENT permanece
disponível após a operação desaparecer ou a ficha encerrar. Permite consultar
preenchimento próprio, descartá-lo ou reconhecer resultado aplicado. Sem ação
oficial disponível, não exibe o formulário de confirmação. Resposta perdida,
reload e reconhecimento não produzem outro POST oficial ou estoque duplicado.
Criação, revisão e demais formulários têm seus contratos específicos preservados.

## Validação e contraprovas

35 unitários/API e23 cenários distintos com Auth real aprovados. Incluem CAS,
segunda sessão, intenção selada, quantidades incompletas, replay, privacidade,
descarte/reconhecimento após perda de escrita e negativa após revogação de leitura.
Locks observados exercitam perda de autoridade e mudança da fonte durante a
espera. Trigger local dirigido revoga o papel durante o evento: a guarda final
nega e reverte documento, estoque, alocações, journal, revisão e papel. Trigger
e função de prova retirados no finally.

Dois oráculos inicialmente esperavam PT409, mas a guarda oficial preexistente
retorna P0001 com mensagem de fonte obsoleta, já mapeada pela API para conflito.
Corrigidas apenas as expectativas, mantendo mensagem e rollback. O parser
inicial também exigia UUID para produto, embora o catálogo use identidade textual;
corrigido para o contrato real e acrescentada regressão unitária.

As rodadas de navegador e resultados por identidade estão no JSON. Cobrem
recuperação entre sessões, mesma versão com outra fonte, leitura negada ou
malformada, falta real de acesso ao estoque, resultado perdido e consulta após
encerramento COM/ENT. Mantidos axe, quatro larguras, autoria, ausência de efeitos
durante comparação e invariantes de estoque. Duas capturas de viewport móveis
foram inspecionadas; não há nova aprovação de paridade integral ou aparelho físico.

Consumidores antigos também foram corrigidos: a retirada de um segundo pedido
precisa retomar e comparar o rascunho anterior; o teste não pode digitar no
formulário bloqueado nem descartar o primeiro preenchimento silenciosamente.
A falha REQ permanece interceptada até a recuperação explícita, cobrindo todas
as consultas concorrentes. Auditorias responsivas começam no topo após resize,
mantendo regras de acessibilidade, foco e largura. Falhas intermediárias ficam
preservadas e não são contabilizadas como aprovação da CI completa.

## Remoto e próximos gates

Migration170:20261109151449. Predecessores, compatibilidade e dry-run conferidos;
aplicação oficial no projeto autorizado antes do commit. Local170/remoto170,
digest ordenado, quatro funções/configurações e ACL iguais. Helpers privados e
leitura direta de rascunhos continuam fechados; entrada pública só autenticada.
Advisors iguais excluindo somente observed_at. Sem reset, fixtures/Auth/Vault
remotos, backup redundante, produção ou ativação externa.

Matriz105x39, primeiras30 colunas,56 PASS/49 PARTIAL e18 requisitos UI mantidos.
Regularização administrativa, transferência e decisões contextuais BAL/REQ
continuam no gate D-B-AC-001 parcial. Restam CI completa do SHA publicado,
paridade66/171 e demais gates D-C/D6/humanos/AT/aparelhos/provedores. Sonar
adiado pelo responsável. Assinatura, backup, monitoramento e transportes não
recebem nova aprovação neste lote.
