# D3.56 — continuidade das observações físicas do BAL

A contagem agendada ignorava campos locais quando a referência mudava e podia
substituí-los por uma cópia vazia. Os dois modos recusavam a retomada privada
sob mudança de contexto. O início de outra conferência apagava quantidades e
instantes sem manter uma referência consultável. O incremento separa os
valores anteriores da nova observação física, com a mesma aparência canônica.

## Implementação

BAL com e sem regime retomam campos, notas, referências e instantes originais.
Uma divergência de modo, ficha/versão, atribuição/versão ou estoque pede uma
comparação explícita. A consulta atual pode mudar novamente; adotar consulta
catálogo, estoque e ficha outra vez. Autorização e janela real continuam no
banco, sem derivação de autoridade do rascunho ou de IDs locais.

A nova conferência começa sem quantidades e sem datas de observação novas.
Notas são conservadas. As conferências anteriores ficam em previousObservations,
com valores brutos inclusive incompletos, nomes/unidades preservados, instantes
e contexto de origem. Não são copiadas para linhas, estoque, snapshot ou PDF
oficial. Digitar os valores da nova contagem registra seu próprio instante
declarado; esse horário de cliente não é comprovação física independente.

A referência anterior integra o conteúdo privado e sua revisão CAS, permitindo
retomar tanto a nova edição quanto as conferências anteriores em outra sessão.
Não há gravação automática no servidor nem POST operacional ao recuperar.
Adotar uma referência primeiro preserva a nova cópia local; falha de gravação
não limpa os campos. Cópia danificada fica protegida. Falha inicial de leitura
não libera autosave sobre uma cópia ainda não conferida; a nova consulta também
retoma essa cópia, sem depender de ser a primeira tentativa de carregamento.

A cópia local passa a guardar o contexto completo. Cópias antigas sem referência
suficiente são tratadas como desconhecidas, exigindo outra conferência; uma
intenção operacional antiga continua congelada e recuperável. Um preenchimento
agendado pode continuar consultável após perder elegibilidade. A troca de
responsável não transfere o preenchimento privado nem permite uma nova contagem
por quem saiu do plantão. O foco retorna ao primeiro campo ou ao título do
formulário depois da adoção.

A abertura antiga conserva a chave existente. O usuário recupera a ficha na
identificação antes de atualizar a referência de contagem. O cliente confere
paciente, autoria, chave e estado da ficha retornada. Campos preenchidos mantêm
a referência preservada e seguem para comparação. Um formulário vazio pode
usar a referência consultada após recuperar a ficha.

## Evolução de banco e compatibilidade

Migration incremental 20261110214907 acrescenta somente a validação opcional de
previousObservations em private.validate_creation_draft(text,jsonb,uuid).
Cada snapshot repete o contrato BAL anterior, com o mesmo alvo e sem histórico
aninhado. Máximo de dez conferências e limite total anterior de 200000 bytes.
Atingir o limite recusa a operação sem descartar silenciosamente valores.
Snapshots, documentos, estoque, Auth, RLS, grants e RPCs de confirmação nativa
não são reescritos. Conteúdo anterior sem o campo continua aceito.

O commit nativo recebe o payload explícito da operação. Por contrato, não exige
que ele seja igual ao último rascunho parcial salvo: a pessoa pode completar
campos depois de salvá-lo. A regressão verifica que o cliente utiliza os novos
campos e que o histórico privado não é publicado; não alega que o banco prova
quando ou como a pessoa fez a observação física.

## Validação e limites

Foram qualificados 31 testes de modelos e consumidores e três cenários com
Auth real. As negativas nativas incluem histórico aninhado, limites e alvo
incorreto. A primeira execução registrou falha de infraestrutura do Auth e
uma expectativa incorreta sobre a relação entre payload final e rascunho.
A repetição dirigida confirmou o contrato e o resultado idempotente.

No navegador foram qualificados 45 cenários distintos. Doze resultados da
primeira rodada continuam aplicáveis à contagem agendada e à recuperação do
pacote original. A rodada após corrigir a abertura antiga teve 32 aprovações
e uma falha de acessibilidade em WebKit a 320 px. O avanço para revisão agora
posiciona o título e o foco abaixo do cabeçalho. Os três cenários afetados
foram repetidos com as mesmas verificações. As rodadas cobriram
resposta perdida, cópia local ilegível, estoque da equipe alterado, revisão de
ficha, troca de pessoa no plantão e retomada em outro aparelho. A comparação
visual usou o Modelo Integral, controles compartilhados e verificações axe
em quatro larguras no cenário de desktop, além dos testes móveis e WebKit.
A primeira simulação alterava apenas o saldo da família. A simulação válida
confere a mudança efetiva da referência após uma entrega recebida pela equipe.

Tipos e lint afetado aprovados. A migration foi aplicada no ambiente local
com test:db:prepare, sem reset. O remoto de desenvolvimento foi reconciliado
de 197 para 198 migrations. Definição e permissão da função conferidas contra
o ambiente local. Dry-run final vazio. A definição anterior foi preservada
como contraprova, conforme a validação proporcional autorizada pelo responsável.

A matriz mantém 105 critérios, com 56 aprovados localmente e 49 parciais.
As estimativas globais continuam em 60% para aparência e 90% para formulários
e recuperação. A CI do commit anterior aprovou Linux, Windows e banco, e
registrou falhas em agenda, foco, Andamentos e confirmação de entrega.
A falha da agenda compara o estado antes da confirmação com o resultado da
rejeição já registrado. A sincronização desse teste e as demais falhas seguem
para investigação dirigida. A CI do novo commit e os ensaios com usuários,
aparelhos físicos e provedores continuam pendentes. A PR #7 segue em Draft.
