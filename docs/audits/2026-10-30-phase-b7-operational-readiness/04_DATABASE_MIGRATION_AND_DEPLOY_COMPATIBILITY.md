# B7.4 — Evolução de schema e compatibilidade

## Estado comprovado sem replay

84 arquivos ordenados, versões sem duplicação, manifesto protege as 84
migrations normalizando CRLF/LF e não apresenta drift. Os textos antigos que
citam 19/63 não descrevem o guard atual; REPO-001 permanece o registro de
origem. Nenhum arquivo de migration foi alterado. Diff da base funcional 37cb7f8
é vazio.

Consulta local e consulta remota de catálogos, ambas com `BEGIN READ ONLY` e
timeout de 15 s: PostgreSQL 17.11; 84 versões iguais, última 20261025214537; 232
rotinas public/private com identidade e definição normalizada iguais. Extensões
requeridas também têm versões iguais na amostra. O wrapper confirmou conta e ref
antes da consulta associada. Nenhuma tabela de paciente foi lida nessa prova
remota. Ver `evidence/schema-metadata.json` e SQL reprodutível.

Contraprova relevante: 218 hashes brutos de função divergiam. Remover apenas
CRLF, sem reescrever SQL, eliminou todas as divergências. É diferença textual de
instalação Windows/Linux, não 218 defeitos ou alterações não autorizadas. Versão
no histórico e hash de função não certificam todos os objetos, grants,
políticas, dados, configuração Auth ou bytes Storage.

Reaproveitamos o replay limpo/legado de A e o job DB de 40656069166, cuja cadeia
funcional está inalterada. A B3 também comparou as 84 migrations; B7 não
reinicializou nem reaplicou a cadeia para reproduzir essa prova.

## Matriz de convivência e reversibilidade

- **Base funcional atual / 84 atuais**. **Consequência sustentada:** Versões e
  rotinas correspondem ao local. **Detecção / ação futura:** Ainda validar
  configuração e smoke do destino.
- **Novo fluxo de escalas/BAL / schema anterior a tabelas/RPCs exigidas**.
  **Consequência sustentada:** Relação/função ausente pode devolver erro; build
  não consulta contrato remoto. **Detecção / ação futura:** Bloquear release por
  manifesto mínimo e conferir RPCs.
- **Código novo / migration parcialmente aplicada**. **Consequência
  sustentada:** Contratos relacionados podem divergir entre chamadas. **Detecção
  / ação futura:** Não servir mutações até verificar pós-condições.
- **Migration aplicada / aplicação anterior permanece**. **Consequência
  sustentada:** Depende de assinaturas e semântica mantidas. **Detecção / ação
  futura:** Testar versão anterior no schema novo antes de migrar.
- **Aplicação atual / rollback só documental para 37cb7f8**. **Consequência
  sustentada:** Código funcional comparado é idêntico. **Detecção / ação
  futura:** Não generalizar para qualquer versão antiga.
- **Migração de dados / rollback de aplicação**. **Consequência sustentada:**
  Dados confirmados e jobs não voltam no tempo. **Detecção / ação futura:**
  Forward fix/compensação, preservando história.
- **Restore de instante antigo / aplicação atual**. **Consequência sustentada:**
  Pode faltar schema, objeto, identidade ou evento. **Detecção / ação futura:**
  Recuperação conjunta e reconciliação antes de jobs.

As migrations finais renomeiam helpers para wrappers, serializam idempotência
BAL e acrescentam cursor com rotação. Manter nomes antigos privados é estratégia
de compatibilidade interna; não demonstra compatibilidade universal de qualquer
cliente antigo. Alterações DDL/backfill históricas incluem relaxamento de
coluna, renomeações e transformações; não há plano de rollback reversível por
migration nem manifesto de versão mínima consumido na inicialização. É B7-003:
lacuna de gate de compatibilidade/configuração, sem afirmar incompatibilidade
atual.

## Locks, falha parcial e condições futuras

O replay usa CLI e `ON_ERROR_STOP` nas suítes SQL; isso prova os contratos
testados no runner, não uma janela de migração online. `lock_timeout=0` na
sessão consultada não é orçamento operacional aprovado. Não houve espera
forçada, alteração de timeout permanente ou benchmark de locks na B7. Timeout de
consulta desta auditoria não representa o timeout do runtime.

Antes de qualquer migração futura: autorização específica, conta/ref/branch/SHA,
inventário do instalado, backup recuperável e destino de ensaio isolado; revisão
de DDL/backfill, lock estimado, timeout, transação e ponto de parada; testes de
versão antiga/nova, esquema de expansão/contração quando aplicável e
pós-condições explícitas. Evitar mudança destrutiva durante convivência.

Se falhar: conservar evidência da versão realmente aplicada, interromper cutover
e jobs que consumam o contrato novo, conferir integridade, corrigir
incrementalmente sob nova autorização e só retomar após aceitação. Não usar
`migration repair`, reset ou edição histórica para fabricar convergência.
Rollback de aplicação só é opção depois de provar compatibilidade do banco
existente. O runbook DR detalha quando um destino de restore separado é
necessário.
