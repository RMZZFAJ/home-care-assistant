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
