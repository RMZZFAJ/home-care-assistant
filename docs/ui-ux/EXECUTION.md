# Execução da refatoração Fluent 2

## Base e autorização

Início em 24/10/2026 sobre master d467f92, com V4 incorporada pela PR 4.
Branch codex/fluent-ui-escalas-bal publicada no início da execução.
As 67 migrations históricas foram verificadas sem alteração.

O usuário autorizou implementação integral, commits/pushes por bloco, PR em
rascunho e migrations remotas após backup e validação local. A ativação do BAL
automático é por paciente, inicialmente apenas na homologação. Não há
autorização para antecipar o merge: conclusão, checks e homologação final são
pré-condições. Nenhum reset de banco será realizado.

## Blocos

| Bloco | Estado | Entrega |
| --- | --- | --- |
| A | Fundação publicada | Referências, inventário, Fluent, tema e componentes |
| B | Publicação incremental | Shells, contexto, menus, login e perfil |
| C | Em execução | Dashboards por contexto e tarefas |
| D | Pendente | Administração, matrizes, catálogo e unidades |
| E | Pendente | Documentos, wizards, estoque, histórico e notificações |
| F | Pendente | Escalas persistentes, permissões e interfaces |
| G | Pendente | BAL por plantão, atrasos, adiamentos e regularização |
| H | Pendente | Homologação, evidências, documentação e integração |

Cada bloco recebe commits coesos e publicação para atualizar o preview.
Telas novas não usarão simulações como resultado de operações reais.

## Validação

Reconhecimento: master local/remota sincronizadas; CI da base aprovada;
check:contracts aprovado com 67 migrations intactas.

Fundação: versões exatas Fluent v9 e ícones oficiais, provider SSR/streaming,
tokens, badges, diálogo e botões de etapas. Imports otimizados pelo Next.
Tipos e build aprovados; 95 unitários aprovados; dois E2E Chromium de login
aprovados pelo runner local. Lint apontou somente a convenção de nome de uma
ref, corrigida antes do commit. Markdown aprovado. A instalação reportou zero
vulnerabilidades conhecidas. Inspeção visual dos módulos permanece pendente.

Bloco B: shell/contexto compartilhado, menu de perfis integrado, navegação
operacional em cinco destinos, caixa de entregas paginada, login Fluent e
perfil com edição por seção. API de entregas revalida capacidade e paciente;
regras de confirmação e RLS existentes foram preservadas. Não houve migration,
reset ou modificação de dados remotos nesta etapa.

A rodada direcionada de login/perfil/navegação executou 15 cenários: 14 passaram
e um revelou retorno de foco no iPhone. Correção com restorer Fluent e foco
explícito no botão, preservando Escape e a asserção de foco. Duas repetições
WebKit da navegação real pelo submenu passaram depois da correção.

No diagnóstico, navegação HTTP completa enquanto a página anterior iniciava
leituras reproduziu o problema de classificação de cancelamento do WebKit,
documentado no [Playwright](https://github.com/microsoft/playwright/issues/43120).
O teste visual passou a navegar pelo menu real do produto e manteve a verificação
de ausência de erros. Não foram removidas asserções nem alterados CORS/RLS.

Capturas de perfil, menu móvel e entregas foram inspecionadas. A captura de
overlays usa apenas o viewport e conclui animações para evitar registrar um
quadro intermediário do movimento. Evidências ficam em output/playwright/fluent
com dados fictícios, até a seleção do relatório visual final.

Gates finais: contratos, lint, Markdown, tipos, unitários, build, migrations
limpas/legadas locais, SQL/RLS, integração Auth/HTTP, concorrência e E2E.
Inspeção visual por módulo em desktop/mobile e larguras de 320 a 1920 px.

Testes mutáveis usam exclusivamente a stack local verificada. Fixtures,
credenciais, backups, traces privados e dados pessoais não entram no Git.
Contas existentes de homologação serão preservadas.
