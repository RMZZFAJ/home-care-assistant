# Segurança

- Sessão é verificada no servidor com `supabase.auth.getUser()`.
- O solicitante não é aceito de campos livres, query string ou localStorage.
- RLS exige vínculo por usuário/função; não há política geral para qualquer autenticado.
- Quantidades e texto são validados novamente no route handler.
- Protocolo é criado no servidor e possui unicidade no banco.
- `idempotency_key` evita duplicação por reenvio do mesmo formulário.
- Logs de auditoria armazenam ação, entidade e protocolo, não conteúdo clínico ou segredos.
- A chave `service_role` não é usada no navegador nem em variáveis `NEXT_PUBLIC_*`.
- A página e a API exigem sessão Supabase e perfil ativo autorizado; `CARE_RECIPIENT_ID` seleciona explicitamente a pessoa assistida no servidor.
- Produtos, nomes, categorias e unidades são conferidos contra o catálogo ativo do banco; os valores enviados pelo navegador não são fonte de autoridade.
- A chave de idempotência é criada uma vez por submissão no navegador e a unicidade por usuário é reforçada no banco.
- Documentos futuros deverão usar bucket privado e URLs assinadas curtas.

Antes de produção: habilite MFA para administradores, revise políticas RLS com dados de teste, configure backup/recuperação, revogue perfis inativos, defina retenção LGPD e realize teste de autorização por troca de identificadores. O seed é exclusivamente de desenvolvimento e não deve ser executado em produção.
