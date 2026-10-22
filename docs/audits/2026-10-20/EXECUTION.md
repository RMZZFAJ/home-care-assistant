# Evidências de execução

Somente procedimentos executados e resultados observados pertencem aqui.
A [continuação de 21/10](../2026-10-21/EXECUTION.md) reúne as ações posteriores
à ampliação de autorização e ao retorno do acesso remoto.

## Baseline de 20/10

- Git inicial: árvore limpa em fc04de4, incluindo dois commits locais.
- Qualidade da base: lint, Markdown, tipos, dez testes e build aprovados.
  Isso não comprovava instalação limpa, RLS ou fluxos integrados.
- PostgreSQL local em consulta: 19 migrations; sequência disponível em 12.
- Consulta vinculada remota: HTTP 403; schema remoto ainda não verificado.
- GitHub Actions 39485166817: npm ci EUSAGE e runtime Node 20 incompatível.
  Os checks seguintes não chegaram a executar.
- Vercel consultada: linha Node 24.x; patch/npm do build não registrados.

## Evolução confirmada em 21/10

- npm ci limpo Windows e Linux aprovado com Node 24.22.0/npm 11.21.1.
- Lock validado nas duas plataformas, sem peers inválidos.
- Repositório atualizado: lint, typecheck e 67 testes unitários aprovados.
- Banco local atualizado para 31 migrations.
- Replay limpo: Auth real e primeiro protocolo HC-000012 aprovados.
- Replay legado 019→031: protocolo antigo, itens, saldos, FKs e movimento
  sem origem comprovada preservados.
- Quatro suítes SQL aprovadas: transactions, invitations-import-outbox,
  alerts-routing e notification-read-model.
- Cinco integrações HTTP/Auth aprovadas, incluindo concorrência de estoque,
  requisição, último administrador global e workers de notificações.
- Backup local completo: 535.840 bytes, SHA256 e pg_restore --list aprovados.
  O arquivo está fora do Git; restauração completa não foi ensaiada.
- Perfil Supabase nomeado corrigiu a seleção da identidade administrativa.
- Wrapper doctor repetido e oito testes negativos de fronteira aprovados.
- Remoto consultado com sucesso: 19 migrations; dry-run das 12 novas aprovado.
  Nenhum seed ou alteração de roles pertence a essa aplicação incremental.

A instalação de dependências não remove os riscos de ferramentas descritos
na [revisão de dependências](DEPENDENCY_REVIEW.md): seis avisos altos de uma
cadeia dev sem patch publicado e zero avisos no audit de produção.

## Evidências ainda abertas

E2E final, Linux completo, checks publicados e
merge recebem resultados próprios. A cadeia de 33 migrations foi aplicada ao
remoto em 21/10, com integridade preservada. Posteriormente, a cadeia 35 passou
nos caminhos limpo/legado e foi aplicada local/remoto: seis suítes SQL,
search_path e seis testes HTTP/Auth. Windows passou 69 unitários e build;
Linux e 32 casos E2E têm escopos documentados na continuação.
Um dry-run não comprova migração aplicada;
uma suíte local não comprova configuração OAuth ou entrega de provedor real.

Os resultados são vinculados a requisitos individualmente na matriz.
Flags gerais de uma área não promovem todos os seus requisitos a validados.
