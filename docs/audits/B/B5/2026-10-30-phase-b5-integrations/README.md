# Fase B5 — automações, notificações e integrações

Investigação B5.0–B5.12 encerrada em 30/10/2026, sem correções. Branch exclusiva
`audit/phase-b`; baseline B4 `a21cea055dc2ba858b261924ee6dd7781112b2bf`;
base funcional `37cb7f85e96e551d6419871f94dd950712e2565b` sem diferenças.
O NO-GO anterior permanece. B6/C/D, deploy, PR e merge não foram iniciados.

## Leitura para decisão

- [Parecer executivo](17_GROUP_B5_EXECUTIVE_ASSESSMENT.md).
- [Registro mestre](14_FINDINGS_MASTER.md) e
  [CSV de 31 campos](14_FINDINGS_MASTER.csv):
  14 registros, 12 P2/2 P3, sem novo P0/P1; origens e limites individualizados.
- [Handoff para C](18_PHASE_C_DECISION_HANDOFF.md) e
  [critérios futuros](15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md), sem execução.

32 mecanismos no [inventário](01_AUTOMATIONS_AND_INTEGRATIONS_INVENTORY.csv),
25 eventos/34 variantes na [matriz de templates](04_EVENT_TEMPLATE_MATRIX.csv).
As [34 variáveis](evidence/TEMPLATE_PARAMETERS.csv) têm reconciliação semântica
individual; isso não acrescenta execuções à contagem.
44 pontos novos em [SCENARIOS](evidence/SCENARIOS.csv): 22 testes controlados,
20 checkpoints SQL/rollback e 2 cenários de navegador incluindo uma hipótese
refutada. Não são 44 E2E nem prova de entrega por provedor real.

## Relatórios por subgrupo

- **B5.0** — Artefato:
  [Baseline, escopo e método](00_BASELINE_SCOPE_AND_METHOD.md).

- **B5.1** — Artefato:
  [Mapa de dependências](01_INTEGRATION_DEPENDENCY_MAP.md) e inventário CSV.

- **B5.2** — Artefato:
  [Scheduler, cron e progresso](02_SCHEDULERS_CRON_AND_PROGRESS.md).

- **B5.3** — Artefato:
  [Outbox, leases e retries](03_OUTBOX_WORKERS_LEASES_AND_RETRIES.md).

- **B5.4** — Artefato:
  [WhatsApp, conteúdo e mídia](04_WHATSAPP_OUTBOUND_TEMPLATES_AND_MEDIA.md).

- **B5.5** — Artefato:
  [Webhooks e entrada](05_WEBHOOKS_CALLBACKS_AND_INBOUND_MESSAGES.md).

- **B5.6** — Artefato:
  [Interações e ciência](06_INTERACTIVE_RESPONSES_SCIENCE_AND_CONFIRMATIONS.md)
  .

- **B5.7** — Artefato: [Flows](07_WHATSAPP_FLOWS_SECURITY_AND_CONTRACTS.md).

- **B5.8** — Artefato:
  [Notificações internas e frescor](08_INTERNAL_NOTIFICATIONS_REALTIME_AND_FRESHNESS.md)
  .

- **B5.9** — Artefato:
  [Identidade externa](09_AUTH_EMAIL_SMS_OAUTH_BOUNDARIES.md).

- **B5.10** — Artefato:
  [Falhas combinadas e recuperação](10_FAILURE_RECOVERY_AND_ADVERSARIAL_SCENARIOS.md)
  .

- **B5.11** — Artefato:
  [Privacidade, saúde e capacidade](11_PRIVACY_OBSERVABILITY_AND_CAPACITY.md)
  .

- **B5.12** — Artefato:
  [Continuidade humana e contraditório](12_HUMAN_CONTINUITY_AND_CROSS_PROCESS_REVIEW.md)
  .

- **Consolidação** — Artefato:
  [Lacunas/oportunidades](13_NEW_GAPS_AND_INTEGRATION_OPPORTUNITIES.md) e
  [dependências](16_CROSS_GROUP_DEPENDENCIES.md).

## Evidência, execução e preservação

[Checkpoint](CHECKPOINT.md) registra a sequência e a retomada.
[Baseline](evidence/baseline.json) confere 395 arquivos protegidos, 232 rotinas
idênticas à B3, stack local, flags e cron.
[Topologia](evidence/active-topology.json)
identifica gatilhos atuais; legado retido não é assumido como cadeia ativa.
[Provas anteriores](evidence/PRIOR_PROOFS.csv) têm caminho/commit/hash e não
foram reexecutadas indiscriminadamente. [ATTEMPTS](evidence/ATTEMPTS.md)
conserva erros instrumentais e hipóteses refutadas, sem mascará-los como defeitos.

Reprodutores e resultados dirigidos ficam em evidence. Node 24.22.0 por processo;
nenhuma instalação/atualização de dependência. Os testes usam transporte
substituído com rede imprevista bloqueada, SQL local com novas fixtures/rollback
e navegador Chrome próprio com origens locais. Backup verificado fica fora do
Git; TOC não equivale a restore. Uma conta/perfil, dois pacientes e uma
submissão fictícios novos permanecem; credenciais/cookies/logs CLI ficam privados.

Não reexecutar scripts mutáveis para “atualizar” este pacote: eles registram uma
investigação datada. Não houve reset, substituição de fixtures anteriores,
alteração de função SQL, mensagem real, ativação ou mudança de provedor.
Build/typecheck/suítes globais/E2E completos não foram repetidos. Ajustes finais
de Markdown recebem somente validação documental afetada.

Conferência de preservação em evidence/preservation-results.json e validação
em evidence/package-validation.json; manifesto SHA-256 em
evidence/MANIFEST.json.
O manifesto exclui a si próprio e identifica todos os demais arquivos do pacote.
Commit/push exclusivamente documentais na branch existente encerram esta fase;
SHA final deve ser consultado no Git, sem autorreferência no manifesto.

Snapshot final: 395 arquivos e 232 rotinas sem alteração; 60 das 62 tabelas
públicas conservaram todos os hashes originais. Um documento e seu lifecycle
avançaram por req.reminder do sistema, com campos estáveis, encadeamento de
hash e próximo prazo conferidos contra backup em
[background-progress](evidence/background-progress-results.json). Nenhuma linha
original foi apagada/restaurada. Os 13 campos estáveis comparados das 77 contas
Auth anteriores foram preservados; há uma conta sintética nova. Timestamps de
login/sessão não integram essa comparação.
