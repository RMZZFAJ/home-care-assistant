# Agent instructions

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` (resolved from this file's directory; in
monorepos the `next` package may not be visible from the repo root) before
writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at
`node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a
diff only re-creates the uncommitted change; committing it with your work keeps
the tree clean.

<!-- END:nextjs-agent-rules -->

## Projeto e fontes de verdade

Home Care Assistant usa App Router, React, TypeScript e Supabase Auth/PostgreSQL.
O paciente é a unidade operacional. Leia README e os documentos de arquitetura,
banco, segurança, APIs e testes antes de ampliar fluxos. Consulte a auditoria
datada e seu checkpoint para retomar trabalho sem recriar funções existentes.

## Convenções verificáveis

- Identidade global e papel por paciente são conceitos distintos.
- Nunca derivar autorização de IDs, metadata, nomes ou flags do navegador.
- Administradores locais só alteram recursos e vínculos do próprio paciente.
- Catálogo canônico é care_recipient_products; products preserva identidades.
- Protocolo, hash canônico e snapshots são responsabilidade do banco.
- Estoque oficial vem de movimentações, não de edição direta de saldo.
- Quantidade solicitada não pertence ao contrato de requisição.
- Funções críticas usam RPC transacional com autorização no banco e na API.
- RLS, grants explícitos/defaults e SECURITY DEFINER precisam ser revisados juntos.
- Erros externos usam código seguro e correlação; logs não recebem payload privado.
- Componentes devem ter carregamento, erro, vazio, feedback e controles acessíveis.
- Evitar abstrações sem consumidor e dependências sem uso demonstrável.

## Preservação e ambientes

Não alterar migrations históricas; check:contracts verifica as primeiras 19.
Usar novas migrations incrementais e testar instalação limpa e evolução legada.
Não modificar banco remoto, Auth remoto, infraestrutura, commits ou publicação
sem autorização expressa correspondente. Preservar alterações e commits locais.

O ambiente de desenvolvimento e testes é o projeto local home-care-assistant,
com API em 127.0.0.1:54321 e banco em 127.0.0.1:54322. Não criar outra stack
para a suíte. Antes de testes mutáveis, verificar projeto, origem e containers.
Reset e fixtures exigem consentimento explícito para substituir dados locais
e backup verificável quando houver dados a preservar. O vínculo do CLI com
o remoto não autoriza usar esse destino em testes: comandos mutáveis de teste
precisam selecionar --local e recusar hosts remotos.

Atualizações remotas usam migrations incrementais após reconciliação,
pré-validação e backup do ambiente correto, dentro da autorização vigente.
Nunca executar reset remoto ou carregar fixtures no remoto. Não copiar
segredos de .env.local para documentação, CI, logs, traces ou navegador.

## Validação e conclusão

Usar Node e npm dos arquivos de versão. Rodar check:contracts, lint,
lint:markdown, typecheck, test e build. Para mudanças de banco/autorização,
rodar test:db:prepare, test:migrations e test:integration. Para fluxos visuais,
rodar e2e pelo runner que verifica a stack local, nunca contra uma sessão
ou origem desconhecida. O runner usa dados fictícios e desabilita envio externo.

Corrigir falhas e repetir verificações afetadas. Não excluir testes ou reduzir
regras para obter verde. RLS precisa de identidades Auth reais; mocks não bastam.
Registrar evidências, limitações e estado final na matriz. Interface, API, banco
e permissões precisam funcionar conjuntamente antes de concluir uma feature.
Manter instruções permanentes separadas de incidentes e estados transitórios.
