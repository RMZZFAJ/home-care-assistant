# Ambiente e implantação

## Runtime

Desenvolvimento e CI usam Node 24.22.0 e npm 11.21.1. Vercel utiliza
a linha 24.x; o patch do runtime é controlado
pela plataforma. O comando de instalação versionado seleciona npm 11.21.1.

Node 26 estava disponível, mas não constava no suporte Vercel verificado.
npm 12 falhou na resolução limpa de dependência; TypeScript 7 não era
aceito pelo parser do lint. O conjunto adota TS 6 e ESLint 10 com plugins
compatíveis, sem forçar peers ou desativar regras.

## Variáveis

O template `.env.example` é a referência sem segredos. URL e chave pública
Supabase são necessárias. A chave de serviço é exclusivamente server-side,
para worker/webhook autorizados e validação de anexos/PDFs. Cada uso exige
sessão ou autenticação do canal e autorização prévia; não contorna a política
de negócio. Configure-a como Secret, sem prefixo NEXT_PUBLIC_.
CARE_RECIPIENT_ID não define mais o contexto operacional.

Auth exige Site URL e redirects aprovados, confirmação de e-mail, provedor
OAuth quando utilizado e serviço de e-mail operacional. Localmente, Mailpit
captura mensagens sem envio externo. WhatsApp exige configuração explícita;
ausência de credenciais não pode produzir estado de entrega externo.

## Atualização controlada

1. Revisar diff, matriz, relatório de segurança e resultados locais.
2. Confirmar a identidade do CLI, organização e ID do projeto remoto correto.
3. Comparar migrations, metadados e relacionamentos nos bancos local e remoto.
4. Resolver associações legadas desconhecidas sem inventar dados.
5. Verificar backup recuperável do ambiente autorizado, sem publicar dados pessoais.
6. Revisar migrations novas, ordem, locks, dados afetados e compatibilidade.
7. Aplicar primeiro localmente e validar instalação limpa e evolução legada.
8. Pré-validar a aplicação remota e aplicar somente a cadeia incremental pendente.
9. Verificar Auth, OAuth, convites, usuário global inicial e configurações externas.
10. Validar checks do PR, fazer merge quando apto e verificar o deploy resultante.

O deploy não alcança 127.0.0.1 da máquina de desenvolvimento. O preview
aprovado reutiliza o Supabase remoto existente. .vercelignore exclui dados e
credenciais locais, caches e artefatos de teste. Não desative a proteção Vercel
para testar: use a autenticação existente da CLI ou OIDC temporário da equipe.

Mantenha NOTIFICATIONS_EXTERNAL_ENABLED e META_FLOWS_ENABLED desligados até
homologar os provedores. Os resultados atuais e os links publicados ficam em
[EXECUTION.md](evolution/EXECUTION.md).

A autorização de 22/10/2026 para a evolução integral permite atualizar os bancos,
publicar preview parcial antecipadamente, fazer
commits e push em blocos lógicos e abrir PR e fazer merge se as verificações
confirmarem prontidão. Essa autorização substitui o limite anterior de somente
consulta. Não dispensa a confirmação do destino e da identidade administrativa.
Se a conta não tem acesso ao projeto, trocar silenciosamente o vínculo para
outro projeto não resolve o impedimento.

Use o perfil nomeado home-care-assistant, com identidade e projeto esperados
registrados na configuração local da máquina. O diagnóstico de 21/10
identificou uma conta padrão diferente da conta com acesso. Consulte
[Identidade Supabase CLI](audits/2026-10-21/SUPABASE_CLI.md) antes de renovar
o login; o acesso correto já foi confirmado por consulta de migrations.

```sh
npm run supabase:project -- doctor
npm run supabase:project -- db push --dry-run
```

Use o mesmo wrapper para a aplicação revisada. Ele recusa troca de identidade
ou destino. O login explícito é `npm run supabase:project -- login`.

O banco local home-care-assistant é o ambiente de desenvolvimento e testes.
Reset local requer a proteção descrita em [Testes](TESTING.md). Reset remoto,
carga de fixtures remotas e alteração de migrations aplicadas não fazem parte
da atualização. Falha de acesso remoto não invalida os testes locais, mas
impede declarar a integração remota concluída.

Não aplicar o código novo contra schema antigo como se estivesse homologado.
O provisionamento inicial de administrador global é uma operação privilegiada
separada: o usuário deve existir em Auth e o perfil deve ter papel admin,
status active e global_scope true. Não promover automaticamente metadata do
navegador nem executar bootstrap remoto a partir do CI.

Rollback de aplicação depende de compatibilidade do schema. Nunca apagar
dados ou reescrever migrations para desfazer a intervenção. Corrigir por
novas migrations e movimentos compensatórios quando pertinente.

O [estado verificável](PROJECT_STATUS.md) e a auditoria datada registram
as ações efetivamente concluídas. Autorização não é evidência de execução.

## Ativação gradual do BAL

A cadeia Fluent inclui escalas persistentes e BAL por plantão. Aplicar as
migrations não habilita nenhum paciente. Após backup, validação e deploy,
ative pela interface autenticada somente o paciente de homologação autorizado.
Confirme agenda, atribuição, elegibilidade e avisos no aplicativo antes de
habilitar outro paciente. Preserve os regimes existentes; não use fixtures
ou SQL de teste para ativar pacientes remotos. Pausar o regime conserva
obrigações, contagens, atrasos e eventos. Detalhes em
[BAL por plantão](ui-ux/BALANCES.md).
