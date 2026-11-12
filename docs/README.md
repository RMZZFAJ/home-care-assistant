# Documentação do Home Care Assistant

**UI/UX vigente:**[Modelo Integral](ui-ux/CANONICAL_MODEL.md), aprovado
em 09/11/2026, substitui Fluent e a direção visual anterior. Aplicar a todos
os recursos existentes/futuros sem reduzir funções. O acompanhamento abaixo
conserva o estado da implementação e das validações.

**Andamento da D-B:** [acompanhamento principal](../TEMP_D_B_ATUALIZACAO.md),
com capacidades entregues, trabalho local, fila e responsabilidades. A
[matriz](audits/D/D-B/ACCEPTANCE_EXECUTION.csv) detalha os 105 critérios.

**Ordens vigentes:** [Ordem Mestre](audits/D/D-B/OWNER_EXECUTION_ORDER.txt),
[complemento documental](documents/01_COMANDO_COMPLEMENTAR_PDFS.md) e
[complemento executivo](audits/D/D-B/OWNER_EXECUTION_SUPPLEMENT.txt). O último
prevalece nos conflitos de método e rascunhos. A
[composição PDF aprovada](documents/03_ESPECIFICACAO_DOCUMENTAL_APROVADA.md)
permanece obrigatória; a aplicação conserva o Modelo Integral.

**Implementado:** [contratos atuais](current/README.md). Fichas, Andamentos,
PWA/Push e emissão/verificação assinada já têm implementação, com pendências
indicadas no acompanhamento. Rascunhos existentes ficam congelados em escopo e
apresentação; expansão e simplificação são OWNER-DEFERRED. Produção NO-GO.

**Histórico e planejamento:** A/B são diagnóstico; C é projeto histórico e D-A
registra D0–D2. Evidências datadas não substituem o estado do candidato atual.

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
