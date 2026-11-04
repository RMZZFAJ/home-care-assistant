# Workers, webhooks e fronteiras externas

## Cadeia e autoridade

Scheduler transacional cria trabalho → worker autentica segredo → claim com
lease → valida destinatário atual → prepara snapshot/template/desafio/PDF →
upload de mídia → envio → complete → callback HMAC/ativo → estado externo.
O endpoint administrativo processa notificações, mas não chama o scheduler.
O endpoint de segredo chama scheduler antes do worker; falha no primeiro impede
o segundo nessa execução. Cron ativo não demonstra progresso útil ou entrega.

**B4-010, P2, risco sustentado de execução.** A validação precede preparação e
upload de mídia. B49-01 usou o worker e o adaptador Meta reais com transporte
inteiramente em memória: após upload iniciar, o teste marcou cancelamento;
o adaptador ainda chamou `/messages`. Complete falhou e a leitura de estado
cancelled impediu sobrescrita. O resumo contou skipped, sem accepted.

Isso prova a janela de orquestração e a perda de informação no resumo, **não
envio real a pessoa revogada**. O SQL real de revogação/lease não foi executado
nesse teste. Relação com B3-020: autoridade pode envelhecer durante espera,
mas não se transfere a prova de movimento SQL para todo envio. É preciso definir
o ponto de cancelamento e minimizar a janela, sem prometer atomicidade entre
banco e rede externa ou apagar callbacks de mensagem já aceita.

## Descarte silencioso de lote recebido

**B4-011, P2, defeito confirmado no adaptador.** `metaInbound` valida o array
inteiro; interactive exige button_reply. Um item com nfm_reply invalida todos
os messages. A rota transforma null em `[]` e responde received=true,
processed=0.
B49-03 apresentou envelope assinado, WABA/telefone corretos, um texto válido e
um interactive.nfm_reply: HTTP 200, nenhuma chamada à RPC de ingestão. B49-02,
contraprova com o texto sozinho, processou um item e chamou ingestão.

Forma nfm_reply é documentada por fonte primária de integração, a
[documentação AWS End User Messaging](https://docs.aws.amazon.com/end-user-messaging/latest/userguide/nx-features-whatsapp-flows-webhooks.html)
.
Ela confirma o formato da resposta Flow; não prova frequência de lotes mistos
da Meta neste produto. Não se exige executar qualquer comando do item não
suportado. O necessário é não perder o texto válido adjacente nem confirmar
silenciosamente um lote descartado. Validação independente por item, registro
seguro de rejeição e política de retry/dedup são alternativas futuras.

[Cinco cenários B4.9](evidence/b49-integration-results.json) também confirmaram
403 antes de RPC privilegiada para assinatura errada ou outro WABA. São
envelopes fictícios em memória; nenhuma mensagem externa foi enviada e nenhuma
persistência de provedor é atribuída aos mocks.

## Significado e recuperação existentes

Accepted é aceitação pelo provedor; delivered/read vêm de callback. Visto no
aplicativo, ciência familiar e recebimento físico permanecem distintos.
Timeout/5xx/2xx sem referência no envio viram uncertain; retry explícito requer
conciliação. Falha de mídia anterior ao envio tem semântica própria, pois não
confirma entrega de mensagem. Callback que venceu a corrida não é sobrescrito
por complete tardio; estado atual é consultado. Deduplicação/monotonicidade SQL
B3 são reutilizadas, sem repetir a suíte inteira.

Webhook percorre statuses e mensagens sequencialmente. Erro de uma RPC devolve
falha do lote, com operações anteriores já confirmadas; recuperação depende de
reentrega e deduplicação do provedor. Isso exige homologação futura, distinta
de B4-011, que responde 200 apesar de não processar o texto.

## Causas anteriores preservadas

- BE-002: parâmetros genéricos misturam diferença ENT/BAL, autor e data de
  emissão/evento. Código igual e probe A reaproveitado; nenhum teste duplicado
  de texto sem benefício novo. Correção futura deve testar valores finais por
  evento, não somente presença de placeholders.
- BE-003/B3-016: até 50 jobs, concorrência 10, mídia e envio em sequência de
  até 15s não cabem garantidamente no orçamento de 120s; o default25 reduz o
  risco. Prova virtual A já existe; não se repetiu espera de minutos.
- DB-002/B3-001: seleção de candidatos REQ pode não progredir. B3-025 trata
  legado malformado abortando lote, sem provar entrada pública normal aceita.
  B4 rastreou a consequência ao endpoint, sem reexecutar scheduler inteiro.
- Serviço de e-mail operacional e transcrição de áudio não estão implementados
  no worker. Preferência/tipo não autoriza anunciar entrega ou transcrição.

## Limites para homologação futura

Flows só cria efeitos específicos autorizados: sessão curta, envelope cifrado,
token/hash/prazo, revisão no aplicativo ou aceite ENT por propósito. Não
publicamos Flow, template ou número. SMTP/SMS/OAuth reais, bytes enviados,
templates aprovados, callback tardio, lotes heterogêneos, retry e tempos reais
continuam pendentes em ambiente autorizado.

Consulta de documentação não alterou configuração de fornecedor. Changelog
Supabase foi consultado: a mudança TLS anunciada para hospedado não altera a
prova local self-hosted. Não há recomendação de mudar infraestrutura nesta fase.
Próximo: revisão adversarial de aplicação e privacidade.
