# WhatsApp e agente de IA

Esta etapa apenas prepara o domínio. A integração futura deve usar a WhatsApp
Business Platform oficial, validar assinatura de webhook, associar o remetente a
profissional autorizado, tratar duplicidade e registrar falhas.

As requisições são persistidas antes de qualquer notificação.
`requisition_notifications` mantém um registro por destinatário/canal, estado,
tentativas e erro resumido; indisponibilidade do provedor não apaga, duplica ou
altera o protocolo. A API administrativa processa apenas o canal interno
atualmente; WhatsApp e outros canais externos permanecem pendentes e não são
apresentados como enviados sem confirmação do provedor.

O agente deverá chamar contratos tipados de negócio como consultar requisições,
criar rascunho, submeter após confirmação, consultar estoque e buscar documentos
permitidos. Cada função deve autenticar, autorizar, validar e auditar. O agente
nunca recebe acesso direto ao banco, SQL arbitrário, prescrições ou autonomia
clínica. Dados pessoais só podem ser enviados a provedor de IA após finalidade,
base legal, minimização e controles de privacidade definidos.
