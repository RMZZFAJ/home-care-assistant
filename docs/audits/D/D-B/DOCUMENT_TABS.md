# Fichas em abas e marcos factuais

Incremento D3.30, base334b08c. Implementação da navegação nas quatro fichas;
paridade integral do Modelo Integral e conclusão da D-B continuam pendentes.
Os resultados por caso e hashes de fonte estão em
[DOCUMENT_TABS_VALIDATION.json](DOCUMENT_TABS_VALIDATION.json).

## Composição e preservação

REQ/COM/ENT/BAL usam abas reais de Visão geral, Materiais, Atendimento/Aquisição/
Contagem e revisão, Comunicações, Arquivos gerados, Anexos, Versões e integridade
e Auditoria autorizada. Os painéis permanecem montados; somente o selecionado
fica visível e participa da navegação acessível. Trocar de aba não descarta
formulários nem confirma uma operação. A URL conserva paciente, versão e
demais parâmetros; seleção inválida ou auditoria recusada volta à Visão geral.
Links anteriores de comparação por historyVersion continuam alcançando o histórico.

Os18 blocos anteriores de cada detalhe foram redistribuídos. Ações existentes,
incluindo ciência própria, arquivamento, cancelamento, vínculos, edição,
reconto, aquisição, recebimento e decisões, conservam suas condições. A ação
principal da ficha de suprimentos abre sua seção de operação. Permanecem
produtos completos, quantidades, observações, proveniência, parcelas, decisões,
destinatários, regularizações, referências, anexos, PDFs e versões.

Versões e aberturas da REQ continuam disponíveis aos leitores da ficha sem
exigir audit.read. A aba Auditoria direciona à consulta autorizada do paciente;
o link informa esse escopo e não se apresenta como auditoria exclusiva da ficha.
O registro de abertura fica fora dos painéis, com atualização de sua consulta;
navegação entre abas não cria novas aberturas ou ciência.

## Marcos e orientação

Marcos não são eventos de conclusão automática. Emissão histórica desconhecida,
ciência dispensada, aquisição dispensada, recebimento desconhecido e encerramento
administrativo mantêm estados próprios. Contagem cancelada sem protocolo não
recebe marca de contagem cumprida. Aprovação BAL, conciliação e reconto são
fatos independentes; uma designação pendente impede afirmar conclusão.
Quantidade é avaliada por linha, sem somar materiais de unidades diferentes.

Visão geral mantém Andamentos cronológicos e faixa de próxima providência.
Aviso de atualização durante edição e confirmação de operação têm estados
separados: uma leitura ao vivo não pode apagar a mensagem de parcela validada.
Não há alteração de API, RPC, autorização, estoque, assinatura, cache ou worker.

## Evidência e limites

Quatro testes unitários e28 cenários distintos de navegador passaram em
Chromium/WebKit, com reuso qualificado por consumidor e fonte. Incluem as
quatro fichas, ausência de novas gravações ao navegar, edição ENT, recuperação
de Andamento após troca de aba/reload, histórico sem auditoria, anexos, revisão
BAL, parcelas COM, notificações, ciência, transferência e compartilhamento PDF.
Build/tipos do runner e lint dirigido dos fontes e testes alterados passaram.

O registro JSON distingue rodadas, falhas, correções, repetições e reuso
qualificado. Testes antigos percorrem a navegação real; não forçam painéis
ocultos nem perdem suas asserções de negócio, teclado ou Axe. Comparação visual
com o HTML tem rede bloqueada e mede as abas em cinco larguras. A linha móvel
de contexto do paciente acrescenta51px ao cabeçalho do modelo, conforme o
contrato já documentado. Isso não aprova todos os detalhes do cabeçalho ou
outras superfícies da aplicação.

Contraprovas: a atualização ao vivo substituía a confirmação de parcela por
aviso de edição; agora os estados são separados. A faixa herdava fonte16px,
diferente dos14px do modelo; corrigida sem alterar a fonte explícita dos botões.
Uma rolagem retida ao redimensionar cortava um alvo sob o cabeçalho no WebKit;
o teste estabelece sua origem de leitura por largura, mantendo todas as regras
Axe e verificações de foco. Os consumidores antigos de ciência e transferência
agora consultam suas respectivas abas, sem retirar as asserções anteriores.

Local e remoto seguem165 migrations, última20261109091550, digest ordenado
igual e zero pendências. Este incremento não produz SQL: reconciliação somente
de leitura, sem reset, backup redundante ou fixtures remotas. CI do novo SHA,
paridade de todas as telas,66 composições/171 relações e gates humanos,
assistivos, físicos, operacionais e externos continuam separados. Sonar adiado
pelo proprietário, PR7 Draft e produção NO-GO. Backup e monitoramento não
recebem nova aprovação por esta mudança de navegação.

## D3.63 — estados e vínculos da requisição

Base 90f832d. O ponto 04.1 do plano finito foi qualificado localmente no
escopo de estados, atendimento, cancelamento e vínculos já definido. A faixa
de próxima providência distingue atendimento pendente/parcial, ciência e
designação familiar, conclusão, arquivamento, cancelamento e origem histórica.
Abre Materiais para acompanhar atendimento, Ciência e responsáveis para os
atos correspondentes e Versões e integridade para os registros encerrados.
Falha de atualização conserva a consulta anterior, identificada, e retira a
orientação atual até uma leitura válida. Nenhum atalho realiza um comando.
O atalho transfere o foco para a aba selecionada após a atualização React,
inclusive pelo teclado. Falha de escrita da ciência mantém a leitura válida;
não é apresentada como falha de consulta do acompanhamento.

As entregas são as referências já fornecidas por requisition_fulfillment.
Agora mostram situação e quantidade aceita com a unidade original. Várias
linhas de uma ENT no mesmo item são reunidas com soma decimal exata e chave
única. Quantidade ausente ou ilegível permanece desconhecida. Expedição,
compra, pendência de conferência, aceite e atendimento continuam distintos.
O leitor da REQ não recebe autoridade de ler outra ficha pelo vínculo.

Passaram 16 testes unitários e 27 cenários distintos de navegador em Chromium
desktop, Mobile Chromium e WebKit, com Auth real. Incluem as quatro famílias
documentais, cinco larguras e teclado; REQ pendente/parcial; ciência pessoal;
arquivo, cancelamento e importação histórica real; negativa de leitura ENT;
falha de atualização; recuperação de cancelamento e arquivamento; necessidade
remanescente com PDF anterior preservado; e Andamentos sem efeito operacional.
Os casos novos comparam fatos oficiais e ledger por leitura independente.

O diagnóstico inicial encontrou seletor que incluía o anunciador do Next,
uma preparação que já gerava ciência causal por expedição e uma identidade
sem leitura do histórico reutilizado. Os testes foram corrigidos para mirar
o aviso correto, usar expedição legítima sem representação familiar e consultar
o histórico com sua identidade autorizada. Não houve mudança dessas regras
do produto. A coorte de produção teve 26 aprovações e um timeout WebKit no
caso antigo de abas. A repetição dirigida passou com os mesmos fontes,
oráculos e timeout. A observação intermitente permanece identificada para a
validação conjunta; não é uma correção de causa demonstrada.

Tipos e lint dirigido passaram. Não há SQL novo; remoto205 com dry-run vazio
no fechamento do lote. A CI do novo SHA permanece necessária. O próximo ponto
do plano é 04.2, compra/doação. O complemento documental recebido durante a
rodada tem quatro resultados próprios DOC-A/DOC-B/DOC-C/DOC-D ainda pendentes,
incluindo os novos avisos e confirmação de cancelamento. Não reclassifica
este fechamento local como aprovação das novas regras. A implementação
documental e a simplificação de rascunhos permanecem no acréscimo aprovado.

## D3.64 — estados e próximas providências da compra e doação

Base 4e1768d. O ponto fixo 04.2 trata da aquisição, parcelas, chegada e
encerramento da COM. A orientação agora diferencia preparação, aprovação,
aquisição efetiva, chegada ainda não válida, conferência de parcela,
expectativa encerrada e registro terminal. Seu atalho abre Aquisição ou
Versões e integridade e transfere o foco à aba selecionada. Não confirma
uma operação. Doação conserva sua origem e recebe rótulo próprio nos estados
de aquisição em andamento ou registrada, sem criar outro tipo documental.

Havia uma falsa conclusão nos marcos: antes da aprovação, quantidades
aprovadas zeradas deixavam os indicadores de pendência falsos e eram
tratadas como etapas satisfeitas. Aquisição e conclusão agora exigem fase
operacional e fatos positivos de aquisição ou encerramento registrado.
Preparação e aprovação pendente não satisfazem esses marcos. Encerramento
da expectativa não dispensa chegada ou conferência, nem faz uma COM atender
uma REQ sem ENT aceita. Rejeição conserva a declaração e não gera crédito.

Falha de consulta mantém a última leitura identificada e retira a orientação
atual até uma consulta válida. Uma operação aberta permanece na versão de
trabalho; a orientação não a apresenta como leitura atual. Recusa de leitura
retira a ficha. A COM deixou de consultar o diretório de pessoas, pois não o
usa; o fluxo ENT mantém sua consulta. Comandos, permissões, recuperação,
parcelas, PDFs anteriores e ledger mantêm seus contratos.

Passaram 25 unitários nos três arquivos dirigidos e 24 cenários de navegador
em uma única coorte com build de produção, Auth real e stack local guardada,
sem falhas ou repetições. Oito cenários em cada perfil: Chromium desktop,
Android emulado e WebKit. A coorte conserva os testes existentes de retomada
de aprovação/aquisição/chegada entre sessões, confirmação perdida sem outro
fato, cancelamento, doação explícita, rejeição de parcela, encerramento P14 e
seus PDFs distintos. Os novos cenários comparam fatos oficiais e ledger por
SQL independente; navegar, reler e seguir a próxima providência não enviam
comando nem alteram esses fatos. Incluem preparação/aprovação, parcela
rejeitada e substituta, crédito único, negativa de leitura, falha 503,
recuperação da consulta, teclado/foco e ausência de consulta ao diretório COM.

Tipos e lint dirigido passaram. A auditoria de acessibilidade/overflow a
320 px e a inspeção visual do cabeçalho da doação foram realizadas; os casos
existentes conservam suas larguras e verificações. Sem SQL novo; dry-run remoto
vazio. CI do novo SHA ainda necessária. Ponto 04.2 qualificado localmente no
escopo declarado; próximo 04.3. A matriz conserva 56 PASS locais/49 PARTIAL.
O complemento DOC-A/B/C/D conserva seus resultados próprios pendentes; este
ponto não implementa a nova aparência dos PDFs, os novos atos de cancelamento
ou a simplificação dos rascunhos. Os ensaios móveis são emulação; gates humanos,
de aparelho real, provedores e operação permanecem nas etapas correspondentes.
