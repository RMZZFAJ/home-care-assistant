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
banco, segurança, APIs e testes antes de ampliar fluxos. Consulte docs/README.md,
docs/current/PROJECT_STATUS.md, a auditoria datada
e seu checkpoint para retomar sem recriar funções existentes. Decisões em
docs/decisions e planos C descrevem futuro, não comportamento implementado.
Autorização corrente vem da missão vigente; relatos históricos não a renovam.

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

Não alterar migrations históricas; o manifesto de check:contracts protege as
84 migrations do baseline atual. Conferir a contagem no manifesto ao evoluir.
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

Quando autorizado a implementar, usar Node e npm dos arquivos de versão.
Escolher verificações locais pelo impacto do conjunto: regressão discriminante,
contrato/API, tipos/lint dos fontes afetados e tarefa visual quando aplicável.
Localizar os consumidores alterados, inclusive fixtures e seletores existentes,
antes de escolher os casos; a suíte nova não substitui a compatibilidade deles.
Após correção, repetir somente as verificações afetadas. Não duplicar a cada
ajuste as suítes gerais já programadas na CI da PR: check:contracts, lint,
lint:markdown, typecheck, test e build. A CI precisa validar o SHA publicado;
resultado de um SHA anterior ou check pendente não vale como aprovação atual.

Mudanças de banco/autorização exigem test:db:prepare e regressões locais com
Auth real, incluindo negativas/concorrência pertinentes. Instalação limpa,
evolução legada e integração completa continuam obrigatórias; aproveitar
test:migrations e test:integration da CI quando já programados. Repetir a suíte
completa localmente quando uma falha, mudança transversal ou hipótese concreta
justificar, ou quando a CI necessária estiver indisponível. Registrar o motivo,
sem reset adicional apenas para repetir evidência inalterada.

Para fluxos visuais, rodar e2e dirigido pelo runner que verifica a stack local,
nunca contra sessão ou origem desconhecida. O runner usa dados fictícios e
desabilita envio externo. Manter fontes estáveis durante a execução; não rodar
suítes mutáveis de banco em paralelo com E2E.

Corrigir falhas e repetir verificações afetadas. Não excluir testes ou reduzir
regras para obter verde. RLS precisa de identidades Auth reais; mocks não bastam.
Registrar evidências, limitações e estado final na matriz. Interface, API, banco
e permissões precisam funcionar conjuntamente antes de concluir uma feature.
Manter instruções permanentes separadas de incidentes e estados transitórios.

Para mudanças exclusivamente documentais, validar Markdown, links, referências
e preservação proporcionalmente. Não repetir suítes funcionais sem mudança de
contrato ou hipótese nova. Auditoria/plano não autorizam corrigir produto.
