# Checkpoint da consolidação

Este checkpoint preserva a base de 20/10 e a continuidade autorizada em 21/10.
Consulte [Autorizações](../2026-10-21/AUTHORIZATION.md),
[Execução atual](../2026-10-21/EXECUTION.md) e
[Relatório de conclusão](../2026-10-21/FINAL_REPORT.md).

## Preservação e Git

- Início: master, HEAD fc04de4, árvore limpa.
- Commits locais de base preservados: 7f79ebb e fc04de4.
- Referência publicada inicial: 408bf68.
- Snapshot publicado pelo usuário para inspeção: 527cef4.
- Branch anterior audit/home-care-consolidacao preserva esse snapshot.
- Tag local de preservação: checkpoint/home-care-user-preview-527cef4.
- Branch para blocos lógicos: codex/home-care-consolidacao, baseada em fc04de4.
- Atualização local/remota, commits e push autorizados em 21/10.
- PR/merge dependem dos checks; excluir somente a branch confirmada como integrada.

## Decisões permanentes

- Paciente é a unidade de administração e isolamento.
- Identidade Auth global não pertence ao administrador de um paciente.
- Catálogo próprio por paciente; custódias usam o mesmo catálogo local.
- Protocolo, hash e snapshots têm autoridade no banco.
- Saldo negativo somente em ajuste extraordinário global explícito e auditado.
- Preservar o último administrador global, inclusive sob concorrência.
- Migrations aplicadas imutáveis; novas correções são incrementais.
- Não inventar paciente, data, autoria ou estoque para registros desconhecidos.
- Desenvolvimento e testes usam o projeto local home-care-assistant.
- Reset local exige destino verificado, consentimento e backup externo.
- Nunca executar reset, fixtures ou testes mutáveis no remoto.

## Evidência consolidada até esta revisão

- Node 24.22.0/npm 11.21.1; ESLint 10 e TypeScript 6.
- Instalação limpa e peers Windows/Linux aprovados com lock atual.
- Windows: lint, typecheck, 69 testes unitários e build aprovados.
- Cadeia de 35 arquivos aprovada em instalação limpa e evolução legada 019.
- Seis suítes SQL, caso de search_path e seis testes HTTP/Auth aprovados.
- Limite HC-1000000 e retry idempotente de movimento aprovados no PostgreSQL.
- Perfil explícito e guard da CLI corrigem a conta administrativa selecionada.
- 35 migrations aplicadas local/remoto, após backup e dry-run.
- Hashes dos registros originais remotos preservados; os totais atuais incluem
  duas requisições e cinco itens acrescentados durante a inspeção.
- Objetos públicos, grants de clientes e quatro default ACLs iguais local/remoto.
- 033/034 aplicadas: serviço sem privilégios diretos, cinco RPCs explícitas
  e zero EXECUTE de PUBLIC nas funções da aplicação.
- E2E: 32 casos únicos aprovados; rodada completa 29/32 e regressão 6/6.
- Linux: npm ci, sete checks, 69 unitários e build aprovados antes do atributo
  final de acessibilidade; o CI deve validar o HEAD publicado.
- Publicação dos blocos, checks, merge e smoke recebem evidências próprias.

## Ambientes e backups

O projeto local existente usa API 54321, banco 54322 e Mailpit 54324.
A stack auxiliar da etapa anterior foi parada; não é requisito ou destino da
suíte atual. Seus volumes foram preservados.

Backups locais completos e backup remoto público estão fora do Git, com SHA256
conferido. A leitura por pg_restore --list foi validada; não foi declarado
ensaio completo de restauração. O backup remoto público não inclui Auth.

## Próximas ações

Registrar aceites individuais na matriz, revisar o diff e publicar os blocos
lógicos. Acompanhar os checks do PR, incluindo E2E completo no HEAD final, antes
do merge e verificar a implantação resultante. Dependências externas de OAuth,
e-mail, provedor/agendamento e política de dados permanecem explícitas.
