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
