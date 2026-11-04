# Ocorrências instrumentais

- Inventário inicial: guarda encontrou duas linhas com coluna ausente, antes
  de gravar CSV. Composição corrigida; não houve teste de produto.
- B55 SQL inicial: bootstrap de novas memberships executou ainda com claims
  do profissional. Guard vigente recusou corretamente “local administrator
  required”; transação abortou e conexão encerrou com rollback. O cenário não
  foi considerado defeito. Bootstrap passou a usar contexto SQL de serviço
  antes dos INSERTs; o teste de telefone manteve claims Auth reais. Conta Auth
  sintética já criada foi reutilizada, sem recriação ou alteração de contas
  anteriores. Nenhum token/telefone/ID pessoal é transcrito aqui.
- Consulta a documentação Meta em developers.facebook.com indisponível no
  extrator; caminhos inicialmente supostos no GitHub deram 404. Navegação pela
  árvore oficial foi adotada. Essas respostas não dizem nada sobre o produto.
- Buscas de fonte com glob como caminho literal no PowerShell foram recusadas;
  passaram a usar diretório e filtros `-g`. Nenhuma mutação decorreu da busca.
- CLI Playwright: distribuição em cache esperava Chromium1247 ausente. Usou-se
  Chrome já instalado, headless, sem baixar navegador ou dependência. Primeira
  tentativa não abriu sessão nem executou teste do produto.
- B58-U02: hipótese de seleção Flow sobrevivendo à troca foi refutada.
  Capturador esperava true e parou antes de salvar o resultado HTTP auxiliar.
  DOM e SQL posteriores apenas leram o estado: formulário antigo ausente,
  novo paciente vazio e sugestão original pending_confirmation. Nenhum status
  HTTP dessa tentativa é alegado. Oráculo corrigido para a contraprova; a
  operação não foi reexecutada. Não é falha funcional a corrigir.
- Validação final: uma anotação TypeScript do inventário de variantes foi
  alargada para incluir a linha diagnóstica conditional_verified_challenge.
  Só typecheck restrito foi repetido; não houve mudança de runtime/reteste.
- Primeiro comando Markdown apontava ao módulo de biblioteca, sem executar
  lint. O bin declarado em package.json foi conferido e usado em seguida;
  foram encontrados problemas de quebra de linha/formatação, corrigidos sem
  reduzir regras. O primeiro zero não foi aceito como prova.
- Decodificação do backup Auth: seletor pg_restore qualificado não selecionou
  tabela. Cabeçalho foi conferido sem imprimir linhas; passou a usar schema=auth
  e table=users. Nenhum restore foi executado. Comparação pública foi agrupada
  numa leitura para evitar repetir dezenas de processos auxiliares.
- Reconciliação de cron: comparador de array PostgreSQL tratava também o array
  JSON atual como texto e recusou comparação estável. Normalização foi corrigida
  só no auxiliar; nova leitura dirigida confirmou um req.reminder system, cadeia
  válida e prazo previsto. Não houve replay funcional, alteração ou restore.
