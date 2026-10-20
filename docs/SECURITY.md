# Segurança

- Sessão é verificada no servidor com `supabase.auth.getUser()`.
- O solicitante não é aceito de campos livres, query string ou localStorage.
- RLS exige vínculo por usuário/função; não há política geral para qualquer autenticado.
- Quantidades e texto são validados novamente no route handler.
- Protocolo é criado no servidor e possui unicidade no banco.
- `idempotency_key` evita duplicação por reenvio do mesmo formulário e `payload_hash` rejeita a reutilização da chave com conteúdo diferente; retries reconstruem o comprovante dos registros persistidos.
- Logs de auditoria armazenam ação, entidade e protocolo, não conteúdo clínico ou segredos.
- A chave `service_role` não é usada no navegador nem em variáveis `NEXT_PUBLIC_*`.
- A página e a API exigem sessão Supabase e perfil ativo autorizado; `CARE_RECIPIENT_ID` seleciona explicitamente a pessoa assistida no servidor.
- Produtos, nomes, categorias e unidades são conferidos contra o catálogo ativo do banco; os valores enviados pelo navegador não são fonte de autoridade.
- O histórico é consultado pelo vínculo autorizado ao paciente, não por protocolo ou por `created_by`; leitores têm somente leitura.
- Estoque é um catálogo único com saldos separados por paciente e custódia. Movimentos são transacionais, idempotentes e auditados; a API não aceita edição direta de saldo.
- Falha de notificação não desfaz uma requisição persistida. Estados individuais ficam preparados para processamento assíncrono e retry.
- Cada requisição cria um item interno pendente após a persistência; nenhum envio externo é declarado como concluído sem confirmação do provedor.
- Alterações de status passam pela função SQL `transition_requisition_status`, que valida perfil ativo, escopo, matriz de transições e justificativa de cancelamento.
- Saídas de estoque são verificadas contra o saldo derivado sob lock transacional; apenas administrador global pode autorizar saldo negativo, sempre com justificativa e auditoria.
- Administração de perfis, pacientes, catálogo, memberships e importação histórica exige administrador global verificado por `auth.uid()`; nenhuma dessas operações aceita função, escopo ou status confiados ao navegador.
- A importação histórica usa hash de lote, limites, validação de produtos/paciente e protocolo separado da sequence nova; a repetição da mesma carga retorna o relatório original.
- Aprovação de inventário é exclusiva de administrador global e transforma apenas divergências em movimentos de ajuste auditáveis.
- A chave de idempotência é criada uma vez por submissão no navegador e a unicidade por usuário é reforçada no banco.
- Documentos futuros deverão usar bucket privado e URLs assinadas curtas.

Antes de produção: habilite MFA para administradores, revise políticas RLS com dados de teste, configure backup/recuperação, revogue perfis inativos, defina retenção LGPD e realize teste de autorização por troca de identificadores. O seed é exclusivamente de desenvolvimento e não deve ser executado em produção.

## Procedimento administrativo

Usuários devem ser convidados/criados pelo painel Supabase ou endpoint server-side administrativo; depois, um administrador autorizado cria/atualiza o perfil e a associação do paciente. Revogação deve marcar `profiles.status = 'revoked'`, remover associações quando apropriado e registrar auditoria. O cliente nunca escolhe sua própria função, escopo ou status.
