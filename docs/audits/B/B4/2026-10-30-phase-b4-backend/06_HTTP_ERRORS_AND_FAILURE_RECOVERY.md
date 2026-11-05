# Erros HTTP, resultado real e recuperação

## Defeito semântico novo

**B4-006, P2.** O adaptador `databaseError` classifica mensagens por regex sem
primeiro distinguir falha de implementação de conflito do domínio. SQLSTATE
42702, `column reference "e.body" is ambiguous`, cai em `/ambiguous|alias/`
e vira 409/AMBIGUOUS_PRODUCT com instrução sobre nome/apelido de produto.
Esse é o erro SQL real do cancelamento ENT B3-002, agora rastreado até o
contrato HTTP. B46-01 executou o adaptador real com essa falha controlada.
Não reexecutou cancelamento SQL nem afirma novo fato de persistência: o
rollback e o estado cancellation_pending são provas históricas B3.

A classificação afeta suporte e recuperação: corrigir um apelido não destrava
cancelamento com erro interno. Também elimina dos logs a categoria real do
defeito. Alternativa futura: códigos de domínio explícitos/allowlist, mantendo
resposta segura, correlação e diagnóstico interno sem payload privado.

## Contraprovas que limitam a conclusão

[Sete testes iniciais](evidence/b46-errors-results.json) usam dependências
controladas, sem banco/provedor. B46-02 mostra que conflito de serialização
com `concurrent` recebe orientação de recontar estoque, mesmo sem conhecer
o domínio. É generalização do mesmo mapper, não nova falha de ledger.

B46-03 usa **SQLSTATE sintético P0001** com texto de expiração de Flow e
resulta em INVITATION_INVALID. A inspeção da RPC vigente mostrou 42501 nesse
ramo real. [B46-08](evidence/b46-flow-counterproof-results.json) confirma
403/FORBIDDEN com esse código; portanto **não há achado de convite inválido
no Flow atual**. A amostra artificial só demonstra a fragilidade do mecanismo.

B46-04 confirma omissão de SQL/payload sentinela nos logs e resposta, correlação
coerente e 503 seguro para erro desconhecido. Não propor devolver erros crus
ao navegador para melhorar diagnóstico.

## Taxonomia por certeza de efeito

- **201 confirmed REQ** — Significado observado: ID persistido, comprovante
  lido; Recuperação adequada: Mesmo ID; guardar intenção até confirmação.
- **503 RECEIPT_PENDING** — Significado observado: REQ salva, leitura
  posterior falhou; Recuperação adequada: Mesmo ID/chave; não nova requisição.
- **201/200 de comando** — Significado observado: RPC retornou sem erro;
  Recuperação adequada: Conferir semântica do retorno; B3-007 é exceção
  conhecida.
- **204** — Significado observado: Nenhum handler atual o usa como sucesso
  JSON; Recuperação adequada: Cliente JSON não aceita; B46-05 é
  compatibilidade, não defeito atual.
- **400/415/413** — Significado observado: Validação/entrada ou operação
  inválida; Recuperação adequada: Corrigir só após saber que nenhum passo
  anterior confirmou.
- **401/403** — Significado observado: Sessão/autoridade insuficiente;
  Recuperação adequada: Reautenticar/rever vínculo; não elevar capacidade no
  cliente.
- **404** — Significado observado: Ausente ou oculto por autorização;
  Recuperação adequada: Rever contexto; não inferir exclusão definitiva.
- **409** — Significado observado: Conflito de intenção/versão/estoque;
  Recuperação adequada: Reler e resolver; B4-004 pode ter revisão anterior
  salva.
- **429 externo** — Significado observado: Limite do provedor; Recuperação
  adequada: Retry somente conforme estado/orçamento; não afirmar entrega.
- **5xx, timeout, JSON interrompido** — Significado observado: Efeito pode ser
  desconhecido; Recuperação adequada: Recuperar intenção estável antes de
  repetir como nova.

## Cliente e contratos herdados

B46-06 confirmou que `client/api.ts` conserva status/code e texto/correlação,
mas descarta `recommendedAction`, `retryable` e categoria. B46-07 confirmou
que resposta não JSON de escrita recebe “Tente novamente”, sem certeza sobre
commit. São revalidações de B1-ERR-002, não achados inéditos. Vários
consumidores
congelam a intenção e mitigam; PolicyConsole não a conserva (B4-002).

B1-ERR-001 continua específico ao seletor de anexo após resposta perdida.
B2-011/B3-007 continuam com decisão oposta de consumo: a RPC devolve estado
anterior e API responde 200 sem comparar a intenção aplicada; o consumidor
ignora o corpo e confirma operação. Não repetir a decisão SQL antiga para
provar o mesmo resultado. Ausência de erro não significa que a segunda
decisão foi persistida.

B4-003 mostra 200 com resultado não acionável; B4-004 mostra 409 após commit
parcial de duas etapas. Logo status sozinho não define certeza. O envelope
deve representar efeito confirmado, parcial ou desconhecido por operação,
sem uniformizar regras legítimas distintas nem liberar edição de intento
incerto.

Nenhum teste desta etapa enviou mensagem ou acessou produção. Próximo:
documentos, cache PDF, reservas, associação e falhas de Storage.
