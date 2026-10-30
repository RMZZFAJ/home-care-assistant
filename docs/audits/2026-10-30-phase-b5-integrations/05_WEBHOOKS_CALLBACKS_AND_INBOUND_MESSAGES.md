# Webhooks, callbacks e mensagens de entrada

## Autenticidade e contrato

Corpo bruto limitado a 100KB; HMAC SHA-256 e comparação temporalmente segura
antes do JSON; WABA e Phone Number ID exatos em todas as entradas/changes.
Verificação GET exige verify token e challenge numérico. Ausência de segredo
nega acesso. Provas negativas B4 B49-04/05 são reutilizadas com código idêntico.
Não foram consultados ativos nem acionados webhooks remotos.

`sent` vira accepted; delivered/read/failed seguem nomes do banco. Não existe
estado separado “compreendida”. Callback usa wamid ou opaque job ID quando a
referência ainda é nula. Update SQL preserva read contra delivered/accepted
tardios. B3 B39-06 já demonstra callback antes do complete e dedup de estado;
não implica exatamente uma entrega externa.

## Lotes: B4-011 aprofundado

[Sete cenários controlados](evidence/b55-webhook-cases.json) executam handler,
HMAC e schemas reais com RPC substituída, sem persistência atribuída ao mock.

- **texto válido, texto >2000, texto válido** — Resultado: 200, processed0,
  zero RPC; Alcance: Item inválido no meio derruba o array completo, ampliando
  B4-011.

- **status read válido + texto válido + NFM** — Resultado: 200, uma RPC de
  status, nenhuma ingestão de texto; Alcance: É possível sucesso parcial
  silencioso; não significa rollback do status.

- **RPC falha no segundo texto** — Resultado: 503; terceiro não alcançado;
  Alcance: Falha é visível, mas transações anteriores podem ter confirmado;
  reentrega/dedup são necessárias.

- **texto sozinho** — Resultado: ingestão chamada, 200; Alcance: Parser não
  descarta todo texto indiscriminadamente.

- **status desconhecido** — Resultado: 400 antes de RPC; Alcance: Não
  converter evento desconhecido em comando autorizado.

Schemas de statuses e messages validam arrays inteiros, inclusive entries
distintas. Tipos opcionais extras são tolerados em alguns níveis; isso não
torna NFM, list_reply, reaction ou payload incompatível comandos suportados.
Frequência/formação real dos lotes Meta continua pendente. A causa é a mesma
B4-011, sem novo achado para cada forma descartada.

## B5-006: recebimento sem encaminhamento recuperável

`processed` soma tamanho de arrays reconhecidos, sem examinar efeitos. B55-C03
retornou processed1 para texto cujo contexto era null, sem ingestão ou handoff.
B55-C04 fez o mesmo para ciência recusada pela RPC. Áudio e botão desconhecido
somaram dois, sem processador. Isso não autoriza executar conteúdo desconhecido;
exige distinguir ignorado/recusado/pendente de processamento efetivo.

[B55-S01/02](evidence/b55-inbound-results.json) aprofundam com SQL real:
telefone
fictício confirmado pelo Auth e registrado legitimamente; duas memberships com
consumption.report → needsAuthenticatedSelection=true, zero inbound_messages e
zero relatos. Retirar somente o segundo vínculo sintético na transação permitiu
um relato; repetição do provider ID devolveu duplicate e não houve ledger.
Tudo foi rollback, salvo conta/perfil fictícios novos preservados para inspeção.

A recusa de adivinhar paciente é um controle correto. A falha é não oferecer
uma continuação autorizada ou registro mínimo de pendência para a pessoa que
acredita ter informado a falta. Não se deve armazenar texto privado sem política
nem responder com dados de outro paciente. Mensagem encaminhada ou número sem
vínculo nunca deve virar comando de estoque. Não há prova de perda real na Meta.

## Tempo, correlação e recuperação

Timestamp do provedor e recipient_id não são retidos pelos schemas; banco grava
horário local de chegada em delivered_at/read_at. Pode haver atraso/reordenação;
esses campos não comprovam horário físico de leitura. HMAC protege origem do
envelope, não confirma identidade humana ou entendimento do PDF. Não promover
essa lacuna isolada a bloqueador: registrar no histórico de homologação/SLO.

Uma falha RPC posterior exige reentrega e dedup persistida; um 200 com descarte
não fornece esse mecanismo. Não há inbox durável de todo lote bruto nem fila
de rejeições operacionais no produto. Criar retenção integral seria decisão de
privacidade/custo, não solução automática. Pode bastar diagnóstico mínimo e
handoff autenticado para os casos comprovados.

Para habilitação futura: homologar callbacks antecipados/tardios, lotes mistos,
reentrega, duplicação, conta/número errados e indisponibilidade. Comparar HTTP,
resultado por item e estado persistido. Não substituir homologação por HMAC
fictício ou pelo total `processed`.
