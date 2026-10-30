# Dependências e causas herdadas

O registro B4 não replica todos os25 achados B3 nem os17 B2. Abaixo está o
mapa de responsabilidade e evidência reutilizada. Código funcional e232
definições SQL permaneceram iguais; provas históricas não são execuções B4.

- **UX-001/B1-UX-001, P1:** decisão de escala sem antes/depois completo.
  Backend autorizar não torna a decisão humana informada. Depende de interface,
  escala/BAL e aceite humano. B4 não corrigiu nem rebaixou o portão.
- **DB-002/B3-001, P1; B3-025, P3:** progresso do lifecycle e candidato legado
  abortando lote. Backend chama scheduler antes de envio; botão de envio não
  equivale a progresso de obrigações. Preservar dedup, justiça e rollback.
- **B3-002/B2-004/DB-001, P2:** SQL de cancelamento com consumo falha42702.
  B4-006 acrescenta erro HTTP enganoso; corrigir mapper não destrava a RPC.
  Testar fato físico, consumo anterior, retorno e ausência de débito duplicado.
- **B3-003/B2-013, P2:** proposta após encerramento republica plantões e pode
  derivar BAL. Não foi refeito; versão/contrato HTTP não corrigem cutoff SQL.
- **B3-004/B2-016 e B1-ERR-001, P2:** reserva abandonada/arquivo incerto.
  B4-007 é avatar, outra identidade de upload. Política de retenção e retomada
  não autoriza apagar reservas ativas, ready ou bytes históricos.
- **B3-005/B2-005, P2:** correção sem referência. API ainda aceita referenceId
  opcional; formulário não protege contrato direto. Preservar ledger e motivo.
- **B3-006/B2-009, P2:** revisão BAL legado pelo próprio contador. Agendado tem
  proteção distinta; não generalizar nem remover revisão independente.
- **B3-007/017 e B2-011, P2:** decisão contraditória/NULL. Boolean HTTP recusa
  NULL; decisão oposta ainda retorna estado anterior com200 e consumidor ignora
  corpo. Não corrigido pelo guard e não recontado como descoberta inédita.
- **B3-008/009 e B2-012/014, P2:** adiamento obsoleto e reconto sem sucessor.
  APIs não inventam nova tarefa; decidir recuperação sem apagar prazo original.
- **B3-010/B2-001 e B2-002/003/007/010/015, P2:** lacunas de fechamento COM,
  desacordo ENT, fila de cancelamento, saldo inativo, relato textual e sucessão
  após revogação. Exigem domínio/operação, não bypass administrativo.
- **B3-011/012, BE-001/004 e B2-017, P2:** consumo e auditoria antigos.
  B4-005 demonstra outra fila; não reexecutou volumes100 já comprovados.
- **B3-013, P2:** ausência de sinal em edição de perfil. B4-012 é causa
  adicional no consumidor mesmo com sinal recebido; corrigir só trigger não
  fecha o segundo contrato.
- **B3-014/OPS-001, P2:** restore conjunto não comprovado. Hash/TOC do backup
B4 não substitui recuperação de Auth, bytes, configuração, Vault, jobs e
RPO/RTO.
- **B3-015/024 e BE-006, P3:** crescimento de snapshots e custo por linha.
  B411 contou25 chamadas no adaptador; não inventar p95 ou ganho financeiro.
- **B3-016/BE-003, P2:** orçamento/lease do worker. B4-010 acrescenta janela
  de autoridade entre mídia/envio; prazo e cancelamento precisam de ensaio
  integrado, com uncertain preservado.
- **B3-018/019, P2:** coerção e fator não finito no SQL direto. B4-001 comprova
  passagem numérica HTTP; API bloquear string NaN não corrige a RPC direta.
- **B3-020/021, P2; B3-022, P3:** in-flight, sessão encerrada direta e TTL.
  B42 confirmou API recusando cookie; não corrigiu escrita direta/avatar nem
  prometeu revogar cópia baixada. Não generalizar janela SQL a toda rota.
- **B3-023, P3:** NULL direto remove limite documental. API passa página/tamanho
  limitados; o contrato inferior continua aberto e requer teste próprio futuro.
- **BE-002, P2; BE-007, P3:** significado de resumo externo e contexto editorial
  do PDF. B4 reutiliza código/probes; não afirma mensagem real ou obrigação
  de reescrever PDFs antigos.
- **BE-005/B1-ERR-002:** identidade de proposta e certeza de resultado.
  B4-002/003/004 ligam causas específicas a recuperações futuras; um envelope
  uniforme não pode apagar as diferenças entre consulta, rejeição e commit.

As referências completas e critérios anteriores ficam em
[B3](../2026-10-29-phase-b3-database/14_FINDINGS_MASTER.md),
[B2](../2026-10-29-phase-b2-processes/13_FINDINGS_MASTER.md),
[B1](../2026-10-28-phase-b1-interface/12_FINDINGS_MASTER.md) e
[A](../2026-10-25-production-readiness/FINDINGS_MASTER.md).
Não se abriu uma nova fase de correção ao ligar essas dependências.
