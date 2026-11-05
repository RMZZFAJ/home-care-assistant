# Resultado da revisão semântica

> Relato intermediário preservado. Contagens/pendências referem-se ao
> fechamento anterior. Estado atual no
> [relatório definitivo C10](../C10-pr-handoff/PHASE_C_FINAL_PART2_REPORT.md).

121 causas e 165 associações de origem foram lidas individualmente contra o
achado/evidência, suas contraprovas e limites. Não houve nova reprodução
funcional. IDs, agrupamentos e prioridades históricos foram preservados. As
[justificativas por causa](CAUSE_SEMANTIC_VERIFICATION.csv) e
[por associação](SOURCE_ASSOCIATION_REVIEW.csv) registram o fundamento.

As alterações de domínio/decisão/spec/lote estão em
[SEMANTIC_CHANGES.csv](SEMANTIC_CHANGES.csv). Destaques:

- 001: lembretes legados por configuração, NOT/BAL/escala, D5; separado de
  049, lifecycle REQ, D1. Cursor BAL não prova nenhum dos dois mecanismos.

- 010: três variantes ENT/estoque/configuração BAL; 015: HTML COM/BAL além do
  PDF; 035: feedback COM preservado junto ao relato/consumo.

- 063: snapshots documentais, sem afirmar cópia recursiva integral.

- 073: candidato inválido no scheduler comum, com impacto REQ, D1.

- 075: testar chave estável tanto no alias administrativo observado em A
  quanto no consumidor de settings observado em B4.

- 077: fonte reproduziu ENT, não COM; recuperação de revisão/submit cobre
  ENT/COM/BAL em D3, sem atribuir prova inexistente a essas duas variantes.

- 086: lembretes internos legados em D5; Meta/Flows continuam D7 diferida.

- 095: consumo/FlowReviews/fila administrativa dependem da revisão da
  consulta; D3, sem aguardar instalação PWA.

- 116: arquivo/transporte em D4; sanitização posterior não resolve teto.

- 119: desenhar oráculo em D0 e integrá-lo ao conteúdo D4; PDF vazio deve
  falhar mesmo com assinatura e hash válidos.

UX-006 conserva associação primária 013 e explicita navegação em 014.
B1-UX-007 conserva 059 e explicita auditoria em 060. Revalidações B8 não
fundem riscos citados só como dependência. DB-006 não foi unido a DB-002.
Limites permanecem: prova estática não vira produção; amostra local não vira
SLO; hash/QR não viram autoria pessoal ou fato físico.

Os 149 aceites anteriores foram refinados individualmente; 12 requisitos
complementares receberam IDs C7-AC. Total canônico: 161 critérios/casos de
design, todos PLANNED_NOT_EXECUTED. Não são 161 testes executáveis escritos.
