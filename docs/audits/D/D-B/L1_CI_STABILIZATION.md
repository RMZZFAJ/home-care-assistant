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
