# Tentativas e correções do procedimento

- B2.0: criar goal retornou meta ativa já criada por `/goal`; a meta original
  foi mantida. Nenhum resultado de auditoria foi afetado.
- B2.0: algumas leituras combinadas excederam o limite de saída. Documentos
  obrigatórios foram retomados em blocos e por campos relevantes, sem tomar
  truncamento por leitura completa de todos os atributos auxiliares.
- B2.0: o npm da instalação nvm era 11.6.2, embora o shim selecionasse o npm
  global 11.21.1. O helper foi ajustado para chamar o CLI global explicitamente
  com Node 24.22.0; baseline.json registra o par correto.
- Reconhecimento de contratos: nome hipotético requisition_lifecycle_status
  não existe. A exportação somente leu metadados, falhou antes desse arquivo e
  preservou os cinco anteriores. Descoberta subsequente usa nomes existentes.
- Pesquisa PowerShell com glob no argumento de path do rg gerou erro123;
  buscas seguintes usam diretório e `-g`. Não houve alteração do produto.
- O exportador inicialmente recusou nomes versionados contendo dígitos; a
  validação passou a aceitar identificadores SQL simples com dígitos após o
  primeiro caractere. Nenhuma função do produto foi modificada. O helper de
  crédito de COM chama-se credit_purchase_receipt, não
  validate_purchase_receipt.
- A primeira preparação Auth criou sete identidades fictícias e um paciente,
  mas tentou selecionar contexto global para convidado ainda sem vínculo e
  recebeu42501. O harness foi corrigido para autenticar sem assumir autoridade
  global e retomar convite pendente existente. Dados válidos foram preservados;
  essa recusa é falha de procedimento, não defeito de convite do produto.
- B25-15 primeira tentativa esperou extensão do prazo semanal ao adiar reconto,
  mas a obrigação física já estava counted. O contrato estende apenas obrigações
  ainda pending e preservou corretamente o prazo histórico da já contada.
  A assertion do auditor estava errada. A transação de aprovação tinha rollback;
  o pedido sintético inicial foi conservado. Resultado original em
  b25s-initial-attempt.json; ensaio corrigido distingue reconto de obrigação
  pendente.
- B27-08 esperava retorno do vínculo revogado no retry de convite aceito;
  produto
  recusou explicitamente42501 membership revoked. Ambos preservariam autoridade,
  mas a expectativa do harness era incorreta. Original em
  b27-initial-attempt.json;
  retomada `--resume` conserva os sete cenários anteriores e testa a recusa
  real,
  sem recriar as entregas ou repetir revogações.
- B29-01 leu motivo no topo de body do evento; o snapshot guarda esse atributo
  em body.event. A reabertura já tinha ocorrido corretamente. Tentativa original
  preservada em b29-initial-attempt.json; retomada usa a prova anterior do
  arquivo
  e o estado cancellation_pending existente, sem repetir o cancelamento.
- B29-02 primeira preparação criou COM por admin, que corretamente nasce
  aprovada; tentou aprovar novamente e obteve400. Família sem capacidade de
  aprovar obteve403. O cenário de concorrência precisava de COM emitida por
  familiar e dois administradores distintos; corrigiu-se apenas o harness.
  b29-second-attempt.json preserva o ocorrido. A COM sintética original ficou
  preservada, sem aquisição/crédito. Regex do helper Auth foi ampliada para
  permitir o nome já conhecido admin2; a recusa anterior não era do produto.
- B29-04 recebeu201, mas o read-back usou coluna reason inexistente no ledger.
  b29-third-attempt.json conserva a falha. Retomada localiza o movimento novo
  por paciente/produto/ator/quantidade/instante e apenas lê as colunas
  existentes;
  não repete correção nem inventa snapshot anterior que não foi persistido.
- Checks iniciais de lint apontaram apenas import sem uso e declaração de
  globais nos helpers novos; Markdown apontou linhas longas e snapshots brutos
  salvos como md. Apenas artefatos B2 foram corrigidos: formatação sem redução
  de regras, raw em txt/yml e ordem mestra byte a byte em txt. Logs iniciais
  preservados e checks.json aponta para eles; últimas execuções passaram.
- Git usa core.autocrlf=true. O staging final seleciona preservação de bytes
  por comando e compara cada blob do index ao manifesto, sem alterar a
  configuração global ou introduzir configuração de produto.
- A primeira checagem do index com autocrlf=false interpretou CRLF como espaço
  final e apontou os terminadores, embora hashes dos blobs estivessem corretos.
  Textos autorais foram normalizados para LF; anexo mestre permanece byte a byte
  CRLF original. A checagem Git usa cr-at-eol para reconhecer terminador, sem
  ignorar espaços finais reais ou enfraquecer testes do produto.
