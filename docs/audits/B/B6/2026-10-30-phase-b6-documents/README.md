# Fase B6 — documentos, PDFs, histórico e fidelidade

B6.0–B6.12 investigados em 30/10/2026 na branch `audit/phase-b`, produto
`37cb7f85e96e551d6419871f94dd950712e2565b`, HEAD inicial
`69048034dc2532ffbe5d1dbca7dbd041c1f4be16`. Sem correções. NO-GO anterior
preservado; C/D, deploy, PR e merge não iniciados.

Começar pelo [parecer executivo](17_GROUP_B6_EXECUTIVE_ASSESSMENT.md), [registro
mestre](14_FINDINGS_MASTER.md) e [handoff](18_PHASE_C_DECISION_HANDOFF.md).
Estado de fechamento no [checkpoint](CHECKPOINT.md).

## Cobertura e limites

- 17 classes documentais/22 campos no inventário; 71 linhas na matriz de
  fidelidade. Quatro documentos operacionais e complementos separados.
- 13 registros/33 campos: 11 P2/2 P3; nove causas novas, duas manifestações
  conhecidas, um risco aprofundado e uma revalidação. Sem P0/P1 novo; anteriores
  permanecem.
- 23 cenários/pontos novos e 12provas anteriores referenciadas, não 35 E2E.
  Cinco pontos SQL mutáveis em três transações revertidas, três READ ONLY, onze
  casos de render, cache controlado, sanitizador, QR e cinza digital.
- Onze PDFs primários/32 páginas; 20 páginas vistas e 1 cinza adicional. Quatro
  PDFs de anexo origem/derivado com 4 páginas vistas. São artefatos fictícios.
- 745 eventos locais conferidos por agregado, sem divergência de hash/cadeia.
  Impressão física, AT, câmera, usuários reais, produção e restore conjunto:
  NOT_VERIFIED. PDF/QR/hash não provam fato físico ou assinatura humana.

## Mapa de leitura

1. [Baseline](00_BASELINE_SCOPE_AND_METHOD.md),
   [inventário](01_DOCUMENT_OBJECT_AND_SOURCE_INVENTORY.csv),
   [fontes](01_DOCUMENT_DOMAIN_AND_SOURCE_MAP.md) e
   [autoria](02_DOCUMENT_IDENTITY_AUTHORSHIP_AND_PROVENANCE.md).
2. [Integridade](03_EVENTS_SNAPSHOTS_HASHES_AND_IMMUTABILITY.md),
   [fidelidade](04_DOCUMENT_SEMANTIC_FIDELITY.md),
   [campos](04_DOCUMENT_FIELD_FIDELITY_MATRIX.csv) e
   [versões](05_VERSIONS_HISTORY_AND_RECONSTRUCTION.md).
3. [PDF](06_PDF_RENDERING_CONTENT_AND_LAYOUT.md), [casos
   visuais](06_PDF_VISUAL_CASES.csv),
   [cache](07_PDF_STORAGE_CACHE_AND_RECOVERY.md),
   [anexos](08_ATTACHMENTS_PROVENANCE_AND_CUSTODY.md) e
   [QR](09_QR_VERIFICATION_AND_EVIDENTIARY_LIMITS.md).
4. [Leitura e impressão](10_HISTORY_PRINTING_AND_HUMAN_INTERPRETATION.md),
   [retenção/restore](11_DOCUMENT_SECURITY_RETENTION_AND_RESTORE.md) e
   [contraditório](12_ADVERSARIAL_DOCUMENT_RECONSTRUCTION.md).
5. [Lacunas](13_NEW_DOCUMENT_GAPS_AND_OPPORTUNITIES.md), [mestre
   CSV](14_FINDINGS_MASTER.csv),
   [aceites](15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md) e
   [dependências](16_CROSS_GROUP_DEPENDENCIES.md).

## Evidências e execução

[Cenários](evidence/SCENARIOS.csv),[reconciliação](evidence/coverage-reconciliation.json),
[provas anteriores](evidence/reused-evidence.json), [tentativas
instrumentais](evidence/ATTEMPTS.md),
[preservação](evidence/preservation-results.json),
[validação](evidence/package-validation.json) e
[manifesto](evidence/MANIFEST.json). Os instrumentos sob evidence são
reprodutores documentais, não suíte para rodar em lote. Não reexecutar scripts
Auth/SQL antigos para retomar memória. Credenciais/dump ficam fora do Git. Novos
pacientes/documentos foram revertidos; duas contas Auth fictícias de ensaio
permanecem. Nenhum objeto Storage antigo foi alterado nem documento real
publicado.
