# Evolução integral — execução

## Checkpoint V4 para acesso online — 23/10/2026

A pedido do usuário, esta etapa prioriza publicar o estado funcional parcial.
Não representa homologação integral nem autorização para afirmar testes ausentes.
A branch é `codex/evolucao-integral-v4`, baseada na master `3f64dfd`.
O merge final permanece condicionado à validação completa da V4.

### Implementação neste checkpoint

- Contexto explícito por sessão Auth: administração global ou vínculo local.
  Administrador local altera seu escopo imediatamente; propostas globais
  exigem aprovação de outra pessoa com administração no paciente.
- Ciência REQ independente de aceite ENT, com evidência da origem e preferências
  pessoais. Aceite positivo atende a linha vinculada, sem quantidade solicitada.
  Necessidade compartilhada exige justificativa, sem duplicar crédito físico.
- Aceites parciais entram imediatamente no saldo confirmado. Conferência,
  trânsito, divergência e conciliação continuam distintos.
- Arquivamento manual justificado e automático agendado. Conclusão com ciência
  obrigatória pendente mantém a exceção que bloqueia arquivamento automático.
- Realtime privado com revisão durável e recuperação de conexão; retorno ao
  documento após login; matrizes de permissões e canais; revisão de cancelamento.
- PDFs com nova revisão do renderizador, fonte incorporada, QR de integridade
  mínima e preservação das versões anteriores. Seis exemplos foram inspecionados.
- Catálogo de 27 templates e contratos de Flows versionados; lembretes BAL e de
  período com destinatários explícitos. Não há envio externo habilitado.
- TOTP opcional no perfil e exigência AAL2 para administração após ativação.
  A homologação completa do ciclo MFA ainda está pendente.

### Evidência executada no candidato

| Verificação | Resultado |
| --- | --- |
| Contratos | 52 migrations históricas intactas |
| Tipagem e build | Passaram |
| Unitários | 91/91 em 16 arquivos |
| Integração V4 com Auth real | 5/5 |
| Realtime entre duas sessões | Passou; canal alheio recusado |
| PDF e templates | Incluídos nos unitários |
| Instalação limpa local | 62 migrations aplicadas; emissão REQ-0001 |
| Evolução desde migration 19 | 62 aplicadas; suíte legada em adaptação |
| SQL/RLS e E2E completos V4 | Pendentes; resultados V3 abaixo são históricos |

O replay legado encontrou uma asserção antiga que consultava saldo como global
sem selecionar vínculo. Isso não prova perda: a V4 exige contexto local.
A adaptação incompleta do harness foi preservada em
`.private/v4/pending-harness/`; não foram removidos testes nem relaxadas regras
para obter verde. O runner E2E existente continua restrito à stack local;
precisa incorporar a seleção explícita de contexto antes da suíte final.

### Preservação e aplicação remota

Backup local custom verificado antes do replay: 1283270 bytes, manifesto SHA-256
fora do Git. O catálogo original tem cópia anterior verificada e rotina de
restauração; a restauração local final ainda precisa ser executada após a suíte.

Remoto conciliado antes da atualização: 52 migrations, 29 produtos, 58 vínculos
de catálogo, oito identidades Auth, um administrador global e quatro movimentos.
Backup remoto de esquema e dados inclui public, private, Auth, metadados Storage
e histórico de migrations. Arquivos de 485445 e 561273 bytes têm manifesto
SHA-256 em LOCALAPPDATA/home-care-assistant/backups. Bytes dos anexos não foram
copiados; nenhum reset remoto ou carga de fixtures remotas será executado.

Aplicação das dez migrations V4 e publicação: em andamento neste checkpoint.
As cinco contas de teste existentes serão preservadas e verificadas online.
Acesso privado: `.private/homologacao/ACESSOS.md`, ignorado por Git e Vercel.

### Limites externos efetivamente constatados

Consulta Meta em 23/10: HTTP 401, OAuthException 190/463, token expirado.
Os cinco templates prioritários ficaram individualmente bloqueados antes da
submissão. Existem 27 contratos preparados, nenhum aprovado por esta execução.
Token válido, permissões Meta, App Secret, webhook e publicação dos Flows são
pendências externas. O erro histórico 130497 é restrição de país, sem entrega.
NOTIFICATIONS_EXTERNAL_ENABLED e META_FLOWS_ENABLED permanecem false.

Auditoria npm de produção: zero vulnerabilidades. Auditoria com dependências de
ferramentas reporta seis alertas altos transitivos de braces, sem versão corrigida
publicada no advisory GHSA-vfj7-8cjw-p6xm consultado. Não houve downgrade nem
supressão para mascarar o resultado. OAuth/SMTP, câmera física e mensagens reais
não são declarados homologados.

Os cinco arquivos de referência estão em `docs/references/v3/`; JSON e PDFs
originais intactos. Markdown foi reformatado, com original também em `.private`.
A assinatura assimétrica permanece apenas no roadmap; SHA-256 não impede um
administrador do banco de alterar também o histórico e os próprios controles.

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
