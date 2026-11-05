# Parecer executivo B3

## Conclusão para o responsável

O banco tem proteções importantes funcionando, mas ainda não sustenta uma
aprovação integral para operação real. A B3 terminou a investigação autorizada
sem corrigir o produto. Foram 94 cenários locais dirigidos, com conferência do
que ficou gravado, além de revisão da estrutura e das 84 migrations. Testes que
passam em situações escolhidas não certificam todo o sistema.

O registro tem 25 achados:um P1, dezenove P2 e cinco P3. Dezesseis reavaliam
problemas anteriores; nove trazem observações ou mecanismos adicionais. Há
defeitos reproduzidos, riscos e decisões de produto; não são 25 invasões. Nenhum
P0 foi demonstrado. O NO-GO anterior permanece, assim como problemas de
interface
e validações externas que esta fase não resolveu.

O principal bloqueador deste recorte continua sendo a automação de requisições:
registros cancelados antigos podem ocupar o lote e impedir indefinidamente
que outra requisição válida seja processada. A B3 mostrou que isso também
ocorre dentro de um único paciente com 100 registros terminais. Não houve perda
de dados, mas uma tarefa essencial pode nunca receber seu lembrete ou avanço.

## Garantias comprovadas

**O que o Home Care Assistant já faz corretamente e não deve ser perdido durante
as correções.**

- Separa a identidade da pessoa do papel que ela possui em cada paciente.
  Nos casos testados, ser administrador global ou alterar informações do
  navegador não deu autoridade para movimentar estoque de uma residência.
- Bloqueia gravação direta nas tabelas públicas pelos clientes. As186
  tentativas de inserir, alterar e excluir foram recusadas. Operações legítimas
  passam por funções que verificam regras do produto.
- Conserva material entre família, trânsito e equipe. Uma entrega não deixa
  o mesmo material disponível nos dois lugares. Relatar consumo não debita;
  a confirmação autorizada é que registra a saída.
- Serializa operações incompatíveis. Duas saídas não ultrapassaram o saldo;
  duas aprovações da mesma versão não produziram duas decisões. Repetir a
  mesma intenção de recebimento não creditou material outra vez.
- Reverte uma operação inteira quando a última linha falha. Isso evita
  documento emitido pela metade ou estoque parcialmente alterado.
- Preserva versões, autores e hashes. A versão antiga continuou acessível
  depois de mil eventos; os hashes conferidos não divergiram. Reconto não
  herdou automaticamente a aprovação da versão anterior.
- Impede vincular necessidade de outro paciente à entrega atual, mesmo quando
  profissional e produto global são compartilhados. Plantões publicados
  também não se sobrepuseram para a mesma pessoa em pacientes diferentes.
- Valida bytes de upload, sanitiza imagem e confere conteúdo/hash. Recusa
  nova evidência após revogação de vínculo. Repetição de upload recupera o
  mesmo anexo, sem criar outra versão documental.
- Trata envio externo de resultado desconhecido como uncertain, exigindo
  conciliação antes do reenvio. Mensagem no outbox não foi confundida com
  entrega ou leitura humana.

Essas proteções são recortes comprovados localmente. Não devem ser removidas
para destravar um caso que hoje falha.

## Onde os problemas conhecidos continuam afetando a operação

**Automação e pendências.** Requisições canceladas e configurações antigas de
lembrete podem bloquear outros trabalhos. O processamento BAL com cursor
funcionou em 101 regimes, portanto o problema não exige presumir que toda
automação está quebrada. A decisão futura é como garantir progresso e avisar
quando ele não acontece, sem gerar notificações repetidas.

**Entrega, compra e estoque.** Uma entrega com parte consumida pode não concluir
o cancelamento consentido por erro SQL. O banco volta ao estado anterior,
protegendo os dados, mas impede uma operação válida. Uma compra parcialmente
realizada também não tem comando para desistir só do restante. Será preciso
definir esse fechamento sem apagar os materiais já recebidos nem inventar
consumo. Correções de estoque precisam identificar o fato que corrigem.

**Escala e balanço.** Aprovar proposta antiga depois de encerrar a série pode
republicar plantões e até gerar responsabilidade BAL derivada. Pedido de
adiamento com alvo alterado pode continuar pendente sem permitir recusa.
Substituição no reconto tem recuperação administrativa atual, mas não cria
sempre um sucessor automático. No regime BAL legado, a própria pessoa ainda
pode revisar sua contagem; no agendado, a separação foi protegida.

**Decisão e acesso à história.** Confirmar e rejeitar o mesmo relato pode
responder sucesso às duas pessoas, embora só a primeira decisão permaneça.
Depois de 100 itens recentes, a aplicação não alcança relatos e eventos de
auditoria antigos que continuam no banco. Editar o perfil também pode deixar
de emitir o sinal que avisa a tela sobre mudança. As correções precisam
alinhar resposta, contador, lista e resultado persistido.

## As descobertas que não haviam sido identificadas nas Fases A, B1 e B2

**Uma sessão encerrada ainda alcança certas escritas pessoais.** O esperado
é que encerrar aquela sessão impeça o uso posterior abrangido pelo produto.
A API e as funções de negócio recusaram o acesso, mas um token ainda dentro
do prazo alterou perfil e avatar próprios por caminhos diretos. Foi reproduzido
em contas novas locais. Não houve acesso a outra pessoa ou paciente. A decisão
é alinhar a proteção de sessão também nessas funções e no Storage, preservando
o login legítimo e o controle de cada sessão separada.

**Uma operação já em espera pode terminar depois da revogação.** Uma pessoa
começou a movimentação antes de perder o vínculo e ficou aguardando o lock.
Depois da revogação confirmada, aquela movimentação ainda terminou. Uma chamada
nova foi negada. O teste não mostra liberdade para usuário revogado iniciar
novas operações. Será preciso definir se a revogação impede só novas intenções
ou também cancela as que ainda esperam, e aplicar a garantia de forma uniforme.

**Entradas inválidas podem virar fatos válidos aparentes.** Uma decisão nula
virou rejeição. Uma quantidade com casas incompatíveis foi arredondada antes
de ser conferida. Um fator de apresentação NaN, sem significado numérico útil,
foi armazenado. Esses casos exigem usuário já autorizado e os formulários/API
mitigam parte das entradas, mas o contrato direto do banco continua aceitando.
A correção deve recusar o valor inválido, sem alterar movimentos históricos ou
unidades já usadas. Nenhum NaN foi introduzido no ledger pelos testes públicos.

**Limites de leitura e revogação precisam de definição precisa.** A RPC
documental aceita paginação nula e devolve todo o conjunto autorizado. Um
link de arquivo emitido antes da revogação continua funcionando dentro dos
120s de prazo, enquanto nova consulta é recusada. O primeiro é defeito de
limite;
o segundo é uma credencial temporária cuja janela precisa ser aceita ou
reduzida por decisão de produto. Não se pode prometer apagar cópias já baixadas.

**Capacidade e recuperação ganharam riscos mais específicos.** A B3 identificou
custo de cálculo/autorização por linha e uma fixture legada inválida capaz de
abortar o lote. O tema geral de desempenho já existia em BE-006; a novidade é o
mecanismo SQL e a evidência. A fixture inválida foi criada pelo operador, com
rollback, e não foi aceita pela configuração normal. São riscos de manutenção
a medir/tratar, sem afirmar ataque público ou lentidão de produção comprovada.

## O que ainda precisa ser comprovado antes da operação real

- Que um ambiente isolado pode ser restaurado com banco, Auth, bytes de
  arquivos, configurações, chaves e jobs reconciliados. O backup é legível;
  restauração completa continua sem prova.
- Que instalação limpa e evolução de legado passam em replay seguro da
  cadeia atual. A B3 fez análise estática e conferiu o instalado, sem reset.
- Que o ambiente remoto tem o esquema, permissões, Auth, Storage e cron
  esperados.
  Nenhuma operação remota mutável foi executada por esta auditoria.
- Que mensagens reais, templates, callbacks, SMTP/OTP e tempos do provedor
  funcionam sob homologação autorizada. O orçamento máximo do worker continua
  risco aberto; nenhuma mensagem real foi enviada.
- Que desempenho e locks atendem volume e prazo aceitos. Mil versões mantêm
  integridade, mas acumulam500500 resumos; isso pede orçamento de retenção e
  capacidade, sem reescrever a história.
- Que pessoas conseguem entender as decisões, recuperar falhas e usar o produto
  nos dispositivos reais. Não houve navegador, aceite humano ou dispositivo
  físico na B3. A falha histórica de CI não foi declarada corrigida.

## Decisões que a auditoria entrega, sem executá-las

Priorizar o bloqueio de progresso; definir cancelamento/consumo e desistência
de remanescente; unificar revisão BAL e destino de propostas obsoletas; decidir
revogação em curso e janela de links; estabelecer retenção, SLO, RPO/RTO e
ensaios
externos. O [handoff](18_PHASE_C_DECISION_HANDOFF.md) organiza as dependências.
As alternativas são propostas para avaliação posterior. B4, C e D não foram
iniciadas, e o produto permanece sem correções desta fase.
