# Notificações, WhatsApp e Flows

## Persistência e acompanhamento

REQ, COM, ENT, BAL e seus eventos são persistidos antes do envio.
As políticas do paciente resolvem grupos e destinatários ativos. A outbox
registra destinatário, canal, tentativas, lease, próxima execução e referência
do provedor. O worker revalida vínculo e autorização antes de cada envio.

O acompanhamento distingue disponibilidade interna, ciência pelo usuário,
aceitação do provedor, entrega e leitura externa. Marcar uma notificação como
vista não confirma recebimento de materiais nem entrega por WhatsApp.
Falhas transitórias usam backoff; resultado incerto exige conciliação.
Reprocessamento administrativo não emite outra ficha.

## Adaptador oficial e aceite simplificado

O adaptador usa graph.facebook.com, versão configurada e templates aprovados.
Não inclui nome do paciente, medicamentos ou observações nas mensagens.
Webhooks verificam HMAC antes de interpretar o conteúdo e processam callbacks
de forma idempotente, sem regredir estados já confirmados.

O aceite por WhatsApp exige destinatário designado, telefone verificado no
Auth, sessão recente na vinculação e política/opt-in vigente. O desafio é
único, expira e se vincula ao telefone, documento, versão e destinatário.
Alteração de destinatário invalida desafios anteriores. O canal simplificado
aceita tudo; divergências e cancelamento bilateral exigem revisão autenticada
no aplicativo. A origem da verificação é estabelecida pelo servidor.

O erro Meta 130497 é uma restrição de elegibilidade/país. Fica identificado
como falha permanente, com orientação administrativa, sem tentativas automáticas
repetidas. Credenciais ausentes mantêm o canal indisponível, sem sucesso fictício.

## Coleta estruturada e consumo

A infraestrutura de Flows possui sessão de duração limitada, token armazenado
como hash e endpoint criptografado com RSA-OAEP SHA-256 e AES-128-GCM.
Esta criptografia de transporte exigida pelo provedor é independente da
assinatura documental assimétrica, que permanece no roadmap.

Uma submissão cria observação para revisão do próprio usuário autenticado.
Texto de consumo ou falta não altera estoque diretamente. A interpretação
preserva ambiguidades para conferência; somente a confirmação autorizada de
consumo extraordinário debita o ledger. Há contrato extensível de transcrição
de áudio, sem provedor de transcrição contratado nesta entrega.

As futuras ferramentas de IA devem chamar contratos autenticados, autorizados
e auditados. Não recebem SQL arbitrário, chave privilegiada ou autonomia clínica.
A finalidade e o tratamento de dados devem ser definidos antes de habilitar
um provedor de IA. Um agente clínico autônomo não integra este sistema.

## Configuração e limites da validação

NOTIFICATIONS_EXTERNAL_ENABLED e META_FLOWS_ENABLED ficam false até a
homologação externa. .env.example documenta variáveis sem seus valores secretos.
O worker possui endpoint autenticado; seu agendamento depende da configuração
do ambiente. E-mail de notificação requer adaptador próprio.

Testes unitários, SQL e E2E usam Auth real local e transporte simulado, sem
mensagens externas. Verificam replay, desafio, telefone, expiração, versão,
destinatário, criptografia e revisão antes do débito. Não provam envio Meta,
SMS real, publicação de Flow ou transcrição. Templates, liberação da conta,
chaves, webhook e agendamento precisam de validação no provedor antes de ativar
os canais. O estado verificado consta em [EXECUTION.md](evolution/EXECUTION.md).
