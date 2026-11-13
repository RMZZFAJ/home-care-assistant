# Reconciliação e aplicações remotas D-B

Projeto único autorizado: `qwfrqychokvhdzakibid`. Sem reset, seed ou remoção
de dados remotos. As 84 migrations históricas permanecem protegidas.

## Estado atual — revisão dos avisos do Supabase

Local e remoto em242, após240→241→242. O acréscimo de teste pessoal de Push
usa20261113001837 e20261113002720, aplicadas depois do término da CI anterior
e da qualificação local. Histórico completo240 preservado; dependências,
grants e relações do Push anterior idênticos ao local. Três RPCs novas têm
search_path vazio: uma Auth e duas somente serviço. A tabela privada tem RLS,
nenhum grant direto e quatro índices válidos, cobrindo suas FKs.

Preflight e recheck precederam a escrita; dump nativo de esquema de1.708.233
bytes protegido fora do Git, sem nova reconstrução de dados. Pós-check confirmou
histórico242, funções/configurações/grants, tabela, constraints e índices iguais
ao local; dry-run sem pendências. Não houve reset, fixtures/Auth remotos, envio
de Push ou ativação externa. A CI do novo SHA continua exigida.

Os três casos novos de Auth real passaram, incluindo propriedade/sessão,
concorrência, frequência, pausa/revogação/chave, sessão encerrada e resultado
incerto sem replay. A guarda de chave nula foi acrescentada incrementalmente
após a introdução local, sem reescrever a migration já aplicada; seu caso
dirigido passou. As verificações de catálogo do contrato de serviço passaram;
o restante dependente das fixtures continua na suíte completa da CI.

## Histórico da revisão dos avisos — 239/240

20261112214842 preserva as onze políticas, seus papéis e predicados sensíveis
às linhas, usando initplan somente para auth.uid(). Acrescenta dois índices
não únicos de authority_sessions e fecha o search_path de
invitation_registration_allowed, sem mudar corpo, assinatura ou grants.
20261112223005 preserva a view security_invoker de saldos e acrescenta uma
condição necessária já exigida por recipient_role: algum vínculo ativo da
pessoa real. Sem esse vínculo, evita percorrer todo o histórico para retornar
vazio; continuam as verificações originais por paciente e custódia.

A regressão com Auth real recusava a consulta sem vínculo por timeout sobre
mais de20mil movimentos locais; após o filtro, o caso completo passou em0,96s.
O teste positivo de retirada concorrente e aceitação ENT passou, preservando
as duas custódias. A autoridade interna por transação também passou; sua saída
excedia o limite padrão de1MiB do processo SQL diante de mais de5mil pacientes
fictícios acumulados. O harness agora limita a16MiB e informa o código de erro
do processo. Nenhum prazo, regra de acesso ou dado foi apagado para obter verde.

Preflight: prefixo completo238, equivalência das políticas, corpos/configuração,
ACL/RLS e opções das relações; dois índices novos válidos; view com somente o
filtro adicional e aliases redundantes do segundo braço UNION. A primeira
comparação recusou esses aliases; a diferença foi delimitada, sem alterar
migrations já aplicadas. Snapshot de catálogo e dump nativo de esquema
public/private de1.707.549bytes guardados fora do Git, com ACL do operador.
O backup crítico237 e seu ensaio de evolução238 permanecem disponíveis; não
houve nova reconstrução de dados sem mudança que a exigisse.

Recheck imediatamente antes da escrita e dry-run exclusivos239/240. Pós-check:
240versões, políticas, corpos/configuração/grants, view, relações e índices
iguais ao local; dry-run vazio. Sem reset, fixtures/Auth remotos ou canais novos.
Instalação limpa, evolução legada e integração completa seguem na CI do novo SHA.

Advisors após239/240:

- Performance: os11 [avisos de initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
  desapareceram; FKs sem índice124→122. Índices ainda sem uso76→78 incluem os
  dois recém-criados. Não remover índices de unicidade/concorrência ou criar os
  outros122 indiscriminadamente; priorizar consultas e planos demonstrados.
- Segurança:69 tabelas RLS sem política, sendo61 privadas sem grants diretos e
  oito públicas. Três destas têm SELECT authenticated, mas a ausência de política
  recusa todas as linhas; não foi criada política permissiva para limpar aviso.
  Os três RPCs anon são convites com token e verificação booleana documental
  legada; seus limites foram inspecionados. Os233 RPCs authenticated usam a
  arquitetura de comandos autorizados; o aviso não equivale a aprovação geral.
- unaccent continua no schema public, com dependências legadas não qualificadas
  e propriedade supabase_admin. Mover a extensão isoladamente quebraria essas
  funções. Não houve relocação ou mudança de owner por conveniência do linter.
- A proteção contra senhas vazadas está desabilitada. A [documentação do Auth](https://supabase.com/docs/guides/auth/password-security)
  exige plano Pro ou superior; o plano não foi confirmado e não houve upgrade
  pago ou alteração de Auth remoto. Registrar a ativação no ambiente elegível.
- Saúde: nenhum aviso na consulta final. Os avisos mantidos continuam visíveis;
  ausência de erro de saúde não constitui aprovação operacional.

A nova consulta de12/11 à noite confirmou os mesmos238 avisos e69 sugestões de
segurança. Performance tem122 FKs sem índice e76 índices sem uso, total198;
os dois índices acrescentados já registraram uso. A queda200→198 não resulta
de remoção de índice ou de regra. Nenhuma alteração remota foi feita nessa
reconsulta. Os contratos e limites de correção acima continuam aplicáveis.

Após242, o consultor registra239 avisos e70 sugestões de segurança: a diferença
é a RPC Auth restrita do teste e sua tabela privada fechada, ambos conferidos
no pós-check. Não foi aberta política permissiva para remover a sugestão.
Performance registra122 FKs anteriores sem índice e78 índices sem uso, total200;
os dois índices adicionais cobrem FKs do recurso novo e ainda não tiveram uso
remoto. Saúde continua sem avisos. Isso preserva a distinção entre sugestões,
riscos conhecidos e defeitos efetivos, sem alegar aprovação geral dos achados.

## Histórico — consulta técnica de tentativas (238)

Local e remoto em 238, sem pendências. A migration
20261112193250_phase_db_technical_notification_reads acrescenta somente a RPC
operations_notification_attempts: consulta global autenticada, paginada e
minimizada. Não cria tabelas, tentativa, reenvio ou acesso operacional local.
Anon e service_role não têm execução; a autoridade global é conferida no corpo
antes da leitura e novamente antes do retorno. Search_path vazio e referências
qualificadas foram preservados.

Preflight: prefixo completo de 237 versões, quatro dependências de autoridade,
colunas e proteção das três fontes conferidos; função nova ausente e dry-run
exclusivo de 238. Uma cópia crítica cifrada foi autenticada e restaurada em banco
isolado, com evolução 237→238, sem cron/pg_net. O banco temporário foi removido.
O ensaio preserva as diferenças delimitadas do catálogo e não aprova RPO/RTO.

Pós-check: histórico 238/238, definição, configuração, grants e dependências
iguais ao local após normalização de CRLF; proteção das fontes preservada e
dry-run vazio. Regressão com Auth real, paginação 101+, ordem SQL independente,
minimização e negativas está em tests/integration/technical-notifications.test.mjs;
API e interface reais foram qualificadas em tests/e2e/operations-monitoring.spec.ts.
Sem reset, fixtures/Auth remotos, alteração de canal ou produção. CI do SHA
publicado continua gate próprio. O andamento corrente pertence ao
[acompanhamento principal](../../../../TEMP_D_B_ATUALIZACAO.md).

## Histórico — contingência

Local e remoto em 237, sem pendências. Aplicado o conjunto pronto
20261112115038, 20261112120018, 20261112120210, 20261112121722 e
20261112121925. Duas tabelas privadas imutáveis, três competências e um
terceiro pai de anexo preservam declarações, atos e evidências. A reserva,
atestação, Storage, finalização e recuperação existentes são reutilizados.
A recuperação oficial pode encerrar uma chave ainda não executada, sem
persistir preenchimento comum. Unidade/precisão revisadas são conferidas e
bloqueadas no banco durante o registro. Nenhuma migration anterior foi editada.

20261112121722 é um registro vazio aplicado localmente após falha na
geração do SQL; não contém DDL nem mudança de dados. Seu histórico foi
preservado. A proteção efetiva da referência está em 20261112121925.

Pré-check: 232 versões, 19 dependências compatíveis, objetos novos ausentes
e dry-run exclusivo das cinco versões, sem seeds/roles/Vault. Captura leve
de histórico e contratos no banco sintético, sem backup integral redundante.
Pós-check: 237 versões; 19 dependências e 15 funções novas, configurações e
ACL iguais ao local. Histórico anterior preservado; duas tabelas com RLS e
sem grants/políticas de acesso direto, FK e constraint do pai de anexo
conferidas. Seis RPCs públicas somente authenticated; helpers privados, anon
e service_role sem execução das funções novas. Todos os search_paths vazios.
Dry-run final sem pendências; sem reset, fixtures/Auth remoto ou alteração
de canais. Instalação limpa, legado e integração geral exigem CI do novo SHA.

Onze cenários Auth da contingência, dez regressões nativas anteriores de
anexos, quatro testes de contrato e dez percursos de produção móveis/WebKit
passaram em conjuntos compatíveis. A prova de anexo inclui Storage real de
teste, proveniência, recuperação e hashes congelados na decisão. Não é
comprovação de operação física ou aprovação global dos achados anteriores.

## Histórico — preparação local

Local e remoto em 232, sem pendências. A migration
20261112111224_phase_d3_local_preparation_context acrescenta uma consulta
local autorizada de metadados, sem novas tabelas, alteração de fatos ou
substituição de funções anteriores. Domínios restritos retornam null; escrita
sem leitura de estoque não revela contagens nem quantidades.

Pré-check: 231 versões e sete dependências coincidentes, função nova ausente
e dry-run exclusivo da migration pronta, sem seeds, roles ou Vault. Captura
leve de histórico e contratos adequada à adição de leitura no banco sintético;
sem reset, fixtures, Auth remoto ou backup integral redundante. Aplicação única
pelo CLI vinculado ao projeto autorizado. Pós-check: 232 versões, definição,
configuração e ACL iguais ao local; histórico anterior e sete dependências
preservados. Somente authenticated executa, com search_path vazio; anon e
service_role sem execução. Dry-run final vazio. Cinco cenários locais com
Auth real passaram; instalação limpa, legado e integração integral seguem
na CI do SHA publicado. Nenhum achado antigo recebe aprovação global.

## Histórico — modalidades documentais V17

Local e remoto 231, sem pendências. Aplicadas uma vez 20261112070000 e
20261112070100. Opções oficiais da emissão, fontes selecionadas, destinatário
humano, competências próprias e recuperação por intenção não alteram rascunhos
ou exemplares anteriores. Uma coluna, uma constraint, dois triggers e uma view
privada; nenhuma tabela/index novo. A cronologia usa a mesma lista de fatos.

Pré-check: 229 versões, onze dependências esperadas, onze entradas anteriores
de reserva idênticas ao local, coluna/view/RPC novas ausentes e dry-run exclusivo
das duas migrations. Pós-check: 231 versões e 26 definições/permissões/configs,
constraint, triggers, coluna e view iguais ao local; versões antigas preservadas
e dry-run vazio. Tabela conserva RLS e grants fechados. View/helper privados
sem grants diretos; nova reserva somente authenticated, com negativas reais.

Advisors mantêm as cinco classes de segurança e três de performance. RPCs Auth
definer passam a 225 pela nova reserva. Permanecem 67 tabelas fechadas, três
funções anon, 124 FKs sem índice, onze initplans e 72 índices sem uso observado.
Extensão/proteção de senhas e achados anteriores continuam sem aprovação global.
Sem reset, fixtures/Auth remoto ou backup pesado redundante no banco sintético.
Instalação limpa, legado e integração integral continuam na CI do SHA publicado.

## Histórico — publicação estruturada de Andamentos

Local e remoto 229, sem pendências. Migration 20261112061700 acrescenta detalhes
imutáveis da publicação: destaque e nomes/papéis de pessoas mencionadas. Não
amplia conteúdo, esquema ou apresentação dos rascunhos privados. As chaves
anteriores permanecem válidas; opções novas integram a intenção oficial e sua
recuperação. Menções não produzem ciência, autoria ou movimentos.

Pré-check: 228 versões, sete corpos nativos esperados, incluindo a evolução
anterior da cronologia, permissões fechadas e novos objetos ausentes. Os quatro
registros de migrations recentes coincidem; 83 digests de statements históricos
locais/remotos diferem, sem divergência de versões. Esses registros antigos não
foram reparados nem usados como alegação de igualdade global. Dry-run exclusivo
de 229. Após aplicar: nove definições/configurações/permissões e nova tabela
iguais ao local; histórico remoto anterior intacto, digest novo idêntico e
dry-run vazio. RLS habilitado, nenhum grant direto ou política na nova tabela;
helper fechado, consulta de pessoas somente authenticated.

Testes locais: 19 casos com Auth real, 18 testes de contrato e percurso integrado
em Chromium/iOS, incluindo resposta perdida e rascunhos sem expansão. Advisors:
67 tabelas RLS fechadas, 224 RPCs Auth definer; demais grupos permanecem com as
contagens anteriores (124 FKs sem índice, onze initplans, 72 índices sem uso,
três funções anon). As adições são a tabela fechada e a consulta autenticada;
nenhum achado antigo recebe aprovação. Sem reset, fixtures/Auth remoto ou
backup pesado redundante. Instalação limpa, legado e integração completa
continuam na CI do SHA publicado.

## Histórico — DOC-C.3: acessos agrupados

Local e remoto 228, sem pendências. Migration 20261112051000 preserva as
aberturas existentes da REQ e suas chaves, acrescenta os relatos das outras
fichas e agrupa novos acessos da mesma pessoa/versão por vinte minutos. Duas
tabelas privadas conservam janelas e referências de recuperação; não há
backfill nem alteração de fatos ou nomes anteriores.

Pré-validação: prefixo 227 correto, oito funções anteriores compatíveis com o
contrato preservado, corpo original do registrador REQ conferido, política e
RLS/grants anteriores verificados; dry-run exclusivo de 228. Pós-validação:
228 versões, onze funções/configurações/permissões, duas tabelas, índices,
constraints, política e nova competência idênticos ao local; grants da trilha
anterior preservados e dry-run vazio.

Advisors mantêm as classes anteriores: 66 tabelas RLS fechadas sem políticas
diretas, 223 funções Auth SECURITY DEFINER e 72 índices sem uso observado. As
adições correspondem às duas tabelas fechadas, duas RPCs autenticadas e quatro
índices novos sem uso registrado no remoto. FKs sem índice permanecem 124,
initplans onze, funções anon três; extension_in_public e proteção de senhas
continuam pendentes. Não há aprovação global desses achados.

Sem reset, fixtures/Auth remotos ou backup pesado redundante no banco sintético.
Instalação limpa/legado e integração completa seguem na CI do novo commit.

## Histórico — composição aprovada V16

Local e remoto 227, sem pendências. Aplicadas uma vez as migrations
20261112030502 (reserva e recuperação por formato), 20261112034304 (corte,
função original e referências autorizadas) e 20261112043300 (referências
reversas da REQ por eventos canônicos anteriores ao corte). Não reescrevem
eventos, snapshots ou exemplares prontos.

Pré-validação: 224 versões, nove definições/configurações/permissões e sete
gatilhos iguais ao baseline local preservado; dry-run exclusivo das três
migrations. Testes com Auth real passaram no projeto local, sem reset.
Pós-validação: 227 versões, doze funções/configurações/permissões e oito
gatilhos idênticos ao local; helpers privados sem grants expostos, nova RPC
somente authenticated; dry-run vazio. Nenhuma tabela ou índice novo.

Advisors mantêm as cinco classes de segurança e três de performance. A contagem
de RPCs authenticated SECURITY DEFINER passou de 220 para 221 pela reserva V16,
cuja autorização foi testada. Permanecem 64 tabelas RLS fechadas, três funções
pré-existentes anon, um extension_in_public, proteção de senhas pendente,
124 FKs sem índice, onze initplans e 68 índices sem uso. Isso não aprova os
achados anteriores nem representa uma revisão global de segurança.
[Regra do advisor da RPC](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Sem reset, fixtures/Auth remotos, ativação externa ou backup pesado redundante
do banco sintético, conforme a autorização vigente. Instalação limpa, evolução
legada e integração completa seguem na CI do commit publicado.

## Histórico — DOC-B.4_PDF

Local e remoto 224, sem pendências. Migration 20261112014602: reserva V15,
congelamento de cancelamento/ciências/vínculos no corte e guarda de leitura de
referências conhecidas. Preserva campos BAL/COM/ENT e intenções anteriores.

Preflight confirmou223 versões e quatro dependências iguais ao local. Oito
Auth, 16 verificações unitárias/PDF, quatro percursos com assinatura e inspeção
das páginas precederam a aplicação linked/skip-vault. Após aplicar, 224 versões,
oito definições/configurações/grants e sete triggers coincidem normalizando
somente CRLF. Dry-run vazio. Reserva V15 somente authenticated; auxiliares,
anon e service fechados. Sem tabela/índice novo;84 históricas preservadas.
Sem reset, Auth/fixtures remotos, produção, transporte ou backup redundante.

Advisors: Auth definer 219→220, a RPC intencional com negativas reais. Demais
classes preservadas: 64 INFO sem política, extensão 1 WARN, anon 3 WARN,
senhas 1 WARN;
performance 124 FKs sem índice, 11 initplan e 68 índices sem uso. Os alertas antigos
não recebem aprovação genérica. [Resultados e orientação](PDF_LIFECYCLE.md).
CI própria, instalação limpa, legado e integração completa continuam gates.

## Fechamento anterior — DOC-B.4_COMPLEMENTS

Local e remoto223,sem pendências. As migrations20261112005024,20261112005608 e
20261112010620 acrescentam relação privada imutável,quatro RPCs autenticadas,
recuperação da própria tentativa e os fatos de vínculo na cronologia existente.
Motivo e referências preservados; materiais e efeitos operacionais inalterados.

Preflight confirmou220 versões como prefixo exato e apenas três pendências.
As dependências anteriores coincidem; a única evolução prevista nelas foi a
lista de fatos automáticos. Dez Auth,14 contratos/API e nove percursos browser
precederam a aplicação linked/skip-vault. Após aplicar,223 versões,11 definições
incluindo dependências,RLS,política,sete índices,constraints,trigger e grants
coincidem com o local,normalizando só CRLF. Dry-run vazio. Tabela/auxiliares
fechados; quatro RPCs exclusivas de authenticated;84 históricas preservadas.
Sem reset,fixtures/Auth remotos,produção,transporte ou backup redundante.

Advisors:Auth definer215→219,demais classes de segurança inalteradas. Os quatro
avisos novos correspondem às RPCs intencionais com autorização/negativas reais.
Performance:124 FKs sem índice e11 initplan preservados;64→68 índices sem uso,
incluindo os quatro índices explícitos ainda sem carga remota. Não remover
índices de integridade/consulta para silenciar esse aviso. Alertas anteriores
não recebem aprovação genérica. [Resultados e orientações](DOCUMENT_COMPLEMENTS.md).
Instalação limpa,legado,integração e CI do SHA publicado continuam gates próprios.

## Fechamento anterior — DOC-B.4_CANCELLATION

Local e remoto220, sem pendências. As migrations20261111232545 e20261112001835
acrescentam consulta/confirmação da ciência do cancelamento, ordem de lock
compatível com a SCI existente e pedido interno obrigatório preservado mesmo
com avisos opcionais desligados. Sem tabela, índice, política ou reescrita de
histórico; canais externos continuam sujeitos às regras anteriores.

Preflight confirmou218 versões como prefixo exato e somente duas pendências.
O contrato anterior da fila coincide com o local normalizando apenas CRLF.
Preparo sem reset, nove Auth, seis contratos/API e seis casos de navegador
precederam a aplicação linked/skip-vault. Depois,220 versões, definições e
grants coincidem; dry-run vazio. Duas RPCs autenticadas, auxiliar privada fechada,
search_path vazio e negação de EXECUTE para anon/service conferidos. As84
migrations históricas permanecem inalteradas. Sem Auth/fixtures remotos, reset,
produção, ativação externa ou backup redundante.

Advisors:64 INFO sem política, extensão1 WARN, definer anon3 WARN, definer
Auth215 WARN e senhas1 WARN. Os dois acréscimos são as RPCs autenticadas, com
negativas/autoridade conferidas. A [orientação de funções autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
permanece registrada; alertas antigos não recebem aprovação genérica.
Performance:124 FKs sem índice INFO,11 initplan WARN e64 índices sem uso INFO;
sem novos objetos dessas classes. Instalação limpa/evolução legada e integração
completa continuam na CI do SHA publicado.
[Escopo e limites](CANCELLATION_AWARENESS.md).

## Último fechamento remoto — DOC-B_RETURN

Local e remoto com218 versões, sem pendências. A migration20261111222925
acrescenta a reserva V14 e permite a nova revisão nas fontes e fatos documentais.
ENT nova usa14; COM13, BAL12 e REQ10 permanecem. Intenções e exemplares anteriores
mantêm revisão, identidade e fonte. Sem tabela nova, alterações de estoque,
políticas, dados de Auth ou migrations históricas.

O preflight confirmou217 versões como prefixo exato e comparou as três funções
de origem com o local. Dry-run isolou somente a migration218. Preparo local sem
reset, Auth real, oráculo PDF e três perfis de navegador precederam a aplicação
linked/skip-vault. Depois,218 versões, definições e grants coincidem exatamente
com o local e o dry-run está vazio. V14 SECURITY DEFINER mantém search_path
vazio e somente authenticated pode executar; anon/service sem EXECUTE.
As84 migrations protegidas continuam inalteradas. Sem reset, fixtures/Auth
remotos, produção, transporte externo ou backup redundante do banco descartável.

Advisors de segurança:64 INFO sem política, extensão1 WARN, definer anon3 WARN,
definer authenticated213 WARN e senhas1 WARN. O acréscimo é a reserva V14
pessoal(+1), com autorização, revogação e negativas locais conferidas. A regra
sobre [funções definidoras autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
continua registrada; os alertas antigos não recebem aprovação genérica.
Performance:124 FKs sem índice INFO,11 initplan WARN e64 índices sem uso INFO;
esta migration não acrescenta tabela, FK, política ou índice. Instalação limpa,
evolução legada e integração completa permanecem na CI do SHA publicado.
[Resultados e limites](AUTONOMOUS_RETURNS.md).

## DOC-B_COM — registro histórico

Local e remoto com217 versões, sem pendências. As migrations20261111210737 e
20261111212303 acrescentam captura privada imutável do saldo FAMILY na transição
nativa de validação COM, projeção por material/versão e emissão COM V13.
Preservam eventos/hash/snapshots canônicos, créditos existentes, BAL V12,
REQ/ENT10 e todas as intenções anteriores. Sem reconstrução de saldos legados.

Preflight confirmou215 versões como prefixo exato do histórico local e isolou
somente as duas pendências. Preparo local sem reset, cinco cenários Auth,
conferência PDF e três perfis de navegador precederam push linked/skip-vault.
Após aplicação,217 versões coincidem; dry-run vazio. Tabela com RLS e sem grants
para anon/authenticated/service; quatro auxiliares fechadas e reserva V13
somente authenticated. search_path vazio, constraints e índices válidos.
As84 migrations protegidas permanecem inalteradas. Sem fixtures/Auth remotos,
reset, produção, transportes ou backups redundantes do banco descartável.

Advisors:64 INFO de RLS sem política, extensão1 WARN, definer anon3 WARN,
definer authenticated212 WARN e senhas1 WARN. Os acréscimos são a tabela privada
intencionalmente fechada e a nova reserva autenticada, com negativas verificadas.
Não há apontamento de FK sem índice para a tabela nova; seus dois índices
auxiliares ainda sem uso recebem INFO. As demais ocorrências permanecem sem
aprovação genérica. Instalação limpa/evolução legada e integração completa
continuam na CI do SHA publicado.
[Resultados e limites](PURCHASE_ENTRY_BALANCES.md).

## DOC-B_BAL_CORRECTIONS — registro histórico

Local e remoto com215 versões, sem pendências. As migrations20261111202159,
20261111203047 e20261111203626 acrescentam somente projeção de atos nativos e
emissão BAL V12 com correções congeladas no corte documental. Recontos usam a
identidade textual exata do produto da contagem preservada. Não há nova escrita
de estoque, tabela ou alteração de snapshot/hash/exemplar anterior.

Preflight212 confirmou contratos-alvo e ausência das novas funções. Preparo
local sem reset e regressões Auth/PDF/navegador precederam o push linked/skip-vault.
Dry-run isolou três pendências e terminou vazio após aplicação. As215 versões
coincidem com os arquivos locais. Auxiliares fechadas, RPC authenticated-only,
SECURITY DEFINER/search_path e proteção dos saldos nas correções conferidos.
84 arquivos históricos protegidos permanecem inalterados. Sem fixtures/Auth
remotos, reset, produção, transportes ou backups redundantes.

Advisors mantêm as mesmas cinco classes:63 INFO sem política, extensão1 WARN,
definer anon3 WARN, definer authenticated211 WARN e senhas1 WARN. O único
acréscimo é a nova reserva autenticada(+1); sua autorização e negativas foram
conferidas. Alertas antigos continuam sem aprovação genérica. Instalação limpa,
evolução legada e integração completa permanecem na CI do SHA publicado.
[Resultados e limites](BAL_REVIEW_APPLICATION.md).

## Núcleo inicial DOC-B_BAL — registro histórico

Local e remoto com212 versões, sem pendências. As migrations20261111183942,
20261111192340,20261111193015 e20261111194511 separam parecer/aplicação BAL,
preservam sua proveniência e os rótulos privados e acrescentam a nova emissão
BAL V11 com saldo autorizado congelado. Não reescrevem aplicações históricas,
snapshots, protocolos, hashes canônicos ou arquivos emitidos. A entrada atual
mantém revisão10 para os outros tipos; entradas antigas continuam recuperáveis.

Preflight confirmou207 versões e as funções-alvo compatíveis. Testes locais
Auth, contratos, PDF e navegador precederam o push linked/skip-vault. Dry-run
isolou quatro pendências e terminou vazio após a aplicação. As212 versões
coincidem exatamente com os arquivos locais. RLS e negação de acesso direto
à tabela privada, grants das duas RPCs e três auxiliares conferidos no alvo.
Não houve reset, seed, alteração Auth, ativação externa ou backup/reconstrução
redundantes do banco descartável, conforme autorização vigente.

Advisors de segurança mantêm as cinco classes: RLS sem política63 INFO, extensão
pública1 WARN, definer anon3 WARN, definer authenticated210 WARN e proteção de
senhas1 WARN. O acréscimo é a tabela privada fechada(+1 INFO) e as duas RPCs
pessoais(+2 ocorrências de definer authenticated), com grants e negativas Auth
conferidos. Os alertas antigos continuam sem aprovação genérica. As orientações
permanecem na seção histórica D3.75 abaixo. CI própria, instalação limpa,
evolução legada e integração completa permanecem gates do SHA publicado.
A checagem de performance identificou a FK composta nova sem índice completo.
A migration20261111201053 acrescentou apenas o índice document_id/paciente,
após preparo local e dry-run isolado. Índices novos ainda não utilizados não
recebem alegação de uso produtivo. Sem repetição de testes funcionais inalterados.
[Resultados e limites](BAL_REVIEW_APPLICATION.md).

## D3.75 — registro histórico

Local e remoto com206 versões, sem pendências. A migration20261111095717
acrescenta somente catalogue_workspace, leitura STABLE/SECURITY INVOKER com
search_path vazio, execução authenticated e a RLS/vínculo/contexto anteriores.
Itens e sucessores chegam completos em um snapshot, sem o limite tabular1000.
Não altera tabela, dados, autoria, saldo ou funções de escrita.

Preparo local sem reset, uma prova nativa Auth e30 cenários distintos de
navegador qualificados precederam a aplicação. Dry-run isolou uma migration;
a aplicação usou linked/skip-vault e terminou com dry-run vazio. Corpo, SQL
registrado, propriedades e ACL coincidem com o local. Os84 arquivos protegidos
não foram alterados. Sem seed, Auth, Vault, reset, produção, transportes ou
backup/reconstrução redundantes do banco descartável autorizado.

O CLI local de advisors teve timeout de conexão TCP. O MCP remoto concluiu
antes/depois, mantendo as mesmas cinco classes e contagens; os achados antigos
não recebem aprovação. Orientações para consulta:

- RLS fechada sem políticas:62 INFO — [orientação](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Extensão no schema público:1 WARN — [orientação](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).
- Funções definer executáveis por anon:3 WARN — [orientação](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- Funções definer executáveis por authenticated:208 WARN — [orientação](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Proteção de senhas vazadas:1 WARN — [orientação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

A função nova é invoker, não integra essas classes de definer e não acrescentou
apontamentos. [Recibo](CATALOGUE_LIST_REMOTE.json) e
[resultados](OPERATIONAL_LISTS_VALIDATION.json). Instalação limpa, evolução
legada, integração completa e CI continuam necessárias no SHA publicado.

## D3.61 — registro histórico

Local e remoto com 205 versões. As migrations 20261111010628,
20261111012930 e 20261111013009 foram aplicadas uma vez, após seis
cenários Auth e validação dos consumidores. O dry-run isolou as três
pendências e terminou vazio após a aplicação. Os tokens das 205 migrations
remotas conferem com a branch. Dez dependências nativas foram preservadas
e 16 funções, configurações e ACL coincidem com o local. Duas tabelas
privadas com RLS e acesso direto vedado foram acrescentadas.

Controles anteriores e posteriores preservam nove usuários, sete perfis,
15 fichas, 11 movimentos e 34 objetos. Duas chamadas sem sessão foram
recusadas em transação revertida. Não foram carregadas fixtures remotas.
Os metadados de 19 aplicações locais antigas divergem dos arquivos atuais.
O histórico remoto coincide integralmente e esses metadados locais não
foram reescritos. A CI própria ainda precisa validar instalação limpa e
evolução legada. Os 84 arquivos históricos protegidos mantêm seus hashes.

Advisors mantêm cinco classes de segurança e três de performance. As
adições correspondem às duas tabelas fechadas, duas RPCs autenticadas e
três índices novos sem uso. FKs sem índice permanecem em 124 e nenhum
achado anterior recebe aprovação. O banco remoto de testes segue a
dispensa de backups pesados repetitivos aprovada pelo responsável.
[Reconciliação](ADMINISTRATIVE_PREPARATIONS_VALIDATION.json).

## D3.38 — registro histórico

Local172/remoto172, zero pendências. Migrations20261109163324 e20261109170235
acrescentam cinco preparos privados e alinham o texto canônico a ECMAScript,
preservando o bruto. Predecessores, compatibilidade e dry-run único conferidos;
seeds=[]/roles=[]. Digest, funções/configurações, ACL e constraint iguais ao local;
advisors iguais exceto observed_at. Aplicadas antes do commit, sem reset,
fixtures/Auth/Vault remoto ou backup redundante. [Recibo](REGULARIZATION_DRAFTS_REMOTE.json),
[dossiê](REGULARIZATION_DRAFTS.md). CI própria obrigatória; histórico abaixo.

## D3.37 — registro histórico

Local170/remoto170, zero pendências. Migration20261109151449 acrescenta
consentimento ENT ao kernel privado, etapa de navegação e vínculo fechado de
pedido/hash/devoluções. Não altera o RPC de estoque/consumo existente. Três
corpos anteriores conferidos, dry-run único, locks/transações antigos zero e
aplicação oficial antes do commit, seeds=[]/roles=[]. Quatro funções/configurações/
ACL e digest iguais ao local; advisors iguais excluindo somente observed_at.
Sem reset, fixtures, Auth/Vault ou backup redundante. [Recibo](ENT_CONSENT_DRAFTS_REMOTE.json),
[dossiê](ENT_CONSENT_DRAFTS.md). Instalação limpa/evolução/integral continuam
na CI do novo SHA. As etapas abaixo são históricas.

## D3.21 — registro histórico

Local164/remoto164, zero pendências. Migrations20261109022429 e20261109024515
acrescentam intenções privadas de avatar, revisão do ponteiro e RPCs com grants
Auth/serviço separados; objetos gerenciados não são inseridos pelo navegador
nem reaplicados pelo setter legado. A segunda migration corrige conflitos
permanentes para P0001, evitando retry de serialização pelo PostgREST.

Validação local/Auth/Storage e navegador precedeu o dry-run restrito às duas
pendências. Aplicação antes do commit, com164 versões, dois históricos SQL,
12 funções/grants, coluna, RLS, política, índices e trigger iguais ao local.
PDF V10 anterior inalterado; sem bloqueios/índices inválidos. Sem reset, seeds,
fixture/Auth remoto ou backup/restore repetido. [Recibo](AVATAR_REMOTE_MIGRATIONS.json)
e [dossiê](AVATAR_RECOVERY.md). As etapas abaixo são históricas.

## D4.11 — registro histórico

Local162/remoto162, zero pendências. A migration20261109013649 acrescenta a
reserva V10 para estrutura semântica dos novos PDFs, preserva V9 e intenções
anteriores, e amplia somente os guards dos dois snapshots. Quatro definições,
histórico SQL, grants e saúde pertinente conferidos;12 Auth e18 cenários do
aplicativo passaram localmente, além das provas de conteúdo e assinatura.
Dry-run restrito à migration162; sem reset, seed/Auth remoto, alteração de
produção ou backup/restore integral redundante. [Recibo](PDF_STRUCTURE_REMOTE_MIGRATIONS.json)
e [dossiê](PDF_STRUCTURE.md). As etapas abaixo são históricas.

## D3.17 — registro histórico

Local161/remoto161, zero pendências. Migrations158–161 acrescentam declaração
versionada e conferência familiar privada, corrigem cast de enum e ciclo de
vida da metadata, e indexam FK do sujeito. Aplicação incremental com projeto,
histórico SQL, validação local/Auth, dry-run e pós-check específico; sem reset,
fixtures/Auth remoto ou backup/restore integral repetido do banco de testes.
Funções/grants, RLS, trigger, backfill e crons conferidos. Aviso de FK resolvido;
RLS privado/RPC autenticada permanecem intencionais e guardados. Sem promoção.
[Recibo composto](CREDENTIAL_REMOTE_MIGRATIONS.json),
[etapa160](CREDENTIAL_REMOTE_STAGE_160.json), [advisors](CREDENTIAL_ADVISORS.json)
e [provas](PROFESSIONAL_CREDENTIALS_EVIDENCE.json). Registros abaixo são históricos.

## Etapa D5.3 — registro histórico

**Local145/remoto145, zero pendências.** Migration20261107213013 corrige seleção
e progresso de lembretes legados, com checkpoints, diagnóstico e lacunas privadas.
Entrada pública de serviço e seus grants são preservados. Somente dois corpos
de funções mudam intencionalmente;386 identidades e229 identidades públicas,
autoridades e grants anteriores permanecem. Nenhum produtor foi desativado.

O consumidor de backup novo gerou6681a390-179c-4172-83db-22338589ad5e:
78 arquivos/10.304.691 bytes,139 tabelas/FKs,32 objetos e31 PDFs, zero emissão
assinada ready na fonte. Manifesto SHA
ce349754ef70a5ab33505b63f7496aa7e915b54d4ddbc731102dccb484b00c36.
Cópia autenticada, restaurada em isolamento e evoluída com145 antes da aplicação.
Probe4,574s não é RTO operacional. Crons/pg_net ficaram ausentes na cópia.

Dry-run oficial mostrou apenas145, sem seed/roles. Após aplicação linked/
skip-vault,145 SQLs e139 projeções originais coincidiram; nenhum drift de dados,
cron ou Vault. Nove Auth, sete perfis e32 objetos preservados. Catálogo vivo
coincide com o local, exceto a qualificação NaN local já conhecida, com predicado
idêntico. Locks/transações longas/índices inválidos zero.
[Preflight](D5_3_REMOTE_PREFLIGHT.json), [resultado](D5_3_REMOTE_MIGRATIONS.json)
e [advisors](D5_3_REMOTE_ADVISORS.json). Publicação/CI são gates separados.

## Fechamento anterior — D5.2

**Local144/remoto144, zero pendências.** A migration20261107195440 acrescenta
quatro tabelas privadas Push, cinco RPCs pessoais Auth e três de worker/serviço.
Não reescreve aplicações anteriores nem ativa transporte. O preflight inicial
recusou alterações posteriores à captura em Auth/sessões e notificações/revisão.
A captura completa foi renovada, preservando a primeira e sua contraprova.

Backup final b065691e-d9af-43ea-88f8-7d6c8111c0a3,77 arquivos/10.094.070 bytes,
manifesto SHA d55dec16160c02c94a810ecbe5e492eaf255f49926f32952bc515905fcb7b33c:
autenticado e restaurado em banco isolado no container local existente.
Foram conferidos135 tabelas/FKs,32 objetos e31 PDFs, zero emissão assinada ready
na fonte; upgrade144 passou na cópia sem cron/pg_net. Não é prova D6 operacional.

Dry-run oficial mostrou somente144, sem seeds/roles. Aplicação linked/skip-vault
passou após compatibilidade:372 definições anteriores,221 públicas, e seus grants
permanecem idênticos. Pós-validação comparou144 SQLs e135 projeções originais,
sem alteração inesperada; cron/Vault idênticos, locks/transações longas/índices
inválidos zero. A qualificação conhecida da constraint NaN local permanece.
Novas tabelas têm RLS e nenhum grant direto; as oito RPCs têm papéis e
search_path conferidos. Não há inscrição ou entrega Push remota criada.
[Preflight](D5_2_REMOTE_PREFLIGHT.json), [resultado](D5_2_REMOTE_MIGRATIONS.json)
e [advisors](D5_2_REMOTE_ADVISORS.json). PR Draft, produção NO-GO.

## Aplicação inicial — D-A

**APLICAÇÃO INICIAL E PÓS-VERIFICAÇÃO CONCLUÍDAS.** Baseline aa9f168:
121 arquivos locais e 113 versões remotas, sem versão desconhecida no
`migration list --linked`. Oito pendências confirmadas, na ordem:

1. `20261106040155_phase_d2_optional_recount.sql`.
2. `20261106073728_phase_d2_bilateral_transfers.sql`.
3. `20261106075328_phase_d2_preserve_bal_draft_recount.sql`.
4. `20261106161707_phase_d2_catalogue_successors.sql`.
5. `20261106181435_phase_d2_requisition_remaining_need.sql`.
6. `20261106185554_phase_d2_private_req_bal_drafts.sql`.
7. `20261106203000_phase_d2_private_bal_reference.sql`.
8. `20261106211500_phase_d2_selected_shift_dates.sql`.

Controles agregados anteriores: 8 usuários Auth, 6 perfis, 3 pacientes,
12 documentos operacionais, 8 REQs, 145 eventos documentais, 8 movimentos,
29 objetos Storage. Esses números não representam conteúdo ou aprovação.
Jobs `hca-notification-worker` e `hca-operational-lifecycle` estavam ativos.
Não foram alterados. Backup precisa incluir bytes Storage, Auth, schema,
histórico, documentos e custódias, fora do Git, com hashes e verificação de
recuperabilidade. Arquivo criado isoladamente não satisfaz o preflight.

Compatibilidade será confrontada com Vercel production SHA 8ec979a e preview
do candidato. Preflight, decisão de aplicação e pós-validação terão registros
separados, inclusive eventuais impedimentos e correções incrementais.

### Decisão de preflight inicial

Backup final `e3c45e45-b4b7-45fd-b58d-666bca46f992`: 47 arquivos,
6.233.858 bytes, AES-256-GCM, manifesto cifrado e autenticação por objeto.
SHA-256 do manifesto:
`964a7be1124fdb93479e16dc98631000d51237b3720be4753ff3122cd8f80fce`.
Destino no computador do operador, independente do Supabase, fora do Git;
chave separada com ACL Windows limitada ao operador. Não há agendamento de
backup diário ativo nem comprovação de recuperação após perda desse computador.

Restauração real em banco temporário restrito no container local já existente,
sem outra stack, sem cron, sem pg_net e sem importar roles no cluster. O banco
temporário foi removido ao fim; postgres operacional local não foi substituído.
122 tabelas restauradas; contagens/digests estáveis conferidos, FKs verificadas,
29 objetos Storage e hashes dos 28 PDFs registrados confrontados. As duas
diferenças temporais de snapshots são exclusivamente cursor BAL e heartbeat
do scheduler, cujas linhas do dump foram restauradas. Nenhum dado de negócio,
Auth ou arquivo divergiu na consulta imediatamente anterior à aplicação.

O procedimento incluiu metadados gerenciados Auth/Storage e sete escopos de
default privileges omitidos pelo dump selecionado. A tentativa inicial com
postgres não restaurava ownership de supabase_admin; o probe usa o administrador
local somente no banco isolado, com proprietário postgres e DDL de migrations
sob SET LOCAL ROLE postgres. Um coletor JSON multilinha foi corrigido para
jsonb; falhas/diagnósticos anteriores permanecem no destino privado.

As oito migrations foram aplicadas nessa cópia restaurada. Catálogo resultante
coincide com o candidato local em relações, colunas lógicas, índices, funções,
RLS/policies, triggers, table/function grants e defaults. Duas qualificações:

- pg_dump/reparse acrescenta alias interno `AS text` ao segundo ramo UNION da
  view de candidatos; a view remota original coincide integralmente com a local,
  e as oito migrations não a substituem.
- presentation_finite_factor está validada no remoto, sem apresentação inválida;
  o local preserva fixture NaN legada e a mesma regra NOT VALID conforme o desenho
  condicional da migration D-A. Não há redução de regra nem saneamento silencioso.

Histórico: 113/113 SQLs correspondem aos tokens dos arquivos atuais. Comparação
preserva literais, identificadores e corpos de funções; diferenças de separação
de statements/whitespace não são tratadas como drift. Guard confirmou os 84
hashes históricos. Nenhuma versão remota desconhecida.

Vercel production 8ec979a mantém as assinaturas RPC anteriores. A inspeção dos
consumidores e das oito evoluções confirma adições e caminhos opt-in: submit REQ
mantém assinatura/recuperação legada, referência BAL nova é opcional, recorrências
anteriores continuam válidas, ENT preserva o motor anterior e campos adicionados
têm defaults compatíveis. Nenhum exemplar, evento ou registro histórico é
reescrito. Isso não é homologação operacional remota ou promoção da aplicação.
CI aa9f168 já aprovou clean/upgrade/Auth e consumidores do candidato D-A.

Consulta final: 113 migrations, zero transações longas, locks aguardando ou
índices inválidos. Dry-run oficial via perfil fixado lista exatamente as oito
migrations, seeds=[] e roles=[]. Aplicação autorizada pode prosseguir com
--linked --skip-vault, sem incluir seeds/roles/configuração do Auth.

### Aplicação e resultado observados

Executado o fluxo oficial com perfil fixado: `db push --linked --skip-vault --yes`.
Resultado: **121 migrations**, oito aplicadas uma vez, nenhuma versão desconhecida,
seed, reset ou atualização de Vault. [Registro sanitizado](INITIAL_REMOTE_MIGRATIONS.json)
contém os hashes dos oito arquivos e os resultados agregados, sem dados privados.
Histórico posterior: 121/121 SQLs conferidos contra os arquivos atuais.

Comparação posterior do catálogo remoto vivo: dez seções coincidem integralmente
com o candidato local; constraints coincidem sob a única qualificação prevista
presentation_finite_factor. A view remota original coincide integralmente; o alias
de reparse era específico do ensaio de recuperação. Preservação de todas as tabelas
anteriores comparada por digest, removendo somente as novas colunas com defaults
compatíveis da projeção: zero mudança inesperada. Continuam 8 usuários Auth,
6 perfis, 12 documentos, 145 eventos, 8 movimentos e 29 objetos.

Jobs remotos preservam seus estados ativos originais. Mudanças observadas fora
do histórico de migrations: somente cursor BAL e heartbeat. Advisor não ganhou
RPC anônima: continuam três entradas anônimas preexistentes. Dez RPCs novas são
authenticated, com leitura/sessão/contexto e capacidades próprias no corpo;
não concedem DML nas tabelas privadas. INFO de RLS sem policy aumenta em um
controle interno cujo acesso direto permanece revogado. Unaccent público e
proteção de senha vazada continuam avisos anteriores, sem configuração remota
alterada por consequência. Esses avisos não são aprovação geral de segurança.

## Aplicação final — D-B

**LOTE ANTECIPADO D5.1 APLICADO E PÓS-VALIDADO.** O responsável antecipou a
reconciliação para este fechamento em [complemento expresso](OWNER_AMENDMENTS.md).
Local143/remoto143;22 pendências D-B aplicadas uma vez. Não há migration
pendente nessa observação. Novos incrementos da missão exigem nova reconciliação.
Migrations aplicadas não substituem prova dos consumidores reais nem concluem D-B.

Novo preflight confrontou121 SQLs com os arquivos e o catálogo remoto com o
registro anterior: sem versão desconhecida ou drift estrutural. Vercel production
continua8ec979a;97 identidades de funções públicas referenciadas pelos fontes
publicados foram preservadas, sem perda de grants desses consumidores.
As evoluções mantêm assinaturas anteriores e acrescentam rascunhos, referências
e emissões opt-in. Nenhum documento, evento ou exemplar antigo foi reescrito.

Backup88477945-31c5-4239-a029-693aa520d5a7 tem78 arquivos e9.289.109 bytes,
AES-256-GCM, autenticação por objeto e manifesto cifrado com SHA-256
866f74c00d81d53c45cd3b28245b742b01ef44ca3dfa245b58cebe999f226eff.
Captura e custódia ficam fora do Git, com ACL do operador e chave separada.
Restauração real isolada conferiu129 tabelas/digests estáveis, FKs,32 objetos e
31 PDFs legados. Zero emissões assinadas ready existiam nessa fonte. Aplicou as
22 migrations na cópia, sem cron/pg_net ou importação de roles. O banco temporário
foi removido.8,639s é tempo do probe, sem atribuição de RTO operacional.

Catálogo da cópia coincide sob duas qualificações já discriminadas no preflight
anterior: alias AS text acrescentado pelo reparse da view e flag NOT VALID da
fixture NaN local. A view remota viva coincide exatamente com o candidato; a regra
presentation_finite_factor tem predicado idêntico e está validada no remoto.
Não se enfraqueceu constraint nem se alterou a fixture para obter equivalência.

Consulta imediatamente anterior confirmou os129 conjuntos estáveis ainda iguais
ao backup, exceto cursor/heartbeat com contagem preservada. Sem locks aguardando,
transações longas ou índices inválidos. Dry-run oficial listou exatamente22
pendências, seeds=[] e roles=[]. Fluxo oficial db push --linked --skip-vault --yes
aplicou somente essas pendências. Não houve reset, fixtures, configuração Auth,
ativação de transporte ou atualização de Vault.

Pós-validação conferiu143/143 SQLs e dez seções integrais do catálogo vivo; somente
a qualificação da constraint local permanece. Projeções originais das129 tabelas
coincidem, excluindo apenas colunas novas e novas linhas do histórico de migrations.
Persistem9 usuários Auth,7 perfis e32 objetos. Cron e Vault têm digests preservados;
somente cursor BAL/heartbeat variaram. Marcador público retornou200 pelo REST
anônimo real: invoker, stable, sem EXECUTE service_role e sem grants diretos às
tabelas privadas. Advisor mantém três definer anônimos anteriores; os quatro
novos controles privados têm RLS e acesso direto revogado. Avisos históricos
de unaccent/senha vazada continuam sem alteração de configuração.

[Preflight e hashes](D5_REMOTE_PREFLIGHT.json),
[pós-validação](D5_REMOTE_MIGRATIONS.json) e [advisors](D5_REMOTE_ADVISORS.json)
separam execução, qualificações e limites. CI dos fontes atuais e teste do preview
são gates distintos. As seções abaixo preservam os estados históricos de cada lote.

### Incremento local D3.2

Local125 / remoto121. Quatro arquivos novos, ainda sem aplicação remota:

- 20261107013356_phase_d3_governance_recovery.sql: leitura autorizada e limitada,
  comparação e versão original da intenção.
- 20261107015914_phase_d3_governance_compatibility.sql: nomes do catálogo,
  herança e preservação da alteração deliberada do próprio vínculo.
- 20261107020304_phase_d3_governance_own_transition.sql: contexto da sessão
  permanece verificável quando a própria ação legítima revoga o vínculo;
  sessão/assurance/ator/linha resultante continuam necessários.
- 20261107021123_phase_d3_open_governance_requests.sql: consulta inicial inclui
  aprovação pendente e convite aguardando aceite, antes da paginação.

Todos criados pelo CLI e aplicados com test:db:prepare no projeto local existente,
sem reset. As revisões anteriores e suas contraprovas foram preservadas. RPCs
novas só têm EXECUTE authenticated; auxiliares e nomes antigos permanecem
revogados. Não se abriu DML/RLS para corrigir leitura. Provas dirigidas Auth,
HTTP e browser constam no checkpoint; clean/upgrade e integração global do SHA
publicado devem ser verificados na CI programada antes do preflight remoto final.

### Incremento local D3.3

Local126/remoto121. 20261107022731_phase_d3_complete_scoped_history.sql acrescenta
leitura paginada de auditoria com audit.read, índice do paciente/ordem e validação
explícita de NULL/limites na RPC documental existente. Nome antigo revogado;
nenhuma abertura de RLS/DML. test:db:prepare, três casos Auth e seis casos browser
dirigidos passaram, com contraprova anterior preservada. Instalação/evolução e
demais suítes programadas continuam gates da CI do SHA publicado. A migration
integra a aplicação remota final D-B; não foi aplicada isoladamente ao remoto.

### Compatibilidade local D3.4a

Local127/remoto121. 20261107031505_phase_d3_governance_read_compatibility.sql
restaura data.definitions e preserva as definições efetivas no topo da resposta.
Mesma autorização e EXECUTE authenticated; auxiliares continuam fechados.
test:db:prepare sem reset e seis casos Auth dirigidos passaram, incluindo duas
falhas da CI bd8747b. Instalação/evolução e suíte completa devem ser confirmadas
pela CI do SHA publicado. A aplicação remota permanece reservada ao lote final.

### Lote local D3.5 em execução

Local130/remoto121. 20261107035508_phase_d3_residence_preparation_and_guides.sql
acrescenta preparação privada, journal/CAS, criação global e guias próprios,
sem ato clínico por progresso. 20261107040539_phase_d3_preparation_read_models.sql
acrescenta páginas estáveis, resumo limitado a metadados e validação de
responsáveis ativos. Aplicadas por test:db:prepare sem reset. Sete casos Auth
distintos passaram entre rodadas; interface/HTTP/CI ainda não concluídos.
Helpers/tabelas privados continuam fechados; RPCs somente authenticated com
autorização revogável. Nenhuma delas foi aplicada ao remoto.

20261107044658_phase_d3_guide_context_intent.sql vincula progresso ao escopo
consultado e verifica-o antes e depois do comando. A entrada antiga tornou-se
helper privado sem EXECUTE público, authenticated, anon ou service_role.
O recheck final Auth passou7/7, incluindo recusa de intenção antiga após troca
de paciente e preservação do progresso de destino. Total pendente D-B: nove
migrations; a reconciliação remota final ainda não foi iniciada.

### Lote local D3.6 em execução

Local131/remoto121. 20261107055526_phase_d3_supply_private_drafts.sql acrescenta
propósito aos slots privados, COM/ENT, conferência contextual pessoal e revisão/
submit atômicos. Entradas REQ/BAL preservadas. Aplicação por test:db:prepare na
stack existente, sem reset. Oito casos Auth passaram entre rodadas, inclusive
falha provocada na segunda etapa para COM/ENT/BAL e replay sem efeitos duplicados.
UI/HTTP/CI do candidato ainda pendentes. Dez migrations D-B aguardam o lote
remoto final; nenhuma destas mudanças foi aplicada ao remoto.

### Lote local D3.7

Local133/remoto121;12 migrations D-B pendentes do lote remoto final autorizado.
20261107070558_phase_d3_legacy_revision_recovery.sql acrescenta consulta
autorizada do comprovante mínimo da primeira etapa legada. Somente authenticated;
nenhuma escrita de revisão/submissão é usada para consultar esse comprovante.
20261107072253_phase_d3_legacy_submission_version.sql mantém a versão da intenção
original ao submeter, sem adotar edição posterior por replay. Preserva os grants
da RPC existente. Ambas aplicadas por test:db:prepare na stack local, sem reset.
Auth final17/17, incluindo grants, CAS, falha atômica nova, primeira etapa antiga,
segunda etapa antiga concluída e recusa de submissão de edição posterior.
Nenhuma migration histórica alterada; remoto sem alteração neste incremento.

### Lote local D3.9

Local136/remoto121;15 migrations D-B aguardam reconciliação remota final.
20261107082257_phase_d3_notice_reference_resolution.sql acrescenta leitura
autorizada do alvo individual e vínculo composto de relato com lembrete do
mesmo paciente. Resposta pessoal e relato vinculado são RPCs transacionais,
com replay próprio, revalidação de contexto e helpers privados fechados.
20261107084512_phase_d3_notice_reference_consistency.sql usa um único snapshot
para contagem/prévia, impede ausência contraditória e vincula comprovante à chave.
20261107090824_phase_d3_notice_reference_timezones.sql conserva o fuso do evento
e da atribuição para apresentação correta da janela do recurso.

As três foram aplicadas por test:db:prepare na stack local existente, sem reset.
Auth9/9 passou após a última aplicação, com negativas, espera observada,
rollback de relato/resposta/auditoria e replay após perda de escrita. Nenhuma
migration aplicada foi reescrita; as84 históricas continuam preservadas.
Nenhuma dessas migrations foi aplicada ao remoto nesta etapa.

### Lote local D4.2

Local137/remoto121;16 migrations D-B pendentes do lote remoto final.
20261107104648_phase_d4_pdf_issuance_lifecycle.sql acrescenta identidade de
emissão em tabela privada, intenção pessoal idempotente, snapshot canônico
congelado, claim de serviço com lease/token e finalização Auth. Caminho e
intenção são imutáveis; registro ready não pode ser alterado ou excluído.
Grants diretos e helpers privados continuam fechados. Leitura/histórico exigem
capacidade atual; consulta pública expõe somente metadados mínimos de ready.

DDL foi pré-validado em transação revertida e aplicado por test:db:prepare,
na stack existente, sem reset. Auth6/6 passou: contexto trocado durante espera
real, revogação de leitura, chave sem prova do worker, lease antigo, NULL/recibo
incompleto, ausência de Storage e101 registros com cursor estável. O teste
negativo de finalização não é prova criptográfica; o pipeline usa PDF real.
A migration aplicada permanece sem reescrita. Nenhuma mudança remota neste lote.

### Lote local D4.3

Local139/remoto121;18 migrations D-B aguardam o lote remoto final autorizado.
20261107113421 acrescenta orçamento compartilhado de consulta/upload e leitura
mínima de legado por digest, sem dados do paciente. Fachada pública limitada no
HTTP passa a ser a única entrada; RPCs mínimas ficam exclusivas do servidor.
Tabela privada não recebe grants diretos. Contadores não armazenam IP bruto.

20261107115300 recalcula a janela depois do lock de admissão e indexa SHA dos
dois acervos legados. O incremento evita depender do instante anterior à espera,
sem reescrever a migration já aplicada. Ambas tiveram preflight em transação
revertida e aplicação por test:db:prepare, sem reset ou novo ambiente.

Auth de emissão6/6 compatível, orçamento/ACL3/3 após a última aplicação e SQL
service-role passaram. A allowlist exata do teste SQL inclui as quatro novas
funções aprovadas; serviço continua sem finalizar emissão pelo Auth. O orçamento
foi exercitado com concorrência real, limite pessoal/global e expiração, sem
limpar contadores para obter verde. CI do novo SHA deve comprovar instalação
limpa, evolução legada e integração geral. Nenhuma aplicação remota neste lote.

### Lote local D4.4

Local140/remoto121;19 migrations D-B pendentes. A migration20261107123000
acrescenta pdf_archive, RPC somente Auth, com leitura autorizada de originais,
representações legadas e intenções independentes. Não modifica artefatos,
metadados ou snapshots existentes. Grants de anon/serviço permanecem negados.
Preflight revertido e test:db:prepare passaram sem reset. Auth percorreu103
registros mistos, cursor estável, filtros e negativas; a interface e os downloads
foram exercitados nos três projetos. Instalação/evolução/integração completas
permanecem gate da CI do SHA publicado. Nenhuma aplicação remota neste lote.

### Lote local D4.5

Local141/remoto121;20 migrations D-B pendentes. A migration20261107150000
muda o padrão de novas intenções para V6 e congela proveniência factual em
sourceFacts, sem reescrever o evento/hash canônico ou intenções já existentes.
Trigger privado, SECURITY DEFINER com search_path vazio e EXECUTE revogado de
todos os papéis de aplicação. Nenhuma concessão direta de DML foi acrescentada.
Preflight revertido e test:db:prepare passaram, sem reset ou outra stack.
Auth real comprovou imutabilidade, origem conhecida/NULL, rename/revogação e
preservação do evento/efeitos. Banco local tem141 aplicações; crons originais
preservados e instrumentos de falha ausentes. CI do SHA publicado deve validar
instalação limpa, evolução legada e integração completa. Nenhuma aplicação remota
neste incremento. [Contrato e limites](PDF_SOURCE_FACTS.md).

### Fechamento OPS.3 — remoto147

As migrations146/147 foram aplicadas no remoto autorizado após captura crítica
fresca, autenticação e restauração/upgrade isolados. Local147/remoto147, sem
pendências. A compatibilidade preservou387 identidades anteriores e seus grants;
somente public.run_operational_schedule recebeu retorno aditivo e coletor em
subtransação. As tabelas novas são privadas, sem grants diretos, e não concedem
escopo clínico ao suporte. 147 corrige a recusa CAS para PT409 sem reescrever146.

O pós-check confrontou os143 conjuntos anteriores, incluindo as145 linhas
anteriores de histórico, e reconciliou separadamente todos os147 SQLs aplicados.
Somente os clocks/cursors nomeados tiveram projeção qualificada. Auth9/profiles7,
Storage33, cron e Vault preservados; locks, transações longas e índices inválidos
zero. Catálogo vivo equivalente, salvo a qualificação conhecida do flag de
validação NaN local, com predicado igual. Runtime anônimo200/protocolo1/schema1.
Sem reset, fixture/Auth remoto, promoção ou ativação de fornecedor externo.

[Preflight](OPS_3_REMOTE_PREFLIGHT.json), [pós-check](OPS_3_REMOTE_MIGRATIONS.json),
[advisors](OPS_3_REMOTE_ADVISORS.json) e [evidência](OPS_3_EVIDENCE.json).
CI do SHA publicado, os critérios restantes e gates D-C/D6 permanecem próprios.

### Fechamento do acompanhamento inicial — remoto148

20261108002700 foi aplicada após cópia fresca autenticada, restauração e upgrade
isolados, compatibilidade e preflight. Local148/remoto148 sem pendências.
Acrescenta somente a política0–10 do documento autorizado, sem payload de
configuração local nem caminho anon/serviço. Os398 contratos anteriores,
corpos e grants permanecem iguais. A API mantém data e acrescenta waitSeconds.

Histórico148/148,149 conjuntos anteriores, Auth9/profiles7, Storage33, cron e
Vault preservados. Locks/transações longas/índices inválidos zero; runtime
anônimo200/protocolo1/schema1. Catálogo vivo equivalente, salvo a qualificação
NaN local conhecida com predicado idêntico. Sem reset, fixture/Auth remoto,
fornecedor externo ou promoção. [Preflight](NOTICE_TRACKING_REMOTE_PREFLIGHT.json),
[pós-check](NOTICE_TRACKING_REMOTE_MIGRATIONS.json),
[advisors](NOTICE_TRACKING_REMOTE_ADVISORS.json) e
[provas locais](NOTICE_TRACKING_EVIDENCE.json). CI do novo SHA continua gate.

### Fechamento dos anexos — remoto150

149/150 foram aplicadas após cópia crítica fresca, restauração/upgrade
isolados, preflight e compatibilidade. Local150/remoto150, histórico integral
150/150 reconciliado, sem pendências; não houve reset, seed, mudança de Auth,
Vault, cron ou ativação de transporte externo.

Os399 contratos anteriores e grants foram preservados. reserve exclui abandono
formal da capacidade; finalize recusa terminal divergente e exige atestado para
tentativas rastreadas. A política evidence_upload conserva INSERT autenticado
e passa a bloquear abandono concorrente e upload fora do ciclo autorizado.
As duas tabelas privadas têm RLS sem grants diretos; atestado e recibo são
RPCs exclusivas do serviço. Nova origem não é atribuída retroativamente.

149 projeções de conjuntos anteriores, Auth9/profiles7,33 objetos, cron e Vault
foram confrontados. Catálogo coincide salvo a flag local conhecida da condição
finita, com predicado preservado. Advisors: INFO privado39→41 e funções Auth
149→153, sem novas funções anônimas; alertas anteriores não foram suprimidos.
[Preflight](ATTACHMENTS_REMOTE_PREFLIGHT.json),
[pós-check](ATTACHMENTS_REMOTE_MIGRATIONS.json),
[advisors](ATTACHMENTS_REMOTE_ADVISORS.json) e
[evidência](ATTACHMENTS_EVIDENCE.json). Probe5,392s não comprova D6/RPO/RTO.

### Formulários e remoção explícita — remoto151

151 foi aplicada pelo CLI vinculado, sem roles/seeds/Vault, após testes Auth e
consumidores, backup válido restaurado, upgrade isolado e pré-validação. Não
cria tabelas, políticas ou grants. Três corpos existentes passam a distinguir
omissão e JSON null para nome curto; assinatura, autoridade, CAS, replay e
propostas anteriores permanecem preservados.

Atividade após o backup foi documentada separadamente e não confundida com
perda causada pela migration. A pré-validação exigiu schema, histórico e
Storage exatos à cópia, sem linhas removidas e cópia verificada com menos de
uma hora. A pós-validação compara o snapshot imediatamente anterior ao DDL.
Histórico151/151,407 identidades/grants,151 projeções, Auth9/profiles7,33 objetos,
cron/Vault e marcador HTTP200/protocolo1/schema1 foram conferidos. Catálogo
coincide salvo a flag local conhecida; advisors sem aumento. Nenhum reset,
fixture/Auth remoto, transporte externo ou promoção.
[Preflight](FIELD_VALIDATION_REMOTE_PREFLIGHT.json),
[pós-check](FIELD_VALIDATION_REMOTE_MIGRATIONS.json),
[advisors](FIELD_VALIDATION_REMOTE_ADVISORS.json) e
[provas e qualificações](FIELD_VALIDATION_EVIDENCE.json).

### Fidelidade técnica do PDF V7 — remoto152

20261108093000 foi aplicada pelo CLI vinculado após backup crítico0648d0ac
verificado/restaurado, upgrade isolado e pré-validação. Local152/remoto152,
SQL152/152 reconciliados e zero pendências. O SQL aplicado é imutável, SHA-256
LF8b82e78b27041af7d89f5358c11b23f9c227ad0713a6ca214ff4651da6744e2f.

Preserva407 identidades/grants, amplia somente o guard privado de origem e
acrescenta trigger suplementar/RPC Auth versionada. Default e reserva antigos
continuam V6; mesma intenção reusa sua revisão original e ready conserva seus
bytes. Eventos, hash canônico e estoque não são reescritos. Não há tabelas novas
ou mudança de políticas Storage; helpers privados não recebem EXECUTE público.

A primeira pós-validação recusou mudança em duas tabelas de monitoramento.
Reconstrução read-only comprovou escalonamento do heartbeat de Preview anterior
à transação DDL:21 linhas antigas exatas, um evento acrescentado e somente
severity/version de um incidente. As149 outras projeções estáveis coincidem;
não há afirmação de igualdade integral das151 tabelas. Recuperação posterior
foi separada, sem relaxar o comparador de backup ou silenciar o monitoramento.

Auth9/profiles7, Storage33, cron/Vault, grants e catálogo foram conferidos;
locks/transações longas/índices inválidos zero. Runtime200/protocolo1/schema1,
RPC anônima401/42501. Advisors Auth153→154 corresponde somente à RPC nova;
demais contagens de segurança/desempenho permanecem. Sem reset, seed, fixture/
Auth remoto, fornecedor externo ou promoção. Restore/upgrade3,67s não homologa
RPO/RTO/D6. [Preflight](PDF_FIDELITY_REMOTE_PREFLIGHT.json),
[pós-check](PDF_FIDELITY_REMOTE_MIGRATIONS.json),
[atividade qualificada](PDF_FIDELITY_REMOTE_ACTIVITY.json),
[advisors](PDF_FIDELITY_REMOTE_ADVISORS.json) e
[provas](PDF_FIDELITY_EVIDENCE.json).

## D3.33 — preenchimentos operacionais COM — 09/11/2026

Aplicada20261109122657:166/166 versões local/remoto, última20261109122657.
Propósitos de aprovação, aquisição e chegada estendem o kernel privado, sem
reescrever rascunhos, documentos ou migrations históricas. Pré-validação de
compatibilidade e dos quatro corpos anteriores; dry-run de uma migration,
seeds=[]/roles=[]; perfil/destino fixados e aplicação oficial sem reset,
fixtures, Auth/Vault, integração externa ou backup redundante, conforme a
instrução vigente para o banco remoto descartável de testes.

Pós-check: digest ordenado
`bdf830814fa964f87f4ab4b2954a615dcabb0466703cdc8a4b006ff0ca69a720`,
quatro corpos candidatos e ACL conferidos. Achados de segurança idênticos após
excluir apenas horários observed_at; avisos anteriores permanecem.23 cenários
Auth distintos,19 unitários/API e10 browsers distintos aprovados. Instalação
limpa/evolução legada/integral do novo SHA continuam na CI própria; o sucesso
da CI d52490d não aprova o candidato novo. Sem liberação operacional.
[Contrato e limites](COM_ACTION_DRAFTS.md), [prova remota](COM_ACTION_DRAFTS_REMOTE.json).

## D3.34 — decisões COM — 09/11/2026

Aplicadas20261109125807 e20261109130033:168/168 local/remoto, última20261109130033.
Propósitos privados COM, parcela exata e confirmação vinculada à revisão salva.
Arquivos aplicados não foram reescritos. Preflight de compatibilidade e quatro
corpos anteriores; dry-run só das duas pendências, seeds=[]/roles=[].
Perfil/destino fixados, sem reset, fixtures, Auth/Vault ou backup redundante.

Pós-check: digest ordenado
`46f05b07cfa468ea52fd334f497faa0a0af9643f00e0b172f25512b26dc2a627`,
quatro corpos e ACL iguais ao candidato. Achados de segurança iguais excluindo
somente observed_at, com avisos anteriores mantidos.23 unitários,30 Auth e20
browsers distintos PASS. CI do novo SHA ainda precisa validar instalação
limpa/evolução legada/integral. Sem promoção operacional.
[Contrato](COM_DECISION_DRAFTS.md), [remoto](COM_DECISION_DRAFTS_REMOTE.json).

## D3.35 — decisões ENT — 09/11/2026

Aplicada20261109135205:169/169 local/remoto, última20261109135205. Cinco novos
propósitos privados ENT e descarte próprio com leitura, preservando escrita,
CAS, confirmação, recuperação e negativa a terceiros. Não altera84 SQLs
históricos nem reescreve as migrations aplicadas dos lotes anteriores.
Preflight de compatibilidade, quatro corpos anteriores, locks/transações e
dry-run apenas da candidata, seeds=[]/roles=[]. Aplicação oficial no destino
fixado; sem reset, fixtures, Auth/Vault, integração externa ou backup redundante.

Pós-check: digest ordenado
`694f6e8a1796476d6f4b342f30e6984ffc95b1e3b6b2e26b326e0061a924f0bc`,
quatro corpos/configurações e ACL iguais entre local/remoto. Achados de segurança
iguais excluindo somente observed_at; avisos anteriores mantidos.28 unitários,
42 Auth distintos e20 browsers distintos PASS. CI56b445e aprovou instalação
limpa/evolução/integral; browsers com regressões próprias ainda em correção.
Isso não aprova a CI do novo SHA ou liberação operacional.
[Contrato](ENT_OPERATION_DRAFTS.md), [remoto](ENT_OPERATION_DRAFTS_REMOTE.json).

## D3.43 — decisões documentais BAL

Migration20261109222649 incrementa175→176 no projeto remoto autorizado.
Dry-run isolou somente o candidato final;aplicação única e dry-run final vazio.
Sete corpos normalizados LF,grants,search_path,SECURITY DEFINER,constraint e
digest176 coincidem com local. Helpers e tabela privada continuam fechados a
anon/Auth;somente commit_supply_draft público mantém execução Auth existente.
Advisors preservam cinco classes e mesmas identidades,168 RPCs Auth sinalizados.
Constraint histórica presentation_finite_factor permanece não validada no
legado local e validada no remoto;nenhuma constraint remota inválida. Não há
reset,fixtures/Auth remotos ou repetição de backup pesado no banco descartável.
Correção de trim da autoria local176 e normalização LF antecedem aplicação
remota;statements locais intermediários não foram reescritos ou reexecutados.
[Conferência](BAL_DOCUMENT_DRAFTS_REMOTE.json).

## D3.44 — programação e plantões BAL

20261110001316 foi aplicada uma vez no remoto autorizado,176→177,antes do
commit. Duas tabelas privadas RLS sem grants diretos e cinco RPCs Auth
suplementam o núcleo existente;os dois comandos nativos e permissões não
mudaram. Corpos LF das dez funções,configurações,grants,tabelas e digest177
coincidem com local. Pré/pós-check sem locks/constraints remotas inválidas;
dry-run final vazio. Advisors preservam todos os achados anteriores e somam
somente duas tabelas fechadas e cinco entrypoints Auth esperados.

Autoria local corrigiu precedência JSON,enriquecimento do alvo,recibo,listagem
e colisão de chave nativa antes dos testes finais. Statements intermediários
locais não foram reexecutados ou reescritos. O remoto recebeu somente a versão
final. Hashes finais normalizam LF explicitamente. Sem reset,fixtures/Auth
remotos ou backup pesado redundante,no banco sintético conforme complemento
do responsável. Instalação limpa/evolução legada/integral continuam na CI do
próprio SHA. [Conferência](BAL_WORKSPACE_DRAFTS_REMOTE.json).

## D3.46 — preparação privada do estoque familiar

Quatro migrations178–181 aplicadas uma vez no remoto autorizado,177→181,antes
do commit. Pré-check confirmou projeto,177versões e compatibilidade dos cinco
helpers/comando legados. Dry-run listou exatamente os quatro arquivos esperados;
aplicação não recebeu seeds,roles ou Vault. Pós-check:181versões/digest,nove
funções/corpos LF/configuração/ACL,duas tabelas RLS fechadas e cinco dependências
iguais ao local;dry-run vazio e probes0. Não houve reset,fixtures/Auth remoto ou
backup pesado redundante no banco sintético,conforme complemento do responsável.

178 teve CASE corrigido antes da primeira aplicação local bem-sucedida.179,
180 e181 preservam autoria incremental e corrigem resumo,independência entre
leitura/gestão e fonte autoritativa do saldo. Nenhuma migration aplicada foi
reescrita. Arquivo178 foi nomeado manualmente;as três posteriores foram geradas
pelo CLI migration new. Hashes normalizam LF explicitamente.

Advisors mantêm cinco classes de segurança e três de performance. As novas
tabelas fechadas,quatro RPCs Auth e dois índices aparecem nos grupos esperados;
isso não sana os achados anteriores. Constraints de produto remotas válidas;
legado local presentation_finite_factor continua não validado. A constraint
preexistente do provedor realtime.messages não é alterada. Instalação limpa,
evolução legada e integração completa são gates da CI própria do novo SHA.
[Conferência](FAMILY_STOCK_DRAFTS_REMOTE.json).

## D3.47 — preenchimentos privados de consumo

Seis migrations182–187 aplicadas uma vez no remoto autorizado,181→187,antes
do commit. Preflight confirmou projeto saudável,versões/digest e16 motores/
dependências legados iguais ao local. Dry-run indicou somente os seis arquivos,
sem seeds/roles/Vault;aplicação sem reset,fixtures ou Auth remoto. Pós-check:
187 versões/digest,oito definições/configurações/grants,duas tabelas RLS fechadas
e16 dependências iguais ao local;dry-run vazio,probes0. Sem backup pesado
redundante de banco sintético,conforme complemento do responsável.

182 implementa cinco propósitos privados;183 corrige alias42702;184 separa
leitura própria inativa;185 inclui materiais do relato no lock de catálogo;
186 alinha trim Unicode;187 mantém leitura operacional ativa na referência
atual. Novos atos continuam sob guardas nativos. Nenhum motor legado mudou.
53 unitários/API,20 Auth e22 browsers distintos qualificados;CI própria ainda
precisa instalação limpa/evolução legada/integral. Rodadas e reutilização
proporcionais estão no artefato de validação.

Advisors conservam cinco classes de segurança/três de performance:duas novas
tabelas fechadas,quatro RPCs Auth e dois índices sem uso nos grupos esperados.
Demais avisos permanecem,sem aprovação global. Constraint local legada
presentation_finite_factor não validada preservada;produto remoto sem inválida.
Constraint realtime.messages do provedor previamente observada não foi alterada.
[Conferência](CONSUMPTION_DRAFTS_REMOTE.json).

## D3.48 — revisão Flow privada

Migrations188/189 geradas pelo CLI e aplicadas uma vez no remoto autorizado,
187→189,antes do commit. Preflight confirmou projeto saudável,versões/digest
e18 dependências legadas;dry-run listou exatamente dois arquivos,sem seeds,
roles ou Vault. Pós-check:nove funções/corpos/configurações/ACL,duas tabelas RLS
fechadas,189versões/digest e18 dependências iguais ao local;dry-run vazio,
probes0 e produto remoto sem constraint inválida. Sem reset,fixtures/Auth ou
backup pesado redundante no banco sintético. Histórico84 preservado.

188 introduz estado privado,CAS,cursor por sugestão e consumo nativo atômico.
189 congela chave privada no recibo,mascara catálogo sem leitura da equipe e
mantém recusa independente de colisão anterior de chave nativa. Nenhum dos18
motores/dependências legados mudou. Auth8/8 e regressões dirigidas qualificadas;
instalação limpa,legada e integração completa aguardam CI própria do novo SHA.

Advisors mantêm cinco classes de segurança e três de performance. Contagens
mudam50→52 tabelas RLS fechadas,181→186 RPCs Auth e38→40 índices sem uso;
demais contagens preservadas. Isso não aprova achados anteriores. Legado local
presentation_finite_factor e qualificação preexistente realtime.messages do
provedor permanecem. [Conferência](FLOW_REVIEW_DRAFTS_REMOTE.json).

## D3.49 — consulta da própria confirmação da agenda

Migration190 gerada pelo CLI e aplicada uma vez no remoto autorizado,189→190,
antes do commit. Preflight:projeto saudável,histórico189/digest e quatro
dependências iguais ao local;dry-run somente190,sem seeds/roles/Vault.
Pós-check:190versões/digest,cinco definições/configurações/ACL iguais ao local,
probes0,dry-run vazio. Novas tabelas0;RPC nova somente leitura,execute apenas
Auth,search_path vazio,consulta por ator autenticado/paciente/chave.

Motores schedule_command/workspace,can_access_recipient e guarda privada não
mudaram. Leitura própria não cria ato nem libera escrita com paciente inativo.
Sem reset,fixtures/Auth ou backup pesado redundante no banco sintético. Advisors
globais não repetidos para esta adição de leitura;achados prévios permanecem.
Instalação limpa/legada e integração integral exigem CI própria do novo SHA.
[Reconciliação](FORM_CONTINUITY_VALIDATION.json).

## D3.50 — preparação privada de Andamentos

Migrations191/192 geradas pelo CLI e aplicadas uma vez no remoto autorizado,
190→192,antes do commit. Preflight:projeto saudável,histórico190/digest igual ao
prefixo local,seis dependências nativas idênticas e dois novos recursos ausentes;
dry-run apenas191/192,sem seeds/roles/Vault. Pós-check:192versões/digest,
13definições/configurações/ACL,duas tabelas e sete índices iguais ao local,
probes0,dry-run vazio. Sete funções novas e seis nativas inalteradas.

Duas tabelas RLS/sem políticas ou grants diretos,quatro RPCs Auth e três
helpers privados. Advisors mantêm cinco classes de segurança e três de
performance:54 tabelas fechadas,191RPCs Auth e44índices sem uso. Novos achados
correspondem às duas tabelas fechadas,quatro RPCs intencionais e quatro índices
FK ainda sem uso;nenhum novo FK sem índice. Achados anteriores não aprovados.
Sem reset,fixtures/Auth remoto ou backup pesado redundante no banco sintético.
Instalação limpa/legada e integração integral exigem CI própria do novo SHA.
[Reconciliação](PROGRESS_NOTE_DRAFTS_VALIDATION.json).

## D3.51 — novos tipos e programações privados

Migrations193–195 aplicadas uma vez no remoto autorizado,192→195,antes do
commit. Projeto saudável,histórico192/digest e cinco dependências iguais ao
local. Única mudança nativa:schedule_command passa a respeitar active=false
na criação do tipo,por marcador único;hash esperado conferido antes da escrita.
Dry-run somente193/194/195,sem seeds/roles/Vault. Compatibilidade anterior
conserva default true e contratos das alterações/decisões existentes.

Pós-check:195versões/digest,14definições/config/ACL,duas tabelas e sete índices
iguais ao local,probes0,dry-run vazio. Oito funções novas:quatro helpers e
quatro RPCs Auth. Duas tabelas RLS fechadas sem políticas/grants diretos.
Advisors mantêm cinco classes de segurança/três performance;56 tabelas
fechadas,195RPCs Auth,48índices sem uso. As adições correspondem ao novo
recurso;nenhum novo FK sem índice,achados anteriores não aprovados.
Sem reset,fixtures/Auth remoto ou backup pesado redundante no banco sintético.
Instalação limpa/legada e integração integral exigem CI própria do novo SHA.
[Reconciliação](SCHEDULE_CREATION_DRAFTS_VALIDATION.json).

## D3.52 — leitura eficiente do contexto

Migration196 aplicada uma vez no remoto autorizado,195→196,antes do commit.
Preflight:projeto saudável,prefixo195/digest,nove dependências/config/grants
idênticos ao local e my_workspace com assinatura/config/ACL preservadas.
Preflight reconfirmado antes da escrita;dry-run somente196,sem seeds/roles/Vault.
Compatibilidade:resposta completa e ordenação iguais ao contrato anterior,
capacidades ainda nativas e autoridade interna transacional preservada.

Pós-check:196versões/digest,dez definições/config/grants iguais ao local,probes0,
0worker probes e dry-run vazio. Mudou somente o corpo de my_workspace;nenhuma
tabela,index,assinatura,ACL ou timeout novo. Advisors globais não repetidos por
essa razão;achados anteriores permanecem sem aprovação. Sem reset,fixtures/Auth
remoto ou backup pesado redundante. Instalação limpa/legado/integração integral
continuam gates da CI própria. [Reconciliação](WORKSPACE_CONTEXT_PERFORMANCE_VALIDATION.json).

## D3.54 — preparações de recursos existentes da agenda

Migration197 aplicada uma vez antes do commit:196→197. Projeto saudável,
digest196/dez dependências iguais,dry-run exclusivo197,sem seeds/roles/Vault.
Somente objetos novos;nenhuma função ou migration nativa anterior alterada.
Pós-check197/digest,24 definições/config/grants,duas tabelas/RLS/FKs e11 índices
iguais ao local. Cinco negativas remotas com rollback,zero probes e dry-run
vazio. Índice autor/cursor cobre histórico e FK;nenhuma FK nova sem índice.

Advisors:cinco classes de segurança/três performance mantidas;58 tabelas
fechadas,202 RPCs Auth,124 FKs anteriores sem índice e55 índices sem uso.
As adições previstas não aprovam achados anteriores. Sem reset,fixtures/Auth
remoto ou backup pesado redundante. Clean/legado/integração integral exigem CI
própria. [Reconciliação](SCHEDULE_RESOURCE_DRAFTS_VALIDATION.json).
