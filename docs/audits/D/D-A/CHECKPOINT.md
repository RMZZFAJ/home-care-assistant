# D-A — implementação D0, D1 e D2

Missão vigente de 05/11/2026, America/Sao_Paulo. **EM EXECUÇÃO**.
Produção permanece **NO-GO**. Não há autorização de merge, D-B/D-C,
migration remota, envio externo ou liberação operacional definitiva.

## Entrada verificada

- Repositório: RMZZFAJ/home-care-assistant.
- Base: `8ec979a`, master local e origin/master reconciliadas após fetch;
  PR 6 integrado. Árvore inicial limpa.
- Branch única: `feat/phase-d-implementation`.
- Stack: home-care-assistant, workdir e labels Docker conferidos;
  API 127.0.0.1:54321 e banco 127.0.0.1:54322.
- Dados locais iniciais: 210 documentos, 81 REQ e 81 identidades Auth.
  Backup custom externo com manifesto/hash e TOC legível preservado;
  não representa ensaio de restore. Replay autorizado explicitamente pelo
  responsável nesta missão, após apresentação do backup verificado.
- Node 24.22.0 selecionado por processo; npm 11.21.1; CLI 2.121.0.

## Execução e evidências

O [registro de aceitação](ACCEPTANCE_EXECUTION.csv) deriva dos casos C9
atribuídos a D0–D2. Origem C preservada; status só avança mediante evidência
do comportamento, ator, versão e efeitos. Nenhum caso foi aprovado na abertura.

1. D0: readiness, NULL, axe incomplete, proteção de ferramentas/exportação
   e contrato do oráculo PDF.
2. D1: progresso REQ, aprovação de escala, precisão, conflitos e autorização.
3. D2: processos REQ/COM/ENT/BAL, ciência P02, estoque/custódia, catálogo,
   consumo e escalas com as interfaces C8 correspondentes.

Checks locais, CI, preview, aceite humano e aparelho/provedor real são
evidências distintas. P03/P09/P13 permanecem pesquisa externa do responsável;
outros gates condicionam apenas o ramo explicitamente dependente.

Draft PR [7](https://github.com/RMZZFAJ/home-care-assistant/pull/7), aberto e
em rascunho; sem merge. Commit inicial: `626a89a`.

## D0 — primeiro incremento

Readiness de navegação aguarda variante real; Data API exige schema válido.
Exportação usa lista única de exclusões testada com sentinelas privadas.
Relatórios exigem destino explícito, identificam SHA/data e recusam
sobrescrita por padrão. Verificador legado exige consentimento/backup antes
de seed; ferramenta Meta combinada permanece desabilitada até D7.
Asserções de saldo positivo rejeitam linha ausente/NULL. Axe conserva
violations como falha e publica incomplete por regra/superfície/estado para
revisão. Contrato de fatos/geometria PDF distingue controle íntegro de branco;
integração ao renderer permanece em D4.

Validação local deste incremento: contratos (84 migrations preservadas),
lint, tipos, 112 testes unitários e build aprovados. Controles dirigidos:
14 unitários, 15 cenários sintéticos de navegação nos três projetos e SQL
transacional NULL/ausência/valor incorreto/zero explícito aprovados.
Não são prova do fluxo completo do produto, conformidade geral de
acessibilidade, conteúdo do renderer ou aceite humano/físico.
E2E do produto e gates completos de banco serão executados nos marcos
funcionais seguintes; CI do incremento ainda não atestada.

## D1.1 — progresso REQ e candidato inválido

Migration incremental `20261105070428_phase_d1_requisition_scheduler_progress.sql`:
terminais são excluídos antes dos limites; rotação privada distribui até
100 candidatos entre até 25 pacientes. Falhas individuais revertem somente
o candidato, conservam SQLSTATE/identidade/tentativas em tabela privada e
mantêm a saúde como degradada por contagem de pendências. Retry técnico após
uma hora; mudança da política permite reconsideração imediata. Esse intervalo
é detalhe de recuperação, sem promessa de prazo operacional/SLO.

Regressão nova falhou na base anterior pelo motivo esperado (25 pacientes
terminais bloqueavam alvos) e passou após correção. Cobre também 100
terminais no mesmo paciente, 26 pacientes elegíveis, limites, repetição,
política malformada, reparo, rollback do cursor e ausência de estoque fictício.

Instalação limpa e evolução desde 019 aprovadas, com Auth real, protocolo
inicial REQ-0001 e preservação de protocolos/quantidades/FKs/saldos legados.
16 regressões SQL e compatibilidade de search_path hospedado aprovadas.
85 migrations atuais; os 84 hashes históricos permanecem íntegros.
O primeiro replay parou na readiness porque exigia tabelas que service_role
corretamente não lê; a correção exige a RPC allowlisted do serviço. Retomada
da instalação recém-criada com --resume-clean, sem recriar dados novamente,
e replay legado completo aprovados. Não houve redução de asserções.

Fixtures pausam os dois jobs locais pelo cron.alter_job, inclusive após
reset/upgrade; a situação inicial de ambos era ativa. Permanecem pausados
durante as suítes, com reconciliação ao fechamento. 34 integrações completas
aprovadas, incluindo workers HTTP independentes e escopo/RLS/Auth real.
Contratos, lint, Markdown, tipos e 112 unitários aprovados. CI e E2E do
produto ainda não atestados neste incremento. D1 integral e D2 permanecem
em execução, sem fechamento antecipado pelos dois casos de scheduler.

## D1.2 — decisões de escala verificadas localmente

Implementação posterior a `743549a`. Migrations incrementais
20261105072306 e 20261105074814:
versão própria, snapshots antes/depois, proponente real, motivo separado da
decisão, encerramento obsoleto e nomes capturados nos eventos futuros.
Legado usa somente fatos recuperáveis dos eventos; nomes antigos ausentes
não são preenchidos com o cadastro atual.

Controle anterior reproduziu a publicação indevida de série encerrada. Dois
outros controles reproduziram publicação para desligado e impossibilidade de
cancelar seu plantão futuro. Após correção, seis integrações dirigidas
aprovadas: recusa de série encerrada, versão/duas decisões concorrentes,
obsolescência, desligamento/publicação, cancelamento com ator próprio e suíte
anterior de escalas.

UI apresenta pessoas, horários/fuso/notas, período completo e efeito BAL;
conflito mantém a revisão visível e não aplica versão nova automaticamente.
Semana/mês exibem o mesmo intervalo no celular e computador. Primeira rodada
Chromium: quatro E2E aprovados; captura de 390 px inspecionada. Rodada ampliada:
15 E2E aprovados nos três projetos, incluindo BAL vigente, rodapé de decisão
integralmente visível e regressão de teclado. 24 controles sintéticos de
harness aprovados. O
[registro de foco](FOCUS_ORIGIN_CONTROL.json) preserva a falha inicial, a
pré-condição incorreta do primeiro controle e o resultado final, sem redução
de regra/asserção/timeout ou retry para obter verde.

Instalação limpa, evolução legada, 16 SQL e compatibilidade de search_path
aprovadas para 87 migrations. 40 integrações completas aprovadas; controle
LF/CRLF reprova a mutação sem normalização e aceita ambas as fontes.
Contratos (84 hashes preservados), lint, tipos, 115 unitários e build
aprovados. Gates finais usam Node 24.22.0/npm 11.21.1. Rodadas anteriores
usaram o npm 11.19.1 embutido na instalação do Node, corrigido antes desses
gates; E2E anterior preserva essa distinção de lançador.

Neste PowerShell, npm.cmd preserva o separador -- dos argumentos de replay;
o shim npm.ps1 omitiu flags e o guard recusou a operação sem alterar dados.
O replay completo foi executado corretamente pelo npm.cmd depois disso.

CI conhecida da base publicada `743549a`: run 41986802256, concluída com
success; contexto GitHub Vercel também success. Essa CI não atesta esta nova
árvore. Não há homologação remota, humana ou física nem liberação definitiva.
D1 integral e D2 permanecem em execução.

## D1.3 — precisão, compensação e sessão encerrada

Migration incremental 20261105084122 valida numeric sem typmod antes da
gravação numeric(18,6), com precisão da unidade e limite de quantidade.
Número e texto usam a mesma precisão sem arredondamento; zeros finais não
alteram o valor. Correção exige movimento original do mesmo paciente,
produto e custódia, em direção oposta. Entrada/retirada avulsa não recebe
referência de compensação. Histórico e saldos derivam do ledger preservado.

Perfil e avatar exigem sessão Auth ainda existente, inclusive na RPC direta
e nas policies do bucket privado. A operação global de identidade não exige
contexto de paciente. Revalidação após locks acrescentada aos fluxos REQ,
criação/revisão de documentos, ciência, arquivo e consumo indicados na migration.
Não equivale a invalidar bytes/URLs já entregues, cujo transporte pertence a D4.

Controles negativos reproduziram quantidade arredondada, correção sem origem
e escrita de perfil com sessão encerrada. Após correção: sete integrações
dirigidas aprovadas, incluindo Storage real e barreiras com lock observado
para REQ/estoque: revogar sessão ou trocar contexto enquanto aguardam impede
efeitos. Primeiro controle de imagem usou MIME não permitido e foi corrigido
para JPEG antes de avaliar a hipótese; o oráculo de saldo usa ledger direto,
pois a view com autorização retorna vazio para SQL sem identidade.

47 integrações completas, lint, tipos e 117 unitários aprovados.
88 migrations atuais; replay limpo/legado e E2E desta árvore ainda pendentes.
CI do SHA anterior 50d843e estava em execução na última consulta (41995412154).
D1/D2 seguem em execução; autorização de replay já concedida permanece válida.

## D1.4 — convite, senha e consumidores de perfil

Migrations 20261105084951 e 20261105143259. Token de convite sem conta correta
revela somente estado mínimo; a conta confirmada vê paciente, função, emissor,
e-mail e validade em leitura antes de decidir. Expirado/revogado/recusado/já
aceito têm estados próprios. Aceite não recebe paciente/papel editáveis e
revalida Auth após espera. Reabrir link na mesma rota refaz a prévia; o E2E
inicial encontrou a mensagem anterior preservada e a correção foi retestada.

Retry da aprovação recupera o resultado e oferece reemissão explícita quando
o segredo original já não está na resposta. O administrador local rotaciona
o convite existente; teste HTTP/UI verifica convite único, link antigo
inválido e nenhum vínculo antes do aceite. UUID malformado no ramo global
agora recebe 400 VALIDATION_ERROR, não retryable, com correlação segura.

Cadastro, recuperação e perfil usam o mesmo campo de nova senha: mínimo 12
caracteres, máximo 72 bytes UTF-8, ajuda, colagem/gerenciador permitidos e
mostrar/ocultar. Nenhuma senha real foi modificada. A jornada anterior de
cadastro/recuperação usa somente contas fictícias e e-mail local.

Perfis agora invalidam a própria pessoa e consumidores autorizados; proponente
global sem vínculo recebe sua própria revisão. SQL e Realtime reais verificam
avanço e ausência de dados privados no broadcast, além de terceiro sem relação.
E2E verifica o nome atualizado no shell após edição em outra sessão.

As primeiras rodadas completas terminaram 49/50 e 48/50: prontidão Realtime
ficou sem mensagens em todos os canais. Controles isolados passaram; aguardar
explicitamente o token não resolveu. Logs do provedor local mostraram
UnableToBroadcastChanges: too_many_requests. A migration adicional coalesce
por transação/usuário e emite a revisão final por trigger deferred; update sem
mudança não invalida. Contraprova anterior emitiu três avisos onde se esperava
um; após correção há um, rollback emite zero e a fila privada fica vazia.
Revisão persistida/polling recuperam aviso perdido; não se promete ausência
de limites do provedor em qualquer volume.

Replay limpo e legado, 16 SQL e search_path aprovados para 90 migrations.
51 integrações completas aprovadas após a correção. 117 unitários, contratos,
lint e tipos aprovados. 18 E2E anteriores nos três projetos aprovados; captura
390 px iOS inspecionada. Nova rodada: **36 E2E aprovados**, incluindo
acessibilidade, capacidades de seis perfis, identidade e onboarding nos três
projetos após a coalescência e o ajuste de harness abaixo; sem retries locais.

CI do commit 6e7b627, run 41997444516: banco e validações Windows/Linux
aprovados, três browsers reprovados no mesmo helper de teclado. O main público
do login não possui tabindex; focá-lo não estabelece origem. O helper agora
usa link/landmark focalizável ou primeiro controle existente e exige movimento
real de Tab para outro alvo acessível. 30 controles locais aprovados, incluindo
main não focalizável e trap nessa alternativa; nenhum timeout/regra/retry
reduzido. A CI anterior não atesta esta árvore; novo resultado será consultado
após publicação. D1 e D2 integrais permanecem em execução, sem GO/merge.

## D1.5 — observação REQ e instante preservado

Migration 20261105145537 aplicada somente à stack local: observed (inclui zero
explícito), unknown e unfilled são distintos em coluna, intenção canônica,
API e controles. Valores anteriores/clientes sem classificação mantêm o valor
como legacy_unclassified; nenhuma contagem antiga é declarada observada.
Rascunho antigo conserva 0/7 e pede revisão explícita. Campo apagado vira NULL
com unfilled; escolha desconhecido permanece unknown, nunca zero.

Recuperação de intenção anterior conserva hash/JSON originais. Controle cria
fixture SQL usando a função histórica imutável e sessão Auth realmente emitida;
a recuperação seguinte acontece por HTTP autenticado. Isso não é prova HTTP
da criação antiga. Tentar reinterpretar o zero legado como observed na mesma
chave recebe conflito. Três integrações dirigidas aprovadas.

Wizard/revisão/comprovante/histórico usam os mesmos rótulos; nenhum saldo é
copiado para a observação. Nove E2E nos três projetos aprovados: editar/apagar,
recuperar draft, resposta perdida/idempotência, ausência de efeito no ledger,
revisão 320/390/1440 e regressão de associação de extra ao catálogo. Primeiro
roteiro tentou saltar etapas futuras que a UI bloqueia; foi corrigido para
Avançar/Revisar, sem alterar esse bloqueio.

PDF acrescenta a observação somente quando o snapshot contém o novo campo;
snapshots/arquivos antigos não são regravados. Um exemplar local de duas
páginas foi extraído e renderizado com PDFium: três pares produto/valor
confirmados e ambas as páginas inspecionadas, sem corte/sobreposição.
Artefatos em output/pdf/phase-d, com SHA/data e sourceHead 001158b + árvore
suja explicitados no manifesto. É evidência do fato novo, não certificação
geral do renderer D4 nem assinatura D-B. 120 unitários, lint e tipos aprovados.
As migrations 20261105145537 e 20261105153216 agora conservam também o
horário registrado no dispositivo (client_draft), sem afirmá-lo como prova
física ou relógio verificado. Sem horário do cliente, a nova emissão registra
server_submission. Linhas anteriores continuam sem instante conhecido;
nenhum backfill deduz horário de observação a partir da emissão.

Recuperação de intenção sem modo e de intenção intermediária sem horário
conserva JSON/hash e origem antigos. Extras com mesmo nome/modo diferente
preservam a ordenação do contrato anterior na recuperação; remover só o campo
de horário falha no controle, enquanto a projeção compatível recupera.
Instantes iguais com fusos distintos são equivalentes; alterar o instante
na mesma chave gera conflito. Decimal permitido 1.234567 permanece exato.

Validação final: replay de 92 migrations, instalação limpa/evolução legada,
16 SQL e search_path aprovados; os 84 hashes históricos estão preservados.
55 integrações completas aprovadas; quatro integrações dirigidas repetidas
após o ajuste de compatibilidade, incluindo ordem empatada e precisão exata.
Contratos, lint, Markdown, tipos, 121 unitários e build aprovados.

12 E2E nos três projetos aprovados: quatro linhas 0/7/unknown/unfilled,
rascunho anterior, importação histórica e associação de extra por alias.
O rascunho fictício do dia anterior permaneceu na mesma aba, dentro das
24 horas atuais; não prova persistência em outro aparelho, que pertence a D3.
Revisão em 320/390/768/1440, perda de resposta, mesma chave/documento e ledger
inalterado foram verificados. Captura iOS 320 px inspecionada; AT/aparelho
real e zoom humano permanecem evidências distintas.

A paginação nova inicialmente deixou título separado dos campos e, no ajuste
seguinte, uma página de pouco conteúdo. O bloco permanece unido e a trilha
continua no espaço disponível quando esse bloco transborda. Um E2E Chromium
adicional na versão final do renderer passou. PDF final de duas páginas,
6ef7c134-6597-42da-853b-8d8b443e5fa9, SHA-256
a575e54af0926caf2bc102523c80f795adf00b0a15edffe22f08fc85ecdd0739:
quatro pares produto/valor/modo/horário confrontados com snapshot/banco,
texto dentro dos limites e ambas as páginas renderizadas/inspecionadas.
Manifesto time-verification em output/pdf/phase-d conserva SHA dos fontes
testados; exemplares intermediários preservados. O primeiro oráculo de
exibição comparava 0.0 do JSON com 0 formatado; foi corrigido sem mudar valor.
Isso não certifica o renderer D4 inteiro nem assinatura D-B.

CI de 001158b, run 42049385860, success; refere-se ao incremento anterior.
Nova CI será observada após publicação. D1 integral, P02 e D2 seguem em execução.

## D2.1 — P02, identidade material e causas adicionais

Migrations 20261105160654, 20261105162705, 20261105170825 e
20261105175151 aplicadas somente à stack local. Material REQ emitido passa a
ter identidade SHA-256 protegida; origem distingue emissão, importação e
projeção dos fatos legados. Eventos pessoais anteriores permanecem intactos.
Compatibilidade ALL passa a ANY por evento técnico de sistema, sem inventar
ciência. Versão técnica/arquivo PDF não substitui identidade material.

SCI-005 registra o expedidor familiar efetivo, mesmo se outra pessoa criou o
draft e flags legadas forem false. Expedições distintas conservam causas
próprias ao lado da ciência expressa anterior; replay/linhas compartilhadas
não duplicam ciência causal ou movimentação. Não representante legitimamente
autorizado pode expedir sem fabricar Família ciente. Rascunho, edição, falha
e rollback deixam zero SCI-005; ciência não é recebimento nem consumo.

Preferência própria append-only manual/dialog/tacit exige consentimento
expresso para as duas últimas, versão e chave de intenção. RLS só permite a
própria leitura com Auth vigente, sem exigir contexto de paciente para essa
escolha pessoal. Flags antigas não viram opt-in. Tácita exige habilitação,
permissão e preferência anteriores à nova emissão; conserva versões/instantes
e autoria do sistema. Alteração ou capacidade posterior não retroage.

Diálogo usa prévia mínima antes de montar conteúdo; cancelar não produz ato.
Resposta perdida recupera uma ciência e falha posterior na consulta é
informada sem inventar abertura. Preferência tem revisão somente leitura,
recuperação da mesma chave e atualização de outra sessão não substitui edição.
SCI-003 permanece comunicação; novos desafios SCI-004 ficam desativados.
Acesso observável independente continua pendente no próximo incremento;
nenhum GET, PDF ou confirmação equivale a atenção/leitura integral.

Contraprovas adicionais e correções necessárias ao núcleo:

- RPC aceitava nova ENT ligada a REQ histórica, com zero ciência: agora novos
  vínculos COM/ENT, inclusive drafts, são recusados; história/ledger anteriores
  preservados. Falha dos dados da ficha bloqueia edição/autosave até retomar.
- JSON 1.0000000000000001 virava 1 antes do schema. Parser verifica token
  original com decimal exato e recusa arredondamento/underflow/inteiro inseguro.
  Observação conserva texto/vírgula em edição e draft; banco exige precisão.
- Trigger tácito acrescentou espera depois da última validação do criador.
  Controle com lock observado e sessão encerrada retornava sucesso, REQ=1 e
  SCI=1; após revalidar no fim da emissão, retorna 42501, REQ=0 e SCI=0.
  Hipótese semelhante em política administrativa já retornava 42501 sem
  efeito; ficou como regressão, sem patch especulativo.

Controle da migration de permissões inicialmente encontrou âncora incorreta;
foi revertido integralmente e ajustado à função efetiva antes da aplicação.
Tipos detectaram duas referências antigas após renomeação de refs; corrigidas.
Primeiro teste pessoal usava helper que exigia paciente indevidamente: passou
a autenticar sem contexto, comprovando o contrato próprio. Um seletor de teste
foi ajustado ao nome acessível do combobox. Outro oráculo consultava coluna
inexistente do ledger: passou a comparar o ledger completo do paciente, com
baseline positivo. Nenhum teste/regra/timeout reduzido.

Validação: replay de 96 migrations limpo/legado, 16 SQL e search_path aprovados;
84 hashes históricos preservados. 69 integrações completas e 127 unitários
aprovados; contratos, lint, Markdown, tipos e build passaram. 30 E2E nos três
projetos aprovados, sem retries locais; captura iOS de 320 px inspecionada.
Upgrade controlado de ALL preservou eventos pessoais e snapshots
anteriores; prova local em p02-upgrade-proof.json, sem homologação remota.

PDFs locais finais de duas páginas, extraídos e renderizados com PDFium; todas
as páginas inspecionadas, sem corte/sobreposição. Observação: 6693a4f9, SHA-256
171855273a72460026d88e4fd43a889562e5e70eaf8e0a43bf8b2365be0e3273,
quatro pares produto/valor/modo/horário confrontados com banco/snapshot.
Diálogo: dca2388c, SHA-256
4519b75ba57f8deacf94a0a21559e22965ea06752a5da1b4f438ff613848562a,
ator/origem/ANY/material confrontados com banco/snapshot. Manifestações locais
em output/pdf/phase-d conservam hashes dos fontes testados e HEAD d7cfa44 com
árvore suja. Hash material quebra visualmente em duas linhas: o oráculo remove
somente espaços para comparar seus 64 caracteres. Sem certificação D4 geral,
assinatura, provedor, pessoa/AT ou aparelho real.

Push de d7cfa44 foi confirmado no ref remoto, mas a leitura da PR ainda exibia
001158b; não apareceu CI para o novo SHA na consulta. A aprovação de 001158b
não cobre estes fontes. Publicação/consulta final serão registradas por SHA.
D-A permanece parcial, sem GO, merge, banco remoto ou início de D-B/D-C.

Incremento acima publicado em 5fb888c. Draft PR 7 passou a refletir esse HEAD
após atualizar a descrição. CI 42083091244 em execução na consulta seguinte;
nenhum resultado aprovado foi presumido para esse SHA.

## D2.2 — abertura observável independente

Migration 20261105182500 cria requisition_openings append-only, com RLS de
leitura por paciente e grants explícitos; somente RPC registra o próprio ator,
nome preservado, material, versão de referência, chave e horário do servidor.
Lock por pessoa/intenção seguido de nova validação Auth/contexto/req.read
protege recuperação concorrente. Outra chave registra nova abertura; retry
mantém o mesmo fato. Nenhum backfill, ciência, versão, snapshot, outbox ou
movimento de estoque é produzido por esse registro.

O aplicativo reporta somente após carregar/renderizar conteúdo em primeiro
plano. Prévia, GET técnico/prefetch, corpo falho, download e ciência tácita
não são abertura. Detalhe, comprovante e prévia vinculada usam o mesmo controle;
a preparação COM/ENT que apenas consulta links não fabrica exibição da REQ.
Falha do reporte oferece recuperar a mesma intenção, mantendo o conteúdo e
a ciência já confirmada. Histórico lista 20 por página, atualiza e carrega
anteriores com cursor instante/ID sem truncar precisão textual.

Quatro integrações dirigidas aprovadas: leitura inerte, concorrência/retry,
nova intenção, SCI independente, escrita direta recusada, RLS de outro
paciente/global sem vínculo e revalidação de sessão/capacidade após lock
observado. Quatro E2E Chromium aprovados: diálogo/cancelar, perda da resposta
de ciência e de abertura, corpo falho, recuperação, nova abertura e 22 fatos
paginados sem duplicação. Sinal document.visibilityState controlado verifica
o ramo de primeiro plano; não é teste de aparelho físico nem atenção humana.

Lint inicialmente pediu convenções React 19 para Context/use/provider;
ajustadas sem suprimir regras. Tipos detectaram mensagem de asserção passada
ao método incorreto no teste; corrigida antes de executar E2E. 128 unitários,
lint, tipos e Markdown aprovados. Replay limpo/legado de 97 migrations e
16 SQL/search_path passaram; 73 integrações completas, 15 E2E nos três
projetos e build aprovados. Renderer não mudou neste incremento; a inspeção
PDF de D2.1 permanece evidência desse renderer, sem promover homologação D4.

Duas negativas finais dirigidas passaram após a suíte: identidade global sem
vínculo local não registra SCI e ciência tácita conserva zero aberturas.
Duas rodadas iOS dirigidas adicionais passaram para a inspeção visual de 320 px.
A captura full-page conserva a barra fixa na posição de scroll da captura;
a viewport real foi conferida separadamente, com summary focalizado, cartões
legíveis e sem rolagem horizontal. Não equivale a aparelho físico/AT humano.

Incremento de abertura publicado em 592db38; Draft PR 7 atualizado e mantido
como rascunho. A alteração local independente de conexão Sonar em
.vscode/settings.json foi preservada fora dos commits funcionais.

## D2.3 — COM: parcelas, expectativa e autoridade

Migrations 20261105184500, 20261105191000 e 20261105192800 aplicadas somente
na stack local após controles transacionais com rollback. Expectativa não
adquirida é calculada no banco e dispensada em waived_quantity, sem alterar
quantidades originais/aprovadas/adquiridas/validadas ou escrever ledger.
Decisão conserva motivo, ator, instante e resumo da versão. Capacidade crítica
com.close_expectation tem padrão admin, com delegação familiar explícita no
próprio paciente. Não amplia autoridade global nem representa ato alheio.

P14-A conserva 10→2 validados+8 dispensados. P14-B encerra expectativa com
parcela pendente e mantém conferência aberta; rejeição conserva declaração e
aquisição ainda sem chegada válida. Uma nova chegada substituta tem identidade
própria. Compra já adquirida não é dispensável. Cancelamento preserva as
proteções físicas anteriores e também recusa apagar o novo encerramento.

Novas chegadas têm submission_key; evento/snapshot contêm receiptId, parcela
causal e declarações/decisões. Nome de quem informou/decidiu é preservado no
fato novo. Campos históricos sem nome continuam desconhecidos. Grants e RLS
foram conferidos: authenticated não tem INSERT/UPDATE/DELETE em linhas ou
parcelas. Validação/rejeição recusam corpo com quantidade editada.

Interface mostra parcela/autor/horário/quantidades em leitura ao decidir;
chegada e aquisição começam vazias, com limite informativo. Contraprova UI
encontrou 8 pré-preenchidos após adquirir 10 e validar 2. Primeiro seletor não
localizava o campo por incluir a ajuda no label; corrigido para o ID real da
linha antes de aceitar essa contraprova. A nova revisão informa se a chegada
vai aguardar conferência ou receber validação administrativa imediata.

Perda de resposta conserva intenção e recupera chegada, validação, rejeição
ou encerramento sem duplicar fatos. Erro/explicação ficam dentro do modal e
o fechamento permanece desabilitado enquanto incerto. Conflito de versão
oferece comparação original/atual antes de adotar o novo resumo; conserva
motivo, reinicia concordância e leva foco ao controle. Sucesso foca o título
do resultado. São estados na mesma tela, sem promessa de persistência D3.

Quatro causas de autoridade foram reproduzidas antes da correção:

- Administrador com com.validate negado ainda validava chegada por papel.
- Administrador com com.approve negado ainda emitia COM já aprovada.
- Rejeição aguardando a linha da parcela concluía após perder com.validate.
- Criação aguardando FK do catálogo concluía após perder com.create.

As duas primeiras agora conservam pendência quando a capacidade é negada;
submeter draft recalcula a aprovação e não promove valor provisório. As duas
esperas tardias agora retornam 42501 e deixam documento/parcela/estoque sem
novo efeito. Revalidação final cobre criação e comandos COM; validação
automática também exige sua capacidade até o final. O primeiro controle de FK
apontava products, mas o FK real é composto em care_recipient_products: o
oráculo recusou esse ensaio por não observar espera. Foi corrigido antes de
reproduzir o defeito. pg_blocking_pids identifica o bloqueador real; nenhum
sleep ou timeout é usado como prova de chegada à barreira.

11 integrações dirigidas passaram após as correções de papel/capacidade;
as duas barreiras tardias adicionais passaram após a migration 100. Incluem
concorrência, idempotência, parcelas múltiplas, rejeição/substituição, versão
antiga, consentimento inválido, delegação familiar e negativas de identidade/
paciente. 130 unitários, contratos, lint e tipos passaram. Quatro E2E Chromium
funcionais passaram; o fluxo anterior REQ→COM doação→estoque→ENT parcial→BAL
também passou com quantidades agora explicitamente preenchidas e mensagens
específicas. Replay limpo/legado de 100 migrations, 16 SQL/search_path e as
86 integrações completas passaram. Dezoito E2E passaram nos três projetos,
incluindo os quatro COM, diálogo P02 e o ciclo operacional completo.

Erros intermediários de teste foram preservados: recuperação precisava usar o
botão dentro do modal, label exato de textarea controlada foi trocado pelo
papel/nome acessível, e a revisão ganhou explicação adicional. Uma rodada
ainda usava asserção carregada antes de editar o arquivo; não certifica a
árvore posterior. A rodada seguinte manteve fontes congelados até terminar.
Nenhuma regra, timeout, retry ou asserção de quantidade/ledger foi reduzida.

Dois PDFs locais v4/v5 de 3ab0a931 foram confrontados com snapshots imutáveis,
parcela causal, crédito no instante do evento e hash dos bytes registrados.
O oráculo normaliza decimal textual da declaração e caixa do título, sem
alterar os dados. Todas as seis páginas foram renderizadas e inspecionadas.
A primeira versão separava título/campos de integridade e chamava a doação
de compra na trilha; ajustes proporcionais foram validados abaixo. Artefatos
anteriores preservados, com escopo de hashes do renderer no manifesto local;
não certificam fontes UI editados entre as rodadas preliminares.

PDFs finais de 6f0efa22, v4 pendente e v5 encerrada, três páginas cada:
9d0fedb706d15ee2a4dc6c99b0c67959bceb5f361a9e66ae321e794a5db1f7dd e
faff650cbae590c59f048706b8f5fd0ba2f04447ff9bd799a7a6566222926d0b.
As seis páginas finais foram renderizadas/inspecionadas. Extração confrontou
10/10/2/0/8 e 10/10/2/2/8, receiptId, autor, estado, crédito no instante do
evento e hash registrado dos bytes. Título/campos/QR de integridade agora
ficam na mesma página e a trilha identifica doação. Manifesto local preserva
snapshots, limites e hashes do renderer; nenhum arquivo anterior regravado.
Um E2E Chromium dirigido adicional passou no renderer final.

CI de 592db38: run 42086896970 concluído com success; status Vercel success
na mesma consulta. Isso cobre a abertura REQ publicada, não este incremento
COM ainda não commitado. A suíte local completa desse incremento passou
conforme resultados acima; não substitui CI do futuro commit.

A inspeção visual posterior aos 18 E2E encontrou texto de estado fora da
cápsula a 320 px e o cabeçalho genérico de compra numa doação. Uma nova
asserção geométrica reprovou antes da correção. A cápsula agora acompanha a
altura do texto, e cabeçalhos respeitam a origem; ausência de origem fica
neutra, sem presumir compra ou afirmar um fato histórico inexistente.
WebKit passou com a nova asserção e a captura foi inspecionada. A primeira
rodada Chromium parou no carregamento do login, antes do campo de e-mail;
não certifica o cabeçalho. Repetição isolada passou, assim como o ciclo
REQ→COM doação→ENT parcial→BAL no Chromium. Fontes permaneceram congelados
durante cada execução. Sem aumento de timeout ou redução de asserções.
Contratos, lint, tipos, 130 unitários e build final passaram novamente.

Último par PDF da árvore final: 953bc84c, v4/v5, três páginas cada, hashes
3491fb94f876695e7fa6961615161ab94d25ed496aaac61a3bd67c232ca197dd e
3ced677323c14788eb4115b63c616f6cd97a9a1a2190abdc3da2ca6faeb6227a.
Extração/ledger/snapshots/hashes e as seis páginas renderizadas foram
verificados novamente. A origem ausente agora recebe título neutro; não se
reescrevem exemplares anteriores. Paginação geral/assinatura seguem D4.

D-A integral permanece aberta; ENT, BAL, estoque/custódia, consumo, catálogo,
recorrências e demais critérios D1/D2 ainda exigem conclusão. Sem GO/merge,
reset remoto, alteração Auth remota, assinatura ou comunicação externa real.

## D2.4 — relatos, complemento e decisão de consumo

COM publicado em e8669818dd401d4c377349dda88d8e201d9e2e1e; Draft PR 7
atualizado e preservado. A alteração independente de .vscode fica fora do
incremento. Por orientação do responsável, validações passam a ser concentradas
nos defeitos/contratos alterados; suítes gerais já programadas são aproveitadas
na CI. Repetição local ampla exige mudança relevante, falha ou hipótese nova.

Antes da migration nova, duas regressões Auth reproduziram NULL aceito como
rejeição e oposição respondendo sucesso após confirmação. Migration
20261105200752 acrescenta original protegido, complementos/decisões append-only,
autoria/instante próprios, versão e intenção. Não altera relato/linha históricos
nem preenche nomes antigos com o diretório atual. Texto livre pode receber
estrutura por complemento próprio ou de outro autorizado, sem débito.
Confirmação decide a versão exata, falta/rejeição não descontam e consumo
confirmado tem movimento causal único. RPC legada não decide complemento sem
versão, nem inventa justificativa para uma rejeição nova.

Primeira execução revelou nome de coluna incorreto no novo código; corrigido
para profiles.full_name antes de aceitar o teste. Conflitos de domínio usam
P0001 e mensagens tipadas; tentativa preliminar com 40001 terminou em timeout
do upstream e não foi tomada como decisão válida. O oráculo de saldo também
foi corrigido: a view exige contexto Auth, e ausência não pode virar zero por
Number de string vazia. Consulta autenticada single agora exige linha/valor.

Dez das onze integrações dirigidas passaram na rodada completa; o único caso
afetado pelo oráculo passou depois da correção, sem repetir os dez demais.
Incluem complemento por outra identidade, relator profissional, ausência de
estrutura, falta, rejeição motivada, oposição concorrente, repetição, versão
antiga, precisão, RLS/grants e revogação em esperas observadas de paciente/linha.
Três testes da fronteira API passaram; tipos e lint dirigido sem avisos.

Interface ganhou estados de consulta/erro/retry independentes, filtros/páginas,
referência antiga, complemento editável e revisão/decisão em leitura. Resposta
incerta congela intenção e impede fechar; conflito exige consulta e revisão
nova. Os quatro casos de browser passaram em execuções dirigidas. A fixture
inicial usava o nome de estado ENT errado; o contrato confirmado foi mantido
com asserts adicionais de quantidade e conferência. Seletores de label foram
ajustados para o papel/nome acessível real e o combobox é aberto por teclado.
Nenhuma asserção de quantidade/movimento foi removida.

A tarefa principal também expôs foco perdido ao desmontar a edição na revisão.
Agora o foco vai ao título do resumo e volta à edição ao retornar; rejeição e
adoção de nova versão seguem o mesmo cuidado. Painéis possuem nome acessível.
A regressão exige título focalizado e Tab até o botão de revisão; passou com
axe/overflow a 320/390/768/1440. Respostas perdidas recuperam relato e decisão
sem duplicar; outra sessão observou o resultado sem recarregar manualmente.
Capturas locais de revisão/resultado a 320 px foram inspecionadas. Materiais
novos mostram nome/unidade; identificador técnico fica só quando o nome não
foi preservado. Movimento mostra o material e oferece sua referência sob
consulta. O caso adicional de decisão oposta passou: outra identidade decide
primeiro, a oposição conflita e a tela abre o resultado original, sem novo
débito nem troca do decisor. Fontes foram formatados com o Prettier já instalado
no editor, sem dependência nova e sem repetir suítes por formatação.

Advisor de segurança local terminou com exit 0, sem ERROR. O único WARN é a
extensão unaccent no schema public, já pertencente à base anterior. RLS,
grants e search_path dos objetos novos foram conferidos; não se move uma
extensão histórica como efeito lateral deste incremento.

Replay limpo/legado completo e suítes gerais deste novo SHA ficam para a CI;
não foram repetidos localmente nem presumidos aprovados. D-A permanece aberta.

Consulta pontual de e866981: CI 42100271575 concluída com success e status
Vercel success. Isso valida o incremento COM publicado, não o novo consumo.

Consumo publicado em 74f5848ff0a94aecdd8ef25bbac68e6269621997. CI
42106623894 passou checks gerais Windows/Ubuntu, replay limpo/legado e
integrações completas. Cada projeto de browser teve 63 E2E aprovados e uma
falha no teste Flow antigo, que ainda procurava texto/botão da interface
anterior. Os quatro casos novos de consumo passaram nos três projetos.
O fluxo Flow foi atualizado para abrir o relato e revisar sua versão em
leitura, conservando as provas de saldo 5 antes da decisão e 3 depois.
O caso afetado passou localmente, com os asserts de saldo 5→3 e decisão em
leitura. CI geral não foi reexecutada localmente nem declarada aprovada.

## D2.5 — ENT: cancelamento, consumo e decisões pessoais em implementação

Reparo Flow publicado em 7c22f54f868fdf3da24bb167e947213022335cc5; PR 7
continua Draft. Consulta pontual da CI 42111139110: concluída com success.
O incremento abaixo não conclui o lote ENT ou a D-A.

Primeiro ensaio usou familiar sem ent.cancel; corrigida a fixture para o
administrador autorizado antes de aceitar a contraprova. Regressão então
reproduziu 42702 em e.body, com rollback do ledger. Migration 20261105204958
corrige só o alias SQL. O caso positivo 2 aceitos/1 consumido/1 devolvido passou;
a contraprova seguinte confirmou defeito temporal independente: cancelamento
anterior era subtraído da janela de consumo da ENT nova e a conciliação válida
era recusada. Não se atribui débito duplicado ao alias como causa presumida.

Migration 20261105205707 cria referências append-only ao consumo já confirmado,
pedido com identidade/autor/instante/motivo e recusa/retirada pessoais. Consumo
a conciliar é calculado de aceite menos devolução real, nunca input debitável.
Fonte disponível é restrita a paciente/produto/custódia e após aceite efetivo;
uma referência não pode ser reutilizada por outra conciliação. Referências
históricas sem vínculo individual recebem reserva virtual dentro da janela
original, sem preencher o passado com IDs ou autoria inventados. Evidência
histórica insuficiente bloqueia conciliação automática, sem virar zero.

Pedidos e decisões não apagam recebimento. Retirada é do solicitante e recusa/
consentimento são do recebedor original. Acesso global não substitui identidade
pessoal. Material ainda em trânsito exige conciliação real; resolver divergência
durante a espera preserva o pedido e sua versão. Recusa/retirada reavaliam os
fatos atuais para retomar a conferência. Retry confirmado requer acesso vivo ao
resultado, sem exigir elegibilidade de uma escrita nova já encerrada.

Quatorze integrações dirigidas Auth passaram: duas contraprovas originais,
recusa/retirada, corrida de pedidos, oposição, replay com capacidade removida,
mudança de fonte sem mudar versão documental, não reutilização de consumo,
trânsito parcial, precisão, corpo forjado, grants e duas revogações após espera
real (paciente e FK tardia do movimento). Fixture legada usa motor retido em
contexto controlado, explicitamente separado das provas Auth RPC novas; nenhum
grant foi relaxado para fazê-la. Histórico do evento antigo foi comparado.

Identidades desconhecidas também usam comparação NULL-safe. Um ensaio local de
aplicação da função falhou por encoding da saída Python e foi revertido pela
transação; a aplicação seguinte usou texto Unicode do PowerShell. A regressão
específica NULL e a repetição afetada passaram, totalizando 15 casos únicos.
O 16º caso dirigido também passou: 3 aceitos/1 consumido/1 devolvido não podem
apagar uma unidade sem fato; o comando rejeita sem efeito e conciliação completa
com retorno real de 2 referencia só o consumo anterior de 1.

Cinco casos Chromium passaram em rodadas dirigidas: pedido e consentimento com
resposta perdida, recusa concorrente/retirada, fonte alterada sem nova versão,
trânsito real durante pedido e fonte inicialmente indisponível. Revisão usa
consumo em leitura e motivo próprio; conflito exige comparar/adotar, conserva
edição e reposiciona foco. Outro contexto observa a decisão. O primeiro caso
expôs crash Decimal com vírgula; normalização corrigida e só esse caso repetido.
Os outros três da primeira rodada não foram repetidos. Atualização da seção
durante edição também consulta/compara, sem trocar silenciosamente a fonte.

Cinco testes da fronteira API, SQL document-invariants, tipos e lint dirigido
passaram. Advisor local: exit 0, apenas WARN histórico de unaccent no public.
Guard de contratos preserva as 84 migrations históricas. Replay limpo/legado e
suítes completas não foram duplicados; são responsabilidade da CI do novo SHA.

Capturas de revisão/resultado foram inspecionadas a 320 px; tarefa auditada
também a 390/768/1440. PDFs reais do cenário fictício foram confrontados com
snapshots imutáveis, autores, débitos/retorno e hashes registrados. A primeira
conferência detectou estado de recebimento incorreto e bloco de integridade
quebrado; corrigidos e repetido somente o caso gerador. Todas as seis páginas
dos novos exemplares 2d9b53f5, versões 3/4, foram renderizadas e inspecionadas.
SHA-256: ccccc83cf35c97156c1a292d3b2211f1d019aea68c4a075bc5b822d51357fc1e
e bd4f99c558ea1f188888348d8d0c3e413f543bbd06ec9a37d8cf64433edc866f.
Manifesto local: output/pdf/phase-d/delivery-cancellation-2d9b53f5-9b6b-4f32-9679-476f68419a57-verification.json.
PDFium, dados fictícios e análise de layout não equivalem a impressão, pessoa,
aparelho físico, provedor, assinatura ou aprovação geral D4.

Permanecem no núcleo executável: origem COM explícita; demais etapas ENT/P05/
P06/P07; BAL, estoque/custódia/compensação, catálogo, profissionais e escala.
Recuperação de consumo após perda somente da capacidade de escrita e efeito de
compensações futuras sobre as referências precisam ser tratados nos respectivos
incrementos. Sem merge, GO, banco remoto ou homologação humana/física/provedor.

## D2.6 — P06: preparação e indicação pessoal

Cancelamento publicado em 648aac6a110675ac80681945f3e55f1c9443d530. Consulta
pontual da CI 42115856829: in_progress, sem conclusão presumida.
Na consulta de entrega seguinte, a execução concluiu com failure: banco
(replay/integrações) e checks gerais Windows/Ubuntu passaram. Os cinco casos
novos ENT passaram nos três navegadores. O teste operacional antigo ainda
esperava mensagem genérica e o formulário anterior; foi atualizado mantendo
saldo família/equipe e declarando a devolução real em campo vazio. iOS também
registrou uma oscilação REQ: a fixture alterava sessionStorage com autosave
ativo. Agora sai do formulário antes de preparar os horários do dia anterior;
os asserts exatos dos quatro horários e a distância de 19h foram conservados.
Somente esses dois percursos foram repetidos em WebKit: ambos passaram,
conservando saldos 4/6→0/10 e os quatro horários exatos anteriores à emissão.

A contraprova Auth de expedição manual sem motivo falhou antes: o comando
era aceito. Migration 20261105215000 deriva pessoas elegíveis e sugestão da
escala no banco, registra escolha/sugestão/indicador/instante/motivo e preserva
indicações anteriores. Fonte consultada tem hash; alteração exige nova revisão.
Sem pessoa apta conserva preparação/contingência. Flags de capacidade não
substituem papel elegível nem a identidade pessoal do recebimento.

Dez casos Auth passaram entre rodada e rechecks dirigidos. Três negativas
iniciais encontraram P0001 no guard antigo; a classificação foi corrigida para
42501, sem remover a negativa. A espera original de catálogo antecedia a
captura da escolha; não foi contada como prova posterior. O caso final passou
com espera observada na FK products da movimentação, depois da captura, e
rejeição específica da referência após revogação, sem documento ou ledger
parcial. Fixtures válidas antigas agora explicitam o motivo manual; o novo
controle de ausência usa RPC direta sem suprir esse campo.
Reassign também passou com preservação da indicação emitida e negativa após
perda de ent.create; razão malformada/NULL/curta não virou fato autorizado.

Onze testes da fronteira/contrato afetado e tipos passaram; o arquivo de dois
testes API foi repetido apenas para o limite curto acrescentado. O SQL afetado
document-invariants passou com rollback, sem reset. Lint encontrou uma chave
de histórico com índice, corrigida e revalidada sem avisos.

Quatro tarefas Chromium passaram: manual com motivo obrigatório e recuperação
de resposta perdida; sugestão editável/terceiro impedido de aceitar; erro e
fonte obsoleta com comparação/adoção explícita; contingência sem pessoa apta.
A primeira rodada passou contingência e expôs uso incorreto do combobox pelo
novo helper: preencher texto não abria as opções. Abertura por teclado e
seleção explícita corrigiram o helper; só as três tarefas afetadas foram
repetidas. Asserções de estoque, identidade e unicidade permaneceram.
O formulário não recarrega automaticamente quando muda apenas a revisão do
workspace, preservando edição durante atualização de outra sessão.

Tarefa de resultado auditada a 320/390/768/1440 e captura de 320 px inspecionada.
PDF 9b8c6d6e, v1, confrontado com snapshot/autores/estoque e hash registrado;
duas páginas renderizadas por PDFium e inspecionadas, sem aceite presumido.
SHA-256: 50df87562dad0b67713e65c858808b86acddacd27fc28bd7e6b0d294a698dd65.
Manifesto local: output/pdf/phase-d/delivery-preparation-9b8c6d6e-d7f7-4772-b8ad-48a08fe670cc-v1-verification.json.
Replay limpo/legado e suítes gerais ficam para a CI do incremento. P05/P07 e
demais etapas do núcleo continuam abertas; sem conclusão D-A, merge ou GO.

Orientação do responsável sobre custo/repetição foi incorporada ao AGENTS.md
e TESTING.md: evidência local por impacto, repetição das falhas afetadas e
suítes completas na CI do SHA publicado, sem polling ou verde presumido.
Não há redução de asserções, guards de ambiente, Auth real ou gates finais.

## D2.7 — COM: origem explícita na preparação e emissão

P06/política proporcional publicados em a79eddac4fa20d97ff5822d431bcaa29080a4856.
Sua CI ainda não foi consultada. A contraprova Auth de COM emitida sem origem
reproduziu aceitação indevida antes da migration 20261105223000. Novo helper
privado, sem execução por clientes, valida purchase/donation antes de emissão
e submit; rascunho pode preservar origem desconhecida, sem backfill histórico.

Formulário novo começa em branco, erro foca a escolha e revisão mostra a
origem em leitura. Doação possui mensagem/título correspondentes. Rascunho do
servidor sem origem não recebe compra presumida; quantidades permanecem para
revisão. Foram localizados os consumidores existentes: três fixtures de COM
agora explicitam purchase, e a negativa de quantidade zero também, para não
virar falso positivo por outro erro de origem.

Três casos Auth passaram: ausência/malformado sem efeito parcial, compra e
doação exatas com recuperação de emissão e draft desconhecido que só emite
depois da revisão explícita. Original do primeiro evento permanece desconhecido.
Doze unitários de contrato/fronteira e duas tarefas Chromium passaram, incluindo
zero crédito de estoque, foco e retomada do draft. Auditoria visual da tarefa a
320/390/768/1440 e captura de resultado a 320 px inspecionada. Renderer não foi
alterado; seus exemplares anteriores não foram gerados novamente sem hipótese.
Replay limpo/legado e demais suítes ficam para a CI do novo SHA.

Permanecem ENT/P05/P07, BAL e revisão facultativa/reconto, estoque/custódia/
compensações, catálogo/apresentações, profissionais/desligamento e escala.
Sem conclusão D-A, merge, alteração de banco remoto ou homologação final.

## D2.8 — P05: regularização com autoria própria

Origem COM publicada em d6db5f016555b0b32f163c31fbb5f896125bd7f1.
Consulta pontual da CI 42121891337: checks gerais Windows/Ubuntu, instalação
limpa/evolução legada de 105 migrations e integrações passaram. WebKit passou;
Chromium/móvel passaram 74 casos e falharam no mesmo teste antigo de retomada
ENT, que avançava antes da consulta P06 terminar. Artefatos mostram o recebedor
e motivo corretos, com aviso de fonte ainda pendente. Avanço agora aguarda a
consulta necessária; recheck apenas desse percurso passou. Vercel success
do mesmo SHA não substitui essa falha de teste nem valida o novo incremento.

Hipótese inicial de aceite substituto por administrador não se reproduziu:
resolve received já recusava com 42501. A contraprova distinta de resolve
returned após desligamento reproduziu uma movimentação crítica sem proposta,
conferência independente ou dossiê. Migration 20261105224000 introduz o
procedimento tipado, preservando a proteção original do recebimento pessoal.

Proposta registra base, motivo, fatos conhecidos e desconhecido calculado,
conferente independente e responsável futuro elegível. Aprovação crítica
registra somente movimentos comprovados; desconhecido fica em trânsito.
Aceite pessoal/autoria/fully_checked permanecem. Retirada, rejeição, encerramento
de obsoleta e relato futuro têm autores próprios e não escrevem ledger.
Pedido anterior de cancelamento sem consentimento permanece história explícita.

Três casos Auth iniciais e onze fronteiras passaram entre rodada e rechecks.
As duas falhas iniciais das fronteiras eram da fixture: precisão de unidade com
histórico corretamente imutável e código esperado errado da tarefa pessoal de
cancelamento. Corrigidas sem relaxar guards/asserts; só as duas foram repetidas.
Foram comprovados papéis locais, desconhecido, futuro profissional, RLS/grants,
concorrência/oposição, recuperação após perda só da escrita e ausência de
efeitos após esperas observadas de paciente e FK tardia do produto. A paginação
encontra a tarefa antiga diante de 22 drafts posteriores sem tarefa executável.

Três testes API passaram. Dois percursos Chromium P05 passaram; o terceiro
chegou ao resultado administrativo correto e falhou na auditoria axe depois
de restaurar foco/alterar viewport, com controle anterior parcialmente atrás
da borda sticky. A inspeção responsiva agora reinicia a origem de leitura;
recheck somente desse percurso passou, sem remover regras. Quatro percursos
Chromium distintos passaram entre as rodadas: proposta/conferência com resposta
perdida, apuração futura própria, conflito com comparação/adoção explícita e
caixa padrão de decisão pessoal de cancelamento. No último, a expectativa de
rota foi corrigida para documentos/:id; depois a fixture terminal foi corrigida
para recebimento integral, pois a declaração de divergência anterior deixava
legitimamente outra tarefa de conciliação. Nenhuma tarefa necessária foi ocultada.

Exemplar desconhecido revelou título de linha do tempo separado da tabela;
paginação ajustada somente para o novo dossiê e repetido apenas seu caso gerador.
Os PDFs de fatos distintos a54cd04a/981d2db4, ambos v5, foram confrontados com
snapshots/atores/ledger e hashes registrados. Todas as seis páginas finais
renderizadas por PDFium e inspecionadas. SHA-256 dos arquivos:
b0c9356ec3fd6f1b030fa9e5f13199738804d5ad86eb737ffbc3bdca03ac2525 e
d6fb0666326c884be81a82a49292d3b9e7b1b3465a826fc53d28095b065d9a4a.
Manifestos em output/pdf/phase-d/delivery-regularization-...-verification.json;
o exemplar anterior ao ajuste de layout também permanece preservado. Na UI,
o resumo distingue conciliação administrativa de desconhecido ainda em trânsito.
Auditoria axe/overflow a 320/390/768/1440, foco e captura de 320 px conferidos.

Lint dos fontes afetados e tipos/build do runner aprovados. check:contracts
preservou as 84 migrations históricas; há 106 fontes incrementais/legados no
total. Advisor local retornou apenas o aviso histórico de unaccent em public,
sem novo alerta. Replay limpo/legado e suítes completas do novo SHA ficam para
a CI programada; não foram duplicados localmente. Preview de desligamento,
P07, BAL e demais etapas D2 continuam abertas. Comunicação legítima externa,
assinatura D4 e aceite humano/físico são gates distintos, sem conclusão D-A/GO.

## D2.9 — recuperação de consumo após perda somente da escrita

P05 publicado em 20601f55509fc708992066e2ea3d467561ea1c70. Consulta pontual da
CI 42129515456: in_progress, sem conclusão presumida. Draft PR 7 preservado.

Quatro contraprovas Auth reproduziram recusa indevida de recuperação após perda
da capacidade de escrita: relato próprio, complemento próprio, decisão própria
e RPC legada de v1. Migration 20261105233500 move a autorização de nova escrita
para depois da comparação da chave do próprio ato. Leitura viva precede a
consulta e é revalidada após o lock; mutações conservam os guards originais e
suas revalidações finais. API exige o escopo de leitura e delega à RPC a distinção
atômica entre recuperar a intenção e criar fato. Payloads, assinaturas e grants/RLS
permanecem preservados.

Cinco casos novos e onze casos existentes das funções afetadas passaram: mesma
intenção, chave alterada, decisões concorrentes, complemento já conferido,
RLS/privacidade, legacy e novas escritas recusadas sem capacidade. Nova negativa
observou a espera real do paciente, revogou a leitura e não retornou resultado
nem deixou efeitos adicionais. A repetição dos onze casos foi dirigida à
mudança da ordem dos guards nas três mutações, sem repetir integração global.
Três testes da fronteira API passaram. Nenhum reset foi realizado.

O primeiro novo caso Chromium passou após corrigir sua sincronização: esperava
controles desabilitados ainda durante busy, antes de a fixture revogar a escrita;
agora aguarda a entrada explícita na recuperação. Com a capacidade perdida
confirmada pelo contexto, recuperou a mesma chave; nova tentativa e perda de
leitura retornaram 403. Movimento, decisão e autor únicos foram preservados.
O segundo percurso também passou: recuperou complemento depois da decisão de
outro administrador com vínculo local, sem reabrir relato nem repetir débito.
A fixture inicial usava familiar sem gestão desse estoque e foi corretamente
recusada; foi usada outra identidade já habilitada, sem conceder privilégios.
Mensagem agora mostra o estado vigente do relato e a decisão real. Ambos os
percursos conservam a chave e a autoria original; nenhuma regra foi relaxada.

Lint dos fontes afetados, Markdown e tipos/build do runner passaram. Não houve
mudança no renderer; PDFs anteriores não foram regenerados. Replay de 107
migrations e suítes completas ficam para a CI do novo SHA. Compensações de
consumo, transferência bilateral, preview de desligamento, BAL, catálogo e
demais critérios D2 continuam em execução. Sem conclusão da missão, merge ou GO.

## D2.10 — prévia de desligamento e alvo fixo do vínculo

Recuperação de consumo publicada em 2e9a9a98849f8ff8224925690c4d559ce540dd23.
Sua CI 42131414896 estava in_progress na consulta pontual, sem verde presumido.
As duas contraprovas Chromium seguintes falharam antes: alvo trocável no editor
de função e ausência de pendências no diálogo de revogação.

Migration 20261105235015 acrescenta membership_impact, somente leitura e sem
novas tabelas. Exige administração local ativa, limita o alvo ao paciente e
respeita ent.read/bal.read/schedule.read.team em cada grupo. Sem acesso retorna
fonte indisponível e total desconhecido, nunca zero. Totais completos antecedem
os recortes de 20 registros/20 linhas por ENT. Inclui aceite/trânsito preservado,
regularizações designadas, responsabilidade BAL atual, adiamentos ainda não
aprovados, plantões em andamento/futuros e propostas de escala.

Cinco casos Auth passaram: leitura sem alterar membership/documento/ledger/
auditoria, papéis/contextos/alvo estrangeiro, fontes negadas sem falso zero,
BAL vigente/adiamento pendente e revogação imediata, 23 ENT com recorte de 20 e
ACL estreita. A revogação manteve recebedor e aceite originais e não transferiu
autoria da assignment BAL. A fronteira API recusa alvo ausente/malformado.

Dois percursos novos e o consumidor existente de revogação passaram entre rodada
e recheck: função da mesma pessoa sem seletor de outra conta, flags legadas
compatíveis preservadas, outro vínculo intacto e outra conta em fluxo explícito;
revogação mantém acesso legítimo da conta a outro paciente; prévia mostra 2/3
aceitos e 1 em trânsito, conserva última consulta após 503 e permite Revogar agora.
O terceiro caso expôs perda de foco ao desabilitar Atualizar pendências: o foco
voltava ao body, fora do modal. Corrigido retorno ao botão após a resposta;
somente esse caso foi repetido, com foco/axe/overflow a 320/390/768/1440.
O editor também passou axe/overflow nessas quatro larguras. Captura de 320 px
membership-urgent-284b1d71-883c-4e6a-9f80-2780cae11ff8-chromium.png foi inspecionada.

O ajuste pontual C030 é compatibilidade da superfície de vínculos usada em D2;
não inicia a persistência/recuperação geral D3, lote original daquele critério.
Vínculo revogado usa reativação explícita; autoria anterior permanece intocada.
Advisor local sem novo alerta: somente unaccent/public histórico. 108 migrations
no conjunto. Lint/Markdown pertinentes e tipos/build do runner passaram;
o aviso de nome de ref foi corrigido e só seu arquivo foi revalidado.
Instalação limpa/evolução legada e suítes gerais ficam para a CI
do novo SHA. Sucessão/contagem BAL futura completa, P07 e demais critérios D2
continuam em execução, sem merge, GO ou homologação humana/física/provedor.
