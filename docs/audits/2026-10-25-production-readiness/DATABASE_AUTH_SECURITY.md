# Banco, Auth, Storage e segurança transacional

Auditoria Fase A; SHA `37cb7f85e96e551d6419871f94dd950712e2565b`. Leitura
iniciada em 25/10, retomada em 26–27/10/2026. Este relatório descreve o estado
cumulativo das migrations, não atribui ao produto atual defeitos já corrigidos
por migrations posteriores. Nenhum código de produto, migration histórica ou
ambiente remoto foi modificado por esta frente.

## Resultado e limite da conclusão

A base possui controles de autorização e integridade substanciais: contexto
vinculado a sessão Auth real, papéis por paciente, RPCs transacionais, grants
explícitos, histórico imutável e estoque derivado do ledger. O replay local
limpo e legado, 14 regressões SQL, a compatibilidade de search_path e 33
integrações passaram na execução coordenada pelo responsável principal. Esses
resultados sustentam os contratos exercitados; não constituem homologação de
produção, de Meta ou de todas as combinações de estado.

Foram lidos semanticamente **103/103 artefatos atribuídos**: 84 migrations,
configuração local, seed, `.gitignore` e 16 arquivos SQL de teste/apoio. A
matriz individual está em
[coverage-database.csv](evidence/coverage-database.csv). Todos têm revisão
semântica; os consumidores de interface/API foram examinados de forma dirigida,
e não integralmente por esta frente. Nenhum artefato de banco requer inspeção
visual; a validação visual pertence à frente de UX.

O conjunto [findings-database.json](evidence/findings-database.json) separa
defeitos confirmados, hipóteses funcionais, riscos de capacidade e observações
estáticas. **Não há P0 confirmado nem exploração de autorização demonstrada
nesta frente.** O root confirmou localmente DB-001 (falha SQL no cancelamento
com consumo, P2) e DB-002 (bloqueio persistente de lembretes no cenário de 25
pacientes com REQ canceladas e outro paciente elegível, P1 para automação
multipaciente). Não extrapolar esse cenário para afirmar que um paciente único
ou todo ambiente já está afetado.

## Evidência executada

- Evidência: [migrations.json](evidence/migrations.json),
  [migrations.log](evidence/migrations.log); Resultado: PASS; 26/10, 18:40–18:43
  UTC; Node 24.22.0; O que demonstra / o que não demonstra: Cadeia completa
  instalada; evolução desde migration19 preservou protocolos, quantidades, FKs,
  saldos dos dois pacientes e estoque legado sem atribuição. Não é comparação
  com schema remoto.
- Evidência: Mesmo log, 14 regressões SQL; Resultado: PASS; O que demonstra / o
  que não demonstra: Transações, convites/importação/outbox, alertas, leitura
  segura, protocolo, grants service-role, documentos, reviews, recibos WhatsApp,
  conflitos, BAL e recuperação de claim.
- Evidência: Mesmo log, compatibilidade hospedada; Resultado: PASS; O que
  demonstra / o que não demonstra: Reprodução local do search_path restrito,
  SHA-256 e remoção da ponte temporária. Não acessou o ambiente hospedado.
- Evidência: [integration.json](evidence/integration.json),
  [integration.log](evidence/integration.log); Resultado: 33/33 PASS; 26/10,
  18:43–18:45 UTC; O que demonstra / o que não demonstra: Identidades Auth
  reais, HTTP, concorrência BAL, escalas, governança, TOTP, realtime e contratos
  de Flow. Transporte de provedor continua simulado.
- Evidência: [database-metadata.log](evidence/database-metadata.log) e
  [consulta](evidence/probe-metadata.sql); Resultado: Leitura local em 27/10; O
  que demonstra / o que não demonstra: 84 migrations; 62 tabelas public e 9
  private. Nenhum grant direto service_role de SELECT/DML/TRUNCATE nas
  tabelas/views examinadas; nenhum SECURITY DEFINER public/private sem
  search_path fixado.
- Evidência: [db-ent-probe-captured.log](evidence/db-ent-probe-captured.log);
  Resultado: Defeito confirmado pelo root, rollback; O que demonstra / o que não
  demonstra: Consumo atual 1, alocação passada 1; comando consent_cancel
  alcançado e erro SQLSTATE 42702 em `e.body`. A hipótese aritmética posterior
  não foi alcançada.
- Evidência: [db-lifecycle-probe.log](evidence/db-lifecycle-probe.log);
  Resultado: Defeito confirmado pelo root, rollback; O que demonstra / o que não
  demonstra: Três rodadas: REQ válida sem lembrete e 25 canceladas ainda
  vencidas. Controle retirou somente candidaturas canceladas; quarta rodada
  processou a REQ válida.

O runner [run-database-probe.mjs](evidence/run-database-probe.mjs) usa o guard
existente de `scripts/test-environment.mjs`: projeto exato, labels do container
e API/banco em loopback nas portas 54321/54322. As consultas desta frente usaram
o Node disponível no shell (24.13.0); isso não substitui os gates oficiais
executados pelo root com 24.22.0. Elas não exercitam código da aplicação.
Posteriormente, o root acrescentou ao runner login oficial de duas identidades
sintéticas porque o logout E2E havia removido sessões. **A versão atual do
runner cria sessões Auth locais, portanto não deve ser descrita como puramente
read-only**, mesmo quando o SQL fornecido só consulta metadados. Esses logins
também exigem coordenação com a suíte.

Na inspeção local, `global_admin_guard` é a única tabela public sem RLS;
anon/authenticated não têm privilégios nela. Não é evidência de acesso aberto.
Os dois RPCs públicos a anon são deliberados:
`invitation_registration_allowed(text,text)` e
`verify_document_integrity(uuid,integer,text)`. A revisão não equipara endpoint
público limitado a vazamento de dados. Buckets `patient-evidence`,
`document-receipts` e `profile-avatars` são privados, com limites respectivos
de10MiB/10MiB/1MiB e MIME allowlists.

## Reconstrução cumulativa

- Faixa de migrations: 01–19; Responsabilidade e estado final: Origem de
  catálogo, requisição, estoque, protocolo e status; remoção de quantidade
  solicitada; primeiras restrições de grants. Há implementações históricas que
  não são mais entrypoints autorizados.
- Faixa de migrations: 20–35; Responsabilidade e estado final: Identidade global
  separada de membership; catálogo canônico por paciente; transações, convites,
  importação, alertas e outbox. FKs compostas e derivação de escopo impedem
  mistura entre paciente/pai/filho. Revogações de service_role e defaults
  globais de função fecham caminhos herdados. Ponte digest20.5 é removida32.
- Faixa de migrations: 36–52; Responsabilidade e estado final: Documentos
  REQ/COM/ENT/BAL, séries por paciente/tipo, snapshots/hashes, ledger decimal,
  recibos, anexos, ciência de recebimento, drafts/recontagem, resolução de
  extras e revisões autenticadas. Guard de último administrador global torna-se
  transacional e não infla com INSERT ignorado/UPSERT.
- Faixa de migrations: 53–67; Responsabilidade e estado final: Contexto
  operacional ligado a Auth session; governança local/global; ciência familiar
  independente do atendimento; lifecycle e archive; regras de aviso; snapshots
  de render; TOTP; registry Meta e Flows por propósito. Revisões posteriores
  corrigem validação de configurações, tarefas, histórico, convites e locks de
  archive.
- Faixa de migrations: 68–84; Responsabilidade e estado final: Capacidades
  administrativas, escalas reais, exclusão de sobreposição por profissional,
  ciclos/obrigações/atribuições BAL, adiamento e recontagem. Revisões de
  referência do ledger e locks antes da recuperação idempotente; transporte de
  conflitos; recuperação limitada de deadlocks em claims; rotação dos regimes
  BAL.

### Autoridade e isolamento

- `profiles` representa identidade global; `care_recipient_memberships`
  representa poder local. Papel global não concede operação implícita sobre
  todos os pacientes. Contexto global e contexto de paciente são selecionados
  explicitamente.
- `private.auth_session` consulta a sessão real, seu usuário e validade, em vez
  de confiar somente em um UUID fornecido pelo navegador. `authority_sessions`
  liga contexto à sessão. Mudança de paciente não concede membership.
- `private.member_can` resolve capacidade para uma identidade; `private.can`
  acrescenta contexto e assurance. Override de usuário precede o de papel, mas
  fronteiras não delegáveis continuam em COM, access.manage e BAL familiar. Após
  ativação de regime BAL, contar exige profissional/supervisor e atribuição
  executável.
- Administração com TOTP verificado exige AAL2. Ausência de fator verificado
  permite administração; isso é a política atual, não MFA obrigatório universal.
  A configuração de produção deve confirmar a política de enrollment escolhida.
- Propostas globais precisam de administrador local distinto. Aprovar ingresso
  de pessoa ainda sem vínculo cria convite; o titular do email confirmado
  aceita. Revogação de vínculo/invitante e rotação de token são revalidadas.
  Mudança local aplica imediatamente dentro do paciente.
- RPCs legadas renomeadas são preservadas internamente, com EXECUTE revogado.
  Defaults globais de PUBLIC em funções também foram revogados; apenas revogar
  defaults por schema seria insuficiente. Teste service-role cria objetos de
  prova e verifica defaults futuros.

### Estoque e documentos

`care_recipient_products` é o catálogo operacional. `products` preserva
identidade/modelos e ownership. Nome/unidade/categoria tornam-se snapshots
documentais; unidade com histórico não pode mudar silenciosamente. Extras
históricos desconhecidos continuam extras/NULL, sem associação automática nem
conversão de desconhecido em zero.

O estoque oficial é `stock_movements`, decimal exato, com custódias
FAMILY/CARE_TEAM/TRANSIT, revisão monotônica e saldos antes/depois calculados
sob lock por paciente. A view de saldo usa security_invoker e a leitura geral
não expõe estoque familiar a perfis da equipe. Transação ENT retira da origem
para trânsito; aceite registra o recebido; diferença exige resolução. COM só
credita recibo validado. BAL aplica diferença sobre referência do ledger e exige
recontagem se a referência mudou. Funções antigas de estoque e exceções
extraordinárias não são caminhos públicos para saldo negativo.

REQ não contém quantidade pedida. Atendimento vem de vínculos explícitos entre
item e linha ENT com aceite positivo; ENT não vinculada não atende por
similaridade. Ciência familiar é outra dimensão, com política/eligíveis
registrados; atraso, entrega e ciência não se substituem.
Cancelamento/compensação preserva eventos anteriores. Arquivamento manual exige
conclusão operacional e autoridade; archiving automático considera ciência e
prazo, e completion sem ciência marca necessidade de decisão manual. Read models
distinguem histórico importado de pedido operacional.

`document_events` e evidências de ciência são imutáveis. Hash SHA-256 é
calculado no banco sobre JSON canônico, não aceito do cliente.
`document_renders` distingue versão semântica da renderização do PDF e preserva
hashes/objetos anteriores. A verificação pública devolve validade limitada. Isso
comprova consistência interna do modelo; não deve ser descrito como assinatura
qualificada ou certificação jurídica.

### Escalas e BAL

Escala significa trabalho programado, não prova de presença. Recorrência gera
ocorrências persistidas; intervalos publicados do mesmo profissional não podem
sobrepor, inclusive entre pacientes. Alteração preserva evento anterior e
versão. Tipos alterados afetam séries novas, sem reescrever horários já
materializados.

Regime BAL é opt-in. Obrigações semanais preservam prazos originais e efetivos,
atrasos e regularizações. Um ciclo aberto e uma atribuição ativa por paciente
são protegidos por índices únicos. Atribuição exige plantão publicado,
capacidade atual, profissional designado e janela válida. O fechamento não
inventa contagem retroativa; obrigação passada regularizada aponta à contagem
física real. Adiamento requer fronteira familiar, versiona o alvo e preserva
snapshot; poder sobre escala não substitui consentimento de adiamento.
Recontagem formal distingue autor original, contador real e revisor.

Locks seguem estoque antes de BAL nos entrypoints de contagem. Migration83 lê
idempotência depois de adquirir lock e revalida autoridade, para retorno correto
quando outra chamada já fechou a atribuição. Teste concorrente por HTTP
independente é evidência mais forte que dois clientes compartilhando refresh
lock. A rotação84 garante avanço entre regimes BAL; não deve ser extrapolada ao
lifecycle ou aos lembretes legados (DB-002/006).

### Notificações, WhatsApp e Storage

Outbox tem destinatário individual, lease, tentativas e estados separados.
Expiração de lease externo gera resultado incerto, sem reenvio cego; retry de
uncertain exige confirmação explícita e trilha. Worker revalida destinatário,
contato, capacidade e política antes de enviar. Webhooks preservam
monotonicidade de estados. Templates PREPARED representam contratos preparados,
não aprovação real da Meta. Configuração ausente pode manter job em hold até
liberação autorizada. Email configurável aparece em outbox, mas o transporte não
é exercido pelo worker WhatsApp: não contar email como canal operacional
homologado.

Quiet hours passaram a adiar next_attempt_at na migration62; hipótese de
descarte permanente da implementação antiga foi refutada. Alertas decimais
também foram corrigidos62: `stock_alert_events.balance` e `evaluate_stock_alert`
usam numeric. Não registrar essas versões antigas como defeitos atuais.

Recibos WhatsApp/Flow exigem token de uso único, propósito, prazo, telefone
confirmado, versão/documento/recebedor corretos e política atual.
`worker_authority` é contexto privado por backend/transação, não um campo livre
recebido do navegador. API remove alegações de provenance do cliente; banco
registra nível real de confirmação. Flow de ocorrência prepara sugestão para
revisão; não altera estoque como consequência de NLP ou clique em sem
ocorrências.

Anexos passam por reserva, sanitização, upload, finalização e vínculo ao
documento. Hash/MIME/tamanho e autoridade são revalidados, e links são
temporários. Há recuperação pela mesma chave idempotente. O ciclo de vida de
reservas abandonadas permanece uma lacuna (DB-004). Leitura de metadados não
comprova comportamento real de upload/assinatura de todos os formatos; esses
caminhos precisam dos testes de API/UX e da futura homologação de Storage.

## Achados e contraditório

- ID: DB-001; Diagnóstico: Consumo positivo no cancelamento aciona consulta com
  alias `e` ambíguo.; Situação: P2 confirmado: SQLSTATE 42702 aborta a operação.
  A diferença entre recortes de consumo/conciliado é sub-hipótese ainda
  encoberta. Não demonstrou corrupção.
- ID: DB-002; Diagnóstico: Cancelados vencidos ocupam os 25 pacientes do
  lifecycle sem avançar.; Situação: P1 confirmado no cenário multipaciente
  descrito: três execuções sem progresso e controle positivo na quarta. Não
  afirma incidência em paciente único.
- ID: DB-003; Diagnóstico: end_series em proposed seguido de approve pode
  republicar ocorrências após cutoff.; Situação: P2; sequência estática; API/UI
  alcançáveis, sem execução da sequência.
- ID: DB-004; Diagnóstico: Quarantine abandonada ocupa limite 10 sem
  expiração/cancelamento identificado.; Situação: P2; lacuna de ciclo de vida,
  mitigada parcialmente por retry da mesma chave.
- ID: DB-005; Diagnóstico: Histórico resumido é copiado em cada evento, com
  crescimento agregado quadrático.; Situação: P3 risco de capacidade; não
  exponencial, impacto de latência não medido. Prioridade alinhada a BE-006;
  medir antes de otimizar.
- ID: DB-006; Diagnóstico: Lote 100 de lembretes legados não tem
  cursor/progresso garantido.; Situação: P2 risco de escala; a rotação BAL não
  resolve essa seleção.
- ID: DB-007; Diagnóstico: Última revisão de invalidate_workspace perdeu
  destinatários de perfil e proponente global sem vínculo.; Situação: P2; stale
  de UI, não bypass; confirmação dirigida com consumidor pela frente backend.

Outras observações não elevadas a defeito: resolução imutável de extra incorreto
merece política futura de compensação; desativação de produto com saldo e
recontagem merece homologação humana do catálogo; ciência exigida de membros
posteriormente revogados pode exigir decisão manual após conclusão. Não se
inferiu vulnerabilidade a partir dessas situações sem uma violação demonstrada.

## Testes SQL: alcance e lacunas

Os16arquivos foram lidos integralmente. `assume-context.sql` é helper que usa
identidades e sessões emitidas oficialmente no Auth local; não fabrica sessão
persistente. `migration-search-path.sql` é teste de compatibilidade por etapa.
Os14restantes são regressões completas identificadas no log. São testes
transacionais com rollback e cenário conhecido; não representam escala
produtiva, backup remoto restaurado, comportamento de dispositivos físicos ou
entrega real de mensagens.

As assertions cobrem isolamento A/B, revogação global/local, defaults e grants
futuros, imutabilidade, estoque sem negativo, hashes, desconhecido histórico,
idempotência, leases, autorização de destinatário, confirmação de consumo,
fronteira BAL e fairness de101regimes. Algumas helpers `must_fail/denied`
capturam qualquer exceção: evidenciam que a chamada falhou, mas isoladamente não
provam que falhou pelo guard pretendido. A integração HTTP e testes com SQLSTATE
específicos complementam, sem eliminar a necessidade de diagnóstico em
regressões novas.

Faltam reproduções dirigidas dos achados DB-003/004/006/007 e da sub-hipótese
aritmética de DB-001; carga de documento longo DB-005; matriz completa de
campos/grants após futura migration; corrida catálogo/desativação/contagem;
retenção/expiração Storage; falhas entre banco e objeto; operação real de cron e
provedor. DB-001/002 foram reproduzidos localmente pelo root como descrito
acima. Não se deve marcar cada ramo como runtime_checked porque a migration
inteira foi aplicada. A matriz usa runtime_checked=YES para aplicação/replay da
migration e descreve esse limite nas notas.

## Probes preparados e checkpoint de retomada

- [ENT histórico](evidence/probe-ent-cancel-history.sql): fixture sintética de
  cancelamento antigo; nova entrega, consumo e cancelamento via RPC autenticada.
  Duas tentativas iniciais desta frente abortaram antes do alvo (substituição de
  delimitador no harness; depois consulta de perfil filtrada por RLS), sem
  commit. O harness foi corrigido e o recebedor passou a ser buscado em
  membership. Após coordenação, o root renovou sessões oficiais e confirmou erro
  42702. A confirmação vem do comando-alvo no log capturado, não das falhas
  iniciais de harness. A consulta aritmética permanece pendente após eventual
  correção autorizada do alias.
- [Lifecycle cancelado](evidence/probe-lifecycle-cancelled.sql): 26 pacientes,
  25 cancelamentos por RPC, três rodadas e controle positivo. Executado pelo
  root; final rollback. A rotação BAL continuou processando seus regimes,
  demonstrando que o problema é da etapa lifecycle.
- Execução futura coordenada: Node da versão do projeto, a partir da raiz, `node
  docs/audits/2026-10-25-production-readiness/evidence/run-database-probe.mjs
docs/audits/2026-10-25-production-readiness/evidence/probe-ent-cancel-history.sql`
  e equivalente lifecycle. Exigem stack local e fixtures Auth existentes.
  Scripts incluem rollback; são candidatos investigativos e podem exigir ajuste
  de fixture. Não executar simultaneamente a E2E/reset.

O responsável principal executou os dois probes após E2E e liberou o banco para
o retry visual. Resultados estão incorporados ao JSON, relatório e cobertura
associada. A cobertura estática está encerrada para os 103 artefatos; a
homologação operacional e os experimentos pendentes permanecem explícitos.

## Preparação futura de produção limpa

O config versionado é local: portas fixas, SMTP capturado, redirects de
loopback, signup confirmado e TOTP habilitado. Não inferir políticas remotas a
partir dele. O seed cria paciente e catálogo fictícios; não é pacote de dados de
produção. Não rodar reset remoto nem transportar fixtures/Auth local.

Uma futura implantação limpa deve aplicar a cadeia imutável em ambiente
autorizado, comparar schema/grants/RLS com o replay, confirmar
Auth/redirects/SMTP/TOTP e buckets, criar administrador inicial de forma
explícita, cadastrar pacientes e catálogos reais com proveniência e verificar
restauração de backup. Dados históricos devem entrar pelos contratos de
importação, preservando desconhecido e evitando avisos retroativos. Cron,
Vault/worker e templates precisam ser habilitados com destinos corretos somente
após homologação e autorização correspondentes. O catálogo de templates contém
URLs do deployment atual e a configuração do worker fixa esse host; reutilizar
em outro ambiente exige revisar destinos, não copiar segredos.

Antes de depender da automação, demonstrar progresso das filas, efeitos de
revogação, recuperação de resultado incerto e monitoramento de atraso. Antes de
adotar BAL em um paciente, homologar profissionais, tipos/janelas, fronteiras
familiares, estoque de referência e tratamento de ausência/recontagem com
pessoas reais. Nenhum desses passos foi executado no remoto durante a auditoria.
