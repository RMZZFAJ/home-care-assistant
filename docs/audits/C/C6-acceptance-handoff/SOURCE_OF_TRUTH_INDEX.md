# Fontes de verdade e conteúdo equivalente exigido

<!-- c-table:start -->

- **Informação:** Estado atual e relação com SHA/deploy

  **Fonte canônica:**
  [current/PROJECT_STATUS](../../../current/PROJECT_STATUS.md).

- **Informação:** Contratos AS_IS e desvios

  **Fonte canônica:** [current](../../../current/README.md); código funcional
  e fontes A/B por ID.

- **Informação:** Decisão humana e status

  **Fonte canônica:** [Master](../../../decisions/PRODUCT_DECISIONS_MASTER.md)
  e [índice de 65 registros](../C2-decisions/DECISIONS_REGISTER.csv).

- **Informação:** Questão aberta não técnica

  **Fonte canônica:** [P01–P15](../C2-decisions/HUMAN_DECISIONS_REVIEW.md);
  recomendações não aprovadas.

- **Informação:** Inventário bruto e reconciliação causal

  **Fonte canônica:**
  [165 IDs](../C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv) e
  [121 causas](../C1-consolidation/CAUSE_FAMILIES_MASTER.csv).

- **Informação:** Tela, campo, ação, estado e permissão desejados

  **Fonte canônica:** [C3](../C3-functional-specification/README.md),
  [inventário](../C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv)
  e padrões comuns.

- **Informação:** Contrato técnico/compatibilidade

  **Fonte canônica:** [C4](../C4-technical-design/README.md), impacto de 121
causas e
  grupos de 28 grupos de requisito.

- **Informação:** Ordem, donos, gate e homologação

  **Fonte canônica:** [C5](../C5-execution-roadmap/README.md).

- **Informação:** Aceites/regressão

  **Fonte canônica:** [Matriz de 149 critérios](ACCEPTANCE_CRITERIA_MASTER.csv)
e
  [estratégia](REGRESSION_PLAN.md); não executados funcionalmente em C.

- **Informação:** História e bytes originais

  **Fonte canônica:** [A/B/_historical](../../README.md),
  [arquivo](../../../archive/README.md) e manifestos datados.

- **Informação:** Movimentos, links e exceções

  **Fonte canônica:** [Mapa](../../../RELOCATION_MAP.csv), logs editoriais,
  [relatório](DOCS_RELOCATION_REPORT.md) e validador C6.

- **Informação:** Implementação futura

  **Fonte canônica:** [D reservada](../../D/README.md); resultados ainda
  inexistentes.

<!-- c-table:end -->

A lista proposta no roteiro C é cobertura de conteúdo, não obrigação de
duplicar documentos. Assim: prioridade/grafo/lacunas estão na reconciliação
C1;
conflitos/glossário/perguntas em C2; blueprint de guias e cenários em C3;
security/traceability e ADR em C4; PR/CI/feature gates/ambiente/homologação em
C5;
decisões abertas são apontadas ao único pacote humano C2. Nenhuma
especificação
de futuro foi copiada como contrato já implementado em current.

Paths em CSV/JSON/log de prova são dados datados, não todos hiperlinks vivos.
Para consultá-los sem executar experimentos:

```powershell
$taskResolver = 'docs/audits/C/C6-acceptance-handoff/'
$taskResolver += 'resolve_documentation_path.py'
$taskOldPath = 'docs/audits/2026-10-30-phase-b5-integrations/README.md'
.venv/Scripts/python.exe $taskResolver $taskOldPath
```

O resolver consulta o mapa e informa existência. `--from-source` permite
resolver referência relativa no contexto original de uma prova movida. Não lê
arquivo privado nem adapta/executa script histórico. Ferramentas com destinos
hardcoded continuam pendência D0; Meta/references e inventário UI conservaram
os caminhos realmente consumidos, sem alterar scripts funcionais nesta C.
