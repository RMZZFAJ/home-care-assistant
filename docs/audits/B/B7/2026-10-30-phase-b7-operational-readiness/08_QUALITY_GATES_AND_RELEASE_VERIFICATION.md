# B7.8 — Cobertura do gate e homologação operacional

## O que cada prova oferece

- **Contrato estático**. **Cobertura reutilizada ou atual:** 84 migrations
  protegidas e campo REQ removido. **Lacuna de release:** Não prova
  schema/configuração remota em funcionamento.
- **Unitário**. **Cobertura reutilizada ou atual:** A:98, validadores, erros,
  redirects, snapshots, worker falso. **Lacuna de release:** Sem todos os
  serviços/efeitos externos.
- **SQL/RLS**. **Cobertura reutilizada ou atual:** B3:94 cenários, Auth real,
  concorrência, integridade. **Lacuna de release:** Sem homologação de
  infraestrutura/restore.
- **Integração**. **Cobertura reutilizada ou atual:** A:33; Auth/HTTP/RPC e
  concorrência. **Lacuna de release:** Não prova operação humana ou todos os
  cortes de falha.
- **E2E**. **Cobertura reutilizada ou atual:** A:119/120; CI atual histórica
  falha Chromium. **Lacuna de release:** Intermitência QA-001 e cobertura física
  ausente.
- **Acessibilidade automática**. **Cobertura reutilizada ou atual:** B1/E2E axe
  e controles. **Lacuna de release:** Não certifica leitor de tela/entendimento
  completo.
- **Visual**. **Cobertura reutilizada ou atual:** B1 superfícies e B6 PDFs.
  **Lacuna de release:** Screenshot/raster não prova operação ou impressão real.
- **B7 dirigido**. **Cobertura reutilizada ou atual:** 7 configurações e 3
  envelopes em memória. **Lacuna de release:** Prova contratos específicos, sem
  autenticação/infra real.
- **Metadado remoto B7**. **Cobertura reutilizada ou atual:** CI, deploy,
  schema/rotinas, cron/HTTP agregado. **Lacuna de release:** Sem novo
  login/smoke mutável, restore ou mensagem real.
- **Homologação operacional**. **Cobertura reutilizada ou atual:** Planos nas
  fases anteriores. **Lacuna de release:** Pessoas/dispositivos, prazos, backup
  e contingência sem aceite.

Os números são evidência datada, não uma suíte B7 reexecutada. A identidade
funcional foi comparada à base e as rotinas locais à B3. A consulta remota
acrescentou estado de catálogos; não converte mocks ou testes locais em E2E de
produção. A B7 não ampliou timeout, excluiu teste, suprimiu regra ou executou
workflow para produzir verde.

## Cobertura por processo e falha

- **REQ sem quantidade**. **Provas úteis existentes:** Contratos, E2E e banco.
  **Lacuna a considerar antes de liberar:** Duplicidade humana, ciência/entrega
  distintas e DB-002.
- **COM / validação**. **Provas úteis existentes:** SQL/HTTP e jornadas.
  **Lacuna a considerar antes de liberar:** Parcela rejeitada/remanescente e
  representação B2/B6.
- **ENT / trânsito / aceite**. **Provas úteis existentes:**
  Concorrência/idempotência, papéis e E2E. **Lacuna a considerar antes de
  liberar:** Cancelamento com consumo, rede após gravação e reconciliação.
- **Estoque**. **Provas úteis existentes:** Ledger, rollback integral e
  concorrência. **Lacuna a considerar antes de liberar:** Correção vinculada ao
  fato, contagem inicial humana e custo.
- **Escalas / BAL**. **Provas úteis existentes:** 101 regimes, locks Auth,
  negações e E2E. **Lacuna a considerar antes de liberar:** Resumo de aprovação
  UX-001 e decisões família/supervisão.
- **Catálogo / acesso**. **Provas úteis existentes:** Multipaciente, revogação e
  último admin. **Lacuna a considerar antes de liberar:** Sessões em voo, links
  temporários, convite recuperável.
- **Anexo / PDF**. **Provas úteis existentes:** Hash, versão e sanitização
  controlados. **Lacuna a considerar antes de liberar:** Body Vercel B7-005,
  fidelidade B6 e restore de bytes.
- **Notificações**. **Provas úteis existentes:** Outbox/leases/uncertain e
  adaptadores B5. **Lacuna a considerar antes de liberar:** Gate B7-002, prazo
  por paciente e canal real homologado.
- **Atualização / retorno**. **Provas úteis existentes:** Replay limpo/legado
  histórico. **Lacuna a considerar antes de liberar:** Versão antiga com schema
  novo, preflight e rollback.
- **Recuperação**. **Provas úteis existentes:** Manifestos e TOC. **Lacuna a
  considerar antes de liberar:** Ensaio DB/Auth/Storage/config/jobs em destino
  isolado.

Testes de rede após persistência e idempotência cobrem intenções escolhidas, não
todo retorno de internet ou restore temporal. Concorrência validada em HTTP/Auth
independente deve ser preservada; mocks não substituem RLS real. Não rodar
suítes que revogam identidades ao lado de E2E autenticado.

## Primeiro uso por papel — condições para aceite futuro

- Administrador local: escolher paciente, revisar configuração/catálogo e
  convite, conferir antes/depois de escala, reconhecer conflito e revogação.
  Administração global não autoriza operação de estoque sem vínculo local.
- Familiar: distinguir ciência, aquisição, recebimento validado e saldo;
  conferir ENT/pendências e decidir revisão/adiamento de BAL segundo a política.
- Supervisão: conferir equipe, divergências, proposta e necessidade de decisão
  familiar; não converter programação em prova de presença.
- Profissional: consultar escala/atribuição real, REQ sem quantidade solicitada,
  aceitar material físico, contar BAL e recuperar a mesma intenção após falha.
  Relato de consumo continua sugestão até confirmação autorizada.
- Leitor autorizado: consultar somente o paciente/escopo permitido, entender
  estado e exceção e ter mutações recusadas; não depender só de menu oculto.

Cada percurso requer papéis reais aprovados, paciente/dataset de homologação,
aparelho físico, rede representativa, suporte de acessibilidade necessário e
confirmação de entendimento. Testar troca multipaciente, erro, vazio,
carregamento, permissão revogada, resultado incerto e canal desabilitado.
Registrar observação humana, resultado persistido, dono e aceite separado da
execução automatizada. Nenhuma dessas homologações foi declarada realizada.

## Gate de decisão

Resolver QA-001 com regressão do helper/cenário, exigir checks do SHA e
cobertura dos processos escolhidos, sem apagar a falha histórica. Associar
homologações, DR e critérios humanos ao mesmo candidato de release. Falta de
automação de um aceite não autoriza omiti-lo; pode ser etapa manual documentada
com responsável. Esta matriz organiza cobertura e dependências para decisão
posterior, sem iniciar C nem escolher unilateralmente o escopo do primeiro
lançamento.
