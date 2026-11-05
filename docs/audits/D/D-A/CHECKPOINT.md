# D-A — implementação D0, D1 e D2

Missão vigente de 05/11/2026, America/Sao_Paulo. **EM EXECUÇÃO**.
Produção permanece **NO-GO**. Não há autorização de merge, D-B/D-C,
migration remota, envio externo ou liberação operacional definitiva.

## Entrada verificada

- Repositório: RMZZFAJ/home-care-assistant.
- Base: `8ec979a`, master local e origin/master reconciliadas após fetch;
  PR 6 integrado. Árvore inicial limpa.
- Branch única: `feat/phase-d-implementation`.
- Stack: home-care-assistant, workdir e labels Docker conferidos;
  API 127.0.0.1:54321 e banco 127.0.0.1:54322.
- Dados locais iniciais: 210 documentos, 81 REQ e 81 identidades Auth.
  Backup custom externo com manifesto/hash e TOC legível preservado;
  não representa ensaio de restore. Replay autorizado explicitamente pelo
  responsável nesta missão, após apresentação do backup verificado.
- Node 24.22.0 selecionado por processo; npm 11.21.1; CLI 2.121.0.

## Execução e evidências

O [registro de aceitação](ACCEPTANCE_EXECUTION.csv) deriva dos casos C9
atribuídos a D0–D2. Origem C preservada; status só avança mediante evidência
do comportamento, ator, versão e efeitos. Nenhum caso foi aprovado na abertura.

1. D0: readiness, NULL, axe incomplete, proteção de ferramentas/exportação
   e contrato do oráculo PDF.
2. D1: progresso REQ, aprovação de escala, precisão, conflitos e autorização.
3. D2: processos REQ/COM/ENT/BAL, ciência P02, estoque/custódia, catálogo,
   consumo e escalas com as interfaces C8 correspondentes.

Checks locais, CI, preview, aceite humano e aparelho/provedor real são
evidências distintas. P03/P09/P13 permanecem pesquisa externa do responsável;
outros gates condicionam apenas o ramo explicitamente dependente.

Draft PR [7](https://github.com/RMZZFAJ/home-care-assistant/pull/7), aberto e
em rascunho; sem merge. Commit inicial: `626a89a`.

## D0 — primeiro incremento

Readiness de navegação aguarda variante real; Data API exige schema válido.
Exportação usa lista única de exclusões testada com sentinelas privadas.
Relatórios exigem destino explícito, identificam SHA/data e recusam
sobrescrita por padrão. Verificador legado exige consentimento/backup antes
de seed; ferramenta Meta combinada permanece desabilitada até D7.
Asserções de saldo positivo rejeitam linha ausente/NULL. Axe conserva
violations como falha e publica incomplete por regra/superfície/estado para
revisão. Contrato de fatos/geometria PDF distingue controle íntegro de branco;
integração ao renderer permanece em D4.

Validação local deste incremento: contratos (84 migrations preservadas),
lint, tipos, 112 testes unitários e build aprovados. Controles dirigidos:
14 unitários, 15 cenários sintéticos de navegação nos três projetos e SQL
transacional NULL/ausência/valor incorreto/zero explícito aprovados.
Não são prova do fluxo completo do produto, conformidade geral de
acessibilidade, conteúdo do renderer ou aceite humano/físico.
E2E do produto e gates completos de banco serão executados nos marcos
funcionais seguintes; CI do incremento ainda não atestada.

## D1.1 — progresso REQ e candidato inválido

Migration incremental `20261105070428_phase_d1_requisition_scheduler_progress.sql`:
terminais são excluídos antes dos limites; rotação privada distribui até
100 candidatos entre até 25 pacientes. Falhas individuais revertem somente
o candidato, conservam SQLSTATE/identidade/tentativas em tabela privada e
mantêm a saúde como degradada por contagem de pendências. Retry técnico após
uma hora; mudança da política permite reconsideração imediata. Esse intervalo
é detalhe de recuperação, sem promessa de prazo operacional/SLO.

Regressão nova falhou na base anterior pelo motivo esperado (25 pacientes
terminais bloqueavam alvos) e passou após correção. Cobre também 100
terminais no mesmo paciente, 26 pacientes elegíveis, limites, repetição,
política malformada, reparo, rollback do cursor e ausência de estoque fictício.

Instalação limpa e evolução desde 019 aprovadas, com Auth real, protocolo
inicial REQ-0001 e preservação de protocolos/quantidades/FKs/saldos legados.
16 regressões SQL e compatibilidade de search_path hospedado aprovadas.
85 migrations atuais; os 84 hashes históricos permanecem íntegros.
O primeiro replay parou na readiness porque exigia tabelas que service_role
corretamente não lê; a correção exige a RPC allowlisted do serviço. Retomada
da instalação recém-criada com --resume-clean, sem recriar dados novamente,
e replay legado completo aprovados. Não houve redução de asserções.

Fixtures pausam os dois jobs locais pelo cron.alter_job, inclusive após
reset/upgrade; a situação inicial de ambos era ativa. Permanecem pausados
durante as suítes, com reconciliação ao fechamento. 34 integrações completas
aprovadas, incluindo workers HTTP independentes e escopo/RLS/Auth real.
Contratos, lint, Markdown, tipos e 112 unitários aprovados. CI e E2E do
produto ainda não atestados neste incremento. D1 integral e D2 permanecem
em execução, sem fechamento antecipado pelos dois casos de scheduler.

## D1.2 — decisões de escala verificadas localmente

Implementação posterior a `743549a`. Migrations incrementais
20261105072306 e 20261105074814:
versão própria, snapshots antes/depois, proponente real, motivo separado da
decisão, encerramento obsoleto e nomes capturados nos eventos futuros.
Legado usa somente fatos recuperáveis dos eventos; nomes antigos ausentes
não são preenchidos com o cadastro atual.

Controle anterior reproduziu a publicação indevida de série encerrada. Dois
outros controles reproduziram publicação para desligado e impossibilidade de
cancelar seu plantão futuro. Após correção, seis integrações dirigidas
aprovadas: recusa de série encerrada, versão/duas decisões concorrentes,
obsolescência, desligamento/publicação, cancelamento com ator próprio e suíte
anterior de escalas.

UI apresenta pessoas, horários/fuso/notas, período completo e efeito BAL;
conflito mantém a revisão visível e não aplica versão nova automaticamente.
Semana/mês exibem o mesmo intervalo no celular e computador. Primeira rodada
Chromium: quatro E2E aprovados; captura de 390 px inspecionada. Rodada ampliada:
15 E2E aprovados nos três projetos, incluindo BAL vigente, rodapé de decisão
integralmente visível e regressão de teclado. 24 controles sintéticos de
harness aprovados. O
[registro de foco](FOCUS_ORIGIN_CONTROL.json) preserva a falha inicial, a
pré-condição incorreta do primeiro controle e o resultado final, sem redução
de regra/asserção/timeout ou retry para obter verde.

Instalação limpa, evolução legada, 16 SQL e compatibilidade de search_path
aprovadas para 87 migrations. 40 integrações completas aprovadas; controle
LF/CRLF reprova a mutação sem normalização e aceita ambas as fontes.
Contratos (84 hashes preservados), lint, tipos, 115 unitários e build
aprovados. Gates finais usam Node 24.22.0/npm 11.21.1. Rodadas anteriores
usaram o npm 11.19.1 embutido na instalação do Node, corrigido antes desses
gates; E2E anterior preserva essa distinção de lançador.

Neste PowerShell, npm.cmd preserva o separador -- dos argumentos de replay;
o shim npm.ps1 omitiu flags e o guard recusou a operação sem alterar dados.
O replay completo foi executado corretamente pelo npm.cmd depois disso.

CI conhecida da base publicada `743549a`: run 41986802256, concluída com
success; contexto GitHub Vercel também success. Essa CI não atesta esta nova
árvore. Não há homologação remota, humana ou física nem liberação definitiva.
D1 integral e D2 permanecem em execução.

## D1.3 — precisão, compensação e sessão encerrada

Migration incremental 20261105084122 valida numeric sem typmod antes da
gravação numeric(18,6), com precisão da unidade e limite de quantidade.
Número e texto usam a mesma precisão sem arredondamento; zeros finais não
alteram o valor. Correção exige movimento original do mesmo paciente,
produto e custódia, em direção oposta. Entrada/retirada avulsa não recebe
referência de compensação. Histórico e saldos derivam do ledger preservado.

Perfil e avatar exigem sessão Auth ainda existente, inclusive na RPC direta
e nas policies do bucket privado. A operação global de identidade não exige
contexto de paciente. Revalidação após locks acrescentada aos fluxos REQ,
criação/revisão de documentos, ciência, arquivo e consumo indicados na migration.
Não equivale a invalidar bytes/URLs já entregues, cujo transporte pertence a D4.

Controles negativos reproduziram quantidade arredondada, correção sem origem
e escrita de perfil com sessão encerrada. Após correção: sete integrações
dirigidas aprovadas, incluindo Storage real e barreiras com lock observado
para REQ/estoque: revogar sessão ou trocar contexto enquanto aguardam impede
efeitos. Primeiro controle de imagem usou MIME não permitido e foi corrigido
para JPEG antes de avaliar a hipótese; o oráculo de saldo usa ledger direto,
pois a view com autorização retorna vazio para SQL sem identidade.

47 integrações completas, lint, tipos e 117 unitários aprovados.
88 migrations atuais; replay limpo/legado e E2E desta árvore ainda pendentes.
CI do SHA anterior 50d843e estava em execução na última consulta (41995412154).
D1/D2 seguem em execução; autorização de replay já concedida permanece válida.

## D1.4 — convite, senha e consumidores de perfil

Migrations 20261105084951 e 20261105143259. Token de convite sem conta correta
revela somente estado mínimo; a conta confirmada vê paciente, função, emissor,
e-mail e validade em leitura antes de decidir. Expirado/revogado/recusado/já
aceito têm estados próprios. Aceite não recebe paciente/papel editáveis e
revalida Auth após espera. Reabrir link na mesma rota refaz a prévia; o E2E
inicial encontrou a mensagem anterior preservada e a correção foi retestada.

Retry da aprovação recupera o resultado e oferece reemissão explícita quando
o segredo original já não está na resposta. O administrador local rotaciona
o convite existente; teste HTTP/UI verifica convite único, link antigo
inválido e nenhum vínculo antes do aceite. UUID malformado no ramo global
agora recebe 400 VALIDATION_ERROR, não retryable, com correlação segura.

Cadastro, recuperação e perfil usam o mesmo campo de nova senha: mínimo 12
caracteres, máximo 72 bytes UTF-8, ajuda, colagem/gerenciador permitidos e
mostrar/ocultar. Nenhuma senha real foi modificada. A jornada anterior de
cadastro/recuperação usa somente contas fictícias e e-mail local.

Perfis agora invalidam a própria pessoa e consumidores autorizados; proponente
global sem vínculo recebe sua própria revisão. SQL e Realtime reais verificam
avanço e ausência de dados privados no broadcast, além de terceiro sem relação.
E2E verifica o nome atualizado no shell após edição em outra sessão.

As primeiras rodadas completas terminaram 49/50 e 48/50: prontidão Realtime
ficou sem mensagens em todos os canais. Controles isolados passaram; aguardar
explicitamente o token não resolveu. Logs do provedor local mostraram
UnableToBroadcastChanges: too_many_requests. A migration adicional coalesce
por transação/usuário e emite a revisão final por trigger deferred; update sem
mudança não invalida. Contraprova anterior emitiu três avisos onde se esperava
um; após correção há um, rollback emite zero e a fila privada fica vazia.
Revisão persistida/polling recuperam aviso perdido; não se promete ausência
de limites do provedor em qualquer volume.

Replay limpo e legado, 16 SQL e search_path aprovados para 90 migrations.
51 integrações completas aprovadas após a correção. 117 unitários, contratos,
lint e tipos aprovados. 18 E2E anteriores nos três projetos aprovados; captura
390 px iOS inspecionada. Nova rodada: **36 E2E aprovados**, incluindo
acessibilidade, capacidades de seis perfis, identidade e onboarding nos três
projetos após a coalescência e o ajuste de harness abaixo; sem retries locais.

CI do commit 6e7b627, run 41997444516: banco e validações Windows/Linux
aprovados, três browsers reprovados no mesmo helper de teclado. O main público
do login não possui tabindex; focá-lo não estabelece origem. O helper agora
usa link/landmark focalizável ou primeiro controle existente e exige movimento
real de Tab para outro alvo acessível. 30 controles locais aprovados, incluindo
main não focalizável e trap nessa alternativa; nenhum timeout/regra/retry
reduzido. A CI anterior não atesta esta árvore; novo resultado será consultado
após publicação. D1 e D2 integrais permanecem em execução, sem GO/merge.
