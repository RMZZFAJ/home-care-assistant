# B8 — Qualidade e sustentabilidade técnica

Auditoria final especializada da Fase B, autorizada em 30/10/2026. Baseline
documental `294382b56e10c7c7c38a4d94bc91bacffb01ee3f`, branch `audit/phase-b`;
base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.

O Eixo Q examina testes, oráculos, regressões, confiabilidade, desempenho,
dispositivos e acessibilidade. O Eixo M examina repositório, documentação,
scripts, dependências e manutenção. O checkpoint registra o progresso.

## Limites

Não corrigir achados A–B7, alterar produto/migrations/dados remotos, realizar
reset, criar PR, promover produção, fazer merge ou iniciar C/D. Testes novos
devem responder a hipóteses concretas, sem repetir suítes globais. Preview
automático do push documental autorizado, sem configuração de provedor.

Antes de B8.0 foram resolvidos os nove avisos do VS Code: seleção explícita da
`.venv` já existente e crases em três linhas do relatório B4. Imports reais e
painel Problems sem problemas verificados; scripts Python preservados.

## Resultado e leitura

Q1–Q9, M1–M7 e revisão transversal concluídos. NO-GO anterior preservado; C e D
permanecem não iniciadas. Consolidação e critérios de conclusão validados.

- [Parecer executivo](GROUP_B8_EXECUTIVE_ASSESSMENT.md).
- [Achados](FINDINGS_MASTER.md) e [CSV](FINDINGS_MASTER.csv): nove registros,
  três novos de qualidade e seis revalidações; seis P2/três P3.
- [Regressões A–B7](REGRESSION_COVERAGE_MATRIX.csv): 156 IDs, 119 famílias.
- [Critérios futuros](ACCEPTANCE_AND_REGRESSION_CRITERIA.md),
  [dependências](CROSS_GROUP_DEPENDENCIES.md) e [insumos para
  C](PHASE_C_DECISION_HANDOFF.md).
- [Checkpoint](CHECKPOINT.md), [contraprovas](evidence/ADVERSARIAL_REVIEW.md) e
  [limitações/tentativas](evidence/LIMITATIONS_AND_ATTEMPTS.md).

## Eixo Q

1. [Inventário efetivo](Q/01_TEST_INVENTORY.md).
2. [Processos, pessoas e exceções](Q/02_PROCESS_AND_EXCEPTION_COVERAGE.md).
3. [Força dos oráculos](Q/03_ORACLE_QUALITY.md).
4. [Catálogo de regressões](Q/04_REGRESSION_CATALOGUE.md).
5. [Flakiness e isolamento](Q/05_FLAKINESS_AND_ISOLATION.md).
6. [Desempenho, dispositivos e
   acessibilidade](Q/06_PERFORMANCE_DEVICES_ACCESSIBILITY.md).

## Eixo M

1. [Repositório e candidatos](M/01_REPOSITORY_AND_CANDIDATES.md).
2. [Manutenibilidade](M/02_MAINTAINABILITY.md).
3. [Documentação vigente](M/03_CURRENT_DOCUMENTATION.md).
4. [Ferramentas, dependências e fluxo](M/04_TOOLS_DEPENDENCIES_AND_WORKFLOW.md).

## Evidência e reprodução

São 20 observações dirigidas, não uma suíte global: cinco casos PDF em dois
modos, um controle que falha como esperado, cinco probes sintéticos de navegador
e quatro casos SQL readonly. Nenhuma prova funcional foi repetida após mudanças
exclusivamente documentais. Ver comandos e limites antes de executar
instrumentos; não rodar evidence em lote.

[Inventário](evidence/inventory.json),
[reconciliação](evidence/regression-reconciliation.json), [provas
anteriores](evidence/PRIOR_REFERENCES.json) e
[âncoras](evidence/SOURCE_ANCHORS.csv) sustentam o pacote. A validação final
produz package-validation.json e MANIFEST.json. Hashes LF são portáveis entre
Windows/Linux; observações de mutantes preservam seus resultados efetivos.
