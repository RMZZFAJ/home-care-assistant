# Parecer executivo B4

## Conclusão para o responsável pelo produto

O backend tem proteções reais que devem ser preservadas, mas ainda não garante
que toda intenção aceita corresponda ao que fica gravado e ao que a pessoa
entende como resultado. A B4 terminou a investigação sem corrigir o produto.
O NO-GO anterior permanece; nenhum resultado desta fase autoriza produção.

Foram catalogados61 métodos HTTP em41 handlers, com82 superfícies de fonte.
Há77 cenários dirigidos:60 de HTTP/Auth/Storage/navegador/assets locais e17
de adaptadores com dependências controladas. Nem todos são testes de fluxo
completo. Quatorze bibliotecas/apresentações sem alteração reutilizam a revisão
anterior; os demais27 helpers e todos os handlers tiveram leitura própria.
Não repetimos build, typecheck global, suíte unitária ou E2E completo.

O [registro mestre](14_FINDINGS_MASTER.md) contém13 registros: dez P2 e três P3.
Sete trazem mecanismos novos, incluindo dois riscos sustentados; quatro trazem
causas adicionais relacionadas a problemas conhecidos; um amplia manifestação
conhecida e um comprova observação anterior. Não são13 invasões nem13
descobertas
inteiramente inéditas. Nenhum novo P0/P1 foi demonstrado. Os P1 de automação e
decisão informada de escala das fases anteriores seguem abertos.

## O que funciona e deve ser preservado

- Sessão, vínculo, papel e paciente selecionado são verificados no servidor e
  no banco. Na amostra, trocar somente um ID não deu acesso ao outro paciente;
  ser administrador local não permitiu promover outra identidade a global.
- Uma pessoa com vínculo em duas residências precisa selecionar o contexto
  correto. Um PDF já gerado não contorna essa regra. Cookie de sessão encerrada
  foi recusado pela API; o problema direto B3-021 continua separado.
- A mesma intenção REQ recuperou a mesma identidade; conteúdo diferente com a
  mesma chave foi recusado. Nome de produto enviado pelo cliente não virou
  snapshot oficial. REQ continua sem quantidade solicitada.
- PDF da versão pedida teve bytes conferidos contra o hash registrado e foi
  reutilizado sem troca silenciosa. Versão ou original inexistente recebeu404.
- A recusa de submissão sem estoque não moveu materiais. A revisão do rascunho
  ficou salva e recuperável; o problema é comunicar esse resultado parcial.
- Assinatura de webhook e identificação do ativo são verificadas. Dados privados
  e SQL não apareceram nos erros examinados; a chave de serviço local não estava
  nos assets do navegador. Esses controles não devem ser relaxados para corrigir
  contratos ou obter mensagens de erro mais detalhadas.

As garantias SQL de custódia, versões, concorrência e história da B3 continuam
referenciadas por funções idênticas, sem serem apresentadas como novas
execuções.

## Descobertas e consequências concretas

**Quantidade aceita diferente da informada — B4-001.** Um operador autorizado
enviou1.0000001 como número; a API confirmou sucesso e o movimento
ficou1.000000.
O mesmo valor como texto foi recusado. A proteção depende do tipo JSON, e o
arredondamento ocorre antes da conferência da unidade. É causa HTTP adicional
ao problema SQL já conhecido. A solução futura deve recusar o valor original
inválido, sem recalcular ou alterar movimentos históricos.

**Recuperação incompleta — B4-002/003/004.** Repetir uma proposta pelo
consumidor
atual cria chave nova e pode duplicar a fila, embora a API recupere corretamente
uma chave conservada. Aprovar ingresso e perder a resposta deixa o convite
salvo,
mas o retry não recupera o link; reemissão manual funciona como contingência.
Revisar e emitir uma entrega pode salvar a edição e depois responder apenas o
erro de estoque da emissão. Nenhum desses casos prova dupla aplicação de
estoque;
eles mostram que a pessoa não recebe informação suficiente para retomar com
segurança. Chave estável e resposta que descreva cada etapa são necessárias.

**Pendência e informação que a pessoa não encontra — B4-005/012.** Com51
mudanças
administrativas, uma proposta ainda pendente desapareceu das consultas local e
global, sem página seguinte ou busca por ID. Em outro cenário, um relato novo
foi salvo e a revisão do backend avançou; mesmo recebendo o sinal, a tela de
consumo não consultou novamente. Recarregar a página mostrou o registro.
O primeiro problema é consulta incompleta; o segundo é o consumidor ignorando
a invalidação. Corrigir só o evento do banco não resolve ambos.

**Estado de criação contrário à escolha — B4-013.** O formulário permite criar
paciente inativo. A API aceita false, mas a criação com administrador inicial
grava ativo=true. Foi comprovado por resposta e consulta independente. A edição
posterior para inativo funciona; a residência fictícia terminou inativa.
É preciso honrar a escolha ou retirar/recusar explicitamente essa opção na
criação. Não dispensar o administrador inicial nem misturar poderes globais e
operacionais para resolver o problema.

**Mensagem válida descartada — B4-011.** Um envelope assinado de teste continha
texto válido e uma resposta interativa de Flow. O parser recusou o conjunto,
mas a rota respondeu200 e não chamou a ingestão do texto. Texto isolado
funcionou.
Foi teste do adaptador com serviço controlado, sem mensagem real da Meta.
A integração precisa processar ou recusar cada item explicitamente, preservando
deduplicação e recuperação de lote.

**Riscos ainda condicionais — B4-007/010.** Avatar pode gravar arquivo e falhar
na associação; retry cria caminho novo. O teste controlou Storage, sem comprovar
órfãos reais ou quota esgotada. No worker, cancelamento simulado durante upload
de mídia não impediu a chamada posterior de mensagem; complete preservou o
estado
cancelado. Isso delimita uma janela de envio, sem comprovar divulgação externa
real. Retenção de arquivos e garantia exata de cancelamento exigem decisão e
validação adicional antes de implementação.

**Contratos menores — B4-006/008/009.** Erro SQL de cancelamento é apresentado
como conflito de nome de produto; um delegado de catálogo é aceito numa rota e
recusado na equivalente; UUID inválido responde500 no modo global e400 no local.
A rota ativa de catálogo funciona e nenhum dado foi exposto nesses testes.
As correções devem preservar autorização e erros seguros.

## O que continua dependendo das fases anteriores

Automação REQ sem progresso permanece P1; aprovação informada de escala
permanece
P1 de interface. Cancelamento com consumo, série encerrada republicada, revisão
BAL legado, decisão oposta de consumo, correção sem referência, reservas,
consultas
antigas, revogação e restore continuam abertos conforme A/B1/B2/B3.
A [matriz de dependências](16_CROSS_GROUP_DEPENDENCIES.md) conserva as causas,
prioridades e contratos, sem aumentar contagem por repetição.

## Como a investigação foi encerrada

Branch única audit/phase-b, produto preservado, backup fora do Git e novos dados
fictícios separados. Não houve reset, substituição de fixtures, alteração
remota,
mensagem real, deploy, PR ou merge. Os auxiliares e as evidências ficam nesta
pasta.
Somente o pacote e o índice geral entram no commit documental autorizado.

Produção, provedores reais, restauração conjunta, p95 remoto, aparelhos físicos
e entendimento humano não foram homologados. A falha histórica de CI/E2E não
foi declarada corrigida. O [handoff](18_PHASE_C_DECISION_HANDOFF.md) organiza
decisões futuras; B5, C e implementação não foram iniciados.
