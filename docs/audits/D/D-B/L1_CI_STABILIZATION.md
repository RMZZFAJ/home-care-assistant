# L1 — estabilização dos navegadores e Sonar

## Escopo reaberto pelo responsável

A CI [43646730287](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/43646730287),
do SHA `302d6c564225725013920fa25128a5024597c216`, passou nas validações
Windows/Ubuntu, instalação limpa, evolução legada e 760 integrações nativas.
Os navegadores acumularam falhas; quatro jobs atingiram o prazo e os dois iOS
terminaram com falhas. O início desses jobs é somente evidência histórica.
O responsável reabriu a execução para corrigir os navegadores e a qualidade.
A continuação permanece em `feat/phase-d-implementation`, sem merge ou produção.

Os logs dos seis jobs foram inventariados por caso de origem: 101 casos distintos,
incluindo consumidores que ainda esperavam a apresentação anterior ao L1.
A correção distingue defeito de produto, expectativa substituída pelo responsável
e falha de sincronização do teste. Não remove permissões, oráculos nativos,
verificação de bytes, testes ou regras para obter verde.

## Causas e correções

- **Campos desapareciam ao comparar nova referência COM/ENT.** A captura
  temporária inclui os controles bloqueados durante a conferência; a submissão
  continua usando o formulário e a autorização oficial. Conservar motivo,
  quantidades e nova concordância explícita é obrigatório.

- **Resposta BAL legítima recusada por ordem de chaves JSONB.** Comparação
  semântica de cada campo e linha, mantendo autoria, versão, paciente e
  documento. Teste aceita somente mudança da ordem das chaves e rejeita
  conteúdo diferente.

- **Conflitos transacionais PT409 apresentados como erro genérico.**
  Mapeamento restrito das mensagens conhecidas para 409, sem classificar erros
  arbitrários como conflito.

- **Troca de contexto ou sessão desmontava o editor próprio.** A sobreposição
  mantém o conteúdo montado e inerte durante a transição. Nenhuma autoridade
  do paciente é conservada como permissão do navegador. Revogação real e falha
  de troca não autorizam replay.

- **Rascunho longo encobria tentativa oficial incerta.** A recuperação oficial
  congelada tem prioridade, sem oferecer descarte como substituto da consulta
  do resultado.

- **Declaração genérica ignorava a leitura da origem selecionada.** A
  disponibilidade de preparar considera a custódia efetiva. Consulta/descarte
  privados continuam separados da autoridade operacional.

- **Pequenos textos, hover do perfil e filtros não atendiam contraste ou
  largura.** Ajustes locais conservam a composição L1; filtros podem quebrar
  linha, sem ocultar conteúdo.

- **Captura de tabela estreita tratava a largura completa como visível.** O
  laboratório usa rolagem horizontal. A captura verifica a interseção visível
  e a região recebe foco somente com overflow real; setas precisam alcançar as
  colunas.

- **Consumidores exigiam salvar decisões curtas ou centros de rascunhos.**
  Alinhamento ao último preenchimento contextual e à consulta oficial de
  resultado, conservando as negativas, concorrência e ausência de duplicidade.
  APIs e recibos históricos permanecem compatíveis.

- **Consumidores ainda liam atendimento completo após recebimento menor.** A
  avaliação familiar precisa ser renovada. Um recebimento físico menor não
  comprova sozinho o atendimento completo da REQ.

- **Contratos HTTP privados repetiam o mesmo limite de entrada.** Fábrica
  compartilhada com esquemas e RPCs próprios por domínio. Rejeição de filtros
  duplicados, cache privado e validação antes de autenticação continuam
  testados.

## Sonar e referência HTML

As duas ocorrências S8707 em `make-sheets.cjs` e `cli-file-path.mjs` foram
classificadas como falsos positivos após rastreamento independente de entrada,
transformação e destino e contraprovas dos guardas. Não houve exclusão de arquivos,
relaxamento de regras ou enfraquecimento dos guardas. A revisão está em artefatos
gerenciados do Codex Security, fora do checkout.

Os S6845 receberam foco condicional ao overflow real, sem papel interativo
artificial. O nome acessível do importador JSON foi acrescentado. A CSP do
laboratório agora autoriza somente o hash de seu script existente, em vez de
`unsafe-inline` para scripts. Estilos inline necessários ao laboratório foram
preservados. Chromium e WebKit provaram o funcionamento nominal e o bloqueio de
script e manipulador inline injetados; a revisão separada não identificou bypass.

Essa alteração de segurança/acessibilidade não altera a aparência do laboratório,
mas altera o arquivo: SHA-256 original normalizado LF
`5d328faa961136beb4b7e814b0c9dcf54adb5058f67890d6f36cd0be85fb0986`;
novo normalizado LF
`a0bf138d43640f516178b8067761490aa15d67d84dac43e30f0a43ff66a76e78`.
O script é o mesmo e tem o hash CSP
`Tc4QPVdckVwA2oOVSQB7AwnLg1XYovUNteoROzEqPSU=`.

O gate observado antes da publicação corretiva ainda estava ERROR: confiabilidade
C, segurança C e duplicação acima de 3%. As cinco ocorrências reais corrigidas
localmente precisam da nova análise do SHA publicado. O encerramento das duas
ocorrências falsas, sozinho, não constitui gate aprovado.

## Análise Sonar do conjunto publicado

A análise 65788d2d-8852-477a-abb9-2753dc869a9f do SHA
9af2cbcd6576d5f0f74b2e7090c74ce75741e4b0 passou no gate: segurança,
confiabilidade e manutenção A, duplicação dentro do limite e zero issues
abertas na consulta da PR7. A restrição de scripts e as correções de
acessibilidade foram reconhecidas.

O único aviso restante tratava de estilos inline do laboratório isolado.
A triagem estática encontrou somente estilos de templates próprios e geometria
numérica; os campos de comentários importados ou persistidos passam por escape
antes da renderização. O HTML da raiz não é servido pelas rotas da aplicação.
A ocorrência foi classificada como falso positivo, separadamente da correção
anterior de scripts. Não se alterou perfil, exclusão ou limite do gate.

O artefato gerenciado é
l1-remaining-style-csp-triage-9af2cbcd.md, SHA-256
13cbab4349417383345ac0d8c5da0aa928546d8db859cad02d7b51c2499dfc55.
Esta triagem não afirma segurança de hospedagens arbitrárias ou de um HTML
alterado pelo operador. Os testes de scripts anteriores permanecem evidência
separada; não foram apresentados como validação dinâmica dessa triagem.

## Evidência em execução

A rodada ampliada de 62 jornadas terminou com 46 aprovações e 16 falhas
identificadas. A seleção seguinte de 65 casos teve 54 aprovações e 11 falhas.
As repetições dirigidas seguintes confirmaram as correções de navegação,
conferência, Andamentos, PDF lento, COM e retomada PWA, conservando seus
oráculos oficiais. A comparação do início com o cenário E02-01 revelou uma
regra ausente: cards de início, histórico e Mais usam raio de 12px e a sombra
do laboratório. A regra foi copiada e a comparação passou em Chromium.
Não há aprovação global.

A estabilização acrescenta nome acessível aos painéis das abas, conserva a
referência de consumo em mudança sem nova versão e alinha a lateral intermediária
a 196px e o cabeçalho móvel às linhas de 58px e 46px do laboratório. A confirmação
da declaração aguarda a gravação própria em andamento; digitar continua possível.
Os oito testes de necessidade remanescente passaram com Auth real, incluindo
revogação após espera e tentativa concorrente. A negativa histórica reutiliza
somente a origem fictícia já identificada pela suíte: os onze protocolos físicos
locais estão ocupados. Nenhum registro foi apagado nem o contrato ampliado.

Trinta testes de validação/erros e 13 contratos HTTP passaram. A primeira prova
visual de BAL e agenda passou em cinco larguras, incluindo teclado, busca
reversível e ausência de efeitos oficiais. Rodadas anteriores já confirmaram
revisão BAL por item, recuperação de aplicação, chegadas COM com resposta perdida,
PWA com revogação real e histórico com mais de 201 eventos.

As repetições de navegador ainda estão em andamento. Resultado anterior, suíte
parcial ou CI pendente não aprovam o conjunto. Nenhuma nova migration ou alteração
remota foi necessária nesta estabilização. A CI do próximo SHA deve confirmar
as correções; aceite humano, aparelho físico e provedores continuam separados.

## Preparação da CI e nova publicação corretiva

A CI 43661980893 de 9af2cbcd passou Windows, Ubuntu, instalação limpa, evolução
legada e 760 integrações nativas. Cinco jobs chegaram ao E2E. O job ios-2
132658616278 falhou antes dos testes: Docker não conseguiu vincular a porta
local 54324 do container inbucket, embora o workflow já reservasse as portas
da stack. Não foi falha de migração, autenticação nem asserção de navegador.

A preparação agora repete somente o mesmo start da stack verificada quando
o diagnóstico identifica um container home-care-assistant e colisão nas
portas 54320–54329. São no máximo três tentativas, com esperas de 15 e 30
segundos. Erros diferentes e a falha final continuam sendo propagados. Nenhum
reset, stop adicional, fixture ou novo destino foi introduzido; migrations
continuam com execução única após verificar os endpoints locais. Nove testes
dirigidos cobrem recuperação transitória, esgotamento, outros destinos e erros
que não podem ser repetidos. A nova CI precisa validar essa preparação.

## Repetições finais dirigidas

Oito jornadas passaram em WebKit/iOS no build de produção local: cabeçalho
e navegação em cinco larguras, tabelas ENT/BAL com teclado e busca reversível,
consulta de referência ENT indisponível, Mais e Andamentos privados por @/#,
edição de plantão com conferência em 320px, cards de tarefas comparados ao
laboratório e declaração com autosave deliberadamente retido. O último caso
confirma que a revisão aguarda a própria gravação sem conflito artificial.

A importação histórica nova continua sem repetição local completa: os onze
protocolos físicos permitidos já estão ocupados por dados anteriores. A suíte
não foi excluída, o limite não foi ampliado e nenhum dado foi apagado. A falha
anterior da CI nesse caso era posterior à importação, no cabeçalho antigo; a
CI com banco novo conserva a jornada inteira como contraprova. Esse limite
local permanece explícito e separado dos resultados positivos acima.

A última repetição de necessidade remanescente passou em Chromium: emissão
única após resposta perdida e perda de escrita, motivo próprio na visão geral,
aceite parcial da origem e bytes do PDF anterior preservados. A reconciliação
dos 101 casos de origem inventariados encontra 100 com execução dirigida
aprovada nas rodadas corretivas; inclui a conferência ENT renomeada para o
comportamento em abas vigente. O caso restante é a importação histórica nova
limitada pela capacidade local descrita acima. Esse levantamento não substitui
a CI completa do SHA final nem o aceite visual do responsável.

## Continuação após disponibilização dos logs de 9af2cbcd

A importação histórica nova passou na CI desse SHA em Chromium, mobile e iOS.
Isso fecha a contraprova que a capacidade local não permitiu repetir; o limite
local e a preservação dos dados continuam registrados acima. Os 101 casos de
origem têm agora prova positiva em rodadas dirigidas ou nessa CI, sem equivaler
a aprovação integral de uma execução única no SHA final.

Os logs fechados também revelaram sete casos adicionais: ciência de cancelamento
REQ/COM com dimensões antigas do cabeçalho, foco do consumo após transição de
URL, foco incondicional na tabela REQ, revisão BAL extensa sem região navegável,
largura mínima intrínseca no grupo de aplicação e inspeção de tabela BAL antes
da atualização assíncrona de foco após resize. Foram conservadas todas as
asserções de autoria, resposta perdida, estoque, URL e bytes de PDF.

O detalhe de consumo agora espera a consulta e a transição de contexto liberarem
o conteúdo antes de transferir foco. O editor BAL usa a região de conteúdo
navegável já existente no componente compartilhado. A grade de formulários
usa coluna minmax(0,1fr), impedindo expansão intrínseca no Safari em 320px.
Os consumidores usam 65px/104px do laboratório e exigem foco somente quando
existe rolagem real. A inspeção BAL aguarda o contrato de foco após resize e
acrescenta prova de deslocamento real por ArrowRight; não desliga regras axe.

Cinco jornadas Chromium passaram após essas correções, incluindo o consumo
com débito único e atualização em outra sessão, ciência pessoal de cancelamento
REQ/COM e tabelas canônicas REQ/COM. Três jornadas WebKit/iOS passaram: atos
posteriores BAL, revisão familiar e aplicação independente com recuperação
por GET após revogação, incluindo 320px. A repetição final da inspeção BAL
com foco e ArrowRight explícitos passou nas cinco larguras em WebKit/iOS.

A análise Sonar de 4ebe385b encontrou S4036 no preparador que já chamava
Supabase por PATH. O reparo usa o resolvedor confiável existente tanto no stop
opcional quanto no start e migration; o PATH descendente contém somente o
diretório confiável do Docker. O retry continua restrito ao start. Dezesseis
testes inertes passaram; investigação e revisão independentes não encontraram
bypass ou regressão concreta. A inicialização real da mesma stack passou,
inclusive com PATH herdado substituído por um caminho sentinela inexistente.
Não foi executado restart, reset ou carregamento de fixtures nessa validação.

O relatório gerenciado é l1-prepare-cli-path-fix-review.md, SHA-256
80b4a43f488260f974e2798c073a90f892aeb343b940755eb4701346a42fda70.
A análise do próximo SHA deve reconhecer esse reparo; o gate A anterior pertence
a 9af2cbcd e não é transferido automaticamente. Windows e Ubuntu passaram
na CI de 4ebe385b. A publicação complementar exige CI própria até o início
correto das seis frentes de navegador. Não houve novas migrations, mudança
remota ou aceite global.

## Resultado completo de ec2c257c e continuação de 15/11

A CI 43667038344 terminou com falha após o ponto de partida dos navegadores.
Windows, Ubuntu, instalação limpa, evolução legada e 760 integrações passaram.
Chromium-2 e mobile-2 passaram, com uma tentativa instável cada. Chromium-1,
mobile-1, ios-1 e ios-2 falharam em casos de navegador. A conferência dos seis
logs identificou 15 casos de origem entre falhas persistentes e recuperações
na repetição. Esses resultados não modificam o registro histórico de partida
dos seis jobs nem constituem aprovação da interface.

As causas examinadas nesta continuação são:

- medidas antigas de cabeçalho em complementos REQ/COM e um seletor textual
  instável no painel do laboratório;
- estado COM repetido legitimamente no resumo e cabeçalho, exigindo consulta
  contextual no teste;
- foco de regiões roláveis após mudanças de largura, fonte, abas e isolamento
  modal: a atualização agora acompanha o layout e a visibilidade reais;
- controles parcialmente encobertos pelo cabeçalho fixo no celular: a rolagem
  reserva sua altura, conservando dimensões e aparência canônicas;
- leitura de resultado BAL e abertura da próxima programação enquanto o modal
  estava encoberto pela atividade, antes da confirmação: as provas aguardam o
  recibo aplicado ou a mensagem de registro, o fim da atividade e dos diálogos;
- espera de resposta tardia iniciada antes de uma retenção deliberada: o
  observador passa a ser armado antes de liberar a resposta, mantendo o teste
  da ordem invertida, foco, erro, vazio e ausência de mutação;
- uma jornada de reconto atravessou meia-noite e o plantão fictício expirou:
  somente esse cenário usa janela corrente estável, criada pelas mesmas RPCs;
  o comportamento e as fixtures que exercitam a fronteira de calendário ficam
  preservados;
- origem de foco e ativação de permissão Push precisam aguardar o isolamento
  de foco e a preparação efetiva; a negativa de troca de conta permanece;
- confirmação de transferência podia ser encoberta por aviso do rascunho
  consumido, após a consulta assíncrona desse mesmo preenchimento.

A repetição dirigida terminou, com os limites registrados abaixo. Nenhum teste,
regra axe, verificação
de largura, histórico, quantidade, autoria ou contraprova foi excluído. As
fixtures continuam no projeto local verificado, sem reset. Não há alteração
de migrations, autorização ou dados remotos nesta continuação.

A auditoria de composição P02 e a de Andamentos publicados usam a origem de
rolagem definida em auditFromTop. Centralizar uma região longa antes de auditar
a página inteira deixava outro controle parcialmente sob o cabeçalho fixo.
Todas as larguras, regras axe, capturas da região e provas operacionais ficam.
A reserva de altura do cabeçalho continua protegendo a rolagem por foco real.

## Diagnósticos adicionais de 15/11

Os seis diagnósticos TS2307/TS7006 citam
`private-operation-recovery-actions.tsx`, removido em 6ebcf0f1 pela política L1
de decisões curtas. Não existe fonte ou consumidor desse componente na árvore.
O resolvedor do TypeScript, com o tsconfig atual e a mesma origem de import,
resolve os quatro aliases para supply-drafts, workspace, floating e icon.
Os parâmetros sem tipo são consequência da análise da aba antiga fora do projeto.
Não foi recriado o componente nem alterada a configuração para ocultar erros.
A aba obsoleta precisa ser fechada no editor para retirar esses diagnósticos.

O calendário conserva região nomeada e rolagem horizontal por teclado. Seu foco
passa pelo mesmo observador de overflow e visibilidade das outras regiões:
somente uma região rolável entra na sequência de Tab; a versão desktop oculta
no celular sai dessa sequência. A jornada existente verifica foco, deslocamento
real por ArrowRight, versão mobile, publicação e recusa do conflito.

Os 14 avisos de segurança do print foram reavaliados individualmente na fonte
atual, mantendo as quatro ocorrências de ui_finalize. A triagem estática não
encontrou caminho acionável: bloqueio incondicional de Meta, contenção canônica
de PNG e de destinos documentais, seleção fixa PV, vetor de argumentos sem shell
e destinos literais ou escolhidos explicitamente pelo operador. Não houve
alteração desses utilitários, regeneração de evidências históricas, supressão
de regra ou encerramento de issue remota. O print não informa revisão ou fluxo
completo; a conclusão se limita aos fontes atuais, sem prova dinâmica de segurança.
O artefato gerenciado l1-sonar-editor-recheck-20261115.json tem SHA-256
604ac0e28618a873c8cd64e3e92d41aaca7341883a2e3b4a2d641a61610ea4b2.
A política resolvida e a explicação por ocorrência estão na mesma coleção.

## Provas dirigidas da continuação

Os 15 casos de origem têm prova positiva nas repetições dirigidas. A primeira
rodada WebKit aprovou 13 jornadas; as duas contraprovas de consulta de declaração
consumida após reabertura também passaram. A nova regressão retém a resposta
do rascunho consumido até depois da confirmação: conserva o acesso à ficha,
um único POST oficial e o estoque, e passou nos três projetos.

A rodada nos três projetos aprovou 22 de 24 execuções. As duas falhas foram
de Andamentos em Chromium/mobile, pela posição de rolagem descrita acima;
a repetição após o ajuste aprovou Andamentos em Chromium, mobile e WebKit/iOS.
P02 completo, saldo COM, estoque com resposta invertida, transferência bilateral
e as negativas de Push de dois perfis passaram nos três projetos. A emissão
P02 havia atingido o limite de tempo em uma tentativa local; o exemplar chegou
a ready em uma tentativa, sem erro, em 4,646 segundos. A repetição integral
aprovou os três projetos em 45,8/40,2/44,3 segundos, sem aumentar timeouts.
Uma rodada com duas falhas de conexão ao Auth local foi igualmente substituída
pelas repetições integrais positivas, sem alteração de Auth.

A agenda já passou em mobile e WebKit/iOS com foco, ArrowRight e versão oculta
fora do Tab, incluindo confirmação positiva antes da próxima programação.
Chromium alcançou a auditoria axe final, mas esgotou o orçamento local padrão
de 30 segundos. O banco local conserva 6.810 pacientes; o seletor no contexto
capturado contém milhares de opções. Esse único caso passou em 30,7 segundos
com prazo local de 60 segundos, sem alterar o prazo da CI ou qualquer asserção.
A confirmação positiva passou nos três projetos; Chromium usou o prazo local
explicitado acima. ESLint dos fontes alterados, Markdown e os builds
de produção com TypeScript passaram. As matrizes preservam gates humanos,
aparelhos e provedores; a CI do próximo SHA continua necessária.
