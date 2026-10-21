# Execução e condições de aceite

Os resultados desta continuação são registrados a partir de comandos
efetivamente executados. Resultados de etapas anteriores continuam nos
respectivos registros; não são apresentados como repetição da versão final.

## Evidências da retomada

| Procedimento | Resultado observado |
| --- | --- |
| Identidade padrão da CLI | Conta sem acesso ao projeto esperado |
| Instalações e variáveis Windows | Uma CLI 2.121.0; sem token de ambiente |
| Login de perfil nomeado | Conta correta autenticada via navegador |
| Listagem vinculada de migrations | Acesso recuperado; remoto na versão 019 |
| Comparação com código | 12 migrations novas pendentes, 020–031 |
| Backup local | 535.840 bytes, manifesto SHA256 e arquivo legível |
| CLI em novos processos | Identidade correta após alinhar perfil |
| Wrapper do projeto | Dois doctors e oito testes negativos aprovados |
| Instalação limpa Windows/Linux | Lock idêntico e peers válidos |
| Lint e typecheck do código atual | Aprovados |
| Vitest do código/dependências atuais | 63 testes aprovados |
| Banco local: cadeia completa | 31 migrations e primeiro HC-000012 aprovados |
| Banco local: legado 019→031 | Dados, FKs e origem desconhecida preservados |
| Regressão PostgreSQL | Quatro suítes SQL aprovadas |
| Integração HTTP/Auth | Cinco testes, incluindo concorrência, aprovados |
| Pré-validação remota | Dry-run das 12 novas migrations aprovado |
| Backup remoto público | Schema e dados fora do Git, com SHA256 |
| Markdown completo | 27 arquivos verificados; zero problemas |

A integridade do backup foi verificada com SHA256 e pg_restore --list.
O arquivo completo está fora do Git. Não foi declarado ensaio de restauração
concluído. O backup remoto registrado contém o schema público e seus dados,
em arquivos separados de 75.999 e 8.513 bytes. Não é apresentado como backup
completo de Auth ou ensaio de restauração. Aplicação remota e E2E final ainda
precisam de resultados próprios.

## Primeira aplicação remota e compatibilidade

A migration 020 foi aplicada. A execução da 021 encontrou incompatibilidade
na resolução da função de extensão digest pela conexão da CLI e sua transação
foi revertida. Isso difere da falha anterior de identidade: o acesso ao projeto
já funcionava. Não houve reescrita da migration 021.

A correção incremental acrescenta a ponte 02050 e sua remoção em 032.
A cadeia passa a ter 33 arquivos, com versão máxima 032. Esses nomes são
preservados para distinguir quantidade de arquivos e número da última versão.
O novo replay local e a retomada remota precisam de validações próprias antes
de declarar a cadeia atual aplicada e homologada.

## Frentes de conclusão

| Frente | Estado na retomada | Evidência para concluir |
| --- | --- | --- |
| Supabase CLI | Perfil/guard validados | Acompanhar renovação normal |
| Banco local | Replay e integração aprovados | Jornadas finais de navegador |
| Banco remoto | Aplicação autorizada | Backup e cadeia aplicada |
| E2E | Regressão final pendente | Jornadas desktop/celular e permissões |
| Publicação | Commits/push autorizados | Blocos revisados e checks verdes |
| PR e merge | Prontidão pendente | Diff, testes e integração |

## Critérios para PR e merge

1. Preservação das migrations históricas e dos commits de base.
2. Instalação reproduzível e validações de código e documentação aprovadas.
3. Migração limpa e legada, integridade e concorrência verificadas localmente.
4. Fluxos banco/API/interface/permissões aprovados com identidades Auth reais.
5. Identificação correta do remoto e distinção entre configuração externa e bug.
6. Commits lógicos sem credenciais, fixtures remotas ou dados pessoais.
7. Checks do PR concluídos; nenhuma falha relevante ignorada.
8. Merge confirmado antes de excluir a branch.

Se uma frente depender de acesso ou configuração externa, registrar o
impedimento e seu impacto. Não marcar integração remota concluída apenas
porque o código local ou a migration existe.
