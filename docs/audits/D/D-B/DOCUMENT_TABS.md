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
