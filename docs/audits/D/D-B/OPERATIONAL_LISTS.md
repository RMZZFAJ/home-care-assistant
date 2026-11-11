# Listas operacionais — conferência por ponto fixo

## D3.70 — fichas e requisições, ponto05.2

Base81fa08a. O Histórico de fichas é o consumidor ativo da lista unificada.
RequisitionHistory não tem consumidor; seu arquivo não foi removido nem
refatorado como se fosse uma segunda tela disponível.

Uma resposta200 sem total foi reproduzida sobre uma COM real. A tela retirou
a ficha e mostrou Nenhuma ficha encontrada, sem erro. Relatório e captura do
baseline estão preservados. A correção acrescenta paciente e filtros ao
envelope HTTP, mantendo os campos nativos; servidor e cliente conferem
estrutura, total, página, tamanho, identidade única e tipo explicitamente
selecionado. Resultado interno inconsistente não vira erro de preenchimento.
Estados documentais futuros continuam usando o rótulo seguro existente.

O consumidor reutiliza useScopedRead. Falha transitória preserva somente os
registros válidos do mesmo âmbito, com instante e identificação da leitura
anterior. Dados iniciais indisponíveis não viram total zero nem vazio.
401/403/404 retiram o conteúdo anterior. Mudar paciente ou filtro não adota
dados da consulta anterior como resultado atual. A paginação aguarda leitura
válida; os links preservados continuam levando ao detalhe autorizado.

A URL conserva filtros e página. O formulário mantém sua identidade durante
a navegação, preservando foco; a mudança da consulta restaura os campos ao
usar Voltar/Avançar. Não há novo rascunho de negócio, armazenamento ou replay.
A autorização, a ordem nativa por data decrescente e ID crescente, protocolos,
ciência, recebimento e efeitos de estoque permanecem nos contratos existentes.

Passaram30 unitários/de contrato, tipos e lint dirigido. A coorte inicial
aprovou nove de15 cenários nos três perfis. Os seis restantes apontaram duas
expectativas do teste: o HTTP normaliza pageSize101 para100, em vez de rejeitar;
e a nova URL com datas precisa estar confirmada antes de acionar Voltar.
Foram acrescentadas esperas pela URL e a asserção do tamanho efetivo100,
mantendo as verificações de campos, resultado, foco e preservação. O código
do produto não mudou depois da coorte inicial.

A repetição exclusiva desses seis casos passou. São15 cenários distintos
qualificados, por nove aprovações iniciais e seis finais. As21 execuções da
correção incluem as seis falhas iniciais de expectativa, preservadas com seus
contextos e capturas. A falha real do baseline é registrada separadamente.
Não houve exclusão de caso, redução de regra ou repetição da suíte completa.

As provas usam Auth real, API e banco local guardado:101 REQ e COM/ENT reais,
percurso completo de103 fichas e101 REQ, ordem/IDs por SQL independente,
pendência mais antiga, busca por código, recarga, filtros, foco e Voltar.
Uma resposta real sem resultado é entregue após a consulta atual e não a
substitui. Respostas incompletas ou de outro paciente, filtro, página, total
ou identidade repetida são recusadas antes de substituir a leitura válida.
Há demora503 sem zero/vazio, recuperação,403 com retirada dos dados, perda
real de com.read e recusa404 de paciente sem vínculo. Período invertido é400;
o limite máximo efetivo permanece100, sem mudar o contrato HTTP anterior.

Snapshots SQL completos de fichas, eventos, movimentos, ciência e aberturas
permanecem iguais após consultar, filtrar e navegar. A lista não envia POST
operacional nem registra ciência ou abertura da REQ. Os consumidores antigos
de chips traduzidos, estado desconhecido e cartão de arquivamento conservaram
suas asserções. Axe a320px e as quatro larguras desses consumidores passaram.
As capturas novas do erro inicial e da REQ antiga a320px foram inspecionadas;
a comparação visual completa continua na etapa06.

Sem SQL novo; dry-run remoto vazio em205. Ponto05.2 fechado localmente no
escopo declarado; próximo05.3, compras e parcelas. Os105 critérios conservam
56 PASS locais e49 PARTIAL. CI própria, outros oito pontos de listas e gates
conjuntos continuam necessários. DOC-B permanece10% e DOC-A/C/D pendentes;
este incremento não aprova os novos PDFs, cancelamentos ou rascunhos simples.
[Resultados](OPERATIONAL_LISTS_VALIDATION.json).

## D3.71 — compras e parcelas, ponto05.3

Basef4b0045. A lista de compras reutiliza a consulta unificada. As parcelas
agora têm busca local por número de localização, material e autoria preservada,
filtro por situação e páginas de20. Todas continuam alcançáveis. A ordem da
consulta usa instante e ID; a coleção recebida não é alterada. Os números de
localização são calculados antes de filtrar, sem virar protocolos oficiais.
Selecionar uma parcela continua usando sua identidade nativa.

Uma seleção vazia não significa ausência de chegadas. Limpar a consulta
restaura a primeira página. Atualizar a ficha preserva os filtros; mudar de
ficha reinicia a consulta. Controles do modelo canônico e campos completos
foram mantidos, incluindo quantidade/unidade, autor, instante e decisão.
Os controles foram classificados no inventário como consulta, sem rascunho
de negócio ou nova persistência. Não há novo endpoint, RPC, autorização,
dependência, armazenamento ou replay.

São15 unitários distintos qualificados: nove de acompanhamento preservados
e seis do helper aprovados após corrigir uma expectativa de rótulo. O contrato
existente diz Validada, não Aprovada; o produto não foi alterado para acomodar
o teste. Tipos e lint dirigido passaram, com o nome do setter corrigido sem
suprimir a regra. A revisão React conferiu derivação de filtros/página,
imutabilidade, chave por ficha e ausência de novos efeitos/requisições.

Os18 cenários de produção passaram numa única coorte, nos três perfis, sem
falhas ou repetições. Com Auth real,101 COM percorrem todas as páginas em
ordem exata por SQL independente; a mais antiga é alcançada pelo código.
Outra COM tem101 parcelas nativas:99 pendentes, uma validada e uma rejeitada.
Antes da consulta, o crédito oficial é exatamente1 unidade; informar chegada
ou rejeitar não cria esse crédito. Todas as101 parcelas foram percorridas,
sem perdas ou duplicações. A parcela101 permanece alcançável por busca e a
terceira validada conserva seu número ao filtrar.

Uma falha503 conserva a consulta101 e a parcela anterior; a recuperação não
envia comando oficial. Comparações independentes dos documentos, linhas,
eventos, parcelas e ledger completos comprovam sua preservação durante a
leitura e navegação; as contagens, estados e o crédito também têm asserções
positivas separadas. Os quatro consumidores antigos conservaram chegada
vazia, quantidades declaradas, decisão recuperável, rejeição sem entrada,
conflito com adoção explícita, encerramento da expectativa e PDFs distintos.
Axe/overflow e a captura da parcela101 a320px passaram. A captura Chromium
foi inspecionada, sem substituir o aceite integral da aparência.

Sem SQL novo; dry-run remoto vazio em205. Ponto05.3 fechado localmente;
próximo05.4, entregas e transferências. Os105 critérios mantêm56 PASS locais
e49 PARTIAL. CI própria e demais pontos/gates continuam necessários.
DOC-B permanece10% e DOC-A/C/D pendentes, incluindo os novos PDFs aprovados.

## D3.72 — entregas e transferências, ponto05.4

Base633b0b9. A lista pessoal e o histórico autorizado reutilizam o contrato
de tarefas existente. O envelope conserva data/total e acrescenta paciente,
página, tamanho e seleção efetiva. Servidor e cliente conferem estrutura,
identidades únicas, tipo ENT e coerência do total antes de adotar a leitura.
Documento ainda não expedido pode continuar sem protocolo. A autoridade
permanece no banco, sem deduzir permissão pela identidade do destinatário.

O consumidor usa useScopedRead. Falha transitória conserva somente a consulta
válida da mesma seleção, identificada com instante; outra seleção/página não
apresenta dados anteriores como atuais. Recusas401/403/404 retiram os dados.
Falha não fabrica vazio. A paginação tem identificação acessível e aguarda
resposta válida. Consultas não viram rascunhos de negócio.

Passaram13 unitários, tipos e lint dirigido. São12 cenários distintos de
produção qualificados nos três perfis: nove aprovações da coorte inicial e
três do caso de volume após correção exclusiva da preparação do teste. Das15
execuções, três falharam antes da interface porque o registro adicional tinha
emissor e destinatário iguais. O contrato nativo corretamente recusou isso;
a família passou a emitir esse registro para o administrador, com autores
distintos. Nenhuma regra do produto foi flexibilizada. Relatório inicial,
contextos e capturas das falhas estão preservados.

Com Auth real,101 tarefas pessoais e102 registros no histórico autorizado
foram percorridos por todas as páginas em ordem exata comparada com SQL
independente. Registro de outro destinatário não entra na seleção pessoal;
tarefas executáveis retomam o âmbito próprio. Seis modos de resposta200
inconsistente foram recusados. Mudança de seleção seguida de503 não exibe
a leitura anterior nem inventa vazio; recuperação e perda real de ent.read
foram conferidas. Navegar não envia POST oficial, e os documentos, eventos e
movimentos completos permanecem iguais.

Os consumidores anteriores mantiveram resposta tardia, foco, quatro larguras,
vazio e preservação do ledger. A expectativa antiga de conservar dados de
outro filtro foi substituída por carregamento sem linhas antigas. A devolução
bilateral manteve três autores, declaração sem protocolo, concordância sem
estoque, material inativo, recebimento pessoal parcial e recuperação.
Axe a320px passou e a captura Chromium foi inspecionada.

Sem SQL novo; dry-run remoto vazio em205. Ponto05.4 fechado localmente;
próximo05.5, consumo. Etapa05 parcial90%;105 critérios mantêm56 PASS locais
e49 PARTIAL. Restam05.5–05.10, comparação visual conjunta e demais gates.
DOC-B permanece10% e DOC-A/C/D pendentes; não há nova aprovação de PDFs,
rascunhos simples ou cancelamentos. CI do SHA publicado continua necessária.

## D3.73 — consumo, ponto05.5

Basee422bb2. Duas contraprovas unitárias do baseline reproduziram a aceitação
de IDs repetidos e de cursor apontando para a primeira linha. Os resultados
originais estão preservados. O envelope mantém data/next e acrescenta paciente,
tamanho20, filtros normalizados e referência recebida. Servidor e consumidor
conferem o âmbito e a ordem nativa decrescente por instante/ID, preservando
microssegundos. O cursor identifica a última linha da página completa; a
continuação precisa avançar. IDs repetidos geram erro, sem fusão silenciosa.

Uma continuação antiga não entra em outra geração da consulta. Tentativas
simultâneas da mesma página são bloqueadas. Falha preserva somente a seleção
válida anterior, identificada com instante; erro interrompe paginação até
atualizar a lista. Recusas401/403/404/409 retiram também as páginas acumuladas.
A URL representa a consulta aplicada; Voltar/Avançar e recarga restauram campos
controlados sem substituir o formulário focado. Consultas não recebem novo
rascunho de negócio, persistência, RPC ou autoridade própria.

Passaram21 unitários/de contrato, tipos e lint dirigido. São12 cenários
distintos qualificados nos três perfis: os seis consumidores anteriores
passaram na coorte inicial; os seis novos passaram na rodada final. Houve18
execuções, com14 aprovações e quatro falhas iniciais de expectativa do teste.
Três asserções incluíam o alerta global do Next.js, fora da região consultada;
foram delimitadas à região dos relatos. No iOS, clicar não conservava foco no
botão como a ativação pelo teclado; o teste agora comprova foco antes de Enter.
A espera da resposta retida começa imediatamente antes de liberá-la, sem
alongar timeout. Os dois casos de navegação já aprovados foram repetidos para
conferir o método ajustado. Produto inalterado depois da coorte inicial.
Relatório, capturas e contextos das quatro falhas estão preservados.

Com Auth real,102 relatos percorrem todas as páginas na interface e na API,
em ordem exata comparada com SQL independente. A referência mais antiga,
busca no texto original, tipo, estado, período, recarga, vazio verdadeiro e
recusa400 de período invertido foram conferidos. Sete respostas200 corrompidas
não substituem a leitura válida; cursor inconsistente e503 na continuação
não avançam nem fabricam vazio.403 retira as linhas acumuladas.

Uma página real retida foi entregue após mudar tipo/busca e não entrou na
seleção atual. Foco, Voltar/Avançar e recarga mantiveram os filtros. A retirada
real de stock.family.read deixou somente o relato da equipe permitido pela
RLS; retirar também stock.team.read produziu a lista autorizada vazia. Não se
converteu esse contrato de leitura parcial numa recusa global presumida.
Relatos, complementos, decisões e ledger completos permaneceram iguais após
consultar/navegar, sem POST operacional. O consumidor anterior de confirmação
perdida conservou recuperação, recusa de nova escrita/leitura e débito único.
Axe a320px passou; a captura Chromium foi inspecionada.

Sem SQL novo; dry-run remoto vazio em205.05.5 fechado localmente; próximo05.6,
agenda. Cinco dos dez pontos de listas conferidos; estimativa da etapa05
mantida90%, sem inferir avanço geral pela contagem dos pontos. Os105 critérios
mantêm56 PASS locais e49 PARTIAL. Restam05.6–05.10 e gates conjuntos/visuais.
DOC-B permanece10% e DOC-A/C/D pendentes, incluindo os novos PDFs aprovados.
CI do SHA publicado continua necessária.

## D3.74 — agenda, ponto 05.6

Base24376c6. A reprodução do baseline mostrou 122 plantões autorizados na API,
em ordem exata por SQL independente, enquanto o noturno iniciado antes do mês
não aparecia na tela. Ele agora aparece uma vez no primeiro dia do período,
identificado como iniciado anteriormente, com seus horários preservados.
Os demais continuam no dia de início, sem duplicação de plantões noturnos.
A grade usa agrupamento derivado por dia e conserva filtros de pessoa/situação.
Um filtro de equipe oculto por perda da capacidade não limita a visão pessoal.

O envelope preserva data e acrescenta paciente/período. Servidor e consumidor
reutilizam o schema completo da referência da agenda, sem duplicar seu contrato.
São conferidos coleções, identidades únicas, campos nativos de paciente e
horários compatíveis com o período. As ocorrências completas da série continuam
admitidas fora da grade, pois são necessárias à revisão. O limite nativo entre
datas é mantido: diferença até 42 dias inclusive. Datas inválidas, invertidas
ou mais extensas recebem400 antes de chamar a RPC.

O consumidor usa useScopedRead. Só preserva consulta válida do mesmo período,
com instante; ações da agenda ficam suspensas durante atualização ou falha.
Outro período não herda linhas anteriores e recusas401/403/404 retiram dados.
A consulta não ganha rascunho de negócio, persistência ou autoridade própria.
A autorização permanece na RPC nativa, com escopos pessoal e de equipe.

Passaram 28 unitários, tipos e lint dirigido. São 15 cenários distintos
qualificados nos três perfis: 12 aprovações iniciais e três finais. As 18
execuções após a correção incluem três apontamentos do axe: depois da captura
do cartão e mudança de viewport/filtro, o botão de mês estava parcialmente
recortado sob o cabeçalho fixo. A repetição exclusiva dos três casos de volume
usou auditFromTop já existente para estabelecer origem de rolagem/foco. Todas
as regras, controles, asserções e verificações de teclado permaneceram ativas.
O produto não mudou depois da coorte inicial. Relatórios, contextos, capturas
e geometria das falhas ficaram preservados. A falha real do baseline está
registrada separadamente.

Com Auth real, as 122 ocorrências nativas do mês corresponderam exatamente aos
IDs e à ordem por SQL independente, na API e na interface. Filtros de pessoa
e situação, troca/retorno de mês e o plantão do mês seguinte foram conferidos.
Sete respostas200 inconsistentes foram recusadas.503 do mesmo período mantém
leitura identificada e ações suspensas; em outro período não mostra dados
anteriores nem vazio falso. Uma resposta mensal real retida foi entregue
após a seleção atual e não a substituiu. Recusa403 limpa o conteúdo.

A retirada real de leitura pessoal/equipe retorna403 e a recarga não expõe
agenda. A identidade profissional real vê somente seus plantões; paciente
sem vínculo retorna404 e períodos inválidos400. Consultar/navegar não envia
POST de agenda e preserva plantões, séries, tipos, propostas, eventos e
atribuições BAL completos. Os consumidores antigos mantiveram publicação,
conflito409, duração noturna, contexto móvel, recuperação503, foco pelo teclado
e revisão imutável antes/depois nas quatro larguras. Axe a320px passou e o
cartão do plantão anterior foi inspecionado, com aviso e datas legíveis.

Sem SQL novo; dry-run remoto vazio em205. Ponto05.6 fechado localmente;
próximo05.7, catálogo e contas. Seis dos dez pontos de listas conferidos;
estimativa da etapa05 mantida90%. O resumo de eventos ainda tem limite nativo100:
histórico completo continua no ponto05.10 e não é aprovado por este fechamento.
Os105 critérios mantêm56 PASS locais e49 PARTIAL. Restam05.7–05.10 e gates
conjuntos/visuais. DOC-B permanece10% e DOC-A/C/D pendentes, incluindo os novos
PDFs aprovados. CI do SHA publicado continua necessária.

## D3.75 — catálogo e contas, ponto 05.7

Base0d4b7b1. O limite tabular1000 foi reproduzido com Auth real: a consulta
antiga retornou1000, com total exato maior. A nova catalogue_workspace retorna
um JSON completo de itens e sucessores, em um snapshot estável. É SECURITY
INVOKER, com search_path vazio, execução somente authenticated e a mesma RLS.
Exige vínculo e contexto Auth atuais; não concede acesso pelo UUID informado.
Não altera tabela, saldo, histórico, permissões anteriores ou identidade.

GET catalog/admin preservam campos, IDs, aliases e semântica dos sucessores.
Servidor e consumidor conferem paciente, total, seleção e unicidade. A tela do
catálogo usa useScopedRead e paginação local, sem rascunho para filtros. A
página efetiva acompanha a coleção sem apagar a consulta. Falha conserva só
leitura válida da mesma seleção, identificada; novas ações da lista aguardam
atualização e recusa remove o conteúdo. Os editores de negócio continuam próprios.

A tela global usa o endpoint paginado existente, com30 linhas, busca e total
exatos. O pai não baixa mais a lista tabular inteira para essa tela. Página,
consulta, tamanho e identidades são conferidos também no seletor global de
vínculos. URL, Voltar e recarga conservam a busca; ela é aplicada por Buscar
contas/Enter. O teste anterior passou a submeter a busca explicitamente,
preservando todas as revisões e negativas. As quatro classificações globais
aprovadas foram mantidas; um valor histórico não reconhecido permanece
selecionado e não assume a primeira opção implicitamente.

Passaram31 unitários, tipos e lint dirigido, mais uma prova nativa com Auth
real. O catálogo com1005+ itens corresponde ao SQL independente, incluindo
origem inativa e sucessor tardios. Leitor autorizado passa; anônimo, paciente
estranho, outro contexto, modo global e vínculo revogado são recusados. Grants,
invoker e STABLE foram conferidos, com catálogo, orientação e ledger intactos.

São30 cenários distintos de navegador qualificados nos três perfis, por24
aprovações iniciais e seis finais. Das33 execuções, três falharam realmente no
reinício do editor antigo: depois de reconhecer o resultado, o formulário
aceitava escolha/motivo antes da nova leitura e os campos eram sobrescritos.
A correção limpa somente os campos/hash transitórios depois de reconhecimento
ou descarte explícitos, aguardando o snapshot novo. Uma resposta real retida
agora comprova ausência de campos editáveis nessa janela. O teste preservou
reativação, recuperação, autoria, saldos e PDF; outro consumidor de destinatários
conferiu o mesmo reconhecimento. As três falhas e seus contextos estão preservados.
Os24 casos iniciais usam ramos não alterados por essa correção e foram conservados.

As provas percorrem101 resultados tardios de catálogo em sete páginas e101
contas em quatro páginas, com ordem/IDs independentes por SQL. Há mais de1000
materiais e identidades sintéticas na origem. As contas-alvo são fixtures de
Auth locais; os operadores de leitura usam sessões Auth reais. Aliases,
inativos, predecessores, filtros, respostas incompletas, página/consulta/total
incorretos,503,403, perda real de gestão do catálogo e recusa do diretório para
administrador local foram conferidos. Ler não modifica catálogo, sucessores,
estoque, fichas ou perfis-alvo. REQ/COM/ENT com100 materiais conservaram seleção,
alias, teclado, categorias e entrada manual. A proposta global conservou
idempotência/recusas de rebase; a edição global conservou revisão e isolamento.

Axe dirigido passou a320px e nos consumidores anteriores. A captura de contas
foi inspecionada, com identificação e controles legíveis. A captura da tabela
do catálogo confirma o item tardio, mas sua composição estreita ainda quebra
o estado e exige deslocamento para ações; a comparação integral permanece
em06.4. Não há aprovação visual ampla nem fechamento do editor global da etapa14.

A migration20261111095717 foi aplicada uma vez no remoto, antes do commit,
após preparo local sem reset, Auth e regressões. O dry-run isolou só essa
versão e terminou vazio. Local/remoto206: corpo, SQL registrado, propriedades
e grants iguais. Somente função de leitura; nenhum seed, Auth, Vault, reset,
backup redundante, merge ou produção. O CLI local de advisors teve timeout de
conexão; o MCP remoto concluiu antes/depois, com as mesmas cinco classes e
contagens anteriores, sem aprová-las. [Recibo](CATALOGUE_LIST_REMOTE.json).

05.7 fechado localmente; próximo05.8, notificações. Sete dos dez pontos de
listas conferidos; estimativa da etapa05 mantida90%. Os105 critérios conservam
56 PASS locais/49 PARTIAL. DOC-B permanece10% e DOC-A/C/D pendentes, incluindo
os novos PDFs. CI do próprio SHA, instalação limpa, evolução legada, integração
e demais gates continuam necessários.

## D3.76 — notificações, ponto05.8

Baseaacc89d. A central já paginava, mas o parser aceitava páginas curtas,
identidades repetidas e metadados de outra seleção. A contraprova unitária
aceitou uma linha quando total21 e página1 de20 exigiam20. Agora o envelope
conserva os campos anteriores e identifica também unread e surface. O parser
confere paciente, página, tamanho, filtro, sino/central, comprimento esperado,
identidades únicas e linhas compatíveis com os filtros. A contagem do sino,
que exclui silenciosas, permanece independente do total filtrado da central.
A autorização continua na sessão revogável e RLS; metadados não a substituem.

A URL conserva página e filtro, com recarga e Voltar. A primeira coorte aprovou
15 dos21 cenários; os seis novos encontraram uma falha real: o checkbox era
controlado pela URL e demorava a responder ao clique. O estado local agora
responde no evento e se reconcilia com a URL sem remontar o campo. O controle
e a consulta compartilham a seleção imediata. Ao navegar pelo histórico do
navegador, a seleção da URL volta a prevalecer. Não há rascunho de negócio,
persistência local, replay ou alteração do cache privado.

As seis repetições exclusivas passaram:21 cenários distintos qualificados por
15 aprovações iniciais e seis finais, em27 execuções totais. Falhas, relatórios
e capturas iniciais estão preservados. Os15 cenários antigos conservam suas
aprovações e asserções; a correção posterior afeta somente a seleção da central,
coberta pelos seis casos finais. As19
verificações unitárias, tipos e lint dirigido passaram. Não foram reduzidas
regras, timeouts, asserções de autorização ou testes anteriores.

Auth real, API e banco local guardado comprovaram102 avisos em todas as seis
páginas por ordem/IDs de SQL independente, inclusive o mais antigo. Filtro,
recarga, Voltar e sino sem silenciosas mantêm os resultados corretos. Respostas
de outra página, tamanho, filtro, superfície ou paciente, página curta e ID
repetido são recusados.503 conserva só a leitura válida da mesma seleção;
mudar filtro não mostra dados anteriores como atuais, nem inventa vazio.
Uma resposta real retida não substitui o filtro atual.403 retira os avisos.

Consultar e navegar preservam o conteúdo integral de avisos, documentos,
eventos e estoque, sem POST. A marcação explícita altera somente seen_at do
aviso escolhido; os fatos documentais e o ledger continuam iguais. Os testes
anteriores preservam foco/fechamento do sino, contexto global sem leitura
ampla, ausência de ciência e separação de evidência controlada do provedor.
Axe mantém todas as regras; captura da página antiga a320px inspecionada.
Isso não é homologação física de Android/iOS nem aprovação visual global.

Sem SQL novo, dry-run remoto vazio em206 antes do commit. Oito dos dez pontos
fixos de listas estão conferidos. Restam05.9 propostas antigas e05.10 auditoria
e históricos; os105 critérios continuam56 PASS locais/49 PARTIAL. DOC-B10%,
DOC-A/C/D pendentes, Sonar adiado e demais gates preservados. PR7 Draft, sem
merge, produção ou ativação externa. [Resultados](OPERATIONAL_LISTS_VALIDATION.json).
