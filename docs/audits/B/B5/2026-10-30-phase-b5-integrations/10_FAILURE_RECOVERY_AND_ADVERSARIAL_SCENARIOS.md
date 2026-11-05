# Falhas combinadas e recuperação

## B5-013: referências atravessam tentativas

[B510-S01–04](evidence/b510-callback-results.json) são quatro checkpoints de
uma fixture SQL nova com rollback, não quatro envios reais. Retry autorizado
de failed conservou provider_reference anterior. Com a nova lease em processing,
callback accepted da referência antiga encerrou a lease. Complete com referência
nova falhou como lease lost; callback delivered novo, mesmo com opaque job ID,
foi ignorado porque a linha já tinha referência diferente não nula.

Resultado: accepted associado à tentativa antiga, sem entrega registrada da
nova. É falha de correlação/recuperação confirmada no contrato SQL. A ordem
externa é simulada; não se afirma que a Meta produziu essa sequência numa conta
real. Um status sent anterior pode chegar atrasado em relação a failed/retry;
frequência e comportamento de cada versão exigem homologação. Não usar o tempo
de chegada como identidade de tentativa.

Contraprova: linha sem referência anterior correlacionou o novo callback pelo
opaque ID e terminou delivered. Monotonicidade funciona dentro da referência
correta; não identifica automaticamente gerações distintas de envio. A solução
futura deve preservar histórico/tentativa e reconhecer callbacks antigos sem
liberá-los para concluir a lease corrente. Simplesmente apagar a referência
antiga pode também perder prova útil. Não reenviar uncertain para testar.

## Matriz adversarial transversal

Esta tabela relaciona hipóteses aos menores recortes existentes. “Referência”
não é nova execução B5; “controlado” não é provedor real.

- **crash após envio/antes do complete** — Prova/estado: B3 B39-05, leitura
  vigente; Efeito e limite: Lease externa vencida vira uncertain, sem reenvio
  cego; envio real não exercitado.

- **resposta de messages perdida** — Prova/estado: B53-C03 controlado; Efeito
  e limite: uncertain correto; referência/callback podem recuperar quando
  disponíveis.

- **upload falha antes de messages** — Prova/estado: B53-C01/02 + S03; Efeito
  e limite: Mensagem não iniciada; classificação incerta desnecessária B5-003.

- **callback antes do complete** — Prova/estado: B3 B39-06, referência; Efeito
  e limite: Estado confirmado não é sobrescrito por worker atrasado.

- **read antes de delivered** — Prova/estado: B3 B39-06, referência; Efeito e
  limite: Read não regride; arrival time não é timestamp do provedor.

- **callback de tentativa antiga durante retry** — Prova/estado: B510-S01–04,
  SQL novo; Efeito e limite: B5-013: referência/lease se confundem; nova
  confirmação pode ser perdida.

- **revogação/cancelamento durante upload** — Prova/estado: B4 B49-01
  controlado + triggers atuais; Efeito e limite: Pode haver chamada posterior
  de messages; resumo skipped não prova ausência de chamada; sem envio real
  indevido demonstrado.

- **fila com tarefa terminal antiga** — Prova/estado: B3 B39-01/02/03,
  referência; Efeito e limite: Starvation P1/legado continua; não limpar
  história para desobstruir.

- **item inválido entre válidos** — Prova/estado: B55-C01/02; Efeito e limite:
  200 descarta inbound; status pode ser processado separadamente; B4-011
  ampliado.

- **segundo item falha na RPC** — Prova/estado: B55-C06; Efeito e limite:
  HTTP503 para reentrega; primeiro efeito não faz parte da mesma transação
  HTTP.

- **mesma conta em dois pacientes** — Prova/estado: B55-S01/02; Efeito e
  limite: Não adivinha paciente; falta handoff B5-006; contexto único e dedup
  funcionam.

- **telefone errado/propósito diferente** — Prova/estado: B56-S01; Efeito e
  limite: Recusa; hash de lembrete não serve como ciência/ENT.

- **telefone muda após confirmação Auth** — Prova/estado: B59-C01 + validação
  vigente; Efeito e limite: Risco de registro interno sem retomada; comparação
  ao Auth evita envio ao antigo.

- **Flow enviado duas vezes** — Prova/estado: B57-S02/03; Efeito e limite:
  Texto recupera; no_issues recusa resultado já confirmado, B5-008.

- **sessão Flow vencida/revogada** — Prova/estado: B57-S05/07 + C02; Efeito e
  limite: Autoridade nega; adaptação de erro cifrado é incompleta.

- **revisão Flow repetida com decisão oposta** — Prova/estado: B57-S06; Efeito
  e limite: Retorna status/report original, sem relato ou ledger duplicado.

- **PDF de evento antigo após nova versão** — Prova/estado: payload vigente +
  prova B4 PDF; Efeito e limite: Evento/versão/hash conservados; texto pode
  misturar nomes/configuração atuais; sem auditoria B6.

- **aviso externo falha, tarefa interna existe** — Prova/estado: enqueue
  required/internal e B3 entrega; Efeito e limite: Canis independentes; modo
  opcional external-only precisa decisão de contingência.

- **ciência repetida** — Prova/estado: B3/V4 por referência; unique REQ/user
  vigente; Efeito e limite: Sem nova ciência individual/estoque; origem
  automática não vira expressa.

- **invalidação chega e tela não consulta** — Prova/estado: B58-U01 real;
  Efeito e limite: Flow pendente invisível até reload, B5-010.

- **trocar paciente com revisão aberta** — Prova/estado: B58-U02 real,
  refutado; Efeito e limite: Remount elimina seleção; sugestão original
  permanece pendente.

- **convite revogado durante preparo** — Prova/estado: convite é link manual;
  B4-003 e contrato de aceite; Efeito e limite: Não existe transporte de
  convite no worker para simular envio; emissor/prazo são revalidados no
  aceite.

## Deduplicação e efeito externo

Locks e chaves transacionais protegem efeitos de banco. Media upload e mensagem
são efeitos externos; não podem ser revertidos por rollback SQL. HMAC autentica
envelope, não elimina perda de retorno. Um único registro outbox pode conter
várias tentativas ao longo do tempo; sua unicidade não é exatamente uma entrega.

Não há nova hipótese de dupla operação física comprovada pela B5. Relatos são
revisados; ENT usa destinatário/versão/idempotência e ledger. A duplicação de
mensagem continua consequência possível de reenvio indevido de resultado
incerto ou de correlação inadequada, não quantidade física duplicada
demonstrada.

A [matriz de cenários](evidence/SCENARIOS.csv) distingue cada execução nova,
contraprova e resultado refutado. Falhas instrumentais estão em ATTEMPTS.
Casos antigos só são reabertos com nova dúvida técnica ou drift de contrato.
