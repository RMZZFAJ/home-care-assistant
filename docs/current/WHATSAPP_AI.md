# Notificações, WhatsApp e Flows

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
Integrações existentes são contratos locais, não canais externamente
homologados. DEC-019 adia Meta/Flows; C não enviou mensagem ou configurou
provedor.
Estado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro
em [C](../audits/C/README.md); decisões aprovadas não equivalem a
implementação.

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

A emissão REQ confirma o registro ao autor sem PDF e informa ciência pendente.
Quando a política de ciência é satisfeita, outro evento entrega o PDF da nova
versão com a evidência registrada. Baixar ou compartilhar o PDF de emissão é
permitido; o documento identifica a pendência. Ciência familiar, leitura de
notificação e aceite de quantidades ENT permanecem independentes.

## Adaptador oficial e aceite simplificado

O adaptador usa graph.facebook.com, versão configurada e templates aprovados.
O conteúdo atual pode incluir nome do paciente, material/saldo e PDF; B5-005
demonstra que a minimização anunciada anteriormente não é uma garantia
técnica.
A matriz de campos/destinos e retenção precisa de aprovação antes de ativar.
Webhooks verificam HMAC antes de interpretar o conteúdo e processam callbacks
com controles idempotentes, mas B5-013 demonstra correlação incorreta entre
tentativa antiga e lease nova. Não tratar todo callback/retry como homologado.

O aceite por WhatsApp exige destinatário designado, telefone verificado no
Auth, sessão recente na vinculação e política/opt-in vigente. O desafio é
único, expira e se vincula ao telefone, documento, versão e destinatário.
Alteração de destinatário invalida desafios anteriores. O canal simplificado
aceita tudo; divergências e cancelamento bilateral exigem revisão autenticada
no aplicativo. A origem da verificação é estabelecida pelo servidor.

O erro Meta 130497 é uma restrição de elegibilidade/país. Fica identificado
como falha permanente, com orientação administrativa, sem tentativas
automáticas
repetidas. Credenciais ausentes mantêm o canal indisponível, sem sucesso
fictício.

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
e auditados. Não recebem SQL arbitrário, chave privilegiada ou autonomia
clínica.
A finalidade e o tratamento de dados devem ser definidos antes de habilitar
um provedor de IA. Um agente clínico autônomo não integra este sistema.

## Configuração e limites da validação

NOTIFICATIONS_EXTERNAL_ENABLED e META_FLOWS_ENABLED ficam false até a
homologação externa. .env.example documenta variáveis sem seus valores
secretos.
O worker possui endpoint autenticado; seu agendamento depende da configuração
do ambiente. E-mail de notificação requer adaptador próprio.

Testes unitários, SQL e E2E usam Auth real local e transporte simulado, sem
mensagens externas. Verificam replay, desafio, telefone, expiração, versão,
destinatário, criptografia e revisão antes do débito. Não provam envio Meta,
SMS real, publicação de Flow ou transcrição. Templates, liberação da conta,
chaves, webhook e callbacks precisam de validação no provedor antes de ativar
os canais. O estado corrente e seus limites constam em
[PROJECT_STATUS](PROJECT_STATUS.md);
EXECUTION arquivada não é homologação atual.

O catálogo V4 contém 27 contratos versionados. O utilitário
`scripts/meta-templates.mjs` mistura consulta/submissão ao encontrar token,
conforme REPO-003/B8-M003. Não executá-lo como diagnóstico com credencial;
D0/D7
precisam separar inspect/submit e obter autorização específica de publicação.
O argumento
opcional é o caminho do relatório dentro de `.private/`.
Corpos usam variáveis nomeadas; botões URL dinâmicos terminam em `{{1}}` no
domínio oficial. Os PDFs fictícios de demonstração têm UUIDs explicitamente
permitidos: essa rota não expõe documentos reais ou objetos privados.

pg_cron executa o ciclo operacional e chama o worker HTTPS usando URL oficial
e
segredo guardados no Vault pela RPC de serviço configure_worker_schedule.
Sem segredo válido, a chamada não é enviada. Arquivamento e avisos internos
não
dependem da disponibilidade da Meta. Regras de ciência obrigatória, exceção
manual e intervalo de lembretes são verificadas novamente em cada execução.

Flows de conferência ENT exigem propósito, destinatário, telefone confirmado,
versão, revisão e token de uso único. Quantidades parciais positivas são
creditadas imediatamente; o restante segue a conciliação formal. O contrato
de ocorrências oferece “sem intercorrências” sem produzir débito de estoque.

## Homologação posterior, ainda diferida

Dados de conta/erro130497 e preparações anteriores são contexto histórico em
[execução arquivada](../archive/evolution/EXECUTION.md) e B5. Não assumir que
token, conta, aprovação ou configuração continuam válidos. Nenhuma credencial
foi solicitada ou consultada nesta C. DEC-019 mantém Meta/Flows diferidos;
minimização, templates, publicação, criptografia, callbacks e recuperação
precisam de homologação real em D7 autorizado.

PWA/Web Push e notificações internas futuras estão no plano C; não existe
transporte e-mail operacional ou transcrição homologados pelo simples fato de
haver preferência/adaptador. Auth SMTP/SMS/OAuth são fronteiras próprias.
