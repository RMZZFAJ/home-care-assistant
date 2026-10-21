# Auditoria do banco de dados

Data da coleta: 20/10/2026. Este relatório distingue o código esperado, a
instalação local preexistente e a instalação descartável usada nos testes.
Não houve aplicação de migrations ou backfill no ambiente remoto.

## Ambientes comparados

- Código inicial `fc04de4`: 19 migrations, baseline preservado por hashes.
- Local original `home-care-assistant`: 19 migrations; 29 produtos; nenhum
  perfil ou requisição; sequência 12 não consumida. Coleta somente leitura.
- Código em consolidação: migrations incrementais 020–029, posteriores ao
  baseline e ainda sem aplicação remota autorizada.
- Descartável `home-care-audit-20261020`: migrations até 029 aplicadas;
  alvo exclusivo dos testes mutáveis. Havia 21 tabelas públicas na coleta 027.
- Supabase remoto: `migration list --linked` recusado com HTTP 403;
  schema, dados e drift não verificados.

A consulta posterior ao trabalho confirmou novamente os mesmos números no
banco local original. Não se infere equivalência com produção a partir desse
banco ou das fixtures. A infraestrutura Vercel foi apenas consultada.

## Conversão crítica do catálogo

`products.id` continua sendo a identidade estável de produto. O novo catálogo
canônico é `care_recipient_products`, cuja chave é paciente/produto e cujos
atributos locais incluem nome, descrição, categoria, unidade, aliases,
ordenação e estado. `owner_care_recipient_id` distingue modelos globais de
produtos exclusivos de um paciente.

A migration 020 copia para os pacientes já existentes a disponibilidade do
catálogo global anterior. Essa cópia conserva a disponibilidade estabelecida;
não representa uma atribuição de origem a movimentos sem paciente. Pacientes
novos começam sem itens e adotam modelos por ação administrativa explícita.

Itens de requisição e inventário recebem o paciente comprovado pelo pai.
Triggers derivam esse identificador; FKs compostas impedem referências fora do
catálogo local. A migration 023 acrescenta uma verificação de propriedade que
também rejeita associação cruzada feita por uma escrita privilegiada.

Nomes e unidades anteriores são reconstruídos a partir do catálogo existente
e identificados por `snapshot_source = legacy_reconstructed`. Não há alegação
de que esses valores reproduzam uma versão histórica que nunca foi salva.
Novas operações gravam snapshots canônicos com origem `persisted`.

Estoque legado sem paciente continua sem paciente. O caso fictício de gaze com
quantidade 3 permanece intacto e não entra em um saldo atribuído por suposição.
Dados reais com origem desconhecida exigirão reconciliação documentada antes
de sua utilização operacional.

## Objetos e controles incrementais

| Migration | Responsabilidade principal |
| --- | --- |
| 020 | Autoridade, catálogo, FKs, último administrador e grants |
| 021 | Intenção canônica; snapshots; ledger; inventário; importação histórica |
| 022 | Convites; destinatários; alertas; outbox com lease e tentativas |
| 023 | Propriedade exclusiva; convites e revogação; webhook monotônico |
| 024 | Diretório administrativo e busca de aliases por paciente |
| 025 | Revalidação de destinatários e cancelamento após revogação |
| 026 | Fronteiras efetivas entre papel, estoque oficial e contagem |
| 027 | Consulta pública mínima para cadastro pessoal por convite |
| 028 | Estoque desconhecido e itens extras na importação histórica |
| 029 | Destinatários de alerta por custódia e prioridade dos críticos |

As primeiras 19 migrations permanecem imutáveis. O manifesto em
`scripts/historical-migrations.json` usa SHA256 com normalização de finais de
linha e é conferido por `npm run check:contracts`.

## Integridade e concorrência

O banco calcula a intenção e o hash da requisição. Campos de apresentação e
hashes enviados pelo navegador não têm autoridade. Um lock transacional por
identidade/chave serializa retries: conteúdo equivalente recupera o mesmo
registro; conteúdo distinto gera conflito. Protocolo e identidade da operação
são protegidos contra alteração posterior.

O protocolo automático começa em `HC-000012`, usa largura mínima de seis
dígitos e permite crescimento além dessa largura. Protocolos já gravados não
são reescritos. A importação dos números 1–11 tem relatório e idempotência
próprios, não consome a sequência e não dispara notificações retroativas.

O saldo oficial deriva do ledger por paciente, produto e custódia. Movimento
normal não pode gerar saldo negativo, inclusive para administrador global.
Transferência grava origem e destino na mesma operação. A única exceção é um
ajuste extraordinário global, com confirmação, justificativa e auditoria.

Inventários registram quantidades esperadas e referências de movimento sob o
mesmo lock usado pelo estoque. A aprovação exige contagem explícita e rejeita
referência alterada; recontagem obtém uma nova referência. Aprovação repetida
não duplica ajustes. O índice parcial `inventory_adjustment_once` reforça essa
regra no banco.

Um contador interno serializa a remoção ou o rebaixamento de administradores
globais ativos. O teste concorrente utilizou conexões HTTP distintas e
confirmou que somente uma das duas tentativas simultâneas foi aceita.

## Metadados verificados no descartável

Consulta executada com `BEGIN READ ONLY` após a aplicação até a migration 027:

| Verificação | Resultado |
| --- | --- |
| Constraints públicas não validadas | 0 |
| Grants de escrita a `anon`, `authenticated` ou `PUBLIC` | 0 |
| Grants de SELECT de tabelas públicas a `anon` | 0 |
| Funções SECURITY DEFINER sem search_path definido | 0 |
| Itens canônicos de requisição sem catálogo correspondente | 0 |
| Movimentos com paciente desconhecido | 1 fixture preservada |
| View `current_stock_balances` | `security_invoker=true` |

Todas as tabelas públicas de dados operacionais têm RLS. A exceção é
`global_admin_guard`, tabela interna sem SELECT ou DML concedido a clientes.
Ela não constitui um recurso da Data API para usuários comuns.

## Evidências de execução

`scripts/test-migrations.mjs` executou os dois caminhos em ambiente descartável:

1. Instalação limpa, Auth real, adoção de produto e primeiro protocolo 12.
2. Reset até 019, carga sintética legada e evolução incremental. Preservados
   protocolo anterior, estoque informado 2, saldo FAMILY 10 do paciente A,
   saldo CARE_TEAM 7 do paciente B e movimento sem origem conhecida.
3. Suítes SQL `transactions.sql` e `invitations-import-outbox.sql`, ambas com
   transação e rollback, incluindo grants, RLS, FKs, inventário e outbox.
   A extensão 028 preservou NULL para estoque desconhecido e itens livres,
   mantendo obrigatório o estoque de requisições operacionais novas.

`alerts-routing.sql` passou separadamente na migration 029: destinos por
custódia, família opcional nos alertas da equipe, prioridade dos críticos,
deduplicação, reposição e cancelamento de aviso resolvido antes do envio.
O replay integral até 029 estava em execução ao registrar essa evidência.

Os cinco testes em `tests/integration/database.test.mjs` passaram usando Auth e
Data API reais: isolamento, submissão concorrente, retirada concorrente,
último administrador e disputa entre workers. Os testes de navegador também
exercitam catálogo, requisição, comprovante, estoque e inventário integrados.

Os resultados finais e eventuais novas migrations devem ser lidos junto de
[EXECUTION.md](EXECUTION.md) e da matriz de rastreabilidade.

## Limites e promoção

Não houve ensaio com dados pessoais reais nem inspeção do schema remoto. O
upgrade sintético demonstra os casos explicitamente exercitados; não prova
que todos os registros remotos desconhecidos possam ser convertidos.

A promoção depende de acesso administrativo de leitura ao remoto, comparação
de objetos e versões, relatório de associações e saldos, backup verificável,
autorização para a mudança e homologação posterior. Não reaplicar os testes
destrutivos deste relatório em uma instalação existente.
