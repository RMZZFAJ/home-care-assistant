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
| B | Publicado | Shells, contexto, menus, login e perfil |
| C | Publicado | Dashboards por contexto e tarefas |
| D | Publicação incremental | Administração, matrizes, catálogo e unidades |
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

Bloco C: dashboards separados para gestão, profissional e supervisão, com
contagens e pendências reais, destinatário explícito nas entregas e saldos
críticos restritos às custódias autorizadas. Administração global apresenta
pacientes e ações globais, sem assumir competências locais. O atalho de BAL
depende de elegibilidade do servidor; o novo regime ainda será implementado.

Três cenários funcionais Fluent passaram no Chromium, incluindo navegação
operacional e cinco perfis de dashboard. Capturas desktop/mobile da gestão e
equipe foram inspecionadas. Os seis cenários de acessibilidade e capacidades
passaram, mantendo todas as regras axe e incluindo WCAG 2.2 AA.

A entrada por teclado verifica o redirecionamento imediato dos sentinelas de
foco do Tabster, documentado na
[biblioteca](https://github.com/microsoft/tabster/issues/288). O atalho de
conteúdo recebeu um destino focalizável e os testes verificam seu foco real.
Nenhum nó ou regra axe é excluído. A auditoria aguarda o fim das transições para
medir cores finais, sem confundir a animação de abertura com contraste estático.
O contraste do nome no cabeçalho foi corrigido.

Bloco D: centro administrativo com áreas e URLs próprias, catálogo e pessoas
com pesquisa e edição lateral, unidades em lista, matrizes compactas por função,
confirmação de permissões críticas e política resumida com edição por grupo.
O snapshot da edição preserva a versão original; conflito fecha a edição e
obriga revisão da versão atual. Falhas de configuração aparecem dentro do
painel ativo. As abas de configuração se reorganizam a 360 px.

Rodada direcionada: dez cenários passaram inicialmente; os cinco cenários
afetados foram corrigidos e reexecutados com sucesso. A última repetição cobriu
o painel administrativo e a proposta global com aprovação local. Os testes
continuam verificando persistência, proibições, isolamento e conflitos. Capturas
de catálogo, permissões e notificações foram inspecionadas após as transições.
Repetição completa por navegador e demais módulos permanece no bloco H.
O percurso administrativo também passou nos projetos Pixel 7 e iPhone 13;
capturas móveis de edição do catálogo e lista de unidades foram inspecionadas.

Uma integração Auth real validou delegação de catálogo/auditoria, revogação,
isolamento entre pacientes e impossibilidade de conceder administração local.
A regressão SQL de grants do worker passou sem reset. A suíte SQL operacional
completa requer fixtures iniciais; documentos existentes no banco local
impedem supor esse estado. A CI fará o replay completo em sua stack efêmera.

Migration 20261024205813 aplicada localmente sem reset e depois no remoto,
precedida por dry-run e backup externo de esquema/dados com SHA-256. O backup
inclui Auth, vínculos, catálogo, ledger e metadados Storage; não inclui os
binários Storage e não foi restaurado em ensaio remoto. A migration altera
somente autorização de catálogo/auditoria e não ativa BAL automático.
Após a aplicação, permaneceram 8 identidades Auth, 6 perfis, 13 vínculos,
29 produtos, 59 ligações de catálogo, 7 REQ, 11 documentos e 8 movimentos.
O administrador global original segue ativo. Anônimo e worker não receberam
execução da operação administrativa de adoção de catálogo.
