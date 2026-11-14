# OPS.3 — observabilidade e suporte técnico

Base19a3568. Local147/remoto147, sem pendências. Implementação e validação
dirigida concluídas neste incremento; CI do SHA publicado continua gate próprio.
[Evidência](OPS_3_EVIDENCE.json), [preflight](OPS_3_REMOTE_PREFLIGHT.json),
[pós-validação](OPS_3_REMOTE_MIGRATIONS.json) e
[advisors](OPS_3_REMOTE_ADVISORS.json) preservam os limites. D-B permanece ativa.

## Contrato técnico

Seis tabelas privadas com RLS/sem grants diretos: configuração por ambiente,
observações de componente, eventos, incidentes, histórico e comandos. Ambientes
local, preview, production, shared_database e operator têm identificação própria;
dados do banco compartilhado não são atribuídos automaticamente ao preview.

Não há campo para mensagem livre, paciente, nome, telefone, endpoint, URL, SQL,
segredo ou snapshot clínico. Eventos aceitam códigos/componentes enumerados,
correlação UUID e métricas numéricas/evidência de arquivo estritamente limitada.
Eventos, histórico e recibos são append-only. Políticas preservam versões,
snapshots técnicos e hashes; limites e severidades são configuráveis.

Heartbeats atualizam somente relógios monotônicos de componente. Não geram uma
linha por polling nem resolvem incidentes. Falhas reais usam intenção/hash
idempotente no banco; mesmo nonce com corpo diferente é recusado. Coleta gera
histórico quando a condição abre, muda ou deixa de ser detectada, sem uma linha
por rodada inalterada. Ausência de observação nunca significa saúde confirmada.

O scheduler de serviço conserva seu corpo operacional; somente seu retorno
final chama o coletor em subtransação. Falha do monitor devolve
operationsObserved=false sem desfazer os efeitos operacionais anteriores.
Coletores não reprocessam envios, mudam ciência, resolvem emissões ou alteram
regras de negócio. Lacuna histórica pode ser tecnicamente revista sem fabricar
o período perdido; os registros originais permanecem.

## Autorização e consumidores

record_operations_event e collect_operations_status são somente serviço.
operations_diagnostics, operations_history e operations_command exigem Auth
vigente, modo global e assurance do administrador. Comandos têm CAS, intenção
por ator e rechecagem depois dos locks; novo reconhecimento não é ciência.
Histórico de incidente e de política tem paginação própria, sem esconder o101º.

patient_delivery_impact é leitura separada no paciente atual. Conta somente
referências próprias com autorização atual, sem detalhe técnico de outro
paciente. Ler não marca visto ou ciência. A equipe receberá impacto e ação/ajuda;
o suporte verá somente os códigos, contagens e correlações pertinentes.

API nova usa o guard global existente, schemas estritos e no-store. O adaptador
de observação recebe apenas códigos seguros/correlação e tem deadline300ms;
falha da telemetria preserva a resposta original e o log seguro. O runtime
público mantém seu contrato exato e usa heartbeat somente quando compatível.
Produtor automático aceita apenas os destinos Supabase já autorizados.

## Consumidores implementados e limites

Administração global → Monitoramento e suporte oferece ambiente, componentes,
filtros/paginação, histórico completo de incidente e política, limites e
severidades, acompanhamento e encerramento técnico. Respostas estritas são
validadas também no cliente. Nova intenção usa CAS; resposta perdida conserva
pacote e ambiente para recuperar somente a mesma tentativa. Recusa409 permite
consultar a versão atual. As ações não reprocessam envios nem criam ciência.

Conflito de política preserva os valores propostos e exibe a versão vigente
em leitura. Guardar novamente exige revisar e adotar explicitamente essa versão
como referência. A recuperação de uma confirmação incerta mantém o pacote
original e o ambiente, sem criar uma nova proposta automaticamente.

A central pessoal mostra somente avisos próprios atrasados/incertos e PDFs
próprios recuperáveis, com orientação de conferir a origem, recuperar a emissão
e acessar Guias e ajuda. Estado vazio exige consulta válida. Falha ou resposta
inválida não é convertida em ausência de pendência.

operations-backup aceita telemetry opcional no arquivo externo de configuração:
enabled=false por padrão; ativação explícita exige url autorizada e
serviceKeyFile separado. O adaptador só aceita o Supabase autorizado ou a stack
local conhecida. Reautentica o arquivo cifrado e usa requestedAt do manifesto,
sem transformar verificação tardia em execução recente. A saída indica disabled,
confirmed ou unconfirmed. Configuração, chave, caminhos e conteúdo capturado
não integram o evento técnico. reportRecoveryProbe é chamado após o ensaio
isolado; o CLI aceita --telemetry-file externo opcional. O código do evento é
RECOVERY_PROBE_VERIFIED e não libera o gate D6. Nenhum fornecedor foi ativado.

147 corrige somente os dois raise40001 deliberados de CAS de operations_command.
A primeira corrida real produziu504; a rechecagem devolveu PT409/HTTP409, com um
vencedor e uma recusa. Consulte o
[diagnóstico oficial do Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
Outras funções históricas não foram reescritas por essa correção pontual.

## Provas e contraprovas

17 casos dirigidos passaram em dois grupos:16 de Auth/SQL/filesystem e um
complemento com coleta real das condições de fila, PDF, falha legada e segurança.
Também passaram17 unitários, tipos, lint afetado, allowlist de serviço e o
guard das84 migrations históricas. Negativas cobrem SQLNULL, payload privado,
idempotência, versão, papel/contexto e prazo após espera real por lock.
Histórico101+, revogação da referência própria, imutabilidade, configuração e
ausência de efeitos em ciência/estoque foram conferidos.

18 casos distintos passaram em build de produção: nove de jornada acessível,
foco e impacto próprio foram conservados; os nove globais afetados foram
rechecados após corrigir o seletor nativo e preservar proposta no conflito.
Os três projetos percorreram o fluxo global; política e impacto passaram por
320/390/768/1440, teclado e todas as regras axe configuradas. O diagnóstico3/3
é registro separado e não integra o aceite. A primeira rodada9 passes/9 falhas
permanece preservada, sem excluir caso ou ampliar timeout.

A captura real145 foi autenticada e restaurada em banco isolado, evoluído
até147:143 conjuntos/digests, FKs,33 objetos,32 PDFs e hash de uma emissão
assinada ready conferidos. Isso não é validação criptográfica nova de todos
os arquivos nem homologação D6. A mesma cópia e o resultado do probe passaram
pelo adaptador HTTP na stack local e produziram os dois eventos corretos;
BACKUP_VERIFIED preservou o horário original. A credencial temporária local
foi removida, e configuração permanente de agenda/telemetria segue desligada.

A aplicação remota preservou387 identidades de função e autoridades/grants;
somente o retorno final do scheduler existente foi estendido. Os143 conjuntos
anteriores, Auth, Storage, cron e Vault foram confrontados. Histórico147/147
coincide com os SQLs. Catálogo vivo coincide com o local, salvo o flag de
validação da constraint NaN local previamente qualificada, com predicado igual.
Advisors acrescentam seis tabelas privadas sem política/grant e quatro RPCs
Auth; caminhos anon não aumentaram. A
[orientação de RLS do Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
e as qualificações constam do recibo; os avisos anteriores não viraram aprovação.

## Estado e limites

Não há adaptador externo de monitoramento ativo, SLA ou prova de disponibilidade
por observador externo. Backup operacional externo, perda de computador/chaves,
RPO/RTO e recuperação D6 continuam gates próprios.

CI19a3568 terminou FAILURE somente no job iOS1, com93 passes/uma falha na jornada
acessível. O artefato mostra B já selecionado ao final: o teste iniciava a volta
aA observando apenas o valor otimista do select, enquanto o contexto/rota B
ainda conciliavam. O consumidor agora exige contexto B, URL e conteúdo pessoal
antes de iniciar outra seleção, sem force/retry/sleep ou timeout maior.
Diagnóstico e aceite de produção dessa correção ficam separados.

A rechecagem da jornada inteira passou em Chromium, mobile e iOS. O seletor
inicial agora oferece busca nos vínculos autorizados e renderiza até50 resultados
por busca, com orientação para refinar. A API e o banco continuam autorizando
cada escolha. A mera presença de Secrets na configuração Preview foi conferida
pelo CLI: serviço, assinatura/confiança PDF e Web Push. Valores não foram
expostos nem alterados; o arquivo pull omite Secrets e não comprova ausência.
