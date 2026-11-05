# Transferência documental para decisões futuras da Fase C

Este documento entrega insumos; não inicia a Fase C, não escolhe solução
definitiva e não autoriza implementação. A próxima fase exige nova autorização.

## Portões de liberação preservados

DB-002/B3-001 é P1 e bloqueia a promessa de automação do escopo afetado.
UX-001 anterior continua fora das correções autorizadas. Os19 P2 exigem plano
de correção/validação ou decisão explícita de escopo antes de operação real.
Nenhum P3 é promovido a bloqueador apenas por ter muitos objetos associados.
Não há certificação geral ou GO derivado dos 94 cenários.

- **B3-001/025** — Questão a decidir: Como provar progresso e recuperar
  candidato inválido?; Alternativas a comparar: Filtrar, rotacionar, isolar com
  alerta quando seguro; Dependência/aceitação: Preservar dedup, rollback e saúde
  observável.

- **B3-002/005** — Questão a decidir: Qual fato físico é compensado e qual
  consumo já existe?; Alternativas a comparar: Comando transacional com
  referência/consentimento; Dependência/aceitação: Não debitar consumo outra vez
  nem reescrever ledger.

- **B3-010** — Questão a decidir: Como desistir de parte não realizada da COM?;
  Alternativas a comparar: Evento por linha/revisão de saldo não físico;
  Dependência/aceitação: Preservar compra/recebimento/validação reais.

- **B3-003/008/009** — Questão a decidir: Como invalidar proposta/alvo/sucessor
  obsoleto?; Alternativas a comparar: Revalidação na decisão ou reapresentação
  formal; Dependência/aceitação: Corte, prazo original, contador e ciclo
  coerentes.

- **B3-006/007/017** — Questão a decidir: Como provar independência e intenção
  aplicada?; Alternativas a comparar: Guarda uniforme/retorno tipado/erro para
  NULL; Dependência/aceitação: Revisão por contador efetivo e débito único.

- **B3-018/019** — Questão a decidir: Onde validar valor original finito/exato?;
  Alternativas a comparar: Entry point antes de coerção e constraint
  justificada; Dependência/aceitação: Compatibilidade de unidade e diagnóstico
  de legado.

- **B3-020/021/022** — Questão a decidir: O que encerrar/revogar garante em cada
  momento?; Alternativas a comparar: Revalidar após lock, sessão em toda
  escrita, TTL aceito/proxy; Dependência/aceitação: Não quebrar login legítimo
  nem prometer revogar cópia.

- **B3-004/014** — Questão a decidir: Como recuperar bytes, reservas e objetos
  entre serviços?; Alternativas a comparar: Retomada/abandono, conciliação e
  restore isolado; Dependência/aceitação: Não apagar upload
  ativo/ready/história.

- **B3-011/012/013/023** — Questão a decidir: Como alcançar e atualizar todo
  registro autorizado?; Alternativas a comparar: Paginação/filtro/sinal por
  usuário/limite explícito; Dependência/aceitação: Contador, lista, referência,
  erro e vazio coerentes.

- **B3-015/024** — Questão a decidir: Qual volume/SLO/retencão é aceitável?;
  Alternativas a comparar: Manter com orçamento ou evoluir
  snapshot/leitura/cálculo; Dependência/aceitação: Hash/PDF antigo, RLS e
  quantidade exata intactos.

- **B3-016** — Questão a decidir: Qual orçamento/reenvio externo é confiável?;
  Alternativas a comparar: Medir lote/concorrência/lease/timeout por caminho;
  Dependência/aceitação: Uncertain conciliado, callback monotônico e sem
  duplicação.

## Sequência sugerida para avaliar decisões, sem execução

1. Fixar as garantias: progresso, revogação, precisão, independência de revisão,
   cancelamento físico e política de recuperação/retencão.
2. Delimitar escopo inicial e portões: quais regimes/canais estarão habilitados
   e quais validações precisam estar concluídas antes de liberar cada um.
3. Comparar alternativas por causa e dependência, com risco de migração,
   compatibilidade, custo de operação e comportamento correto a preservar.
4. Elaborar plano de implementação incremental e testes a partir da
   [matriz futura](15_ACCEPTANCE_AND_REGRESSION_MATRIX.md). Não editar
   migrations
   históricas ou usar limpeza de dados como substituto da correção.
5. Preparar ensaios isolados de replay/restore, homologação externa e validação
   humana/física com autorização específica e dados apropriados.

## Evidências que devem acompanhar qualquer decisão

O [registro mestre](14_FINDINGS_MASTER.md) fornece32 campos por causa, incluindo
contraprova e limite. A [cobertura](01_DATABASE_COVERAGE.csv) separa revisão
estática, negação DML, leitura Auth, SQL simulado e função sem caso
independente.
As [manifestações](evidence/FINDING_MANIFESTATIONS.csv) não são novos achados.
O pacote não autoriza converter uma linha estática em teste aprovado.

A revisão de migrations identificou transformações dinâmicas cuja semântica
e ACL precisam ser comparadas em replay futuro. Não foi observado drift de
função durante B3. O restore precisa incluir Auth, bytes, configuração e jobs,
com decisão de reenvio de trabalho já entregue externamente. Não basta
pg_restore terminar sem erro nem obter verde só em mocks.

A conclusão de C deverá registrar decisões do responsável, condições de aceite,
responsáveis, ordem e limites. A B3 deixa essas decisões abertas e rastreáveis,
com todo o histórico e o código funcional preservados.
