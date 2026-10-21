# Notificações, WhatsApp e preparação para IA

## Processamento

Requisições são persistidas antes das mensagens. Configurações por paciente
resolvem grupos e destinatários ativos. A outbox registra um evento por
destinatário/canal, tentativas, lease, próxima execução e referência do provedor.

O worker usa reserva concorrente, revalidação de acesso e conclusão persistida.
Falhas temporárias têm backoff; tarefas interrompidas são recuperadas. Timeout
após possível aceitação é resultado incerto e exige conciliação. Reprocessar
é uma ação administrativa separada de submeter uma requisição.

Estados distinguem pendência, processamento, aceitação, entrega, leitura,
falha, cancelamento e incerteza. Canal interno entregue significa registro
interno disponível; não significa envio externo. Reposição resolve alertas
por custódia sem somar silenciosamente saldos da família e equipe.

## Provedor oficial

O adaptador WhatsApp usa somente graph.facebook.com, template aprovado,
versão suportada configurada e identificador do evento. Não inclui nome de
paciente, medicamentos ou observações. Webhooks verificam assinatura HMAC,
processam eventos idempotentes e não regridem confirmação já recebida.

NOTIFICATIONS_EXTERNAL_ENABLED permanece false por padrão. O template de
ambiente lista as variáveis Meta, segredo do worker e chave server-side.
E-mail de notificação permanece pendente até existir adaptador específico.
Não tratar uma configuração de destinatário como integração real concluída.

Testes usam fetch falso ou Mailpit local, sem enviar mensagens reais.
Homologação do provedor e configuração de agendamento são dependências
externas e exigem autorização posterior.

## IA futura

As futuras ferramentas devem chamar contratos de negócio autenticados,
autorizados, validados e auditados. Nunca disponibilizar SQL arbitrário,
chave privilegiada ou autonomia clínica ao agente. A finalidade, base legal,
minimização, retenção e transferência a provedor de IA devem ser definidas
antes de enviar dados pessoais. Um agente de IA completo não foi implementado.
