# Checkpoint D-B

## DB.0 — autoridade, baseline e sequência

Ordem integral lida antes de intervenções. Meta persistente ativa. Base local e
GitHub: `aa9f168a790e1d1730f3134314132ac65fba6b14`, árvore limpa, branch
`feat/phase-d-implementation`, PR #7 OPEN/Draft, sem merge. Identidade CLI
Supabase fixada: RMZZFAJ, projeto `qwfrqychokvhdzakibid`, ACTIVE_HEALTHY,
PostgreSQL 17.11. CLI 2.121.0; Node exigido 24.22.0 encontrado e selecionado
por PATH da invocação, npm 11.21.1. Node padrão 24.13.0 não será usado para
implementação/validação. Nenhum segredo é copiado para este pacote.

CI `42307754118` do SHA aa9f168: validações Ubuntu/Windows, banco, Chromium,
Mobile Chromium, WebKit e agregado aprovados. SonarCloud do mesmo SHA ERROR:
Reliability D e Security B. Conector Sonar recusou credencial; API pública e
annotations GitHub permitiram identificar sete apontamentos. São três bugs
de UI (ordenação de datas e tipo explícito de botões) e quatro apontamentos
de resolução de executáveis por PATH em ferramentas. Triagem/correção ainda
pendentes; nenhuma regra ou Quality Gate foi desabilitado.

Vercel production READY permanece no SHA `8ec979aac340bbc19ec64288bf0acf3abea4711a`
(master/PR6). Inspeção não é deploy, liberação ou homologação. Compatibilidade
dos consumidores publicados integra o preflight anterior a qualquer migration.

Matriz C9 canônica: 36 D3, 8 D3/D4, 25 D4 e 6 D5 = **75**. Nome efetivo da
matriz complementar: `C9_GAP_AND_DECISION_MATRIX.csv`. A matriz D-B conserva as
colunas C9 e acrescenta rastreabilidade de implementação e prova. Nenhum
critério foi aprovado nesta reconciliação. Complementos da ordem têm IDs D-B.

Sequência verificável:

1. Reconciliação de contratos, baseline, critérios, CI e Sonar: em andamento.
2. Preflight, backup verificável e aplicação remota D-A: concluídos em DB.1.
3. D3, consumidores reais e contraprovas: em execução a partir de D3.1.
4. D4, fidelidade, emissão, PAdES-B-T interno e verificação: não iniciado.
5. D5, PWA, push e avisos internos: não iniciado.
6. Base operacional de backup/recuperação/monitoramento: não iniciada, salvo
   ferramentas necessárias ao backup de preflight.
7. Consolidação técnica e CI do candidato: não iniciada.
8. Preflight e aplicação remota D-B: não iniciada.
9. Encerramento documental/PR Draft: não iniciado.

Decisões ordinárias seguem a ordem vigente. Exigências externas bloqueiam
somente os ramos dependentes; nenhum estado pending se converte em PASS por
decurso de tempo. Commits/pushes serão incrementais e provas identificam seu
SHA e eventual árvore suja.

## DB.1 — backup e preflight remoto D-A

Reconciliação publicada em `0c5d414`; PR7 continua OPEN/Draft. Criados
arquivador cifrado, verificador de Storage, comparador de histórico e probe de
restore isolado, necessários ao preflight. 18 testes dirigidos passaram,
incluindo consumidores de preservação existentes; lint dos fontes passou.
Tipos dirigidos passaram após configurar explicitamente --ignoreConfig e
--types node exigidos pela CLI TypeScript 6 ao selecionar arquivos; falhas
anteriores eram da invocação do instrumento, sem alteração do produto.

Backup final e suas qualificações estão no [relatório de migrations](MIGRATIONS.md).
Restauração real verificou 122 tabelas, FKs, 29 objetos e 28 hashes de PDF;
oito migrations passaram na cópia. Não é restore operacional completo D6,
medição de RTO/RPO produtivo ou cobertura de segredos externos.

Histórico remoto 113/113 confrontado por SQL; nenhum drift de conteúdo. Catálogo
e grants coincidem sob as duas qualificações documentadas. Consulta imediata
anterior preservou 8 usuários, 12 documentos, 145 eventos e 29 objetos, com
alterações apenas nos dois controles do cron. Jobs remotos não foram pausados.

Os quatro apontamentos Sonar de PATH passaram a resolver Git/Docker em locais
fixos de sistema no coletor e barreiras de concorrência. A suíte de preservação
existente e contraprova de Git injetado no PATH passaram. Um caso Auth real
exercitou os dois caminhos de barreira (advisory e FK/perfil), incluindo a
revogação observada durante espera, e passou após test:db:prepare sem reset.
Verificação Sonar do novo SHA ainda é necessária. Três apontamentos de UI
permanecem pendentes. Dois erros de lint no teste novo foram corrigidos no
próprio teste (nome reservado module e throw em finally), sem reduzir regras.

O fluxo oficial aplicou as oito pendências: remoto 113→121. Pós-verificação
confirmou dez seções de catálogo idênticas e uma constraint condicional
qualificada; zero mudança inesperada nos digests das tabelas anteriores. Usuários,
documentos, eventos, movimentos e Storage preservados. Nenhum reset, seed, Vault,
Auth config, cron ou deploy foi alterado. [Evidência por arquivo](INITIAL_REMOTE_MIGRATIONS.json).
D-B continua em execução; início de D3 está liberado pelas dependências técnicas.

## D3.1 — erro de consulta, intenção incerta e página não encontrada

Base publicada4315eb9. API cliente distingue consulta e comando também em
timeout, rede, abort e resposta JSON indecifrável. Erro de leitura orienta
reconsultar a seção; escrita sem resposta verificável conserva status técnico0
e estado incerto, inclusive quando um proxy apresenta400 após commit. Não se
limpa a intenção como se houvesse recusa comprovada. Método HTTP explicitamente
informado é respeitado mesmo sem payload. Respostas HTTP válidas preservam
código, status e correlação.

SQLSTATE42702 recebe INTERNAL_ERROR500 seguro antes da classificação por texto.
Ambiguidade legítima do catálogo mantém409. Resposta e log não expõem coluna,
SQL ou payload privado. Passaram28 unitários/API, incluindo17 casos de transporte
e11 guards; lint e tipos passaram. O typecheck geral local foi justificado pela
mudança transversal do cliente HTTP e nova convenção Next/configuração.

404 público em português usa global-not-found conforme guia Next16.4.2 instalado,
com flag experimental específica: evita depender do shell/contexto autenticado
para um endereço que não existe. Heading/main, título próprio, noindex, CTAs,
teclado e320/390/768/1440 conferidos nos três projetos. API sem sessão permanece
401; outra tarefa autenticada como profissional recebeu403 e preservou o nome
do paciente. Nada disso libera dados privados ou modifica autorização.

Dez casos browser distintos aprovados entre rodadas: recuperação GET/save nos
três projetos, 404 nos três,403 Auth Chromium e os consumidores existentes de
cadastro por convite, preferência e calendário. Primeira rodada:6/9; os três
404 falharam no coletor que exigia título único. O coletor agora aceita título
esperado explícito e conserva o default e todos os asserts anteriores. Recheck
somente404:3/3. A contraprova403 nova omitia isDevelopment obrigatório e recebeu
400 de validação; corrigido somente o payload de fixture, recheck1/1. Não houve
redução de regras, force click, sleep arbitrário ou ampliação de timeout.

A captura do resultado recuperado foi repetida em Chromium após fixar scroll0:
o primeiro full-page conservava a posição sticky do scroll anterior. Captura
anterior preservada; a nova mostra título, revisão2 e texto mantido. Capturas
390 do resultado e do404 mobile foram inspecionadas. Axe e geometria passaram;
isso não é homologação humana/AT/aparelho. Logs d3-request-first,
d3-public-404-recheck, d3-context-and-capture e d3-authorized-denial-recheck e
contraprovas ficam em output/playwright/phase-d. Fontes permaneceram estáveis
em cada runner, sem suíte mutável de banco em paralelo.

Os três apontamentos UI originais foram tratados, mas CI/Sonar do próximo SHA
continuam independentes. [Triagem S4790](SONAR_TRIAGE.md) documenta checksum
legado, controles fortes independentes e credencial do provedor indisponível.
Não se declara Sonar aprovado. Listas/administração, demais rascunhos/estados,
guias e critérios compartilhados ainda exigem seus próprios incrementos.
