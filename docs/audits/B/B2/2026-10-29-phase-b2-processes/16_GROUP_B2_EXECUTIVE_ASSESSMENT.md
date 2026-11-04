# Diagnóstico executivo da Fase B2

O Home Care Assistant possui uma cadeia operacional consistente para registrar
necessidades, aquisições, transferências, recebimentos, contagens e consumo.
Os testes demonstraram preservação de histórico, separação de estoques e vários
controles de autorização e repetição. A principal fragilidade aparece quando
uma operação sai do caminho esperado: algumas situações reais não têm uma
etapa suficiente para terminar ou uma pessoa claramente capaz de continuar.

Esta auditoria não autoriza liberação do produto. O parecer NO-GO da Fase A
permanece, incluindo os dois problemas prioritários de decisão informada sobre
plantões e de progresso dos lembretes entre pacientes. Nenhuma correção foi
implementada. A B2 entrega o diagnóstico e a base de decisões futuras.

## O que foi examinado e com que prova

Foram reconstruídos 66 processos em 12 domínios e 102 transições. A investigação
executou B2.0–B2.10 em sequência, com segunda passada por subgrupo e análise
contrária às conclusões iniciais. Os arquivos permitem acompanhar objetivo,
responsável, entrada, decisão, estado, efeito, exceção e recuperação.

Há 81 cenários locais dirigidos, com contas fictícias autenticadas e consulta
independente dos fatos gravados. Além deles, seis testes E2E selecionados
passaram: o ciclo REQ–COM–estoque–ENT–BAL e a recuperação de uma REQ após
resposta
perdida, em desktop, Android emulado e iPhone emulado. Foram inspecionadas a
fila de entregas e quatro páginas de PDF de versões diferentes.

Dos 66 processos, 57 têm alguma amostra local dirigida. Os outros nove foram
reconstruídos em código, sem execução integral nesta B2. Também existem ramos
não testados nos 57; a cobertura os identifica individualmente. Não houve
participantes reais, aparelhos físicos, mensagens externas, restauração integral
ou operação em produção. Esses limites não são tratados como testes aprovados.

## O que funciona e deve ser preservado

- Uma requisição registra necessidade, urgência e estoque observado. Ela não
  pede quantidade como uma ordem de compra e não cria saldo.
- Comprar ou receber uma doação não equivale a entregar material à equipe.
  A chegada informada por familiar pode aguardar validação; só a validação
  credita o estoque correspondente.
- Expedir material cria trânsito. O aceite da pessoa designada é que confirma
  a entrada no destino. Recebimentos parciais, devoluções e perdas ficam
  distinguíveis; vincular duas requisições não duplica a quantidade física.
- Relatar consumo não debita estoque. Confirmar falta também não é consumo.
  Uma diferença de contagem aprovada ajusta inventário, sem inventar uso.
- A contagem física pode cumprir uma obrigação enquanto sua revisão ainda
  está pendente. Recontagens preservam versões e não reaproveitam aprovações
  antigas como se fossem da nova contagem.
- Convite, conta, vínculo, papel e capacidade são fatos distintos. Revogar uma
  participação retirou acesso daquele paciente e preservou outro vínculo
  legítimo. Administração global não ganhou poder operacional local automático.
- Repetir a mesma intenção recuperou o fato sem duplicar crédito. Duas pessoas
  aprovando a mesma versão produziram uma decisão e um conflito de atualização.
- Ciência, aviso visto, atendimento e arquivo permaneceram separados. Uma REQ
  arquivada reabriu quando a entrega foi cancelada; o motivo anterior e o PDF
  histórico continuaram preservados.

Essas etapas são controles de responsabilidade. Simplificar o preenchimento é
útil; eliminar silenciosamente suas diferenças perderia informação importante.

## Onde o processo não consegue terminar bem

O [registro mestre](13_FINDINGS_MASTER.md) contém 17 achados: oito defeitos,
sete lacunas e duas oportunidades. São 15 P2 e dois P3, sem criar prioridades
elevadas para problemas ainda hipotéticos. Quatro revalidam causas da Fase A;
13 acrescentam causas ou recortes operacionais, alguns relacionados à B1.

Três exemplos ilustram o problema de completude:

1. A família aprovou dez unidades, adquiriu e recebeu duas, e decidiu desistir
   das outras oito. O estoque ficou correto, mas a compra não permite encerrar
   formalmente esse restante. A previsão digital continua esperando algo que
   a família já decidiu não adquirir.
2. Uma profissional recebeu parte de uma entrega e depois foi desligada.
   Revogar seu acesso funcionou corretamente. Porém a entrega parcial não tem
   um processo formal para outra pessoa assumir as conferências futuras,
   preservando os aceites anteriores. Reativar a pessoa ou assinar por ela
   não é uma solução geral aceitável.
3. Um pedido de cancelamento de entrega chegou à profissional, que discordou.
   Existe consentimento, mas não recusa ou retirada formal. Além disso, a fila
   padrão de entregas pode parecer vazia, mesmo havendo essa decisão pendente.

Outras lacunas envolvem produto inativado com saldo, relato de consumo sem
quantidades para posterior confirmação e troca de contador durante reconto.
Há recuperações parciais existentes, como reativação explícita, novo relato e
nova designação pelo revisor. Elas precisam ser apresentadas com suas condições;
não resolvem todos os casos sem uma decisão de produto.

## Defeitos que precisam de tratamento técnico

Os oito defeitos comprovados têm alcance delimitado:

- Cancelamento de entrega com consumo confirmado falha e conserva a pendência
  (B2-004, mesma causa A DB-001). A transação não deixou efeito parcial.
- Correção de estoque aceita falta de vínculo ao movimento original pela API
  e pelo banco, embora o formulário exija esse vínculo (B2-005).
- No regime anterior de BAL, um supervisor conseguiu aprovar sua própria
  contagem apesar de revisão obrigatória; o regime agendado recusou corretamente
  a mesma situação (B2-009).
- Rejeitar um consumo já confirmado recebe resposta de sucesso, mas a rejeição
  não é aplicada. O primeiro débito é preservado; a segunda pessoa precisa
  receber informação de conflito, em vez de entender que decidiu (B2-011).
- Um adiamento de BAL cujo plantão de destino mudou permanece pendente e nem
  pode ser recusado até outra ocorrência limpar a obsolescência (B2-012).
- Aprovar uma série proposta depois de seu encerramento republica plantões
  posteriores ao corte (B2-013, mesma causa A DB-003). A sequência foi
  comprovada
  pela API/banco; a tela atual não oferece todos esses passos diretamente.
- Dez reservas de anexos abandonadas esgotam o limite, mesmo sem dez arquivos
  prontos (B2-016, mesma causa A DB-004).
- Uma pendência antiga fica fora dos cem relatos retornados, mesmo com sua
  referência e com o painel contando trabalho pendente. O dado continua no
  banco,
  mas a fila normal não o alcança (B2-017, A BE-001/B1-UX-007).

Não foi demonstrada perda generalizada de dados ou autorização por nome do
navegador. As recomendações não dependem dessas alegações. Cada achado inclui
reprodução, limites, causa sustentada e efeitos que uma correção deve preservar.

## O que pode ficar mais simples

As melhores melhorias iniciais completam processos existentes: explicar quem
age em seguida, tornar toda pendência alcançável, conservar a origem de uma
conversão de embalagem e abrir a justificativa de cada movimento de estoque.
Preparar a primeira residência pode começar com uma lista curta de tarefas e
links, sem novo módulo ou uma grande configuração obrigatória.

O [catálogo de alternativas](12_NEW_FUNCTIONALITIES_AND_PROCESS_GAPS.md)
examinou 20 possibilidades: 19 candidatas e uma descartada como novidade
genérica porque o reaproveitamento entre documentos já existe. Listas
recorrentes, controle por lote, visão de tarefas entre residências e tratamento
de duplicatas continuam hipóteses condicionadas à necessidade real.

Nenhum ganho de tempo foi inventado. Para avaliar benefícios, observar famílias
e profissionais executando tarefas equivalentes antes e depois: erros de
decisão, ajuda necessária, redigitação, tempo para encontrar o próximo passo e
pendências que ficam sem responsável. Se o recurso existente já atende ou se
o custo superar o benefício, a proposta deve ser abandonada.

## Decisões e verificações que continuam pendentes

O responsável precisará definir quem pode desistir de saldo de compra, como
resolver desacordo de cancelamento, quem assume conferências futuras depois de
desligamento, como destinar produto inativo e quem pode complementar um relato.
Também precisa escolher se a troca durante reconto exige nova designação
explícita ou transferência sob condições determinadas. São decisões do processo,
não meramente escolhas de tela.

Provedores externos, entrega/leitura de mensagens, telefone verificado, câmera,
impressão, entendimento humano, múltiplas semanas reais e recuperação integral
do ambiente continuam exigindo validação própria. O backup local foi criado e
seu conteúdo listado com sucesso; isso não comprova restauração completa de
Auth, arquivos e operação. A B2 não realizou alterações remotas para obter
prova.

O [handoff](17_PHASE_C_DECISION_HANDOFF.md) organiza 17 questões de decisão;
os [aceites futuros](14_ACCEPTANCE_SCENARIOS.md) descrevem 17 critérios por
achado e 11 sequências de preservação. Assim, decisões futuras podem partir de
comportamentos concretos e consequências humanas, sem reconstruir logs técnicos.

## Preservação e validação do trabalho

Toda evidência está na pasta B2 e o índice geral da Fase B foi atualizado.
O trabalho permaneceu na branch audit/phase-b. A master e 371 arquivos de
referência com hash foram preservados. Não houve mudança funcional, migration,
dependência, configuração remota, reset, deploy, PR, merge ou envio real.

As verificações oficiais abrangem contratos, lint, Markdown, tipos, 98 testes
unitários e build, além dos seis E2E selecionados. O resultado final e os hashes
do pacote ficam em [validação](evidence/package-validation.json),
[checks](evidence/checks.json) e [manifesto](evidence/manifest.json).
Falhas iniciais de preparação/formatação dos artefatos do auditor foram
preservadas e corrigidas, sem alterar o produto ou enfraquecer testes.

A conclusão da B2 significa conclusão da investigação especializada desta
versão, com seus limites identificados. Não inicia B3, Fase C ou implementação.
