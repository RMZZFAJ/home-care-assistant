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
