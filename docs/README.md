# Documentação do Home Care Assistant

**UI/UX vigente:**[Modelo Integral](ui-ux/CANONICAL_MODEL.md), aprovado
em 09/11/2026, substitui Fluent e a direção visual anterior. Aplicar a todos
os recursos existentes/futuros sem reduzir funções; migração em execução.

**PDFs e fichas:** o [complemento documental aprovado](documents/01_COMANDO_COMPLEMENTAR_PDFS.md)
autoriza a [nova composição e conteúdo](documents/03_ESPECIFICACAO_DOCUMENTAL_APROVADA.md).
A aplicação conserva o Modelo Integral. Implementação do acréscimo pendente.

**Estado atual:** [fonte por SHA](current/PROJECT_STATUS.md). Produção NO-GO;
A e B1–B8 concluídas como diagnóstico; C é planejamento e organização;
**D-B em execução** na [ordem vigente](audits/D/D-B/README.md);
**D-A consolidada localmente; CI e liberação independentes**, com
[evidências por incremento](audits/D/D-A/CHECKPOINT.md).
Decisão aprovada não é funcionalidade implementada.

Entrada mais recente: [C7–C10](audits/C/C10-pr-handoff/README.md),
[decisões vigentes](audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[projeto visual](audits/C/C8-visual-blueprint/README.md) e
[casos de aceite](audits/C/C9-acceptance-refinement/README.md).

<!-- c-table:start -->

- **Preciso de…:** Entender o sistema disponível e suas limitações

  **Começar aqui:** [Contratos atuais](current/README.md) e
  [operação](current/OPERATIONS.md).

- **Preciso de…:** Rever o que o responsável decidiu

  **Começar aqui:** [Decisões](decisions/README.md), com aprovações,
  adiamentos e pendências.

- **Preciso de…:** Entender como deverá funcionar

  **Começar aqui:**
  [Projeto C3](audits/C/C3-functional-specification/README.md) e
  [questões humanas atuais](audits/C/C7-decision-closure/OPEN_DECISIONS.md).

- **Preciso de…:** Implementar depois da autorização

  **Começar aqui:** [Arquitetura C4](audits/C/C4-technical-design/README.md),
  [lotes D](audits/C/C5-execution-roadmap/README.md) e
  [handoff C10](audits/C/C10-pr-handoff/PHASE_D_HANDOFF_UPDATED.md).

- **Preciso de…:** Conferir uma prova ou achado

  **Começar aqui:** [Auditorias A/B/C/D](audits/README.md) e
  [165 IDs](audits/C/C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv).

- **Preciso de…:** Recuperar um endereço anterior

  **Começar aqui:** [Mapa de relocação](RELOCATION_MAP.csv) e
  [relatório da migração](audits/C/C6-acceptance-handoff/DOCS_RELOCATION_REPORT.md).

- **Preciso de…:** Ler contexto histórico sem assumir autorização atual

  **Começar aqui:** [Arquivo](archive/README.md) e
  [_historical](audits/_historical/README.md).

<!-- c-table:end -->

current descreve contratos AS_IS e desvios conhecidos. decisions registra
regra humana; audits/C especifica TO_BE ainda não implementado. Auditorias
datadas preservam conclusões e evidências, mesmo quando dizem que C ainda não
começou naquele momento. runbooks distingue procedimento planejado de
executado. Nenhum índice autoriza envio, migration, restore, deploy, PR ou
merge.

Guias UI mantidos por compatibilidade ficam em [ui-ux](ui-ux/README.md).
[Meta](meta/README.md) e [referências](references/README.md) são
contratos/amostras, não aprovação/publicação externa. Não há duas versões
ativas concorrentes dos contratos principais. Dados fictícios e arquivos
privados não são operação real.

## Fechamento definitivo de 04/11/2026

P02 OWNER_APPROVED; 66 fichas/262 controles originais revistos, catálogo de
274 controles/424 usos e 187 casos planejados.
[Entrega histórica C](audits/C/C10-pr-handoff/README.md). D-A executada na
[Draft PR7](https://github.com/RMZZFAJ/home-care-assistant/pull/7), sem merge.
Gates específicos e CI pendente não são aprovados por documento.
