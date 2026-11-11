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
