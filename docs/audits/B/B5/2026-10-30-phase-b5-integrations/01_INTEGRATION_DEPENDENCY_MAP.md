# Mapa canônico de dependências

O [inventário](01_AUTOMATIONS_AND_INTEGRATIONS_INVENTORY.csv) descreve
mecanismos,
não apenas endpoints. Estado local conferido no baseline; implementação não
equivale a homologação externa. Contratos SQL por nome no catálogo B3 de
definições idênticas. Os relatórios 02–12 aprofundam as garantias e as falhas.

## Saída

Evento transacional documental/estoque/relato/lembrete → regras do paciente e
preferências → `requisition_notifications` por pessoa/canal/evento → entrega
interna pelo cron ou claim do worker → validação de vínculo, capacidade e
telefone → payload do evento e template registrado → PDF quando requerido →
upload Meta → `/messages` → `complete_notification_job` → callback autenticado
→ estado persistido → caixa/sino/acompanhamento administrativo.

`document_event_id` conserva a referência histórica. `provider_reference` e
`biz_opaque_callback_data` correlacionam fatos externos. Nenhum dos dois concede
autoridade operacional. Lease não constitui transação distribuída com a Meta.
`seen_at`, ciência, aceite físico e leitura externa são fatos distintos.

## Entrada

Meta → corpo bruto limitado → HMAC → WABA/número configurados → schemas de
statuses/messages → RPC por item → correlação/dedup → estado ou comando de
propósito específico. Texto segue identificação de telefone/paciente → parser
de catálogo → relato para revisão, sem débito. Áudio tem formato e contrato
extensível, sem transcritor integrado. NFM não é convertido em comando genérico.

Flow: sessão criada no aplicativo → token aleatório com hash/propósito/prazo →
envelope RSA-OAEP/AES-GCM e HMAC → `flow_exchange` → telas/interações →
submissão
pendente para revisão do autor ou recebimento ENT autorizado e versionado.
Revisão de relato e confirmação de consumo são decisões separadas.

## Tempo e automação interna

Dois jobs pg_cron de minuto. O operacional executa lifecycle REQ/ENT, lembretes
legados, scheduler BAL por plantão e entrega interna. O outro consulta Vault e
invoca o worker oficial por pg_net quando URL/segredo existem. O endpoint worker
também executa o scheduler antes de claim; processar administrativamente a fila
chama somente o worker. Portanto falha do scheduler pode afetar o caminho
automático de saída, mesmo sem defeito do transporte.

BAL por plantão usa cursor próprio. Lifecycle REQ/ENT e lembretes legados não
herdam essa garantia. Escala publicada dá elegibilidade a atribuições BAL;
não comprova presença ou contagem. Adiamento exige decisão familiar.

## Atualização e identidade

Triggers → revisão privada por usuário → broadcast Realtime sem payload
documental → `/api/sync` → WorkspaceProvider → consumidores. Polling de 30s,
foco e reconexão são mecanismos de recuperação, sujeitos ao contrato de cada
consumidor. A caixa, sino e acompanhamento documental têm ciclos próprios.

Supabase Auth controla e-mail, SMS/OTP e Google OAuth. Convites do paciente são
links compartilhados manualmente, não e-mails operacionais automáticos.
Preferência `email` não cria um adaptador SMTP no worker. Templates e Flows
locais precisam de configuração, publicação e homologação próprias.

## Estado efetivamente demonstrável

Produto implementa outbox, transporte WhatsApp, callbacks, desafios, duas
famílias de Flow, notificações internas e Auth externo por SDK. Canal externo
local fica desabilitado e não é exercitado com credenciais reais. Catálogo de
27 templates em fonte tem estado PREPARED; estado registrado no banco é
independente e não prova aprovação Meta. Não existe transporte operacional de
e-mail/SMS, envio de Flow integrado à interface ou transcrição contratada só
porque há configurações, contratos ou arquivos JSON. Cada ausência será
delimitada pelos consumidores e pelas provas dos subgrupos correspondentes.
