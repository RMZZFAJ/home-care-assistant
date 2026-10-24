# Evolução integral — execução

## Refatoração Fluent, escalas e BAL — 24/10/2026

Execução integral autorizada na branch `codex/fluent-ui-escalas-bal`, publicada
com [PR 5 em rascunho](https://github.com/RMZZFAJ/home-care-assistant/pull/5).
O checkpoint e as evidências de cada bloco estão em
[Execução da interface](../ui-ux/EXECUTION.md).

Tema Fluent com SSR, shells por contexto, login/perfil e dashboards com tarefas
reais foram publicados progressivamente. Administração, documentos, escalas e
novo regime BAL continuam em execução. Não houve reset ou alteração remota
nesta primeira etapa. O processamento novo será opt-in por paciente, iniciando
na homologação. O merge depende da conclusão integral e dos checks finais.

## Entrega V4 — 23/10/2026

Esta revisão substitui o checkpoint parcial da V4. O [PR 4][pr-v4] reúne a
implementação, os commits lógicos e os checks associados ao código integrado.
O resultado do merge, da CI da master e da validação pós-merge é registrado no
PR e no relatório final da entrega. Resultados V3 abaixo são históricos.

### Escopo implementado

- Contexto explícito por sessão Auth real: global ou vínculo local existente.
  Identidade global não concede poderes operacionais. Administrador local
  aplica alterações no próprio paciente; proposta global exige aprovação de
  outra identidade administradora local. Trocar perfil não permite autoaprovar.
- Cadastro de paciente com administrador inicial explicitamente informado e
  e-mail confirmado. Convites exigem aceite da identidade destinatária e
  revalidam o emissor. O último administrador ativo é preservado sob concorrência.
- Ciência REQ independente de recebimento ENT, com preferências pessoais,
  política do paciente, modalidades e evidência de origem. Na emissão o autor
  recebe confirmação sem PDF; ciência satisfeita gera outro aviso com PDF novo.
- REQ sem quantidade solicitada: aceite positivo de ENT vinculada atende a
  linha. Necessidade compartilhada exige motivo e não duplica crédito físico.
  Atualizações do atendimento geram nova versão canônica da requisição.
- ENT sem aceite aguarda conferência. Aceite parcial credita imediatamente a
  equipe; divergência, quantidade conciliada e conferência integral ficam
  separadas. Compra ou doação COM entra na família somente após validação.
- Ajustes familiares usam ledger, motivo, responsável e compensação auditável.
  BAL é exclusivo da equipe. Estoque confirmado, trânsito, projeção e mínimos
  possuem apresentação e contratos distintos.
- Agendador de lembretes e arquivamento com intervalo configurável, trabalho
  vencido e recuperação. Conclusão com ciência obrigatória pendente conserva
  a exceção que exige arquivamento manual justificado, mesmo após ciência tardia.
- Navegação por capacidades, perfil ativo, quatro wizards, histórico filtrável,
  matrizes móveis, duplicidade contextual, timeline e notificações integradas.
  Realtime privado transmite revisões; recuperação não descarta rascunhos.
- PDF profissional com fonte incorporada, QR mínimo, SHA canônico, SHA dos bytes
  e revisão do renderizador. Versões anteriores e documentos históricos ficam
  preservados; dados desconhecidos não são inventados.
- Arquivo PDF entregue ao compartilhamento nativo, com download alternativo.
  Acompanhamento inicial dos avisos termina em até dez segundos.
- TOTP oficial no perfil; fator confirmado exige AAL2 para administração.
  Templates Meta versionados e Flows com propósito, revisão, telefone, versão e
  token de uso único. Consumo extraordinário exige confirmação autorizada.

### Evidência executada nesta revisão

| Verificação | Resultado real |
| --- | --- |
| Contratos | 63 migrations aplicadas protegidas por hash |
| Lint, Markdown, tipagem e build | Passaram |
| Unitários | 92/92 em 16 arquivos |
| Instalação limpa e upgrade desde 19 | 63; preservação validada |
| SQL/RLS | Dez suítes; grants e search_path restrito passaram |
| Integração HTTP/Auth | 16/16, sem testes ignorados |
| Concorrência e isolamento | Idempotência, saldo, outbox e últimos admins |
| Realtime | Duas sessões reais; canal de outro usuário recusado |
| TOTP/AAL2 | Local e remoto; AAL1 impedido; fator temporário removido |
| E2E local | 81/81 em 13,8 minutos; desktop, Pixel 7 e WebKit/iPhone 13 |
| Matrizes e arquivo PDF | Persistência e aprovação local verificadas |
| Prazo de acompanhamento | Parada em dez segundos verificada no navegador |
| Preview | READY; APIs, menus, sino, três larguras e PDF real |
| Jornada remota | REQ → COM → família → ENT parcial → conciliação → BAL |
| Contas remotas | Cinco logins; capacidades e proibições RPC/RLS passaram |

Os testes preservam verificações negativas; erros seguros de acesso negado,
sessão revogada, versão antiga e paciente inativo são resultados esperados.
O contrato visual de múltiplos canais simula somente a lista de canais, pois
provedores estão desabilitados; gravação, RPC, autorização e aprovação são reais.
O contrato WhatsApp local não representa entrega ou aprovação real da Meta.

O erro antigo da extensão Playwright vinha de uma exceção durante a descoberta
no editor. A descoberta agora é livre de mutações; servidor e globalSetup
verificam a stack local ao executar. Nenhum aviso foi desativado. A classe
Tailwind usa a forma canônica wrap-break-word.

### Banco, preservação e acessos

O proprietário aplicou as dez migrations V4 iniciais. Conferimos 62 migrations
antes do complemento; nenhuma foi reescrita. O incremento 63 foi validado em
instalação limpa e upgrade, protegido por transação e aplicado incrementalmente.
O dry-run indicava somente esse arquivo, sem seeds ou alterações de roles.

Backup remoto prévio: esquema de 609148 bytes e dados de 840172 bytes, com
manifesto SHA-256 fora do Git. Inclui public, private, Auth, metadados Storage e
histórico de migrations. Dumps sequenciais não formam snapshot atômico; bytes
de anexos não foram copiados e esse backup remoto não teve ensaio de restore.
Não houve reset remoto nem carga da suíte/fixtures no remoto.

Os 29 produtos, 58 vínculos originais do catálogo, oito identidades Auth e o
administrador global foram preservados. Hashes do catálogo permaneceram iguais
antes/depois da migração. A jornada remota criou paciente fictício separado,
adotou um produto existente e usou convites oficiais para as cinco contas.
Dados operacionais originais não foram apagados.

Na jornada isolada, COM recebeu 12 unidades sem comprovação financeira;
ENT expediu dez e aceitou seis. As quatro ausentes foram conciliadas formalmente.
Resultado: família 2, equipe 6, trânsito 0; REQ 1/1 atendida; ENT confirmada com
0/1 linha integralmente conferida; BAL aplicado. O PDF da versão 1 permaneceu
idêntico após o PDF da versão 5.

Após a suíte, o banco local foi limpo com backup verificado e recebeu o catálogo
original: 37 produtos e 107 vínculos, zero diferenças nos campos originais.
O dump original foi restaurado para conferência em banco temporário dentro do
mesmo container; esse banco foi removido e nunca foi destino da suíte.

Credenciais das cinco contas: .private/homologacao/ACESSOS.md e contas.json,
ignorados por Git, Vercel e empacotamento npm, com acesso local restrito.
Endereços example.invalid permitem login por senha; recuperação por e-mail exige
endereço humano. Senhas, tokens, QR TOTP e dumps não foram versionados.
A conta `renatomazzarinocorp@gmail.com` mantém senha e administração global.

### Publicação e integrações externas

[Preview validado][preview-v4], [PR 4][pr-v4] e [CI da master][master-ci] são as
referências públicas. A efetivação e verificação do deploy oficial constam no PR.
O agendador usa pg_cron; URL oficial e segredo do worker são configurados no
Vault pela RPC de serviço. Agendamento interno independe da liberação da Meta.

Consulta real Meta em 23/10: HTTP 401, OAuthException 190/463, token expirado.
Os cinco templates prioritários ficaram individualmente bloqueados antes da
submissão. Há 27 contratos preparados; nenhum foi declarado aprovado.
Faltam token válido/permissões, App Secret, webhook inscrito, elegibilidade do
destinatário e chaves/publicação dos Flows. O erro 130497 é o relato histórico
fornecido pelo proprietário, sem nova entrega confirmada nesta execução.
NOTIFICATIONS_EXTERNAL_ENABLED e META_FLOWS_ENABLED permanecem false.
OAuth humano, SMTP, SMS real, câmera física e transcrição não foram homologados.

Auditoria npm de produção: zero vulnerabilidades. A cadeia de ferramentas tem
seis alertas altos transitivos de braces, sem correção publicada no advisory
GHSA-vfj7-8cjw-p6xm consultado. Não houve downgrade nem supressão para esconder
esse resultado. Essa limitação externa não equivale a ausência absoluta de risco.

As referências aprovadas estão em docs/references/v3. PDFs e JSON originais
permanecem intactos; Markdown foi reformatado, com original privado preservado.
Ed25519 fica no roadmap. SHA-256 não impede que um administrador do banco
altere o conteúdo junto com os próprios controles e histórico.

[pr-v4]: https://github.com/RMZZFAJ/home-care-assistant/pull/4
[preview-v4]: https://home-care-assistant-5o4ge7pt4-rmzzfajs-projects.vercel.app
[master-ci]: https://github.com/RMZZFAJ/home-care-assistant/actions?query=branch%3Amaster

## Histórico da entrega anterior — 22/10/2026

## Entrega e autorização

Implementação integral autorizada em 22/10/2026, incluindo commits, publicação,
reset local com backup, migrações incrementais remotas, contas de homologação,
PR e merge. O usuário integrou o [PR 2][pr] na master fec3926.
A [CI dessa master][ci] terminou com sucesso. O fechamento corrige a integração
do editor Playwright e a classe Tailwind, e consolida os acessos e evidências.

Somente insumos sob responsabilidade familiar. Quatro fichas: REQ, COM, ENT
e BAL. COM admite doação sem pagamento obrigatório. Ajustes familiares geram
ledger auditável; BAL é exclusivo da equipe. REQ não tem quantidade solicitada:
atendimento por linha exige vínculo explícito e aceite positivo da ENT.
Conferência ENT, atendimento REQ e quantidades físicas são independentes.

UUID, sequência por paciente/tipo, protocolo, snapshots e SHA-256 ficam no
banco. Assinatura assimétrica é futura. Hash não impede alteração por
administradores do banco que também modifiquem controles e histórico.

## Banco, preservação e contas

- Local e remoto: 52 migrations aplicadas, sendo 17 da evolução. As primeiras
  19 históricas intactas; nenhuma migration aplicada foi reescrita.
- Último incremento corrige o contador transacional de administradores:
  somente eventos de linha efetivados alteram a contagem.
- Atualizações remotas incrementais precedidas de reconciliação, pré-validação
  e backups externos de schema/dados com manifesto SHA-256. Dumps sequenciais
  não constituem snapshot atômico. Não houve reset ou replay da suíte no remoto.
- Todos os campos originalmente exportados dos 29 produtos e 29 vínculos
  remotos foram comparados após o provisionamento: zero diferenças.
  Administrador global exigido permanece ativo, com senha preservada.
- Backup local completo restaurado em banco temporário do mesmo container
  para ensaio e extração. Catálogo original reposto: 37 produtos e 107 vínculos,
  zero diferenças nos campos originais. Banco temporário removido após QA;
  nunca utilizado como destino da suíte.
- Cinco identidades remotas reais criadas pela API oficial Supabase Auth:
  administrador do paciente, familiar, supervisor, profissional e leitor.
  Todas autenticaram por senha e têm perfil/vínculo ativo no paciente
  “Homologação Home Care Assistant”. Nenhuma recebeu administração global.
- Administrador global também é o segundo administrador desse paciente.
  Promoção do supervisor proposta/aprovada por administradores distintos.
  Catálogo de 29 produtos adotado nesse paciente, preservando o original.
- Login real na produção, menu por capacidades, APIs proibidas, isolamento
  e saída passaram nas cinco contas. RPC/RLS também recusaram acesso ao
  paciente original e operações proibidas.
- Credenciais aleatórias em `.private/homologacao/ACESSOS.md` e `contas.json`,
  ignoradas pelo Git e excluídas do upload Vercel. ACL restrita ao proprietário.
  Nenhuma senha, token ou hash manual nos commits. Endereços example.invalid
  são controlados para teste; recuperação por e-mail exige endereço humano.
  Login por senha foi efetivamente verificado.

## Matriz da implementação

| Bloco | Estado | Evidência executada |
| --- | --- | --- |
| REQ, COM, ENT, BAL | Integrados | Jornadas positivas e negativas |
| UI/UX global | Refatorada | Menus, perfis, mobile, filtros e wizards |
| Estoques e unidades | Integrados | Ledger, trânsito, mínimos e apresentações |
| Scanner e anexos | Integrados | Imagem, câmera recusada, Storage, PDF |
| Auth e perfil | Integrados | Auth real, foto, sessões e cinco contas remotas |
| Notificações | Integradas | Central, outbox, ciência e estados do provedor |
| Consumo e indicadores | Integrados | Revisão autenticada antes do débito |
| WhatsApp e Flows | Configuráveis | Contratos testados; Meta bloqueada |
| Produção | Publicada | [Sistema online][production] e verificações abaixo |

## Validações realizadas

- Contratos passaram: primeiras 19 migrations intactas e quantidade solicitada
  ausente do contrato ativo de REQ.
- Lint sem erros/avisos, Markdown, tipagem e build com 49 rotas.
- 84 unitários em 14 arquivos, incluindo proteção E2E contra configuração
  remota herdada e recusa de stack/porta não autorizadas.
- Auditoria npm de produção: zero vulnerabilidades reportadas.
- Replay local das 52 migrations: instalação limpa, upgrade legado, dez suítes
  SQL, search_path restrito e autorização com Auth real.
- Integração HTTP/RPC: 6/6, incluindo concorrência, idempotência e isolamento.
- E2E completo local: 75/75. CI do PR 2 e da master fec3926 passou novamente
  com Chromium desktop, Pixel 7 e WebKit/iPhone 13.
- Retomada de tela BAL considera Activity do Next: carregamento bloqueia ações
  até a resposta atual. Doze repetições direcionadas passaram após a correção;
  CI completa posterior também passou.
- Após correção do editor: descoberta direta lista 75 testes sem exigir banco
  ou autenticação. Execução direta sem variáveis do runner passou nos seis
  testes de login dos três projetos com stack local verificada.
- Servidor e globalSetup preparam credenciais locais antes da execução;
  descoberta não inicia servidor nem toca o banco. Nenhum diagnóstico foi
  suprimido, teste excluído ou proteção desativada.
- Classe Tailwind `break-words` substituída pela canônica `wrap-break-word`.
- Produção fec3926 READY: Auth oficial global, anônimo bloqueado, oito leituras
  de API e 39 verificações visuais (13 rotas em desktop, Android e iPhone),
  menus e sino, sem erros de navegador ou overflow horizontal.
- PDF real baixado, renderizado e inspecionado no local e preview.
  Homologação remota começa sem documentos operacionais; não foram criadas
  movimentações fictícias remotas para simular esse resultado.
- CI do fechamento executa novamente a cadeia completa e os 75 E2E; os checks
  do PR registram o resultado associado ao SHA efetivamente integrado.

## Limites externos verificados

NOTIFICATIONS_EXTERNAL_ENABLED e META_FLOWS_ENABLED permanecem false.
O webhook fornecido pelo usuário registrou falha Meta 130497: restrição de
envio ao país do destinatário. Isso não representa mensagem entregue.
App Secret, token válido, templates, webhook inscrito, chaves/publicação de
Flow e elegibilidade precisam de configuração e validação no provedor.
Dados faltantes em [WhatsApp e Flows](../WHATSAPP_AI.md).
Nenhum token compartilhado em conversa foi versionado ou exposto em logs.

Worker possui endpoint autenticado e processamento administrativo manual;
agendamento automático externo precisa ser configurado. OAuth humano, SMTP,
SMS real, câmera física e transcrição externa não foram homologados por esta
suíte. Transcrição tem contrato extensível, sem provedor contratado.

Advisor: seis tabelas internas com RLS sem política direta são fechadas e
acessadas por RPCs autorizados; 67 funções SECURITY DEFINER são fronteiras
intencionais verificadas com grants/RLS. Predicado anônimo de convite valida
hash/e-mail e retorna booleano. Permanecem aviso herdado de unaccent em public
e proteção de senhas vazadas desativada no Auth remoto, dependente de
configuração/plano conforme [Supabase][passwords].
Não foi declarada ausência absoluta de risco ou homologação externa fictícia.

## Reprodução e artefatos privados

Usar Node 24.22.0 e npm 11.21.1. Suíte mutável seleciona exclusivamente
a stack local home-care-assistant em 127.0.0.1:54321/54322. Backups, manifestos,
provas de preservação e resultados online ficam em
LOCALAPPDATA/home-care-assistant, fora do Git. Credenciais locais da suíte
continuam em supabase/.temp; contas remotas ficam em `.private`.
Não rodar integração que revoga administradores junto com E2E autenticado.

[pr]: https://github.com/RMZZFAJ/home-care-assistant/pull/2
[ci]: https://github.com/RMZZFAJ/home-care-assistant/actions/runs/39769658084
[production]: https://home-care-assistant.vercel.app
[passwords]: https://supabase.com/docs/guides/auth/password-security

## Retomada e correções da revisão da PR 4 — 23/10/2026

Commits de correção: `05e6bf4` (banco/API e regressões Auth) e `d92c342`
(interface, acompanhamento e regressões visuais).

O incremento 64, `20261023120000_v4_review_regressions.sql`, foi aplicado no
remoto após backup de esquema/dados e dry-run exclusivo desse arquivo. As 63
migrations anteriores continuam intactas. O manifesto agora protege as 64.
Produtos, catálogo anterior, oito identidades Auth e administrador global foram
reconferidos: contagens e hashes preservados; nenhum reset remoto ou fixture.
Backups privados desta retomada: esquema 624771 bytes e dados 1026965 bytes,
com manifesto SHA-256. São dumps sequenciais, sem bytes Storage ou ensaio remoto
de restauração.

Os cinco apontamentos foram tratados:

- WhatsApp usa a mesma lista explícita no banco, matriz e registry. Eventos
  internos não geram trabalhos externos; submissão COM tem template. Templates
  preparados ficam pausados, sem consumir tentativas sucessivas; aprovação
  libera os trabalhos compatíveis. Revalidação impede envio após desabilitação.
- Aprovação local de proposta global para novo vínculo gera convite destinado
  à identidade confirmada. Só o aceite cria acesso. Recusa ou revogação encerra
  a proposta; autoaprovação e identidade indevida continuam bloqueadas.
- Pendência de ciência considera satisfação coletiva, modos any/all, dispensa
  e ausência de elegíveis, além da autorização atual.
- Card de arquivamento e filtro usam o mesmo predicado, incluindo concluídas
  com ciência satisfeita ou pendente e excluindo arquivadas.
- Sino exclui silenciosas no servidor antes da paginação. Central preserva
  esses registros; contador, troca de paciente e atualização foram verificados.

Os ajustes adicionais mantêm o acompanhamento de envio conectado às revisões
duráveis, com recuperação, e reconciliam horários/intervalos da matriz com o
estado confirmado. Gravações são serializadas; conflitos recarregam a versão
atual sem restaurar snapshot antigo. Conflito lógico de política agora retorna
409, sem ficar repetindo a transação. PDF de REQ concluída indica arquivamento.

Validação local direcionada: 15 testes unitários; três regressões HTTP/Auth,
com reexecução dos casos alterados; três cenários E2E Chromium, incluindo
conflito, rede, permissão, atualizações posteriores, sino e arquivamento.
Contratos, lint, tipagem e build do runner passaram. A suíte completa fica na
CI do novo SHA da [PR 4][pr-v4]; o fechamento registra o resultado e a produção.
Envios externos Meta e Flows continuam desabilitados. Aprovação em fixture
local não representa aprovação da Meta.

A CI `39994658483` validou código em Linux/Windows e a instalação/upgrade do
incremento 64, mas detectou regressão no contrato global do worker. O incremento
65 restaura os grants anteriores; verificações de identidade global, contexto
e lease continuam obrigatórias. Dois testes HTTP de concorrência/serviço
passaram, junto com recusas para familiar e administrador em contexto local.

A nova revisão identificou formulário de política desatualizado, capacidade de
arquivamento ignorada e erro determinístico de configuração PDF com retries.
O incremento 66 aplica a capacidade no RPC e nas tarefas; API e botão também
exigem a permissão. PDF incompatível fica pausado e habilitar o PDF na matriz
libera somente os trabalhos correspondentes. Formulários intocados acompanham
a versão atual; rascunhos em edição preservam a versão original e recebem
conflito explícito, com recarga e recuperação verificadas.
Os incrementos 65/66 foram aplicados no remoto após novo backup completo dos
mesmos schemas; todas as 66 migrations estão protegidas por hash.
Regressões direcionadas: 16 unitários, três HTTP/Auth e dois contratos de worker;
E2E verificou a nova recusa de arquivamento e as duas sessões de configuração.
Correções adicionais nos commits `d949bfc` e `415ec5e`.

A revisão seguinte encontrou uma disputa entre revogação e arquivamento. O
incremento 67 repete a autorização após adquirir o bloqueio do paciente. Uma
regressão concorrente com sessão Auth real e a RPC de política reproduziu o
arquivamento indevido antes da correção e passou após ela, sem evento de arquivo
nem alteração do documento. Backup da função/ACL foi comparado ao remoto antes
da aplicação, além do backup completo anterior; 67 migrations estão congeladas.
A CI `39997599812` passou por SQL e integração e foi cancelada durante E2E por
ter sido substituída pelo commit com essa correção. A execução final usa o novo
SHA e mantém toda a suíte, sem excluir testes ou afrouxar regras.

A execução `39999220340` confirmou 95 unitários, 20 integrações e 87/90 E2E.
As três falhas eram o mesmo contrato visual nos três dispositivos: o catálogo
simulado incluía WhatsApp, mas omitia a disponibilidade por evento introduzida
na API. O fixture agora declara somente o evento compatível e mantém ausente o
controle de WhatsApp para arquivamento. Persistência e autorização continuam
reais; nenhum teste ou filtro foi removido. Os três cenários direcionados
passaram localmente. A lentidão de pacotes Ubuntu na primeira tentativa foi
isolada no log e o job repetido no mesmo SHA, sem alterar as verificações.

A lentidão do mirror Azure reapareceu na CI `40005863396`, antes dos testes
visuais. O runner passa a usar o arquivo oficial Ubuntu por HTTPS, mantendo a
[verificação de assinatura do APT](https://documentation.ubuntu.com/security/software-integrity/archive-verification/).
O limite do job foi ampliado para 40 minutos para comportar a suíte completa;
nenhum teste, navegador, condição de acesso ou verificação foi removido.

### Fechamento da integração

A [CI final da PR](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/40007688325)
passou em Linux/Windows: 95 unitários, 20 integrações, dez suítes SQL/RLS,
instalação limpa e upgrade. Foram concluídos 90 cenários E2E; um WebKit exigiu
retry e passou também em três repetições direcionadas. Os nove comentários de
revisão foram respondidos e resolvidos com regressões específicas.

O [merge funcional 80c76eb](https://github.com/RMZZFAJ/home-care-assistant/commit/80c76ebbd05fbd283352b7cb96b9ff4729fa35a4)
integrou a PR 4 em 23/10/2026. A branch de trabalho foi removida. O SHA final
está no [commit atual da master](https://github.com/RMZZFAJ/home-care-assistant/commit/master),
que inclui este registro. A CI pós-merge executa novamente a cadeia completa:

[![CI da master](https://github.com/RMZZFAJ/home-care-assistant/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/RMZZFAJ/home-care-assistant/actions?query=branch%3Amaster)

Estado do [deploy de produção](https://home-care-assistant.vercel.app), cinco
logins, menus, APIs, PDF, preservação e agendamento efetivamente verificados
constam no [relatório pós-merge](https://github.com/RMZZFAJ/home-care-assistant/pull/4#issuecomment-6373105656).
As credenciais permanecem somente em `.private/homologacao/ACESSOS.md`.
Meta/Flows seguem desabilitados; os limites externos documentados continuam
distintos da validação operacional e não são apresentados como homologação.
