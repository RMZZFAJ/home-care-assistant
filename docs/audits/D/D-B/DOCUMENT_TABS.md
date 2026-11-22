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

## D3.65 — conferência e conciliação das entregas

Base c57c613. O ponto fixo 04.3 distingue preparação, conferência pessoal,
divergência, pedido de cancelamento, referências de conciliação, proposta de
regularização e encerramento administrativo. Material físico ainda desconhecido
mantém orientação própria mesmo depois do encerramento administrativo. Uma
proposta não vira decisão e outra pessoa não substitui o aceite pessoal do
recebedor indisponível. O atalho seleciona e foca Atendimento ou Versões e
integridade conforme o registro preservado, sem executar comando.

O estado nativo confirmed também pode resultar da conciliação de uma parcela
como devolvida ou faltante. O marco Recebimento deixava de considerar essa
distinção e aparecia satisfeito só pelo estado. Agora recebimento integral
exige todas as linhas integralmente conferidas e emissão comprovada. Uma
conferência encerrada com diferenças tem identificação própria. A parte
devolvida ou faltante não é quantidade recebida. O vínculo REQ conserva o
atendimento já sustentado pela parcela aceita, sem exigir quantidade que a
REQ não define. Ausência da
referência integral permanece desconhecida. Quantidades aceitas e seus autores,
expedição, vínculos e movimentos preservam os contratos existentes.

A orientação ENT identifica leitura antiga após falha, fica suspensa enquanto
uma operação está aberta e transfere foco ao seguir sua aba. Transferências
ainda sem expedição conservam o fluxo próprio do ponto 04.4. A conciliação de
uma parcela não recebida desta ENT continua sendo fato desta expedição; não
implementa nem substitui a devolução autônoma equipe→família do complemento.

Passaram 24 unitários em três arquivos, tipos e lint dirigido. A primeira
coorte de produção teve 21 aprovações e seis falhas, correspondentes aos mesmos
dois cenários nos três perfis. Um consumidor antigo ainda buscava literalmente
o texto anterior do cabeçalho de cancelamento. O caso novo esperava apenas um
item REQ atendido, embora ambos tivessem quantidade aceita positiva. A REQ não
define quantidade solicitada; receber parte da expedição pode atender seu item.
A expectativa foi corrigida para 0→2→2: antes do aceite, depois do aceite parcial
e depois da devolução da parte não recebida. O teste do consumidor passou a
buscar o texto atual, conservando as verificações de autoria, conciliação,
consumo, recuperação e estoque. Nenhum contrato de atendimento foi alterado.
Relatório, screenshots e contextos das seis falhas foram preservados.

A repetição restrita aos seis casos passou nos três perfis. Dez unitários do
helper afetado passaram novamente, sem somá-los como novos testes. No conjunto,
27 cenários distintos de navegador qualificados: 33 execuções, 27 aprovações
e seis falhas iniciais de expectativa. A orientação confirmada com diferenças
foi a única ramificação do helper ajustada após a coorte, para explicitar a
independência do atendimento REQ; foi exercitada na repetição dirigida.

As comparações SQL independentes confirmam que leitura, navegação e atualização
não alteram ficha, linhas, eventos, regularizações ou ledger. A coorte abrange
vínculo REQ, aceites, devolução da parte não recebida, cancelamento com trânsito,
falha503 e recuperação, proposta independente, parcela desconhecida, apuração
posterior, retomada de conciliação decimal e compatibilidade COM. Conserva os
consumidores existentes de cancelamento com consumo, confirmação perdida e
PDFs, além do dossiê administrativo. A caixa de entregas conserva seu contrato;
o caso de apuração futura percorre a tarefa real até a ficha.

Tipos e lint passaram. Axe/overflow e o cabeçalho com diferenças a320px foram
conferidos, incluindo inspeção visual do exemplar Chromium. Sem alteração de
banco, contratos de comando ou permissões; dry-run remoto vazio em205. Ponto
04.3 qualificado no escopo declarado; próximo04.4. CI do novo SHA necessária.
DOC-A/B/C/D, incluindo devolução autônoma, novos atos de cancelamento,
aparência documental e retomada simplificada, conservam implementação pendente.

## D3.66 — preparação bilateral, entrega e devolução

Base fa017a7. O ponto fixo 04.4 trata da direção, concordância, expedição e
encerramento da preparação bilateral. A aparência e os componentes continuam
os do Modelo Integral. Entrega de materiais identifica família→equipe;
Devolução de materiais identifica equipe→família. Pares incompletos ou iguais
não recebem sentido presumido. Os tipos persistidos, protocolos, versões e
identificadores permanecem os existentes.

O console, a preparação, a revisão, os fatos e o cabeçalho da ficha bilateral
mostram o processo correspondente. O vínculo documental de origem permanece
opcional e sua ausência na devolução não é apresentada como erro ou pendência.
A capacidade de declarar sem vínculo já pertencia ao contrato nativo; a
implementação aproveita esse processo, sem tornar devolução um cancelamento
ou compensação de outra ENT. Os registros anteriores não são reescritos.

Antes da expedição, os marcos agora são Declaração, Concordância, Expedição e
Recebimento. Declaração registrada não é emissão ENT; concordância não expede
nem recebe materiais. Recusa ou retirada encerra a preparação sem criar fatos
físicos. Após expedir, os marcos e a orientação usam os fatos próprios da ENT,
preservando a distinção entre recebimento integral e conciliação com diferenças.
A orientação da devolução conserva esse nome no recebimento e divergência.
Os atalhos selecionam e focam a aba real, sem executar comandos.

Passaram31 unitários em quatro arquivos, tipos e lint dirigido. Os27 cenários
da coorte de produção passaram nos três perfis, sem falhas ou repetições por
erro. Após a inspeção a320px, o texto genérico do cabeçalho antes da expedição
foi substituído por uma explicação própria da preparação. O cenário completo
de devolução foi repetido nos três perfis, passando com build de produção e
nova inspeção visual. No conjunto:27 casos distintos qualificados,30 execuções
aprovadas. O ajuste final é exclusivamente esse texto compartilhado; os demais
ramos e consumidores conservam a prova da coorte inicial.

Os cenários novos registram pela tela entrega e devolução sem vínculo de origem,
com Auth real, API e banco local guardado. Declaração/concordância conservam o
ledger; expedição cria trânsito e recebimento tem autoria pessoal distinta.
A contraparte de uma devolução não recebe em nome do recebedor designado.
SQL independente compara documentos, linhas, eventos, transferências e ledger;
os dados, eventos e hash da entrega anterior permanecem intactos. Navegar e
seguir a próxima providência não enviam comando oficial nem alteram esses fatos.
Recusa e retirada preservam a preparação sem criar tarefa de recebimento.

Os consumidores existentes conservam declaração incerta com perda de escrita,
três autores, material inativo com saldo, recebimento parcial, PDFs, conflito,
retomada de campos nas duas direções e decisões agree/dispatch recuperáveis.
Os nomes de seletores afetados foram atualizados antes da execução, sem reduzir
suas verificações. Axe/overflow a320px passou nas duas direções e três perfis;
a inspeção visual final verifica a identificação e o texto da devolução. Não
é aprovação de toda a aparência ou prova de aparelho físico.

Sem alteração de banco, API ou autorização; dry-run remoto vazio em205.
O terminal PowerShell ficou sem pwsh.dll; a execução continuou com Node24.22.0
explícito via CMD, mantendo o mesmo runner, guardas, build e stack local.
Ponto04.4 qualificado no escopo declarado; próximo04.5. CI do novo SHA necessária.
DOC-B tem avanço parcial na nomenclatura e preparação bilateral. O complemento
ainda exige os novos PDFs, o ajuste da criação cotidiana ENT e a apresentação
das variantes em outras superfícies. Rascunhos simplificados, novos atos de
cancelamento e demais DOC-A/B/C/D continuam separados; essas partes não são
aprovadas pela existência do fluxo bilateral.

## D3.68 — orientação factual do BAL e fechamento do ponto04.6

Base697e103. O BAL passa a indicar preparação, revisão exigida, referência
alterada ou indisponível, conciliação registrada, reconto designado, falta de
designação e encerramento. A próxima providência abre e foca a seção real de
Contagem e revisão ou Versões e integridade. Atualização, falha de consulta e
operação aberta suspendem a orientação atual, usando os estados já existentes
da ficha. Os dados preservados não são apresentados como nova confirmação.

Uma conciliação comprovada permanece histórica após movimentos posteriores;
uma contagem pendente com referência antiga não aparece conciliada. Aprovação
sem protocolo ou aplicação comprovada não produz marco de contagem concluída.
Designar reconto não equivale a contar novamente. O contexto nativo também
pode trazer outra atribuição ativa do paciente: os marcos e a orientação agora
exigem uma atribuição de reconto vinculada ao ciclo desta ficha, conferida
contra a última atribuição desse ciclo. Uma tarefa ordinária ou de outro ciclo
não cria pendência de reconto neste BAL.

Passaram12 unitários distintos e24 cenários de navegador nos três perfis,
em uma única coorte com build de produção e fontes congelados, sem falhas,
repetições ou casos ignorados. O primeiro conjunto tinha11 unitários; o caso
de outra atribuição foi acrescentado antes da coorte e o conjunto final12
passou. Tipos e lint dirigido passaram. O tipo opcional do rótulo compartilhado
foi ajustado antes da coorte; não houve alteração de comportamento posterior.

Os casos novos usam Auth real e saldo real do banco local guardado. Uma entrada
posterior invalida a referência pendente e preserva o efeito já conciliado.
SQL independente compara documento, eventos, pareceres e todos os movimentos
do paciente; GETs, troca de aba e ativação do atalho por teclado não os alteram
nem enviam operação oficial. Delay/falha503 suspendem a orientação; recuperação
restabelece a consulta. A revogação real de bal.read produz403 e remove a ficha.
Axe e overflow a320px passaram para revisão exigida e facultativa, nos três
perfis; os dois avisos Chromium foram inspecionados sem cortes.

Os consumidores anteriores conservam seus oráculos: parecer facultativo com
resposta perdida/revogação sem nova baixa, referência alterada com adoção
explícita, substituição Juliana→Sheila, reconto sem contador, reconto facultativo
legado sem semanas inventadas e contagem agendada em duas etapas com resposta
perdida e PDF. Foram acrescentadas verificações das orientações reais, sem
retirar asserções de autoria, referência, recuperação, conciliação ou estoque.
As relações BAL de contagem, revisão, designação, retorno à ficha e PDF da
versão original foram conferidas; isso não aprova todas as171 relações globais.
Adiamento/configuração conservam seus contratos e pacotes anteriores, sem
mudança desses formulários, APIs ou banco neste incremento.

Sem SQL novo; dry-run remoto vazio em205. Os seis pontos04.1–04.6 da etapa04
ficam qualificados localmente no escopo anterior. Próximo05.1, estoques e
movimentos na conferência das listas. Os105 critérios mantêm56 PASS locais e
49 PARTIAL; a CI do novo SHA e a revisão conjunta continuam necessárias.
DOC-B conserva10%: a nova separação de parecer BAL e efeito de estoque ainda
exige implementação própria. DOC-A/C/D, PDFs novos, cancelamento, rascunhos
simplificados, aparência integral e demais gates permanecem nas etapas próprias.
