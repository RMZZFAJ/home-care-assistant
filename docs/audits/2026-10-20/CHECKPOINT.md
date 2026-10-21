# Checkpoint da consolidação

Este checkpoint reúne a base de 20/10 e a continuidade autorizada em 21/10.
As novas decisões estão em [Autorizações](../2026-10-21/AUTHORIZATION.md).

## Base preservada

- Início: master, HEAD fc04de4, árvore limpa.
- Commits locais preservados: 7f79ebb e fc04de4.
- Referência publicada observada no início: 408bf68.
- Branch de trabalho: audit/home-care-consolidacao.
- Em 20/10, remoto e Git externo estavam limitados a consulta.
- Em 21/10, o usuário autorizou atualização dos bancos, commits e push.
- PR, merge e exclusão da branch foram autorizados quando houver prontidão.

## Decisões confirmadas

- Paciente é a unidade de administração e isolamento.
- Administrador do paciente administra os recursos daquele paciente.
- Identidade Auth global não pertence ao administrador de um paciente.
- Catálogo próprio por paciente; custódias usam o mesmo catálogo local.
- Saldo negativo só em ajuste extraordinário global explícito e auditado.
- Proteger o último administrador global ativo, inclusive sob concorrência.
- Migrations históricas imutáveis; conversão exige integridade real.
- Usar versões estáveis mais atuais com compatibilidade comprovada.
- Desenvolvimento e testes usam o projeto local home-care-assistant.
- Reset local exige destino verificado, consentimento e backup externo.
- Reset e fixtures nunca são executados no remoto.

## Estado de validação em 21/10

- Node 24.22.0 e npm 11.21.1; ESLint 10 e TypeScript 6.
- Lock atualizado com instalação limpa Windows e Linux aprovada.
- Lint, typecheck e 63 testes Vitest aprovados nas dependências atuais.
- Primeira rodada local: 31 migrations; limpo e evolução 019→031 aprovados.
- Quatro suítes SQL e cinco integrações HTTP/Auth aprovadas.
- Confirmação de e-mail local habilitada; Mailpit sem envio externo.
- E2E completo desktop/celular em execução; sem aceite antecipado.
- Perfil Supabase explícito recuperou acesso ao projeto remoto correto.
- Wrapper: doctor repetido e oito testes de fronteira aprovados.
- Primeira consulta remota: 19 migrations; dry-run das 12 novas aprovado.
- Remoto: 020 aplicada; 021 revertida após falha de resolução de digest.
- Correção incremental: ponte 02050 e remoção 032, total de 33 arquivos.
- Replay da cadeia atual, publicação e merge aguardam resultados próprios.

## Baseline histórico observado em 20/10

- Lint, Markdown, typecheck, dez testes unitários e build passaram na base.
- CI publicado falhava no npm ci; Node 20 era incompatível com Supabase.
- Banco local tinha 19 migrations e sequência 12 não consumida.
- Consulta remota era recusada com 403; o schema ainda não era verificado.
- Vercel foi consultada em Node 24.x, sem implantação naquela etapa.

Esses itens registram o início. Não descrevem o estado atual após as novas
autorizações e verificações. Consulte a [execução](EXECUTION.md) e a
[continuação de 21/10](../2026-10-21/EXECUTION.md).

## Continuidade

O banco local de desenvolvimento utiliza API 54321 e PostgreSQL 54322.
A stack auxiliar da etapa anterior foi parada, preservando seus volumes.
Ela não é pré-requisito do projeto nem destino da suíte atual.

O backup local completo fica fora do Git, com manifesto SHA256 e verificação
de leitura. Não equivale a ensaio completo de restauração. Use os comandos
atuais de [Testes](../../TESTING.md), sem adaptar destinos para o remoto.

Próximas ações: concluir E2E e build final, registrar aceite individual dos
requisitos, aplicar a cadeia remota após pré-validação, publicar blocos
lógicos e avaliar os checks do PR antes de merge. Não declarar conclusão
integral com base em uma suíte parcial ou no número agregado de testes.
