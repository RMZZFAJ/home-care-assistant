# Checkpoint B7

Auditoria autorizada em 30/10/2026. Branch exclusiva `audit/phase-b`; baseline
`378298ac4df887df95a92d27cf360700a97dfeed`. Árvore inicialmente limpa. Base
funcional `37cb7f85e96e551d6419871f94dd950712e2565b`; `master` preservada em
`34dcb835c5c49068e0417f7306eb4e501aa868bc`.

## Estado recuperável

- Ordem mestra e objetivo lidos integralmente.
- B7.0 concluído: baseline local/remoto e fontes reconciliadas.
- B7.0–B7.12 e consolidação concluídos; validação final em evidence.
- Commit documental autorizado após validação; publicação condicionada à guarda
  real de não deployment descrita abaixo.
- Não repetir suítes globais, replay, build ou testes anteriores sem hipótese
  nova.
- Não corrigir produto, configurar provedor, restaurar, publicar deploy, criar
  PR, fazer merge ou iniciar C.
- Escrever somente neste pacote e, no fechamento, no índice `phase-b`.
- Commit/push documental único após validação e preservação.

## Limites já identificados

Plugins: Vercel exige reautenticação; GitHub requer `link_id` indisponível. CLI
GitHub: conta ativa `RMZZFAJ` confirmada. CLI Vercel: usuário `rmzzfaj`, equipe
`rmzzfajs-projects`, plano Hobby; não divulgar e-mail/credenciais. Node global
24.13.0 diverge; usar runtime 24.22.0 existente em LOCALAPPDATA. Nenhuma
configuração permanente foi alterada.

## B7.0 — concluído

`evidence/baseline.json`: Node 24.22.0, 395 arquivos protegidos, 84 migrations
locais, 232 rotinas idênticas à B3, zero fila HTTP externa e zero segredos de
worker no Vault. Hashes agregados de public/private/Auth/Storage preservados
para comparação final. 216 objetos Storage; nenhuma escrita de negócio.
`evidence/remote-baseline.json`: contas e projeto conferidos por GET. Master
remota igual à local e desprotegida; CI mais recente falhou no SHA 34dcb83.
Vercel possui previews históricos da branch documental e produção 34dcb83.
`createDeployments=disabled` observado; confirmar sua semântica e revalidar
antes do push para preservar a proibição de deploy. Supabase doctor autenticado
como RMZZFAJ no projeto qwfrqychokvhdzakibid. Falha inicial do coletor: guard de
identificador não admitia o dígito em `s3_multipart_uploads`; corrigido apenas
no auxiliar documental e repetida a leitura. Nenhum dado foi alterado.

## B7.1 — concluído

Topologia e 17 dependências inventariadas. Guardas locais mantidas; desenho
documental de preview compartilhando remoto não equivale a isolamento. Valores
de env não coletados. Next/Auth/DB e Storage necessário à evidência separados de
Meta/Flows/OAuth/SMS opcionais. Identidade administrativa Supabase foi
verificada antes de considerar qualquer consulta remota de metadados.

## B7.2 — concluído

CI histórica verificada por SHA/jobs/log dirigido, sem reexecutar. QA-001
continua: Chromium39/40, retry também falhou, agregado falhou. Gate não mascara
a falha. Rulesets vazios e master sem proteção; Vercel produção READY no mesmo
SHA com CI falha demonstra desacoplamento histórico do release. HEAD audit tem
somente Vercel, não CI. Metadados persistidos em ci-metadata.json.

## B7.3 — concluído

Inventário de configuração, tipos remotos e serviços produzido sem valores. Sete
testes dirigidos sem rede: quatro configurações anunciam WhatsApp, mas o
provider recusa ativação. Contraprovas completa/desligada/sem token concordam.
Nova causa B7-002; não reexecutados os44 pontos B5. Service key também atende
anexos/PDF; desligar Meta não elimina essa dependência.

## B7.4 — concluído

84 migrations e 232 rotinas comparadas em catálogos local/remoto de leitura. 218
diferenças brutas foram refutadas ao normalizar somente CRLF/LF; zero drift
normalizado. Histórico protege84, sem duplicação ou alteração. Não há prova de
incompatibilidade atual; ausência de gate de versão/configuração é B7-003.
Matriz de convivência e falha parcial concluída sem replay.

## B7.5 — concluído

16 dumps com manifesto válidos; um sem manifesto separado. TOC do último: 2093
entradas/128 TABLE DATA, inclui Auth, cron.job e vault.secrets. Dois pares SQL
históricos remotos conferidos por hash/cabeçalhos; bytes Storage fora. Backups
gerenciados: GET/CLI acessível, lista vazia, PITR false. Não extrapolar para
inexistência de qualquer cópia externa.20 componentes na matriz. Runbook futuro
de destino isolado/quarentena/reconciliação; nenhuma restauração. Risco de
jobs/endpoint antigo reativados é B7-004, ligado a OPS-001.

## B7.6 — concluído

Health existente identificado e preservado: last_run/processed, cursor e cron.
Remoto:1440 sucessos por job/24h,360 respostas HTTP200/6h, nenhuma lease
expirada observada. Local: cron worker success sem secrets/invocação; 465 leases
antigas em fixtures, sem limpeza. OBS-REUSE delimita falta de detecção/ação por
progresso, não outage comprovado. Sem logs privados, claim, retry, envio ou
falha induzida.

## B7.7 — concluído

Nova incompatibilidade B7-005: UI/helper10 MB e avatar5 MiB frente a body4,5 MB
documentado Vercel. Três provas em memória:1 MiB passa,6 MiB passa/sanitiza, 11
MiB recusa. Zero rede/upload/DB. Dez pontos novos somando CFG/UPL.
BE-006/B3-015/016/024 e B6 reutilizados, sem carga ou p95 inventado. Fluid
suporta 120 s; elevar plano/teto sozinho não resolve lease120 s.

## B7.8 — concluído

Matriz por tipo de prova/processo/papel. Preservados98 unitários/33 integrações
históricos e 119/120 E2E de A; não atribuídos a nova execução B7. QA-001 aberto,
mobile emulado separado de físico e aceite humano. Sem testes globais novos.

## B7.9 — concluído

Lock538, sem mismatch/integrity ausente/URL externa; 4 Actions SHA/tag
conferidas. npm audit exit1:3 nós high, um advisory re2js2.8.6 devOnly; flag
opt-in não usado nos consumidores markdownlint examinados. Sem
exploração/runtime demonstrados, acompanhar proporcionalmente B7-007 P3. Shell
login público sem headers de hardening amostrados é B7-006 P3, sem exploração.
Preview protegido302; drains0. Nenhum fix, atualização, login, cookie ou segredo
foi coletado.

## B7.10 — concluído

15 incidentes com detecção/contenção/registro/conciliação/dono/retorno.
Contingência física e recuperação da mesma intenção explicitadas; não se impôs
processo definitivo nem se inventou endpoint de reconciliação. REQ sem
quantidade, ciência diferente de recebimento, relato diferente de débito e
escala diferente de presença preservados. Não houve ensaio humano ou outage
induzido.

## B7.11 — concluído

Cinco estratégias comparadas sem escolha unilateral; 14 domínios de prontidão.
Sequência futura de bootstrap/cutover/smoke/monitoramento/parada e rollback
compatível documentada, sem execução. Canais opcionais separados de dependências
de Auth/ledger/Storage/service key. Não declarar GO nem iniciar C.

## B7.12 — concluído

Segunda passagem A–J e 11 contraprovas reconciliadas. Sete registros: 5 P2/2 P3;
quatro causas/lacunas novas, uma causa adicional de recuperação, duas
oportunidades. OBS-REUSE excluído dos achados novos. OpenAPI: createDeployments
só controla GitHub Deployment records. Sem guarda git.deploymentEnabled/ignore
verificada, push pode disparar preview como os anteriores. Não publicar até
mecanismo real ou instrução adicional. Concluir todos os documentos,
verificações e commit autorizado antes dessa dependência.

## Consolidação e preservação verificadas

24 entregáveis obrigatórios, sete registros/28 campos (cinco P2/dois P3), 31
cenários, 16 provas anteriores e 46 âncoras. Ver package-validation.json para
links locais, referências e verificações proporcionais. Markdown, sintaxe/lint
dos auxiliares e TypeScript dos probes passaram; não houve repetição de testes
funcionais após documentação.

395 arquivos protegidos e 232 rotinas preservados; 108 tabelas observadas, 106
inalteradas. Somente scheduler_health e bal_scheduler_progress mudaram seus
agregados por cron preexistente, explicitamente registrados. Zero mudança
inesperada de negócio/Auth/Storage e master intacta. Sem reset, restore,
fixture, escrita remota, configuração de provedor, mensagem, deploy, PR, merge
ou Fase C.

Manifesto guarda hashes locais brutos e hashes de texto normalizado LF para
checkout Git com CRLF. O diagnóstico está completo e o commit deve permanecer
estritamente documental. Verificar git log/status para a referência efetiva; o
SHA do próprio commit não pode constar do conteúdo que o determina.
