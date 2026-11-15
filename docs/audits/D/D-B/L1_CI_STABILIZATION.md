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

## Evidência em execução

A rodada ampliada de 62 jornadas terminou com 46 aprovações e 16 falhas
identificadas. A seleção seguinte contém 65 casos: as falhas restantes, os
consumidores ainda não repetidos e uma contraprova com autosave deliberadamente
retido. O resultado dessa seleção continua pendente; não há aprovação global.

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
