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
| D | Publicado | Administração, matrizes, catálogo e unidades |
| E | Publicado | Documentos, wizards, estoque e histórico |
| F | Publicado | Escalas persistentes, permissões e interfaces |
| G | Publicado | BAL por plantão, prazos e regularização |
| H | Evidências publicadas | Homologação e integração rastreadas na PR 5 |

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

Bloco E: DocumentViewer e cabeçalho comuns em `/documentos/[id]`, mantendo
URLs legadas e allowlist de demonstração. Classificação vem do servidor e
inclui o identificador, evitando metadados de outra navegação. Nome na emissão
e versões são preservados. Eventos, hashes, avisos e anexos ficam sob demanda.

Wizards usam ações compartilhadas e cabeçalho compacto. Atendimento REQ,
ciência e conferência ENT continuam independentes. Histórico preserva filtros
e página na URL. Estoque usa tabela no desktop, cartões móveis e detalhes por
custódia; confirmado é separado de trânsito/projeção. Movimentação familiar
abre painel e seleciona a compensação entre movimentos manuais do histórico.
Documentos confirmados continuam corrigidos por seus próprios fluxos formais.

Ocorrências usam edição contextual e revisão antes da confirmação que debita
estoque. Notificações distinguem estado no aplicativo de resultado externo.
Navegação tem grupos recolhíveis; configuração usa links de seção com URLs e
teclado nativos, mantendo todas as regras axe.

Passaram no Chromium o fluxo REQ/COM doação/recebimento/ENT parcial/BAL,
anexos, scanner, cancelamento, troca de destinatário e compensação de estoque.
Documentos dos quatro tipos, histórico e estoque passaram nos três projetos;
o profissional aceitou um convite real antes de receber a ENT. A tentativa de
vincular uma conta externa ao paciente sem convite foi recusada corretamente.

Após as correções, passaram acessibilidade, consulta documental, ocorrências,
notificações e confirmação de consumo. A repetição do fluxo com upload de
anexo passou. Contratos, 95 unitários, tipos, lint e build do runner passaram.
Homologação integral e CI final permanecem no bloco H, após escalas e novo BAL.

Bloco F: agenda persistente com séries semanais, datas avulsas e ciclos
12×36/24×48/24×24; exceções, propostas, substituições e encerramentos auditáveis.
Exclusão transacional bloqueia sobreposições entre pacientes sem expor dados
do conflito. Autoridade própria e da equipe são separadas. A API não permite
escrita direta ou competência local derivada da administração global.

A integração Auth real e o E2E Chromium passaram. A agenda e o formulário
foram inspecionados em desktop/mobile; o cadastro e a recusa de conflito
foram verificados na API. 97 unitários, tipos e lint passaram. A documentação
de comportamento está em [Escalas](SCHEDULES.md). Três migrations incrementais
foram pré-validadas localmente sem reset; o checkpoint remoto será registrado
após a conferência das contagens. O novo BAL permanece em implementação.

Escalas aplicadas no remoto após backup de esquema/dados e verificação SHA-256.
As contagens permaneceram 8 Auth, 6 perfis, 13 vínculos, 59 produtos por
paciente, 11 documentos e 8 movimentos. Nenhum plantão foi criado pela
migration. A conta global original permanece ativa; anônimo e worker não
receberam execução de comandos de escala.

O helper de backup local foi corrigido para consumir o arquivo inteiro antes
da leitura do catálogo: pg_restore encerrava a entrada cedo em arquivos maiores
no Windows. Novo backup SHA-256 e leitura do catálogo foram verificados.

Bloco G: regime por paciente, obrigações semanais, atribuições por plantão real,
adiamento familiar versionado, conservação de atrasos e regularização por uma
única contagem atual. Contagem em duas etapas com referência do ledger, rascunho,
recuperação idempotente e contexto documental/PDF produzido pelo banco.
Substituição conserva autor original e identifica quem contou; essa pessoa não
aprova a própria contagem. Mudança de período com BAL vigente exige decisão
familiar. A matriz apresenta as restrições efetivas por função.

Dez integrações Auth/HTTP direcionadas passaram, incluindo os oito cenários do
novo BAL. Três regressões SQL cobrem grants, autoridade e códigos de conflito.
Nove E2E direcionados passaram nos três projetos, incluindo axe, agenda,
configuração, resposta perdida e decisão. A rodada integral do bloco H fará a
regressão após os últimos ajustes de prazo e projeção de capacidades.
PDF de duas páginas foi renderizado e inspecionado com dados fictícios.

Conflitos manuais usavam SQLSTATE 40001 e acionavam repetição automática no
PostgREST. Uma migration incremental troca somente esses conflitos de negócio
por P0001, mantendo 409 na API e os erros reais de serialização do PostgreSQL.
A regressão Auth que demorava mais de dois minutos passou a concluir em poucos
segundos, sem remover as recusas. Referência técnica:
[diagnóstico oficial Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions).

Backup pré-G: esquema 675110 bytes e dados 434094 bytes, com manifesto SHA-256 e
verificação das tabelas Auth, catálogo, documentos, ledger e escalas. Exportações
sequenciais, sem binários Storage nem ensaio de restauração remota. O dry-run
identificou somente as nove migrations 72–80. Nenhum reset foi executado.

Os incrementos 72–80 foram aplicados no remoto. Permaneceram 8 identidades
Auth, 6 perfis, 13 vínculos, 59 produtos por paciente, 11 documentos e 8
movimentos. Não foram criados plantões nem habilitados regimes automaticamente.
Contratos, lint, Markdown, tipagem e 98 unitários passaram antes da publicação.
Detalhes operacionais: [BAL por plantão](BALANCES.md).

Bloco H em execução: a rodada completa concluiu 29 de 30 integrações e detectou
que o adaptador V4 de política ainda capturava o SQLSTATE antigo. O incremento
81 preserva a resposta PT409 desse contrato e deixa outros erros intactos.
A regressão original de conflito, proposta, convite e aceite passou novamente;
o contrato SQL de conflitos também passou. O teste não foi enfraquecido.

Incremento 81 aplicado no remoto após novo backup de esquema/dados e manifesto
SHA-256. As cinco contas existentes autenticaram por senha no Auth remoto e
verificaram consultas, proibições administrativas/COM e isolamento pelas APIs
do preview. A ativação foi realizada por API autenticada somente em
`Validação V4 fictícia d506812c`, preservando o paciente original e a homologação
legada. Nenhuma fixture foi carregada no remoto. A atribuição profissional ficou
disponível no plantão programado; não se presume presença física nem envio Meta.

A homologação visual detectou contraste em estados desabilitados e área de
toque de detalhes no estoque. O tema foi corrigido, mantendo todas as regras
axe. O cenário de importação passou a consultar a nova data no cabeçalho comum
e abrir os avisos recolhíveis. A troca de paciente deixou de disparar refresh
RSC redundante; o sino aguarda a troca confirmada e descarta respostas antigas.
As capturas móveis do BAL verificam topo e rodapé visíveis, incluindo geometria
dos botões acima da navegação inferior, sem alterar CSS para a captura.

As execuções anteriores concentravam banco e três navegadores em um limite de
40 minutos e foram canceladas durante E2E. A CI passa a executar banco/upgrade
e Auth uma vez, seguidos por três jobs de navegador isolados. O check agregado
conserva a exigência de sucesso em todos, sem remover cenários ou permissões.

O banco local acumulado revelou no iPhone um submenu de perfis maior que o
viewport. O menu agora limita altura/largura e permite rolagem interna, sem
remover vínculos. A auditoria de teclado do login aguarda os campos interativos
após a hidratação, mantendo a navegação e todas as regras axe. Esses casos serão
reexecutados no build atualizado antes do fechamento.

Na CI 40188155460, banco/upgrade, integrações e validações Windows/Linux foram
aprovados. A homologação remota confirmou cinco logins por senha, proibições nas
APIs e 135 consultas de telas entre cinco perfis e três projetos de navegador.
Avisos de configuração, abertura, atribuição e disponibilidade do BAL foram
confirmados como disponíveis no aplicativo pelo worker remoto. Não houve envio
Meta, alteração de estoque ou contagem física presumida nessa verificação.

A CI 40188155460 aprovou 98 unitários em Windows/Linux, instalação limpa,
upgrade legado, 12 regressões SQL, compatibilidade hospedada e 30 integrações.
Os projetos Chromium desktop e Pixel 7 concluíram seus 39 cenários cada.
WebKit Linux identificou encerramento do flyout durante a seleção; a seleção
de perfil passou para uma seção do mesmo dropdown, com retorno e foco explícito.
Permissões e vínculos continuam no servidor. Uma regressão adicional verifica
a navegação de ida e retorno no menu.

O iPhone local corrigido passou 36 de 39 cenários. Os três restantes revelaram
contraste durante interpolação de cores e duas asserções de captura que exigiam
barra operacional nos perfis familiares. As cores agora mudam diretamente entre
estados legíveis; animações de sombra/movimento são preservadas. Capturas exigem
a barra somente na operação e verificam sua ausência na gestão. A rodada
direcionada mantém todas as regras axe e repete os fluxos afetados.

O remoto permanece reconciliado com 81 migrations e sem pendências no dry-run.
As cinco contas também verificaram recusa de DML direto e isolamento RLS no
banco remoto. Contagens preservadas: 8 Auth, 6 perfis, 13 vínculos, 59 produtos
por paciente, 11 documentos e 8 movimentos. Somente o regime fictício está ativo.

Critérios, componentes e capturas estão na [matriz](ACCEPTANCE.md), no
[inventário](INVENTORY.md) e no [mapa de telas](SCREEN_MAP.md).
O registro final de checks, SHA de merge e validação da produção fica na
[PR 5](https://github.com/RMZZFAJ/home-care-assistant/pull/5), evitando confundir
evidências da candidata com resultados posteriores à integração.

A CI 40212256797 detectou um deadlock real entre reservas concorrentes da
outbox. O incremento 82 ordena a invalidação por usuário e recupera somente
reservas abortadas por 40P01, em até três tentativas com rollback integral.
O envio ao provedor continua posterior à reserva e não participa da repetição.
Uma regressão SQL injeta falhas depois de produzir resultados/efeitos e verifica
que não sobrevivem; também verifica o limite de tentativas. Os dois testes de
workers HTTP e as 30 integrações completas passaram após a correção.
A abordagem segue a [documentação PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-DEADLOCKS).

O incremento 82 foi aplicado no remoto após backup de esquema/dados, manifesto
SHA-256 e dry-run exclusivo. As 82 migrations estão protegidas por hash.
Na interface, o nome acessível da seleção é aplicado à lista de menu, removendo
a referência automática ao acionador. Isso preserva a identificação dos
contextos e a navegação de retorno, sem desabilitar verificações de acessibilidade.

A CI 40213968412 aprovou todos os checks e 117 cenários de navegador, com
repetição bem-sucedida de dois casos. A investigação dirigida reproduziu o
Histórico mobile: o aviso de paciente inativo em linha única transbordava de
412 para 594 px e deslocava a área visual do Chromium. Os avisos Fluent do
workspace, login e edição agora usam layout multilinha explícito e texto
quebrável. A regressão do Histórico verifica a largura real do documento;
duas verificações legadas também passam a comparar com clientWidth, evitando
que innerWidth expandido esconda transbordamento. O caso iOS falhou por
ECONNRESET no transporte HTTP local, sem falha de asserção de estoque, e será
revalidado no fluxo completo. Nenhum clique forçado ou teste removido.

A revalidação encontrou a causa estrutural da cascata: o registro Griffel
reemitia buckets modificados em flushes posteriores do streaming, gerando
cópias no body que venciam regras de runtime no head após navegação.
O registro agora faz uma única emissão por requisição, conforme a
[orientação oficial Griffel para App Router](https://griffel.js.org/react/guides/ssr-usage/).
Uma regressão verifica o HTML real sem JavaScript e a navegação autenticada,
exigindo ausência de folhas Griffel no corpo, além da geometria do Histórico.

O build de produção também reproduziu a duplicação do registro na retomada de
Cache Components, mesmo com a proteção de emissão única. Esse comportamento
está reportado no [Next.js 99905](https://github.com/vercel/next.js/issues/99905).
Os opt-ins cacheComponents e partialPrefetching foram retirados; o aplicativo
usa SSR convencional e não contém funções dependentes de use cache. A troca
dispensa a casca parcialmente pré-renderizada; autenticação, APIs, estado de
contexto e persistência dos rascunhos continuam com seus contratos e testes.
As verificações de CSS, largura, navegação e acessibilidade permanecem ativas.

O build compatível passou os nove casos dirigidos de SSR sem JavaScript,
navegação autenticada e Histórico entre Chromium desktop, Pixel 7 e WebKit
iPhone. O diagnóstico confirmou estilos r/d ordenados no head e larguras
iguais de documento/viewport (412/412 e 390/390), com o aviso visível e
quebrável. Os logs temporários de diagnóstico foram retirados; as asserções
de ausência de CSS no corpo e de largura permanecem na suíte.

A repetição do fluxo iOS completo encontrou no BAL legado um avanço coberto
pela navegação inferior durante a rolagem automática. Os controles da operação
móvel recebem margem de rolagem compatível com a barra e a área segura,
complementando o espaço já reservado no fim do conteúdo. O teste conserva
o clique normal e as verificações de estoque; não usa force ou remoção da barra.

Após esse ajuste, o fluxo iOS completo passou na primeira tentativa (1,2 min),
incluindo COM por doação, validação, ENT parcial, saldo confirmado e BAL real.
Contratos, lint, Markdown, tipagem, 98 unitários e build também passaram nesta
rodada. Os resultados completos da nova candidata ficam nos checks da PR 5.

A CI 40219651517 aprovou os 120 cenários, com duas repetições no mobile:
uma auditoria axe apontou título vazio durante a navegação;
uma leitura HTTP do BAL confirmado recebeu ECONNRESET. A auditoria passa a
exigir o título real antes da análise, conservando todas as regras. Leituras
GET da suíte de fluxos permitem uma reconexão apenas para ECONNRESET,
usando maxRetries do Playwright; respostas HTTP continuam com as mesmas
asserções e gravações conservam seu comportamento anterior.

Os dois cenários mobile foram reexecutados sem repetição e passaram (48 s),
assim como lint, Markdown e tipagem após os ajustes do verificador.
No preview, foram confirmados cinco logins Auth, permissões/isolamento por
API e RLS, a identidade global do proprietário, a separação do contexto local,
PDF e heartbeat do scheduler. O remoto preserva 8 Auth, 6 perfis, 13 vínculos,
59 produtos por paciente, 11 documentos e 8 movimentos; somente o paciente
fictício está com o BAL novo ativo e as 82 migrations estão reconciliadas.

A conferência online cobriu 135 visitas: 90 desktop/Android e 45 iPhone por
links e menus reais, sem erros de página nas etapas validadas. Uma rodada
anterior de trocas completas de documento registrou quatro diagnósticos
WebKit, compatíveis com o [problema 43120](https://github.com/microsoft/playwright/issues/43120);
foram preservados separadamente. A confirmação pelos menus no iPhone passou
com zero erros. Isso não representa teste em aparelho físico.
Os últimos ajustes são exclusivos de testes/documentação; o runtime permanece
idêntico ao preview e91d156 já conferido. A CI da nova cabeça continua sendo
pré-condição do merge, com estado e links atualizados na PR 5.
