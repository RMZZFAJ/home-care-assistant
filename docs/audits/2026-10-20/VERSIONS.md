# Runtime, dependências e reprodutibilidade

As versões foram avaliadas em 20/10/2026 considerando dependências, ferramentas
locais, CI e configuração Vercel observada. A escolha usa compatibilidade
demonstrável; o maior número de versão isolado não define uma combinação
suportada.

## Combinação selecionada

| Componente | Versão | Validação |
| --- | --- | --- |
| Node.js | 24.22.0; Vercel 24.x | Engines e projeto consultados |
| npm | 11.21.1 | Explícita em engines, CI e Vercel |
| Next.js | 16.4.2 | Documentação instalada consultada |
| React / React DOM | 19.3.1 | Par compatível e versões idênticas |
| TypeScript | 6.0.3 | Compatível com peers selecionados |
| ESLint | 10.13.0 | Flat config e plugins diretos |
| typescript-eslint | 8.72.0 | Peer de TypeScript inferior a 6.1 |
| Plugin Next | 16.4.2 | Compatível com ESLint 10 |
| Plugin React | 5.28.3 | Compatível com ESLint 10 |
| Plugin hooks | 7.1.1 | Compatível com ESLint 10 |
| Supabase JS / SSR | 2.118.0 / 0.12.7 | Engines atendidas |
| Supabase CLI | 2.121.0 | Fixada no job de banco e usada localmente |
| Tailwind / Turbopack | 4.3.3 / 4.3.3 | Versões alinhadas |
| Zod | 4.6.7 | Validação de contratos e configuração |
| Vitest | 5.0.5 | Configuração ESM; testes unitários existentes e novos |
| Playwright | 1.64.1 | Navegador real em desktop e emulação móvel |
| axe para Playwright | 4.14.0 | Verificação automática do login e formulário |
| markdownlint-cli2 | 0.23.3 | Documentação incluída no gate |

CSS permanece como linguagem nativa da plataforma e não tem uma versão de
runtime a fixar no package.json. O compilador/utilitários Tailwind e as
dependências nativas transitivas são fixados no lockfile. Recursos visuais
exigem validação nos navegadores usados; um upgrade de pacote não a substitui.

## Alternativas efetivamente avaliadas

Node 20 do workflow anterior não atendia ao requisito do Supabase instalado.
A consulta do projeto Vercel confirmou Node 24.x; o patch de Node executado
pelo provedor não pode ser fixado pelos arquivos locais. Não se alega paridade
de patch entre o computador e um futuro build hospedado.

npm 12.2.0 foi tentado. A resolução limpa falhou com `EALLOWREMOTE` ao obter
tarball oficial do Tailwind, inclusive com registry explícito. Foi selecionada
a versão 11.21.1, sem `--force` ou `--legacy-peer-deps`. Essa escolha evita
declarar compatibilidade de um candidato que não completou a resolução.

TypeScript 7.0.2 foi considerado, mas o peer de `typescript-eslint` selecionado
exige versão inferior a 6.1. TypeScript 6.0.3 atende ao contrato sem ignorar
peers. ESLint 9 apresentava aviso de fim de suporte; o projeto passou para
ESLint 10 com plugins diretos. Não foram desabilitadas regras para obter verde.

`react-hook-form`, resolvers e bibliotecas de teste sem consumidor demonstrado
foram removidos. Isso reduz a superfície instalada e o custo de manutenção.

## Fixação e ferramentas locais

`.nvmrc` e `.node-version` declaram 24.22.0; `.npmrc` usa `save-exact=true`.
As dependências diretas têm versões exatas e `package-lock.json` registra as
transitivas. A CI instala explicitamente npm 11.21.1 antes de `npm ci`.
`vercel.json` também declara esse procedimento para uma publicação futura.

O runtime usado nesta execução é portátil, sob
`LOCALAPPDATA/home-care-audit-toolchain`; o binário oficial foi verificado por
SHA256. Não houve substituição do Node/npm global do usuário. No PowerShell,
`npm.ps1` global pode continuar apontando para o runtime anterior; os testes
usam explicitamente `node.exe` portátil e `npm-cli.js` correspondente.

Uma instalação Windows na árvore existente encontrou DLLs nativas bloqueadas
por processos. A instalação prosseguiu após liberar o processo Next
positivamente identificado. Isso não conta como prova de instalação limpa;
essa prova exige diretório novo e lockfile íntegro.

A instalação limpa Windows posterior passou em diretório externo com o
lockfile corrigido. O npm global do usuário permaneceu inalterado.

## Instalação limpa e CI

O workflow publicado observado falhava antes dos checks com `npm ci EUSAGE`,
pela ausência de `@emnapi/core@1.11.3` e `@emnapi/runtime@1.11.3` no lockfile.
Os sete runs recentes consultados estavam falhando. O run analisado em detalhe
foi `39485166817`.

O lockfile foi regenerado em diretório externo. A primeira execução Linux
limpa detectou novamente as entradas nativas ausentes; a correção e a nova
instalação devem constar em [EXECUTION.md](EXECUTION.md). Este registro mantém
a falha observada, em vez de pressupor reprodutibilidade pelo build Windows.

`scripts/verify-linux.sh` executa instalação e checks em container Node
24.22.0, copiando apenas fontes e excluindo `.env*`, `.git`, `.vercel`,
artefatos e dependências locais. O job de banco/navegador cria projeto
descartável sem secrets de produção.

As actions são fixadas por SHA completo: checkout v7.0.1, setup-node v7.1.0,
upload-artifact v7.0.2 e setup-cli v3.0.1. Há validação Windows/Linux e um job
Linux separado para migrações, Auth/RPC concorrentes e navegador. A presença
do workflow não comprova execução remota: push, commit e publicação seguem
sem autorização nesta missão.

## Critério de validação final

Instalação limpa Windows e Linux, guard de contratos, lint, Markdown,
typecheck, unitários e build precisam passar com o lockfile final. Banco e UI
também têm gates próprios no projeto descartável. Consultar
[EXECUTION.md](EXECUTION.md) para resultados efetivamente obtidos; nenhuma
versão ou workflow é considerada homologada somente por estar configurada.
