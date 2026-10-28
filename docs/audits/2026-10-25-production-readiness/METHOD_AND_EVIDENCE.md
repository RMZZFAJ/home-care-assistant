# Método e evidência

Auditoria investigativa iniciada em 25/10 e consolidada em 28/10/2026,
America/Sao_Paulo. Logs preservam UTC. Houve interrupções e retomadas;
datas de criação dos arquivos não representam tempo contínuo de execução.

Base imutável: `37cb7f85e96e551d6419871f94dd950712e2565b`, `master`.
Os quatro anexos da missão e o objetivo persistente foram lidos integralmente.
A ordem atual prevalece sobre prompts históricos e memórias. Estes ajudaram
a localizar decisões anteriores; resultados antigos não viraram evidência atual.

## Etapas realmente executadas

1. Inventário do SHA, estado Git, fontes de verdade, stack e limites de escrita.
2. Leitura semântica por domínio, incluindo consumidores, chamadas, fronteiras
   de autorização, estados, testes e configuração. Reconciliação por path.
3. Reconstrução transversal: identidade e paciente; catálogo; REQ/COM/ENT/BAL;
   escalas; consumo; anexos/PDF; notificações; administração e recuperação.
4. Execução da suíte local protegida, análise dos oráculos e consulta da CI
   do mesmo SHA. Falhas foram investigadas sem alterar código do produto.
5. Probes dirigidos, contraditório de P1 e controle das hipóteses relevantes.
6. Inspeção de imagens/PDFs históricos, comparação de contratos Meta e
   exploração atual com Auth real, estados assíncronos e múltiplos perfis.
7. Consolidação de achados, cobertura, critérios de liberação, roadmap e
   revisão da própria documentação. Resultado final em `CHECKPOINT.md`.

As frentes já existentes dividiram backend/integrações, banco/segurança e
UI/jornadas. A coordenação revisou os resultados e consolidou referências,
scripts, configuração, testes, documentação, probes e limites. A quantidade
de arquivos lidos não foi tratada como prova automática de compreensão.

## Ambiente e ferramentas

Windows, PowerShell, Git, `rg`, Node 24.22.0 e npm 11.21.1; Supabase CLI
2.121.0 e Docker 29.9.2. Node foi selecionado no PATH do processo porque
o padrão da máquina era 24.13.0. Não houve alteração global de versão.

Stack existente `home-care-assistant`, API `http://127.0.0.1:54321`, PostgreSQL
`127.0.0.1:54322`, container `supabase_db_home-care-assistant`. Guardas conferem
projeto, origem, portas e labels antes de testes mutáveis. App E2E em
`http://127.0.0.1:3100`; todas as execuções de teste desabilitam envio externo.
O vínculo remoto do CLI não foi usado como destino de fixtures ou reset.

Vitest, TypeScript, ESLint, markdownlint, Next build, Playwright, clientes
Supabase e SQL local foram usados conforme seus papéis. PyMuPDF, via `uv`,
renderizou PDFs; fontTools inspecionou fontes. Scripts auxiliares ficam
exclusivamente em `evidence/`. Não foram instaladas dependências no produto.

## Comandos e rastreabilidade

Os arquivos JSON de cada execução contêm comando, versão Node, timestamps,
origem e exit code; o `.log` correspondente preserva a saída sanitizada.
`run-check.mjs` executa comandos com ambiente protegido e redige credenciais.
Estes são os comandos lógicos da suíte, não autorização para remoto:

```text
npm run test:db:prepare
npm run check:contracts
npm run lint
npm run lint:markdown
npm run typecheck
npm test
npm run build
npm run test:migrations
npm run test:integration
npm run e2e
npm ls --all
npm audit --omit=dev --json
npm audit --json
```

Repetição dirigida: `node scripts/run-e2e.mjs --project=chromium` com
`--grep 'dez linhas' --repeat-each=3`. Probes de banco usam
`run-database-probe.mjs` e SQL nomeado; probes de backend usam configuração
Vitest exclusiva da auditoria. Exploração visual usa `ui-runtime.mjs` e
`ui-runtime-ready.mjs`; são mutáveis no local e dependem do servidor protegido.
Não executar reprodutores apenas para consultar este relatório.

## Reset, fixtures e preservação

A ordem autorizou o banco local descartável e fixtures sintéticas. O replay
limpo e a evolução da base legada de 19 até 84 migrations usaram a stack
identificada. O guard validou o backup local preexistente
`local-20261025T194132245Z.dump`, de 10.177.729 bytes, com manifesto/hash.
Não foi criado backup remoto nem interpretado esse dump como recuperação
integral de produção. Detalhes estão em `migrations.log` e no plano de
bootstrap.

Probes DB-001/002 rodaram em transações concluídas com rollback. O runner
renova sessões oficiais locais antes do SQL; portanto não é inteiramente
somente leitura. E2E e exploração visual persistiram dados fictícios,
preferências, anexos e sessões locais. Não houve limpeza final destrutiva
destes cenários, para permitir inspeção. Não criar outra stack para repetir.

O inventário original contém 503 paths do commit, não do index em evolução.
Anexos e documentos novos podem aparecer staged por ações externas à auditoria;
o fechamento preserva esse estado e não faz stage, commit ou reset de Git.
Comparar os 503 blobs com o HEAD é o controle de preservação relevante.

## Critérios de evidência

- **Semântica:** leitura do contrato e dos consumidores sustenta defeito
  estático ou risco; não declara execução de todos os ramos.
- **Runtime local:** resultado observado em ambiente identificado, com
  identidades e dados descritos. SQL, HTTP e navegador têm alcances distintos.
- **Visual atual:** imagem aberta e inspecionada, associada ao estado
  efetivamente carregado. Captura automática sem inspeção não basta.
- **Histórica:** relatório, imagem ou teste de outro momento mantém sua data.
- **Hipótese:** caminho plausível ainda sem confirmação dirigida; precisa
  de experimento e resultado esperado explícitos antes de correção específica.
- **Externa:** depende de provedor, hardware, responsável ou destino real;
  permanece NOT_VERIFIED/EXTERNAL_VALIDATION_REQUIRED, com procedimento futuro.

Um achado pode ter evidência estática forte sem ser reproduzido em runtime.
Prioridade mede consequência, não grau de certeza. P1 recebeu controle:
UX-001 também foi observado antes do diálogo e em dois tamanhos; DB-002 foi
comparado com a remoção transacional das candidaturas canceladas. Nenhum
deles demonstrou bypass ou perda de dados. Recomendações DELETE_CANDIDATE
incluem busca em rotas, strings, scripts, CI, docs e compatibilidade.

## Resultados adversos e divergências preservadas

O primeiro unitário herdou uma origem incompatível com fixtures; a rodada
com ambiente adequado passou 98/98. O primeiro E2E parou no typecheck de um
probe da auditoria; apenas esse artefato foi corrigido. A rodada completa
posterior teve 119/120 e a repetição 2/3. Esses resultados não foram apagados.
Tentativas iniciais dos probes de banco falharam no harness/Auth; a evidência
do produto vem dos logs posteriores, explicitamente separados.

O roteiro visual inicial encontrou imagens de loading. A segunda rodada
esperou o dashboard; ambas são preservadas com nomes distintos. Os metadados
UI foram minimizados para remover texto de página irrelevante, mantendo
geometria, cenário e resultado. PDF atual teve quatro páginas inspecionadas;
os três exemplos históricos tiveram seis páginas inspecionadas separadamente.

Não houve benchmark p95, load remoto, aparelho físico, leitor de tela completo,
envio Meta/SMTP, restauração remota ou smoke atual do deployment. Limites
específicos estão na cobertura e na matriz de homologação. A auditoria conclui
o diagnóstico com essas limitações; não conclui o aceite de produção.

## Integridade do pacote

`evidence/MANIFEST.csv` indexa cada artefato com bytes e SHA-256, exceto o
próprio manifesto. `created_at` é mtime, não necessariamente início do teste.
O CSV de achados mantém os 36 campos do protocolo; a versão Markdown é
navegável por ID. A cobertura tem uma linha por path e método declarado.

A verificação final reconcilia inventário, schemas, IDs, links, hashes,
preservação e padrões de segredo. A busca automática por credenciais é
complementar à geração com dados fictícios e à inspeção das imagens; não
constitui prova matemática de ausência de toda informação sensível.
