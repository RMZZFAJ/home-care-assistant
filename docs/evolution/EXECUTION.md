# Evolução integral — execução

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
