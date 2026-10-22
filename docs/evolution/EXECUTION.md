# Evolução integral — execução

## Contrato e autorização

Execução integral autorizada em 22/10/2026: implementação, commits, push,
reset local controlado, PR, merge na master e verificação do deploy.
O usuário autorizou antecipar o preview e migrações incrementais remotas,
preservando catálogo e administrador global. Nunca executar reset, fixtures
ou suíte mutável no remoto.

Somente insumos sob responsabilidade familiar. Quatro fichas: REQ, COM, ENT
e BAL. COM admite doação sem pagamento obrigatório; ajustes familiares usam
ledger próprio. BAL pertence à equipe. REQ não tem quantidade solicitada:
atendimento por linha depende de ENT explicitamente vinculada e aceite
positivo. Conferência ENT e atendimento REQ são indicadores separados.

UUID, sequência por paciente/tipo, protocolo, snapshots e SHA-256 ficam no
banco. Assinatura assimétrica é futura. Hash não impede adulteração por
administradores do banco que também alterem controles e histórico.

## Publicação e preservação

- Base Git: 701521c; branch codex/home-care-evolucao-integral publicada.
- Snapshot do usuário: 014580f (Temp), preservado.
- Cadeia local: 51 migrations, sendo 16 de evolução, todas aplicadas e congeladas.
- Remoto reconciliado após aplicação das primeiras onze pelo usuário.
  Os cinco incrementais restantes foram aplicados: 51 migrations, sem reset.
  Pré-validação selecionou apenas esses cinco arquivos, sem seed ou roles.
- Todos os campos originais dos 29 produtos e 29 vínculos remotos foram
  comparados com a exportação anterior e preservados. Administrador global ativo.
- Backup local completo externo com SHA-256 verificado. Ensaio de restauração
  passou: 37 produtos, 107 vínculos, 13 Auth e 13 perfis. Replays posteriores
  recriaram containers; repor/conferir o catálogo após a última suíte.
- Backup remoto externo de schema/dados inclui Auth e metadados Storage.
  A exportação inicial coincidiu com a migração do usuário. Antes dos cinco
  incrementais finais foram feitos novos dumps (schema 465495 bytes; dados
  463995 bytes), com CLI concluída e manifesto SHA-256 verificado.
  Schema e dados foram exportados sequencialmente; não são snapshot atômico.
- [Preview parcial][preview] READY, conectado ao Supabase remoto existente.
  Segredos de servidor ausentes foram adicionados a preview e produção;
  flags externas permanecem desligadas. Configuração pública preservada.
- Verificação online: Auth oficial da conta global, API anônima bloqueada,
  contexto, catálogo, estoque, fichas, dashboard e perfil responderam.
  Doze verificações visuais desktop/Pixel 7 passaram sem overflow e com menu.
  Proteção Vercel mantida. Isso não homologa OAuth humano ou canal externo.

## Matriz atual

| Bloco | Estado | Evidência |
| --- | --- | --- |
| Banco e capacidades | Implementados | Local e remoto: 51 migrations |
| REQ, COM, ENT, BAL | Integrados | Fluxos positivos e negativos em E2E |
| UI/UX global | Refatorada | Menus, contexto, wizards e componentes |
| Estoques e unidades | Integrados | Ledger, trânsito, mínimos e apresentações |
| Scanner e anexos | Integrados | Leitura manual, arquivos privados e PDF |
| Perfil e Auth | Integrados | Auth real, registro, foto e sessões |
| Notificações | Integradas | Caixa paginada e estados independentes |
| WhatsApp/Flows | Configuráveis | Testes locais; provedor não homologado |
| Consumo e indicadores | Integrados | Conferência antes do débito |
| Gates completos | Em execução | Resultados abaixo |
| PR, merge e produção | PR em rascunho | [PR 2][pr]; merge após critérios de aceite |

## Resultados efetivamente obtidos

- check:contracts passou; primeiras 19 migrations históricas intactas.
- Lint sem erros/avisos, Markdown, tipagem e unitários passaram na revisão final.
  Componentes de etapas/comprovante foram extraídos para reduzir os wizards
  e reutilizar o acompanhamento de notificações.
- Typecheck e build atuais passaram, com 49 rotas.
- Unitários: 81 testes em 13 arquivos passaram.
- Auditoria npm de produção: zero vulnerabilidades reportadas.
- Replay das 51 migrations passou: instalação limpa, evolução legada,
  dez suítes SQL e compatibilidade com search_path restrito do hosted.
- Revisões SQL e aceite WhatsApp passaram isoladamente com Auth real:
  telefone, desafio único, replay e invalidação por destinatário/versão.
  Transporte e telefone de teste não representam homologação de SMS ou Meta.
- Integração HTTP: 6/6 passaram novamente após a cadeia final de 51 migrations.
- Chromium: rodada final 25/25 passou, incluindo perfil/foto/ciência e scanner
  por imagem real, recusa de câmera e código desconhecido.
- Android: rodada final 25/25 passou.
- WebKit/iPhone: 24/25 passaram; falha intermitente na confirmação de e-mail.
  A navegação do teste agora aguarda a saída concluir antes de abrir o convite;
  callback ganhou códigos seguros e correlação. Três repetições WebKit do
  fluxo completo convite/cadastro/confirmação/recuperação passaram.
- Os fluxos operacionais completos passaram nos três projetos: COM/doação,
  aceite parcial, REQ 5/10 e ENT 8/10, anexo/PDF, reconto BAL, scanner,
  múltiplas REQ, cancelamento bilateral, trânsito e revisão autenticada de Flow.
- Rodada unificada inicial: 74/75 passaram. O retorno Auth WebKit corrigido
  passou três repetições. Nova rodada unificada após os ajustes de componentes
  será executada em base local limpa. Nenhum teste foi excluído ou enfraquecido.
- PDF gerado pelo aplicativo foi renderizado e inspecionado visualmente.
  Câmera física continua dependente de aparelho.

## Apontamentos do Supabase Advisor

Consulta após a atualização remota: seis tabelas internas com RLS sem política
direta são fechadas e acessadas somente pelos RPCs autorizados. O predicado
anônimo de elegibilidade de convite exige hash do token e e-mail e retorna
somente booleano. Os 67 RPCs SECURITY DEFINER autenticados são fronteiras
intencionais, com autorização no banco, grants e search_path revisados e
testados. A listagem automática não substitui os testes de isolamento.

Permanecem o aviso herdado de unaccent no schema public e a proteção de senhas
vazadas desabilitada no Auth remoto. A mudança de schema da extensão não foi
incluída neste corte para preservar dependências legadas. Proteção de senhas
vazadas depende de configuração e plano Pro ou superior, conforme
[documentação Supabase][password-security]. A política de novas senhas do
aplicativo continua ativa. Não foi declarada ausência absoluta de riscos.

Referências dos avisos:
[RLS sem política][advisor-rls],
[SECURITY DEFINER][advisor-rpc] e
[extensão no public][advisor-extension].

## Trabalho restante

1. Fechar gates e E2E unificado; corrigir qualquer falha e repetir o afetado.
2. Publicar evidências finais; incrementais remotos concluídos e conferidos.
   CI e novo preview estão em execução sobre os commits publicados.
3. Repor e verificar o catálogo local preservado e as identidades de teste.
4. Consolidar documentação/evidências, abrir PR, conferir CI e fazer merge.
5. Verificar master, deploy publicado, acesso administrativo e operações.

Usuários locais de teste existem no Auth oficial e têm vínculos reais:
administrador do paciente, familiar, supervisor, profissional e leitor.
Credenciais aleatórias ficam em estado local ignorado, sem hashes manuais.
O remoto não recebeu fixtures. Homologação remota com pessoas distintas
continua dependente de identidades humanas controladas.

Meta/WhatsApp, publicação de Flow, OAuth humano, SMS, transcrição e câmera
física dependem de configuração, credenciais ou liberação do provedor/aparelho.
Permanecem controlados por configuração. Não declarar esses canais homologados
sem evidência externa efetiva.

## Retomada

Usar Node 24.22.0 e npm 11.21.1 preparados fora do Git. A suíte mutável usa
exclusivamente a stack local home-care-assistant em 127.0.0.1:54321/54322,
com Storage habilitado e envio externo desligado. Não executar integração que
revoga administradores em paralelo com E2E autenticado.

Backups ficam em LOCALAPPDATA/home-care-assistant/backups. Verificar SHA-256
e manifesto antes do replay. Após a última suíte, restaurar o backup em banco
temporário do mesmo container para exportar/conferir o catálogo original.
Nunca usar esse banco temporário como destino da suíte.

[preview]: https://home-care-assistant-6alv20w16-rmzzfajs-projects.vercel.app
[pr]: https://github.com/RMZZFAJ/home-care-assistant/pull/2
[password-security]: https://supabase.com/docs/guides/auth/password-security
[advisor-rls]: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
[advisor-rpc]: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
[advisor-extension]: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
