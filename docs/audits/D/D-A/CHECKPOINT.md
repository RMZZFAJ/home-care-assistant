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

## D2.11 — estoque: consultas independentes

Prévia de desligamento publicada em 59b2e292cab4fc584302f5935ece09d4b9efa0d0.
CI 42134849214 estava in_progress na consulta pontual. O ensaio anterior
de estoque falhou: painel sem produto após erro do histórico. A leitura do
fonte confirmou Promise.all descartando o saldo válido; o seletor de região
também ainda não existia, limite dessa contraprova anterior à implementação.

Saldos e histórico agora têm resultado, retry, instante e erro independentes.
Retenção só no mesmo filtro e em erro transitório; 401/403/404 descartam dados.
Mudança de custódia/página não apresenta consulta antiga como atual. Vazio só
após consulta válida, nunca por erro. Paciente continua sendo a chave da tela.
Nenhum contrato RPC, grant, migration ou ledger foi alterado.

Três tarefas Chromium passaram: falhas isoladas/simultâneas e recuperação,
última consulta com aviso e isolamento de custódia, mais o consumidor existente
de revisão/paginação/filtro/compensação com saldo final 21 e produto inativo
preservado. Leitura independente confirmou dois produtos e ledger imutável.
Foco/axe/overflow em 320/390/768/1440 e captura de 320 px inspecionados.
Logs locais: stock-availability-before.log, stock-availability-e2e.log e lint.
O único erro de lint inicial era expressão no helper do teste; corrigido e
somente esse arquivo revalidado. Tipos/build passaram no runner. Suítes gerais
ficam para a CI; catálogo, transferências e demais critérios D2 seguem abertos.

## D2.12 — catálogo: fatores e capacidade equivalente

Isolamento de estoque publicado em 3ff00683a01c0d13d6ac905d164e87bb9438302f.
CI 42136087448 estava in_progress. A consulta da execução anterior, 42134849214
do SHA 59b2e29, confirmou banco success: replay limpo/legado de 108 migrations
e integrações completas. Ubuntu falhou apenas no import rpc sem uso em
delivery-regularization.test.mjs; Windows foi cancelado e navegadores estavam
em execução. Import removido, lint do arquivo passou; não se repetiu a suíte
funcional por remoção de import. Não houve verde presumido dos demais jobs.

Contraprova Auth reproduziu fator NaN persistido. Migration 20261106002443
valida finitude/positividade/limite/precisão antes da coerção e pares de campos,
preserva código textual e recusa colisão com outro produto atomicamente.
Constraint protege novas escritas; validação integral é condicional à ausência
de fator legado inválido, sem reescrever história. Configuração e identidade
do produto seguem locks stock→catalogue e revalidam capacidade ao final, também
após espera tardia. Configuração registra seu autor em audit_events.
Alias /api/catalog agora exige catalog.manage, igual à ação product em /api/admin.

Nove casos Auth passaram: fatores inválidos sem efeito parcial, 1,5 válido,
código com zero, colisão, delegado sem access.manage/outro paciente recusado,
cinco esperas observadas com revogação e ACL/DML estreitos. Uma fronteira API
passou; duas tarefas Chromium distintas passaram entre rodada e recheck.
Primeira comprovou as duas rotas com sessão real, fator e negativas HTTP;
segunda cadastrou 1,5 mL na UI. O seletor inicial getByLabel não alcançava o
select cuja árvore acessível mostrava combobox Produto; corrigido para esse
papel/nome e repetido somente o caso. Nenhum assert material foi removido.

Lint pertinente passou após retirar import novo sem uso; Markdown e tipos/build
do runner passaram. Advisor local retornou somente unaccent/public histórico.
109 migrations; instalação limpa/evolução legada e suítes gerais na CI do novo
SHA. C029/C044/proveniência/apresentações, P07, BAL e demais D2 permanecem em
execução. Sem merge, alteração remota, conclusão D-A ou GO.

## D2.13 — apresentações versionadas e proveniência da conversão

Finitude/capacidade equivalente publicadas em 80753c16b9b2dcf5221eb739a8feb38f1bf6eaae.
Consulta pontual da CI 42137449589: in_progress. A contraprova Auth de ENT
com 2 embalagens/20 base confirmou perda do fator/código na linha oficial.
Migration 20261106003523 acrescenta versões, comandos imutáveis por ator/chave
e captura da conversão na coluna presentation_conversions, distinta de metadata
legada. A captura anterior desconhecida é rotulada, sem inventar autoria/data.
Unidade com apresentação não é reinterpretada antes do primeiro ledger.

Comando novo exige identidade/versão, permite recuperar o próprio resultado com
leitura viva e separa resultado aplicado de cadastro atual posterior. Novas
escritas exigem catalog.manage/paciente ativo e revalidação após espera tardia.
O contrato legado mantém configuração de unidade/criação de código novo;
edição cega de código existente é recusada e direcionada ao comando versionado.
A disputa aplicativa com 40001 causou upstream timeout na stack local. Refinada
para PT409 e mapeamento VERSION_CONFLICT; os três rechecks afetados passaram
com recusa explícita, sem reduzir a negativa. Apenas definições da migration
não publicada foram refinadas localmente, com guardas e sem reset.

Oito casos Auth distintos passaram entre rodada e rechecks: captura no banco,
2x10=20 após cadastro12 e retry, rejeição de total/fator/versão/identidade forjados,
draft preservado e edição obsoleta recusada, resultado próprio após escrita
revogada versus versão posterior do par, concorrência, espera tardia com
rollback de história/comando e RLS/grants. Duas correções de fixture foram
necessárias: oracle privilegiado de saldo migrou da view filtrada por Auth
para somatório independente do ledger; segundo setup trocava o contexto do
cliente cacheado. A primeira rodada de negativas nesse contexto não conta.
Fixture agora seleciona o paciente correto, prova um controle válido e exige
a mensagem específica da conversão recusada. Só os dois casos afetados foram
repetidos. Dois consumidores legados de fator/espera foram adaptados ao comando
versionado e passaram. Três fronteiras API passaram.

Seis tarefas Chromium distintas passaram entre rodadas/rechecks: consumidor
fracionário de 1,5 mL; criação com resposta perdida/código duplicado/inativação;
comparação e adoção explícita/leitura sem inputs editáveis; emissão20 e
recuperação após cadastro12; escolha obsoleta20 só muda para24 após adoção;
consumidor anterior de REQ/scan/foto real decodificada/trânsito/aceite.
Três interrupções iniciais eram seletores dos testes novos. Rechecks dirigidos
alinharam o nome acessível, inclusive a ajuda da origem COM, sem remover
asserções de quantidade, autoria, unicidade ou ledger. Inativação preserva
estoque e devolve foco ao controle estável; duplicata conserva campos/foco.
Axe/overflow e teclado a 320/390/768/1440; captura do editor a 320 px inspecionada.

PDF aeb585f4, v3: 2 embalagens de fator10, código 0123456789012 e base20 após
cadastro12. Compra/chegada creditaram 20 uma única vez, com receiptId/ator reais.
Snapshot/hash/registro do renderer confrontados; as três páginas foram
renderizadas por PDFium e inspecionadas. SHA-256:
f4b774f574d561346b6ba226c8e3a66b58a28107141bfae3974102a6f2365462.
Manifestos locais presentation-provenance-...-verification.json e -visual-review.json.
Sem sobrescrever PDFs anteriores; sem assinatura, pessoa, impressão, aparelho
físico, provedor ou homologação geral D4.

Lint pertinente, tipos e build do runner passaram. Advisor local: somente
unaccent/public histórico. 110 migrations; replay limpo/legado e suítes gerais
ficam para a CI do novo SHA. O read hook de estoque foi movido sem alterar seu
comportamento para use-scoped-read, agora consumido também por apresentações.
CI ganhou concorrência nativa por PR: um novo commit cancela runs superadas que
já usem a configuração. Pushes master têm grupo único. YAML foi parseado e
jobs/triggers/permissões comparados com o HEAD anterior: intactos. Execução
cancelada não aprova SHA. Sem polling ou duplicação local das suítes gerais.
BAL, sucessão, P07, rastreabilidade de estoque e demais critérios D2 continuam
em execução. Sem merge, banco remoto, conclusão da missão ou GO.

## D2.14 — revisão BAL com autoria própria e referência preservada

Apresentações publicadas em 8e7c7a1; complemento documental em 66b95b4.
O commit independente 0348342 de conexão SonarLint foi preservado. Sua CI
42142741347 estava in_progress na consulta anterior; 42142658842 de 66b95b4
foi cancelada. Nenhum resultado pendente/cancelado foi tratado como verde.

Duas contraprovas Auth reproduziram contador legado revisando o próprio ato
e conciliação após referenceRevision NULL. Migration 20261106012400 resolve
contador pelo evento efetivo, separa balance_reviews imutável de bal_approvals
legadas e protege aplicação com IS DISTINCT FROM. appliedRevision/appliedBy
identificam o efeito confirmado. Revisão posterior facultativa pode registrar
parecer histórico, sem reaplicar estoque ou validar saldo posterior.

Comando usa locks stock→document, ator/grupo reais, versão da contagem e
hash da referência. Recupera intenção própria confirmada antes de exigir nova
escrita, com leitura viva. Revogação após espera de estoque/FK impede o efeito
e desfaz parecer/evento/ledger. Reconto muda o contador efetivo e a elegibilidade
das revisões antigas, preservando autor original e pareceres de cada versão.
Não se inventa elegibilidade histórica nem nome antigo a partir do cadastro.

Doze casos Auth distintos passaram entre rodadas/rechecks: auto-revisão legada,
parecer distinto, facultativo sem fila universal/sem segundo ajuste, limite
de texto, NULL, recuperação/revogação, duas esperas observadas, concorrência,
reconto com autores distintos, RLS/grants e referência posterior. Consumidores
existentes de substituição no mesmo intervalo e SQL document-invariants passaram.
Advisor all retornou 13 WARN; a policy de comandos de apresentação ganhou
initplan do ator nesta migration incremental, sem alterar o predicado por
paciente. Consumidor Auth de isolamento passou; advisor final caiu para 12:
onze avisos initplan preexistentes e unaccent/public, sem aviso novo de BAL.

Três fronteiras API passaram. A primeira rodada detectou que Zod 4.6.7 max
conta pontos Unicode, divergindo do maxlength do navegador e do limite do
banco. Validação explícita UTF-16 agora aceita 1.000 emojis e recusa 1.001;
parecer nulo, autoria forjada e referência malformada são recusados antes de Auth.

A fixture da espera de perfil inicialmente tentou inserir um override cuja
FK esperava o próprio lock controlado. O teste foi cancelado, não validou a
fronteira. O único holder identificado por PID/usuário/estado/marcador/lock foi
encerrado; fixture passou a criar override antes da espera e somente alterar
enabled com statement_timeout durante a barreira. As duas esperas passaram no
recheck, com rollback integral. Isolamento começou com contexto global inválido
para adminB; corrigido para seu paciente real, controle de leitura positivo e
negativas específicas passaram. Nenhuma dessas falhas conta como passe.

BAL-03 mantém contagem/notas em leitura e parecer vazio até 2.000 caracteres.
Consultar/adotar referência preserva o texto; pendência obsoleta exige reconto.
Resposta perdida congela corpo/chave e permite recuperar após revogar escrita.
Três tarefas Chromium distintas passaram: revisão facultativa/recuperação,
conflito→reconto→consulta→adoção explícita e consumidor por plantão. A asserção
final do conflito consultava uma lista resumida sem notas; foi corrigida para
o snapshot persistido e somente esse caso repetido. Axe/overflow/foco nas
larguras 320/390/768/1440; captura do drawer a 320 px inspecionada.

PDF BAL 2eb073aa, v2, SHA-256
c5890961a25e4c967ed8283b82724e71129b39ff4c5436761e19776d90d4612f:
contador, notas originais, parecer familiar de 2.000 unidades e marcador final,
versão revisada, ressalva de não reaplicação e cronologia distintos. Snapshot,
registro do renderer/hash e ledger antes/depois confrontados; três páginas
renderizadas por PDFium e inspecionadas. Manifestos bal-review-...-verification.json
e -visual-review.json preservados localmente, sem sobrescrever exemplar anterior.

Lint pertinente e tipos/build do runner passaram. 111 migrations; instalação
limpa/legada, suítes gerais e matriz dos browsers ficam para a CI do novo SHA.
C054 tem evidência local; C7-AC-003 permanece parcial porque reconto facultativo
de ciclo já conciliado/sucessão futura ainda não foram concluídos. C056/C057,
P07 e demais critérios continuam em execução. Sem merge, alteração remota ou GO.

## D2.15 — decisão de adiamento obsoleto sem alterar o prazo

Revisão BAL publicada em 5535c5562fee1f9355693fbcc8a217564f684acf. Draft PR 7
permaneceu aberto e Draft. CI 42148205279 desse SHA estava queued na consulta
pontual; não foi acompanhada por polling nem presumida aprovada.

Contraprova Auth demonstrou que cancelar legitimamente o plantão futuro
impedia tanto aprovar quanto recusar o pedido pendente: stale document target
shift. A primeira fixture tentou deslocar em uma hora uma ocorrência diária
de 24h e encontrou sobreposição, sem validar C056; substituída por cancelamento
oficial do alvo futuro, a falha de recusa foi reproduzida pelo motivo específico.
Outra contraprova registrou approve NULL como rejeição. As evidências anteriores
permanecem preservadas; não foram corrigidas retroativamente na base fictícia.

Migration 20261106021316 acrescenta decision_snapshot e comando privado dedicado
a decide_deferral. Booleano/motivo próprios são obrigatórios, sem destino ou
ator editáveis. Aprovação exige exatamente alvo/versão congelados e atribuição
vigente; recusa não depende de alvo antigo ainda aprovável e não toca atribuição,
prazos ou ledger. Snapshot registra decisor/nome, motivo, proposta e fontes
observadas. Registros sem captura anterior continuam explicitamente sem nome
preservado. Lock bal→pedido→atribuição, leitura viva na recuperação e
revalidação final do decisor e da pessoa designada protegem a confirmação.

Nove casos Auth passaram em uma rodada após aplicação incremental sem reset:
recusa obsoleta/única, controle de aprovação válida, NULL, corpo/motivo inválidos,
recuperação própria após perda só de escrita, duas esperas observadas com perda
da autorização familiar, perda tardia de bal.count do destino e disputa de
aprovação/recusa. Outro paciente e solicitante não decidiram. Prazos originais,
ledger e rollback foram comparados por leitura independente. Dois consumidores
Auth existentes de adiamento/scheduler e SQL balance-shift-authority passaram.
Três fronteiras API passaram, incluindo 500 emojis aceitos/501 recusados e
conflito sem instrução indevida de reconto de estoque.

BAL-05 mostra proposta/destino/prazo/versão em leitura e situação atual separada.
Alvo alterado desabilita aprovação e mantém recusa legítima. Motivo próprio
permanece durante falha de leitura/conflito; corpo/chave incertos ficam congelados.
O primeiro percurso de recusa/recuperação e o consumidor existente passaram,
mas o retorno do conflito deixou o drawer fora da árvore acessível. Trava de
fechamento isolada não resolveu. Diagnóstico temporário sem payload confirmou
editor/ação corretos e estado preservado; foi removido dos fontes. Edição e
revisão agora usam etapas da mesma superfície, com o formulário mantido montado.

Três tarefas Chromium distintas passaram entre rodadas/rechecks. A mudança da
composição exigiu escopar a asserção do motivo à região de conferência, pois o
textarea preservado e oculto tinha o mesmo texto. Não foi removida a exigência
de leitura, unicidade, foco ou preservação. A rodada final passou os dois casos
novos com campo/foco após conflito, ausência de inputs na revisão, recusa única
recuperada após revogar escrita, descarte explícito e foco no título quando o
acionador perdeu elegibilidade. O consumidor existente passou com a superfície
única. Axe/overflow nas quatro larguras e na conferência; captura 320 px
bal-deferral-2b46075f...-chromium.png inspecionada. Read-back antes/depois no
manifesto local bal-deferral-2b46075f...-browser.json, sem apagar histórico.

Lint pertinente e tipos/build do runner passaram. Advisor all manteve os doze
WARN anteriores (onze initplan e unaccent/public), sem achado novo. 112 migrations;
replay limpo/legado e suítes gerais do novo SHA continuam na CI. C056 tem prova
local; sucessão/reconto facultativo C057/C7-AC-003, P07 e demais critérios seguem
em execução. A via de adiamento imediato e demais famílias de comando ainda
participarão da matriz final C068. Sem merge, alteração remota ou GO.

## D2.16 — consumidor P05 WebKit e evidência de CI por SHA

Adiamento publicado em f9fdb8a25d563d3ce8fccf1e9bf5a976c296d22d. Draft PR 7
atualizado; CI 42152588224 desse SHA estava in_progress na consulta pontual.
Na mesma consulta, CI 42148205279 de 5535c55 já estava concluída com failure:
banco (instalação limpa/evolução legada de 111 migrations e integração completa),
checks gerais Windows/Ubuntu, Chromium e mobile passaram. iOS/WebKit passou
91 casos e falhou em dois percursos P05 no mesmo helper de seleção do conferente.
O agregador reprovou corretamente. Os resultados não validam o SHA posterior.

Logs do job 127668491024 apontaram opção Teste family fora do viewport após
fill/ArrowDown. Os dois casos foram reproduzidos localmente em WebKit pelo
runner da stack conferida. O helper não garantia que o próprio campo estivesse
visível antes de digitar. Agora inicia por clique real no campo, exige campo
e opção inteiros no viewport e mantém a seleção por clique normal, sem force
ou remoção de asserções. Geometria anexada ao relatório comprova viewport
390×664: campos estavam em y1005/y1221; após clique/scroll, y443/y469 e opções
visíveis em y480/y506. Extração local em p05-webkit-choice-geometry.json.

Somente esses dois consumidores usam o helper alterado; ambos passaram no
recheck, incluindo autoria, recuperação, conflito, ledger e PDF já exigidos.
Código do produto, banco e regras não foram alterados. Não se repetiu replay,
integração completa ou checks gerais locais. Lint do teste e Markdown deste
registro são as verificações adicionais pertinentes. A nova CI continuará
responsável por validar o SHA publicado nos três projetos e no replay de 112 migrations.
Emulação WebKit não constitui teste em aparelho iOS físico ou homologação P10.
Reconto/sucessão C057 e demais critérios D2 seguem em execução; sem merge/GO.

## D2.17 — sucessão do reconto agendado e recuperação da responsabilidade

Base publicada 2b18b1b2901ccc9a7ffeb5c0899397e3bbb92671, branch única e Draft
PR 7 preservados. A correção Markdown desse SHA não autoriza tratar sua CI
pendente como aprovada. Dois cenários Auth novos falharam antes da migration
20261106031520: ciclo counted perdeu a atribuição executável após substituição
no mesmo intervalo; contador indisponível deixou fila falsamente vazia.

A migration incremental transfere somente o reconto para a substituta elegível
do mesmo plantão, sem mudar janela, material ou contagem anterior. Sem pessoa
elegível ou com prazo encerrado, mantém pendência explícita de designação.
Leitura bal_recount_context exige bal.read; workspace informa total/recorte das
100 pendências mais antigas. Histórico paginado e detalhe abrem os demais BAL.
Designação exige família/supervisão nativa habilitada, versão documental, hash
da referência e versão exata do destino. Locks stock→bal→documento/ciclo→plantão,
recuperação da própria intenção com leitura viva e revalidação tardia preservam
isolamento e rollback. Helpers privados e leitura pública têm grants estreitos.
O resultado congela contador anterior, pessoa/janela designados, motivo e autor
da decisão; não registra contagem física. Evento recount_recorded distingue o
novo ato de outra satisfação das semanas anteriores.

Oito cenários Auth reais distintos passaram entre rodada e recheck: sucessão
Juliana→Sheila, recuperação da pendência, campos forjados/versões/int32/hash,
isolamento, replay próprio após perda de escrita, recusa após perda de leitura,
concorrência de dois designadores e três esperas observadas bal/perfil, incluindo
perda tardia de bal.count do destino. Sete passaram na rodada ampliada; o caso
de recuperação usava destino filtrado após a revogação e falhou no fixture.
Corrigido para a versão real já capturada do plantão, esse caso e o consumidor
Auth existente de semanas atrasadas/reconto passaram. O novo evento de conclusão
foi integrado e o percurso completo de sucessão passou novamente. Uma tentativa
extra de reaplicar somente esse patch foi recusada pelo guard, pois a primeira
extração local já o incluía; definição viva confirmada, sem reset ou duplicação.

Sheila não herdou autoria de Juliana nem preencheu contagem em nome dela.
Só a designada contou; created_by, eventos/hashes anteriores, parecer da contagem
um e datas originais de cumprimento/atraso permaneceram idênticos. Parecer antigo
da família não aprovou a contagem dois: supervisão e família revisaram novamente.
Entrega pessoal anterior de cinco unidades deu referência física legítima;
contagem nova de uma gerou um único ajuste BAL de quatro, sem consumo inventado.
Quatro fronteiras API passaram, incluindo ausência/coerção de versão, autoria
forjada, UUID inválido, UTF-16 e classificação do conflito para comparação.

Duas tarefas Chromium passaram de primeira no runner da stack local: designação
com resposta perdida e recuperação após perda da escrita, substituição, contagem
pessoal vazia, revisão e PDF; pendência sem contador, falha da consulta após
conflito real de versão, motivo/foco preservados, comparação Camila/Márcia,
adoção explícita e nova confirmação. Revisão é somente leitura; fechamento
retorna ao título estável. Axe/overflow 320/390/768/1440 e captura de 320 px
inspecionada. Relatório e logs locais bal-recount-* preservam as tentativas.

PDF bal-recount-7c201aa0-cd96-40e0-9caa-ac2b5b124b49-v5.pdf:
SHA-256 8bfb836c37b91cee81dfd27cfaa15a4cc7fd4137d12e7ce1811bff0a5a246cd8.
Três páginas renderizadas por PDFium e inspecionadas; nomes/observações de ambas
as contagens, linhas antigas, três pareceres próprios, hash e histórico confrontados
com snapshot/renderer/ledger. Continuação do parecer familiar na terceira página
legível, sem corte. Fonte, leitura independente e manifestos locais adjacentes.

Lint pertinente, tipos/build do runner e Markdown dos documentos afetados
compõem a validação proporcional. Advisor all mantém exatamente os doze WARN
anteriores, onze initplan e unaccent/public, sem achado novo. 113 migrations;
instalação limpa/legada e suítes gerais do SHA publicado ficam na CI. C057 tem
prova local no BAL agendado submetido. Reconto facultativo após conciliação,
legado sem ciclo, demais famílias C068, P07 e critérios D2 restantes continuam
em execução. Sem zoom400%/humano/AT/aparelho/provedor ou liberação operacional.

## D2.18 — consumidor mobile de apresentações e CI por SHA

Reconto/sucessão publicado em eb5c6783e982ec5a478c872ea8083c77177a78b1;
Draft PR 7 atualizado. CI 42159112693 desse SHA estava in_progress na consulta
pontual. A consulta do SHA anterior 2b18b1b mostrou failure em 42153551800:
checks gerais Windows/Ubuntu, banco com replay limpo/legado de 112 migrations
e integração completa, Chromium e iOS/WebKit passaram. Mobile falhou em um
caso de apresentações, na segunda seleção de material, inclusive no retry.
Os consumidores P05 WebKit corrigidos em D2.16 passaram nessa matriz.

Log do job 127686309124 e artifact 13474393531 inspecionados. ZIP baixado pelo
conector GitHub com digest 0aabb5fd08707f08267efcc6949be638bb5766ecdfcb22e246831661d7fd819b
conferido; duas capturas/contextos preservados em output/phase-d-work. Clique
da opção era interceptado pelo portal. O teste local dirigido antes da mudança
passou, portanto não se declarou reprodução local dessa falha específica.
O helper digitava logo após abrir o drawer, sem esperar o próprio campo estável.

Seleção agora começa por clique normal no campo, exige campo/opção inteiros no
viewport, verifica que o centro da opção recebe o ponteiro e seleciona por
clique normal. Confere também o material escolhido. Sem force, aumento de timeout,
sleep fixo ou redução das asserções materiais. Geometria anexada mostra viewport
412×839: campos ainda estavam em x339/x618 durante entrada do drawer; após
clique ficaram em x26, e opções em x29 com largura355. O arquivo local
presentation-mobile-pointer-geometry.json conserva os dois controles observados.

Somente esse cenário usa o helper, em duas escolhas. O recheck mobile dirigido
passou, incluindo recuperação da criação própria, inativação histórica, código
duplicado, formulário/foco preservados, ledger idêntico e axe/overflow nas quatro
larguras já previstas. Lint do teste passou. Produto, migrations e regras não
mudaram; não se repetiu integração completa ou replay local. CI posterior precisa
validar o SHA publicado. Reconto facultativo/legado e demais critérios D2 seguem
em execução; nenhum resultado local ou anterior equivale a GO/homologação física.

## D2.19 — reconto após conciliação e legado sem obrigação semanal

Base 24bc154d0f0d95e6dc67708680b4df5df9d02ae7, publicada e Draft PR preservado.
CI 42159766519 estava in_progress na consulta pontual. Duas contraprovas Auth
falharam antes da migration 20261106040155: BAL facultativo já aprovado não
permitia nova designação; legado sem ciclo também não oferecia o caminho formal.

A migration amplia designação para submetido/aprovado, preservando o estado e o
efeito anterior durante a preparação. Ciclo técnico legacy_recount guarda o
instante oficial anterior somente se conhecido, sem inventar obrigação/data
semanal ou ativar regime. A nova profissional tem plantão real e confirmação
pessoal. Novo ato usa referência atual e política preservada: facultativa aplica
só o delta atual; exigida aguarda os novos pareceres. Snapshots, created_by,
pareceres, movimentos e datas anteriores não são reescritos. A contagem revalida
leitura, bal.count, vínculo e fim da janela após efeitos tardios. Recuperação
própria precede nova capacidade de escrita e não repete a conciliação.

Sucessão/indisponibilidade de reconto agora independe de regime semanal ativo.
Worker nativo inclui essas atribuições na mesma rotação limitada, com helpers
privados sem EXECUTE para clientes e índice parcial de candidatas. Sem segundo
worker. A API preserva campos/versões da designação do incremento anterior;
hasRecountCycle distingue ciclo formal da existência de agenda semanal.

Cinco cenários funcionais Auth distintos passaram entre rodada e rechecks. C7 exato:
entrega pessoal deu referência20; Juliana contou18 sem parecer/fila universal;
Sheila formalmente designada contou17. Dois movimentos BAL de dois e um,
sem consumo inferido. Parecer facultativo posterior não reaplicou o efeito;
retry após perda de bal.count recuperou a contagem confirmada. Legado foi contado
pela designada sem regime/semanas. Aprovação legítima da contagem um enquanto
reconto estava designado não bloqueou o novo ato nem eliminou seu efeito prévio.
Perda de bal.count após espera tardia observada no FK/perfil retornou 42501,
com rollback de delta, evento e versão. Legado também transferiu o mesmo plantão
e mostrou pendência após perder o novo contador, sem tocar documento ou estoque.

Dois consumidores Auth existentes passaram: sucessão/pareceres do incremento
anterior e regularização de semanas antigas. No novo teste de ausência de semanas,
o agregado SQL sem linhas retornou NULL, enquanto o readmodel retorna array vazio.
A asserção foi corrigida para cada contrato, exigindo também count(*)=0, sem
tratar NULL como prova suficiente de ausência. Só esse caso foi repetido.
Lint inicial acusou import actor sem uso após extrair o fixture compartilhado;
removido, lint pertinente passou. O unitário PDF afetado preservou as três semanas
legítimas do consumidor anterior. Não se duplicou replay ou suíte geral local.

A interface usa Balanço de estoque, sem chamar todo BAL de semanal. Reconto
legado abre a contagem pessoal vazia e a conferência explicita efeito facultativo
ou revisão exigida. Histórico mostra links para PDFs das versões das contagens,
inclusive sem pareceres, usando a rota versionada existente e seus controles.
Não se duplicou todo o histórico material em cada snapshot novo. O PDF da janela
legada informa ausência de obrigação semanal e não imprime semanas vazias.

Duas tarefas Chromium passaram no mesmo runner: novo percurso legado com
designação, contagem pessoal, perda da resposta após aplicação, revogação de
bal.count e recuperação sem segundo delta; consumidor anterior com ativação,
contagem/referência, resposta perdida e documento real. Fontes estáveis durante
a execução; tipos/build do runner passaram. Axe/overflow 320/390/768/1440 no novo
fluxo; sem zoom400%/AT/humano/aparelho físico. Relatório local preservado em
bal-optional-recount-report.html, logs bal-optional-recount-*.

PDFs bal-optional-recount-f8e637d3-7ca8-4398-960c-4ad66931bea1:
v1 SHA-256 490d290321166c7b575b902d8853b089a9e6b8efed80ac54ebcd5f8172def12e;
v2 SHA-256 4071bb0f5b17a1de9f476e5f48d9b8021595ad77c5f7a0cf0e93b999550d625d.
Quatro páginas renderizadas por PDFium e inspecionadas: v1 conserva contador,
observações e quantidades dois; v2 identifica Sheila, quantidades um, janela
formal e ausência de semanas. Hashes canônicos/bytes/renderer, eventos e ledger
confrontados por leitura independente. Fonte e manifestos adjacentes preservados.

Advisor all mantém exatamente as doze chaves WARN anteriores, onze initplan e
unaccent/public. 114 migrations; 84 históricas preservadas. Instalação limpa,
evolução legada e matriz geral do SHA publicado ficam na CI. C7-AC-003 e trecho
BAL de C-FINAL-AC-016 têm prova local integrada. C068 restante, P07, catálogo,
rastreabilidade/destinação e demais critérios D2 continuam em execução. Sem merge,
alteração remota, assinatura/provedor ou liberação operacional definitiva.

No fechamento deste incremento, a consulta pontual da CI 42159766519 de 24bc154
mostrou failure: checks gerais Windows/Ubuntu passaram, instalação limpa/legada
de 113 migrations passou, mas integração falhou com BAL document required nas
leituras do workspace; browser foi skipped. Não houve falha mobile nova observada
nesse SHA, pois a matriz visual não foi executada. Logs do job 127725650966 foram
inspecionados, sem polling. O resultado não certifica o código local posterior.

O readmodel de recuperação chamava projeção exclusiva de BAL em CTE passível de
reordenação antes da restrição de identidade/tipo/paciente. Esse é o caminho
inferido da fonte e do erro; o plano original de CI não foi reproduzido no banco
local retido, inclusive em quatro probes de plano com uma REQ legítima. Uma
contraprova Auth controlada com vínculo de tipo incompatível, permitido pelo FK
histórico de existência, reproduziu o mesmo erro 22023. Esse fixture artificial
foi removido no finally com ID/paciente/documento exatos; não se afirmou que a CI
continha vínculos corrompidos.

Na migration 114 ainda não publicada, a consulta agora materializa primeiro as
identidades BAL do próprio paciente e somente depois chama a projeção. Foi
aplicada localmente só a definição refinada, sem reset nem edição da 113 publicada.
A rota específica continua recusando REQ; autorização/RLS não foram relaxadas.
Cinco controles dirigidos passaram: contraprova de tipo, recuperação válida
submetida, recuperação válida aprovada/legada, recusa de adiamento e duas edições
BAL concorrentes com mesma intenção. Somados aos anteriores, seis casos Auth
novos e cinco consumidores Auth distintos neste incremento. Suíte completa e
plano/dataset limpos do SHA publicado continuam sob a CI, sem verde presumido.

## D2.20 — preservar o rascunho BAL ao atualizar a referência

Consulta pontual de 357d159, run 42180846088: checks gerais Windows/Ubuntu
success; replay limpo/legado preservou protocolos, quantidades, FKs e saldo
sem paciente, mas transactions.sql falhou com invalid operation for document
state. Integração e browser não chegaram a executar. Sem polling.

O bloco de reaplicação da migration 114 alcançava também p_recount em draft.
A contraprova Auth bal-draft-recount.test.mjs usa paciente e materiais novos,
cria rascunho, expede ENT para tornar a referência obsoleta e atualiza a
contagem: antes retornou approved quando deveria permanecer draft. Uma primeira
asserção do teste esperava PT409; a fronteira legada usa P0001 para referência
obsoleta. Corrigido esse contrato, o defeito material foi reproduzido.

Migration 20261106075328 restringe a reaplicação aos BALs que já não eram draft.
Nenhuma migration publicada foi editada. test:db:prepare passou sem reset.
Dois casos Auth dirigidos passaram: atualização preserva draft e zero movimentos
BAL até o submit explícito, com recuperação idempotente e dois ajustes esperados;
reconto facultativo agendado após conciliação preserva seu efeito anterior.

A execução isolada de transactions.sql na base local retida parou antes do
trecho BAL por duplicate review required, pois contém necessidades anteriores
do mesmo fixture. Não foi declarado PASS SQL, nem feito reset para repetir uma
evidência que a CI executa com dataset próprio. Replay e regressões completas
continuam necessários no SHA publicado. Logs bal-draft-recount-before/after,
-migration e -transactions preservados em output/phase-d-work.

115 migrations publicadas neste commit; 84 históricas preservadas. Trabalho P07
ainda não publicado permanece separado. D-A segue incompleta, sem merge,
alteração remota ou liberação operacional. Validação local proporcional à causa;
não foram repetidos check:contracts, suítes gerais ou build já previstos na PR.

## D2.21 — declaração, concordância e expedição da transferência P07

Migration 20261106073728 usa ENT e ent_transfers, sem novo tipo de documento,
capacidade padrão ou grant implícito. Declaração congela materiais, declarante,
contraparte, recebedor e origem ENT conhecida, com razão própria e referência
consultada. Cria transfer_pending sem protocolo ou movimento. A contraparte
registra agree/decline pessoal; agree produz transfer_ready, sem mover estoque.
Somente o declarante autorizado expede, após revalidar pessoas e saldo. O motor
ENT preservado gera protocolo, debita origem e credita trânsito; somente o
recebedor designado confirma o fato físico, inclusive parcialmente. Contraparte
e recebedor podem ser a mesma pessoa, mantendo atos separados.

O destinatário fica congelado nesta declaração bilateral; sua troca exige outro
processo explícito, preservando cancelamento e recebimentos. A troca de ENT comum
permanece disponível. Proposta ainda não expedida admite retirada própria ou
encerramento administrativo com autor/kind efetivos, sem falsificar decisão ou
aceite da pessoa desligada. Tabela tem RLS/SELECT por paciente e ent.read, histórico
imutável e sem DML cliente. Intenções ficam em private.transfer_commands, sem
grants de cliente. A cadeia anterior ficou sem execução direta; wrapper público
preserva seus consumidores. Nenhuma migration publicada foi editada.

test:db:prepare aplicou incremento na stack home-care-assistant, API54321/DB54322,
sem reset. Refinamentos da migration ainda não publicada usaram somente
CREATE OR REPLACE das definições afetadas; tabelas/rename não foram repetidos.
UUIDs foram tornados canônicos; referência e paciente ativo são revalidados ao
final. Origem ENT exige aceite positivo do material na custódia correspondente;
o vínculo é documental, sem inventar lote. Inativo com saldo positivo permite
destinação física sem reativação ou baixa inferida.

Treze cenários Auth distintos passaram entre rodadas e rechecks:

- Juliana declara, Ana concorda e Bruno recebe três de cinco: TEAM5, FAMILY23 e
  TRANSIT2. Declaração/concordância não movem; Ana/admin não recebem por Bruno.
- Mesma contraparte/recebedor registra dois atos; direção FAMILY → TEAM funciona.
- Concordância e retirada concorrem na mesma versão; somente uma confirma, sem
  movimento. DML direto é recusado; recebedor não tem tarefa antes da expedição.
- Mesma chave/intenção recupera declaração, concordância e expedição depois da
  perda da respectiva escrita; nova intenção e perda de leitura continuam negadas.
- Material inativo preserva identidade/saldo e segue expedição/aceite reais.
- Revogação durante espera observada no lock de estoque impede a declaração.
- Três esperas tardias observadas em FK/perfil impedem declaração, concordância
  e expedição após perda da autoridade do ator, revertendo todos os efeitos.
- Cancelamento de retorno recebido cinco referencia consumo familiar confirmado
  de dois e devolve somente três; retry não debita consumo ou devolução outra vez.
- Recusa deixa código/protocolo NULL e zero movimento; origem sem leitura e
  paciente estrangeiro são recusados.
- Contraparte desligada não decide; administrador encerra com autoria própria,
  preservando declarante e saldo. RLS oculta a proposta do vínculo revogado.
- Revogação da contraparte durante a espera tardia do expedidor reverte também
  o movimento nativo, preservando a concordância anterior.

Os primeiros asserts de quantidade esperavam texto normalizado; PostgREST retorna
número e stock_quantity retorna numeric com escala. Foram ajustados para
comparação numérica exata nos inteiros do fixture, sem mudar os saldos esperados.
O caso inativo isolado foi repetido; não se repetiram os oito já aprovados.
Dois consumidores existentes passaram: P06 reassign preservando indicação e ENT
com consumo confirmado/retorno real. Logs transfer-bilateral-*, transfer-inactive,
transfer-cancel-compatibility e transfer-counterparty-boundaries preservados.

Três fronteiras API passaram: declaração estrita/quantidade exata, separação dos
comandos e conflito seguro. O caso UTF-16 reprovou o limite inicial do schema para
501 emojis; o schema agora verifica unidades UTF-16 e mínimo de três caracteres,
alinhado ao banco. Recheck passou, mantendo as negativas. A API de recuperação
exige ent.read; o banco decide novas escritas e autoria.

Interface /transferencias usa gaveta única, seleção explícita das três partes,
materiais/quantidades base, origem documental opcional e motivo próprio. Consulta,
erro inicial, vazio, comparação e adoção são explícitos. Pacote incerto permanece
congelado até recuperação, inclusive depois da perda de ent.create. O detalhe
mostra atos preservados; tarefas de concordância/expedição são filtradas antes da
paginação. Recusa/encerramento não geram recebimento. O percurso ENT anterior foi
mantido; não há remoção nem migração silenciosa de intenções pendentes.

Dois percursos Chromium distintos passaram entre rodadas dirigidas. O primeiro
confirma os três autores, resposta de declaração perdida após commit, perda de
escrita e recuperação do mesmo pacote, saldo inativo, expedição e aceite3/5;
axe/overflow 320/390/768/1440 e PDF real. O segundo produz referência obsoleta por
consumo confirmado, falha de consulta503, adoção explícita e campos preservados;
depois encerra a proposta durante o parecer e exige comparar/adotar sem reabrir
ato encerrado. Justificativa e foco permanecem. Fontes estáveis nos runners,
sem suíte mutável de banco em paralelo. Tipos/build dos runners passaram.

O primeiro teste esperava403 ao solicitar saldos sem stock.family.read; o contrato
existente responde200 com somente dados autorizados. Corrigida a expectativa,
as negativas verificam ausência de FAMILY nos movimentos/métricas e family NULL
no overview. Uma fixture manteve ent.create revogada também ao tentar uma nova
concordância, corretamente recusada; restaurada somente após concluir a prova de
recuperação, antes do ato novo. Não houve relaxamento da autorização.

A primeira rodada visual reproduziu perda de foco no conflito; a restauração
agora ocorre após o fieldset voltar a habilitar. Screenshot também mostrou
quantidade de declaração rotulada Expedido; o componente agora mostra Declarado
até a expedição efetiva. O novo percurso exige essa distinção. Depois da segunda
rodada, só o percurso ainda falho foi repetido. Relatório final do primeiro em
transfer-three-actors-report.html; aprovação do conflito no log da segunda rodada.

PDF transfer-8c8d7657-b718-40ef-b4de-971d0661f8ff-v4, três páginas:
SHA-256 149236af170ef4e43e8fe35f8f131626507aa73495d6014f8318a5dcb66230a3.
Bytes registrados/API, hash canônico, quatro eventos, autores distintos e ledger
foram confrontados independentemente. As duas primeiras versões não têm protocolo
ou aceite; somente expedição5 e recebimento3 acrescentaram movimentos. O arquivo
registrado foi preservado. Sua inspeção achou seta sem glifo na página2: fonte
final usa a palavra para. Só o renderizador foi chamado novamente, sem repetir
E2E, com o mesmo snapshot/hash e sem alterar registro/estoque. Artefato separado
-final-renderer.pdf tem SHA-256
ac8749d54017b02903421da4bf5e515a839518959fd4675f18fde9545ad29d0e.
As três páginas finais foram inspecionadas; nomes, aceite3, divergência2, origem,
declaração/concordância, histórico e hash estão legíveis. Esse segundo arquivo
não é o render anterior registrado na API; CI deve produzir o PDF novo pelo fluxo
real no SHA publicado. Manifestos -source/-database/-integrity/-verification e
PNGs adjacentes preservam a distinção. Screenshot320 inspecionado; sem prova
humana/AT/zoom400%/aparelho/provedor ou assinatura digital.

Advisor all, local, manteve exatamente as doze chaves WARN do incremento anterior,
onze initplan e unaccent/public. A primeira conexão CLI expirou; Docker SQL e
probe TCP confirmaram a stack, e uma nova consulta concluiu sem diferenças.
116 migrations agora no conjunto; 84 históricas preservadas. Replay limpo/legado,
integração completa e suítes gerais ficam na CI do novo SHA. CI 42184146007 de
57f6cdc estava in_progress na consulta pontual; não certifica este incremento.
Sem merge, alteração remota, envio externo ou conclusão global de D-A. C7-AC-010
continua parcial até equivalência integral e tratamento das intenções antigas;
a interface anterior permanece. Demais critérios D2 continuam em execução.

Na consulta final disponível do mesmo run83/57f6cdc, database, checks gerais
Windows/Ubuntu, Chromium e mobile concluíram success. Logs confirmaram replay
limpo/legado, regressões SQL/search_path e 203/203 integrações. A correção do
rascunho BAL e a seleção materializada foram exercitadas no dataset limpo da CI.
iOS passou97/falhou1, incluindo retry: o consumidor do reconto sem contador
encontrou BAL-0001 no DOM, mas oculto. A investigação desse consumidor é um
incremento separado, sem mudar os testes aprovados de transferência. Esses
resultados pertencem a 57f6cdc; não aprovam o SHA seguinte de P07.

## D2.22 — identificação visível do reconto na tela estreita

Falha comprovada na CI 42184146007/57f6cdc, job iOS127783562356:97 casos passaram,
um falhou também no retry. O código BAL estava no DOM da região de recuperação,
mas toBeVisible recebia hidden. Artefato13488725094 foi baixado e confrontado com
SHA-256 6b1c07d9d3e53dd8d7b313a4c3cd2c77a0afbe118a64b6b30d1208cb3e9710a4;
duas imagens e dois contextos foram preservados, sem executar instruções deles.

Uma execução local somente do caso BAL reconto sem contador, projeto iOS, manteve
a falha. Diagnóstico geométrico mediu viewport390, linha324, ações284 e largura
zero tanto no strong do código quanto na identificação flex:1 1 0%; nowrap.
Portanto era defeito de layout visível, não ausência do registro ou mero seletor.
Log recount-recovery-ios-before e geometria/screenshot anteriores preservados.

Uma classe exclusiva dessa linha permite quebra, reserva base de12rem para a
identificação e conserva as ações dentro da largura disponível. A regra geral
dos demais registros não foi alterada. Após a correção, o mesmo caso iOS passou:
identificação/código296px, ações296px e wrap. O teste conserva as negativas e todo
o percurso de conflito, falha de consulta, texto/foco, adoção explícita, resultado
e preservação de documento/obrigações/ledger. Acrescenta largura positiva e
visibilidade real em 320/390/768/1440, com axe/overflow e screenshots320/390.
As duas imagens finais foram inspecionadas: código, contador e ações legíveis.

Tipos/build do runner e lint dos dois fontes afetados passaram. Somente o caso
que falhou foi executado antes/depois; não se repetiram os97 aprovados da CI,
Auth, migrations ou suítes gerais. Sem alteração de banco, permissões ou saldo.
Relatório recount-recovery-ios-after-report.html e anexos geométricos preservados
em output/phase-d-work e output/playwright/phase-d. A evidência é emulação WebKit,
sem substituir aparelho físico/AT/zoom400% ou CI do SHA publicado. D-A permanece
em execução, com116 migrations; sem merge ou operação remota.

## D2.23 — origem tipada dos movimentos de estoque

A CI42191441950/run85 do SHA20eac215 concluiu success. Confirma o conjunto
programado desse SHA, incluindo replay/integração e os três projetos de browser.
A correção iOS e P07 publicados deixaram de depender do resultado de um SHA
anterior. Não se repetiram localmente essas suítes gerais aprovadas.

C-AC-046 recebeu GET /api/stock/movements/:id/origin e gaveta somente leitura.
O servidor usa exclusivamente o cliente Auth do chamador: primeiro movimento
visível no paciente/custódia, depois recurso real autorizado. Parcela de compra
resolve receiptId e documentId distintos; a gaveta mostra somente a parcela de
origem. ENT/BAL consultam a ficha, consumo consulta o relato e compensação
familiar conserva o movimento original. Inventário legado fica somente leitura.
Referência ausente, incompatível ou restrita recebe explicação explícita, sem
adivinhar ficha. Nome atual de perfil/catálogo é rotulado como atual; as origens
preservam sua autoria histórica. Quantidade do ledger usa texto decimal exato.

Sem schema, migration, grant ou RPC privilegiada nova. As leituras usam a RLS
existente e os leitores documentais/consumo nativos, sem cliente de worker.
Acesso ao movimento não concede COM; UUID de parcela não é aceito como UUID de
movimento. Origem estrangeira/invisível retorna404. API privada usa no-store.
Links anteriores Abrir ficha e Abrir dossiê administrativo foram conservados;
o novo botão não substitui seletores/consumidores existentes.

Dois percursos Chromium distintos passaram entre rodadas/rechecks:

- Compra5 recebida em parcelas2/3 abre exatamente a parcela3; ENT, BAL e consumo
  abrem seus recursos reais. Compensação aponta ao movimento avulso original.
  Falha503 não apresenta origem falsa; retry conserva contexto e filtros.
  Foco entra no resultado, permanece no modal e volta ao botão de origem.
  Axe/overflow320/390/768/1440 passaram; screenshot320 inspecionado.
- Auth real prova movimento familiar oculto à equipe, consumo da equipe legível,
  perda de stock.team.read com404 e COM indisponível após perda de com.read,
  mesmo com estoque legível. Não expõe documento ou observação COM. UUID aleatório,
  UUID de parcela e paciente estrangeiro recebem404. Estado independente de
  movimentos, documentos e eventos fica idêntico antes/depois de cada percurso.

A primeira rodada identificou consulta incorreta a care_recipient_id inexistente
em purchase_receipts: sua RLS deriva do documento pai. Corrigida a seleção do
vínculo real, sem alterar autorização. A rodada seguinte encontrou perda de foco
quando retry desaparecia após sucesso; a gaveta agora foca o título do resultado
na consulta inicial/recuperação manual, sem roubar foco em atualização automática.
As negativas esperavam403 para paciente estrangeiro, mas o contrato canônico
responde404; a expectativa foi corrigida. O caso de leitura exata esperava3 sem
escala; o banco preserva3.000000 como texto, e a asserção agora exige esse valor.
Após cada correção só o caso afetado foi repetido. Nenhuma asserção de segurança,
acessibilidade ou preservação foi removida. Uma invocação de filtro mal citada
não encontrou testes; foi corrigida, sem contabilizá-la como aprovação.

Logs stock-origins-browser-* e relatório final preservados em output/phase-d-work;
screenshot em output/playwright/phase-d. Tipos/build do runner e lint dos fontes
afetados passaram. A evidência é local/fictícia, sem homologação humana, AT,
zoom400%, aparelho, assinatura ou provedor.116 migrations permanecem; replay,
integração completa e matriz de browser do novo SHA ficam na CI programada.
D-A segue em execução, sem merge, alteração remota ou envio externo.

## D2.24 — identidades separadas e destinação explícita do inativo

Migration 20261106161707 implementa comparação de origem/sucessor e os atos
retire, reactivate e clear_successor, com motivo próprio, hash da referência e
chave por ator. O sucessor orienta novas seleções; não é alias, conversão,
transferência nem substituição de IDs existentes. Unidades diferentes são
mostradas lado a lado. Inativação pode manter todo saldo sem destino obrigatório.
Reativação conserva a mesma identidade e remove a orientação. Não há novo papel
ou capacidade padrão. O percurso anterior de edição/inativação permanece.

Tabelas catalogue_successors e catalogue_identity_events têm RLS e SELECT
limitado; não oferecem DML a clientes/service_role. FKs compostas mantêm o mesmo
paciente; a RPC recusa autorreferência e ciclos. História imutável conserva
metadados de identidade/motivo/autoria, sem reter saldo privado visto por outro
gestor. Comandos ficam em private, sem grants diretos. Contexto projeta NULL para
custódia restrita e histórico paginado20. Nova escrita exige catalog.manage e
paciente ativo; recuperação própria exige leitura viva. Helpers privados têm ACL
revogada e funções privilegiadas usam search_path vazio.

test:db:prepare aplicou117 na stack home-care-assistant, API54321/DB54322, sem
reset. Refinamentos posteriores dessa migration ainda não publicada aplicaram
somente o novo corpo de family_stock_movement e o trigger de invalidação; não
recriaram tabelas ou repetiram migrations históricas. As 84 protegidas estão
preservadas. Replay limpo/legado e integração completa permanecem na CI.

Doze cenários Auth distintos passaram entre rodadas dirigidas:

- FAMILY4/TEAM4 conservam exatamente os mesmos movimentos/documentos ao inativar
  e reativar. A identidade não muda nem gera estoque em outro produto.
- Sucessor em mL com saldo9,5 continua separado do original em unidade. Gestor
  delegado sem access.manage vê somente custódias autorizadas; história não
  revela os saldos que outro gestor viu.
- Chave própria recupera resultado após perda só de escrita; chave nova, outro
  corpo, paciente estrangeiro e perda de vínculo não conferem nova autoridade.
- Duas decisões da mesma referência produzem um ato e um conflito. DML direto
  em orientação/evento e execução de helpers são recusados.
- Esperas reais de estoque e linha de catálogo impedem escrita após revogação.
  Uma espera tardia de perfil usa encerramento da sessão Auth real e confirma
  42501/rollback, sem aceitar timeout como prova de autorização.
- Campos forjados, referência ausente, outro material, motivo curto e excesso
  UTF-16 são recusados sem alterações parciais.
- Remover orientação invalida a revisão dos demais consumidores. Indicação
  inversa cíclica, inclusive após reativação pelo consumidor legado, é recusada.
- Nova entrada/retirada comum de inativo falha; chave já confirmada recupera e
  compensação com referência cria somente seu movimento histórico legítimo.
- Retorno físico independente de duas unidades inativas passa por declaração,
  concordância, expedição e aceite pessoal: FAMILY6/TEAM2/TRANSIT0, ainda inativo.
- Movimento familiar revogado durante espera tardia de perfil também reverte
  ledger e efeitos ao finalizar, com a sessão Auth realmente encerrada.

A primeira fixture usou withdrawal, inexistente no contrato, e foi corrigida
para outbound. A expectativa de trânsito zero foi alinhada ao texto decimal
0.000000 preservado pelo banco. O ensaio tardio inicial terminou57014: revogar
capacidade invalidava as mesmas revisões de workspace que o comando já mantinha
enquanto aguardava o perfil. A prova foi separada entre revogação de capacidade
antes da escrita e encerramento da sessão real após a escrita; não houve aumento
de timeout, desativação de trigger ou redução da asserção42501/rollback.

Duas contraprovas efetivamente reprovaram antes das correções: entrada comum em
inativo era aceita; remover somente sucessor não invalidava os consumidores.
A RPC passou a recusar a operação comum após recuperar chaves já confirmadas,
preservando compensações referenciadas. O trigger existente de invalidação foi
acoplado à orientação. Somente essas provas afetadas foram repetidas e passaram.

Duas fronteiras API passaram: intenção estrita sem autor/quantidade/merge e
limites Unicode anteriores a Auth. Três percursos Chromium novos passaram entre
rodada/recheck: sucessor com unidade distinta e recuperação após perda de escrita;
conflito de saldo com falha503/adoção explícita; compensação de inativo. Motivo,
escolha e foco são preservados; revisão usa uma superfície sem campos editáveis.
PDF anterior manteve os mesmos bytes/hash e fatos canônicos. A equipe escolhe
explicitamente o novo material, sem rebinding do antigo. Axe/overflow em
320/390/768/1440 passaram; capturas320 dos dois materiais foram inspecionadas.

Três consumidores anteriores também passaram na rodada dirigida: edição de
aliases/inativação, conversão COM2x10 após fator12 e correção familiar com
paginação/filtro. A única falha visual nova ocorreu no rótulo implícito da
textarea depois de remontar o campo: captura mostrava valor e foco preservados,
mas a consulta exata pelo rótulo falhava. Label/id explícitos corrigiram a
associação, mantendo as asserções. Só esse percurso foi repetido e passou.
Busca por nome/alias foi acrescentada a COM/ENT, mantendo seleções por categoria;
o conjunto exato1/5/20/100 de C028 continua separado, sem aprovação presumida.

Tipos/build dos runners, lint pertinente e advisor all local passaram; exatamente
as doze chaves WARN anteriores, sem chave nova. Logs catalogue-identities-*,
catalogue-clear-guidance-*, inactive-material-*, family-movement-final-authority
e relatórios HTML/capturas preservados em output. Evidência fictícia/local;
sem humano/AT/zoom400%, aparelho, assinatura ou provedor real.

Consulta pontual da CI42250234690/52cb54e: banco, checks gerais Windows/Ubuntu,
Chromium e WebKit success. Os dois casos C046 passaram nos três projetos.
Mobile passou101/falhou1 também no retry, em consumption.spec.ts:320, opção
interceptada pelo portal. Esse consumidor anterior será tratado separadamente;
não se declarou CI global verde. O novo SHA continua dependente da própria CI.
D-A permanece em execução, sem merge ou mutação remota.

## D2.25 — seleção física do material no consumidor mobile de consumo

CI42250234690/52cb54e, job128009328870: consumption.spec.ts:320 falhou também no
retry ao clicar na opção. Log confirma interceptação pelo FluentProvider do
portal; os outros101 casos mobile passaram. Chromium/WebKit e banco/checks
gerais desse SHA concluíram success. Não se repetiu essa matriz inteira.

Artefato13522260427 foi conferido com SHA-256
c9ee6e03492c8494f3109cef553a4196a84868268ac363e461020055e623019c.
Somente os dois PNGs foram extraídos para nomes gerados e inspecionados; o
manifesto preserva origem/hash. A falha não se reproduziu na execução local
anterior à alteração: o caso mobile passou. Não se declarou reprodução local.

A etapa anterior preenchia o combobox sem começar por clique visível. O teste
agora clica no campo, exige campo/opção inteiros no viewport e confere que o
centro da opção recebe o ponteiro antes da seleção. Geometria anterior/posterior
e viewport ficam anexados. Não há force, dispatch de evento ou sleep para
contornar o alvo. As asserções posteriores de pacote, revisão/foco, autoria,
recuperação da decisão, débito único e atualização da outra sessão permanecem.

Somente esse caso mobile foi repetido após a alteração e passou. Tipos/build do
runner e lint pertinente passaram. Fonte de produto, banco, permissões e dados
oficiais não mudaram; fixtures continuam fictícias na stack local verificada.
Logs consumption-mobile-before/after e relatório final preservados em output.
117 migrations permanecem; CI do novo SHA ainda necessária, sem aprovação global
presumida ou homologação humana/aparelho. D-A segue em execução.
