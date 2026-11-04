# Outbox, workers, leases e retentativas

## Máquina de estados efetiva

- **evento confirmado** — Operação: enqueue; Destino/efeito: pending,
  destinatário/canal/evento; Recuperação: Persistência transacional; não é
  entrega.

- **pending elegível** — Operação: claim; Destino/efeito: processing;
  attempts+1; lease 120s/worker UUID; Recuperação: SKIP LOCKED e até três
  retries de deadlock no claim.

- **processing** — Operação: validate; Destino/efeito: mantém ou cancelled;
  Recuperação: Revalida capacidade, opt-in e telefone Auth; não garante
  autoridade futura.

- **processing** — Operação: interno; Destino/efeito: delivered; Recuperação:
  Não depende de Meta.

- **processing** — Operação: preparo/upload/send; Destino/efeito:
  accepted/pending/failed/uncertain; Recuperação: Referência externa quando
  disponível.

- **pending transitório** — Operação: complete; Destino/efeito: backoff
  30×2^attempts, teto 3600s; Recuperação: Até cinco tentativas; depois failed,
  salvo holds especiais.

- **pending por configuração** — Operação: wrapper complete; Destino/efeito:
  pending, next_attempt_at=infinity; Recuperação: Somente alguns gatilhos
  liberam automaticamente.

- **processing lease vencida** — Operação: próximo claim; Destino/efeito:
  interno pending; externo uncertain; Recuperação: Externo não reenviado
  automaticamente.

- **processing/accepted/uncertain** — Operação: callback; Destino/efeito:
  accepted/delivered/read/failed; Recuperação: Monotonicidade; callback pode
  invalidar lease.

- **failed/uncertain** — Operação: retry autorizado; Destino/efeito: pending,
  attempts0; Recuperação: uncertain exige confirmação explícita de
  conciliação.

O resumo TS não é um livro de efeitos externos: complete perdido seguido de
estado terminal soma skipped, inclusive após uma tentativa de `/messages`.
B4-010 permanece risco sustentado de janela de autorização, sem prova de envio
real indevido. B3-016/BE-003 conserva risco de orçamento: 50 jobs, concorrência
10, preparo/PDF e duas chamadas de até 15s não cabem garantidamente em 120s.
Não repetir relógio virtual A nem afirmar que o default 25 fecha esse risco.

## B5-002: hold sem caminho de retomada

[B53-S01](evidence/b53-queue-results.json) usa funções SQL vigentes, novas
linhas
sintéticas e rollback. Complete com `EVENT_TEMPLATE_NOT_CONFIGURED` gravou
pending/infinity sem template vinculado. Inserir o contrato ausente já aprovado
não liberou a linha. Retry com claims de uma sessão Auth local real e contexto
administrativo foi recusado como `notification is not retryable`.

`release_template_holds` trata somente mudança de approval para APPROVED com
nome/versão já vinculados e dois códigos específicos; não trata contrato
ausente, nome nulo ou erro de canal. Retry aceita somente failed/uncertain.
É defeito de recuperação confirmado, não mero template aguardando aprovação.
Contraprova B53-S02: template conhecido que passa PREPARED→APPROVED libera hold,
zera tentativas e torna elegível. PDF habilitado também tem gatilho próprio.
Não generalizar o defeito para todos os holds nem editar fila diretamente.

## B5-003: upload sem envio vira entrega incerta

[B53-C01–03](evidence/b53-provider-results.json), provider real com transporte
em memória e guarda contra rede: timeout em `/media` devolveu uncertain mesmo
sem chamar `/messages`. Erro HTTP503 explícito do mesmo upload devolveu pending
com MEDIA_UPLOAD_FAILED. Timeout depois do upload, já em `/messages`, manteve
uncertain corretamente. O catch geral perde a etapa em que falhou.

B53-S03 demonstra que complete persiste uncertain sem referência; não afirma
um envio SQL ou Meta. Combinar os dois contratos exige conciliação humana para
um caso em que o adaptador sabe que não iniciou a mensagem. É falha delimitada
de recuperação, com possibilidade de upload órfão no provedor não comprovada
realmente. Incerteza de upload não prova entrega ao destinatário. Preservar a
regra conservadora para falha depois da chamada de mensagem.

## Concorrência e interrupção: garantias e limites

B3 B39-05/06 já mostrou worker incorreto recusado, lease externa incerta,
retry com confirmação e callback read que vence a conclusão tardia; as 232
definições estão idênticas. Nada disso prova exatamente uma entrega externa.
Crash depois da aceitação e antes de persistir referência conserva resultado
incerto; callback com opaque ID pode recuperar, se recebido e aceito.

Revogação de membership/profile durante processing muda a linha para uncertain
e limpa lease, em vez de prometer desfazer mensagem em andamento. Pending vira
cancelled. Validar antes de preparar, emitir desafio ou bind reduz janelas,
mas upload e rede continuam fora da transação. O ponto de corte e a conciliação
precisam ser definidos sem apagar callbacks legítimos.

O job guarda último estado/erro/referência e contagem, não um histórico completo
de cada upload/tentativa. Reset de attempts por retry dificulta reconstruir
trajetória; há audit_events do retry, sem referência externa completa na UI.
Este limite será tratado em observabilidade, sem criar outro motor de filas.

## Proporcionalidade e encerramento

Três cenários de provider e três SQL; todos sem envio externo. Backup local
fora do Git com hash/TOC em [prova](evidence/backup-proof.json), sem restore.
SQL fez somente novas fixtures e rollback; nenhuma função ou linha anterior
foi substituída. Não executar os reprodutores antigos. Próximo: significado
das mensagens, versão selecionada e transporte.
