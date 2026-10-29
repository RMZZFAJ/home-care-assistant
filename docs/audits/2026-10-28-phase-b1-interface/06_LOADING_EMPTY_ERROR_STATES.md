# B1.5 — Carregamento, atualização e espera

O principal problema de estados não é falta universal de spinner. É atribuir
significado de negócio a valores ainda desconhecidos: vazio antes de resposta,
configuração falsa antes de consulta e processamento depois de um prazo, mesmo
quando a consulta já terminou sem pendências.

## Escopo e taxonomia

[06_LOADING_STATES_MATRIX.csv](06_LOADING_STATES_MATRIX.csv) registra estados
aplicáveis por superfície, comportamento atual, proposta visual/frase/CTA,
foco e condição de saída. A coluna de proposta não afirma que o estado já
existe. Componentes sem consumidor têm exclusão explícita. Demos fixas não
recebem estados fictícios de gravação. PDF é interface documental: seu GET
pode preparar um objeto, sem equivaler a uma nova decisão de negócio.

[QUERY_STATE_CATALOG.csv](evidence/QUERY_STATE_CATALOG.csv) localiza cada
chamada de consulta/comando em fontes UI, estados iniciais e dependências de
efeito. Uma consulta importada num hook pode atender várias telas; não contar
essas telas como provas comportamentais independentes.

INITIAL/LOADING significam informação ainda desconhecida; REFRESHING conserva
conteúdo anterior identificado como tal; READY e EMPTY_CONFIRMED exigem
resposta correspondente ao contexto atual. PARTIAL conserva seções válidas.
ERROR_RECOVERABLE e ERROR_BLOCKED têm saídas diferentes. SUBMITTING,
PERSISTED e UNKNOWN_RESULT dependem da certeza do comando. DELIVERY_PENDING
vem de tracking do canal, nunca do cronômetro. OFFLINE, STALE_CONTEXT e
NO_PERMISSION não devem aparentar READY operacional.

## Provas atuais e propostas específicas

- **Superfície / experimento:** Consumo, GETs de relatos e Flow retidos;
**Observado:** Nenhum relato registrado, nenhuma sugestão e canal aguardando
configuração antes das respostas; **Proposta exata e transição:** Consultando
relatos e disponibilidade do canal…; vazio/configuração só após200.
- **Superfície / experimento:** Mesma tela, liberar respostas reais200;
**Observado:** Vazio confirmado na fixture nova; aparência igual à fase
pendente; **Proposta exata e transição:** Preservar título e só então
apresentar ausência com ação Registrar ocorrência.
- **Superfície / experimento:** Sino, GET retido; **Observado:** 0 novas e Você
está em dia; **Proposta exata e transição:** Consultando suas notificações…;
não exibir zero como dado confirmado.
- **Superfície / experimento:** Sino, liberar500 sintético; **Observado:** Erro
e Você está em dia juntos; **Proposta exata e transição:** Não foi possível
atualizar as notificações. Consultar novamente; manter histórico acessível.
- **Superfície / experimento:** Estoque, saldos200 com2 produtos e histórico500;
**Observado:** Nenhum produto encontrado; a visão válida não é aplicada pelo
Promise.all; **Proposta exata e transição:** Mostrar saldos confirmados e
Histórico indisponível; Atualizar histórico sem repetir tudo.
- **Superfície / experimento:** Entregas, mudar para Concluídas e reter
consulta; **Observado:** ENT aguardando recebimento permanece sob filtro
Concluídas; **Proposta exata e transição:** Atualizando entregas para esta
seleção…; conservar dados anteriores explicitamente ou ocultar linhas
incompatíveis.
- **Superfície / experimento:** Entregas, liberar200 vazio sintético;
**Observado:** Vazio coerente com seleção; **Proposta exata e transição:**
Manter esse ramo, com ajuda específica ao filtro e opção Todas.
- **Superfície / experimento:** Perfil500 da etapa anterior; **Observado:** Erro
e Carregando perfil simultâneos; **Proposta exata e transição:** Não foi
possível carregar seu perfil. Consultar perfil novamente; sair de loading.
- **Superfície / experimento:** Documento, avisos200/data[] e avançar relógio do
browser11s; **Observado:** Texto concluído volta a avisos continuam sendo
processados; **Proposta exata e transição:** Preservar conclusão; encerrar
acompanhamento sem inventar pendência.
- **Superfície / experimento:** Painel profissional carregado, browser offline;
**Observado:** Conteúdo continua; leitura de sync falha e
navigator.onLine=false; status sr-only ainda conectado no instante medido;
**Proposta exata e transição:** Sem conexão. Estas informações podem estar
desatualizadas; reconsultar antes de confirmar comando.

Evidências: [b15-states.json](evidence/b15-states.json) e
[b15-followup.json](evidence/b15-followup.json). As três folhas foram abertas.
A primeira tentativa do filtro usou label Situação; o real é Situação das
entregas. A falha foi preservada e a repetição concluiu.

O teste de prazo usa relógio virtual do Playwright, não latência de11 segundos
medida no mundo real. A fixture não retornou valor explícito de
shareWaitSeconds; o conflito entre configuração e consumidor é estático:
o componente recebe id/code/version e fixa10.000 ms. A regressão de mensagem
foi reproduzida independentemente desse valor.

## Refresh, dados antigos e contexto

`DocumentHistory` oferece modelo melhor: filtros disparam loading, erro tem
retry, vazio ocorre em ramo de consulta concluída. `DeliveryInbox` inicia bem,
mas não reativa loading quando muda filtro. `StockConsole` reativa loading no
botão manual, não em todas as dependências; o nome do produto do histórico
também depende de uma visão filtrada. A Fase D deve testar transições, além
do primeiro carregamento.

Mudança de paciente exige invalidar conteúdo incompatível e preservar rascunho
somente na chave daquele usuário/paciente. Não basta trocar o nome no header.
O provider e as APIs revalidam contexto; B1 não demonstrou bypass. A ausência
de indicação visual de desconexão é risco de entendimento, separado da
autorização revalidada pelo servidor.

Estado parcial precisa preservar a validade temporal: saldo obtido agora não
é contagem física agora; um documento de versão anterior continua histórico
válido. Mostrar hora/fonte e oferecer reconsulta da seção que falhou. Não
silenciar erro nem transformar tudo em skeleton com perda de edição.

## Esperas, foco e recuperação

O helper de API tem30s; DocumentActions usa10s para PDF e avisos; upload raw
fetch não usa esse helper. Timeout não significa rollback. Desabilitar somente
o que poderia alterar intenção; manter resumo e recuperação. Mensagens devem
ser status para espera e alert para falha; preservar foco durante refresh,
levando-o ao resumo de erro após envio quando houver decisão a tomar.

Anexos e contatos pessoais também precisam de estados próprios. Uma falha de
consulta não deve afirmar nenhum arquivo ou manter loading sem saída. Uma
resposta tardia do paciente anterior não pode substituir o contexto novo.
Esses ramos foram lidos; não foram todos induzidos. Sua cobertura não é verde
por associação com os dez cenários capturados de B1.5.

## Segunda passada e contraditório

Conservar lista durante refresh reduz cintilação, mas exige indicar a qual
filtro ela pertence. Esvaziar tudo também pode induzir ausência. A proposta é
uma escolha por domínio, testada com pessoas, e não uma regra única para todos
os consumidores.

Recusados: spinner eterno como solução de erro; atualizar a página inteira
como única recuperação; sucesso de canal por cronômetro; percentual de espera
sem progresso mensurável; ocultar todos os dados por falha secundária; bloquear
leitura histórica porque não há rede. Não há homologação de rede celular,
perda prolongada de conexão ou leitor de tela nesta etapa.
