# Mapa das telas

## Trabalho e documentos

- `/`: decisões gerenciais, tarefas pessoais ou supervisão por contexto.
- `/fichas`: central dos quatro tipos, conforme capacidades efetivas.
- `/fichas/req`: requisição sem quantidade solicitada, com sete etapas.
- `/fichas/com`: compra ou doação para entrada familiar.
- `/fichas/ent`: expedição entre custódias com destinatário explícito.
- `/fichas/bal`: contagem da equipe em duas etapas no regime por plantão;
  fluxo compatível nos pacientes sem ativação.
- `/documentos/[id]`: consulta comum, preservando adaptadores de negócio.
- `/historico/[id]` e `/fichas/[id]`: URLs compatíveis para a mesma consulta.
- `/historico`: busca, tipo, estado, período e página preservados na URL.
- `/entregas`: caixa de entregas próprias ou da equipe, paginada no servidor.

Somente IDs presentes no allowlist de demonstração dispensam autenticação.
Classificação documental, paciente e permissões vêm do servidor.

## Estoque e rotina

- `/estoque`: confirmado, trânsito, projeção, mínimo e histórico auditável.
- `/estoque?custody=FAMILY`: estoque familiar e movimentação autorizada.
- `/estoque?custody=CARE_TEAM`: saldo confirmado da equipe.
- `/estoque?custody=TRANSIT`: documentos e quantidades em trânsito.
- `/consumo`: ocorrências, revisão de sugestões e confirmação autorizada.
- `/notificacoes`: avisos pessoais e estados do aplicativo/provedor.
- `/mais`: ações secundárias da operação, sem ampliar competências.
- `/escalas`: agenda diária móvel, semana/mês no desktop e edição contextual.
- `/balancos`: obrigações semanais, atribuições, decisões e regularização.

## Administração e identidade

- `/admin`: áreas disponíveis por contexto e capacidade.
- `/admin?section=catalog`: catálogo, busca e edição lateral.
- `/admin?section=memberships`: pessoas, vínculos e revogação confirmada.
- `/admin?section=profiles`: identidades na atuação global.
- `/configuracoes?area=rules`: resumo e edição versionada da política.
- `/configuracoes?area=permissions`: matriz por função e exceção pessoal.
- `/configuracoes?area=notifications`: eventos, funções e canais disponíveis.
- `/configuracoes?area=people`: propostas e aprovação local distinta.
- `/unidades`: unidades base e apresentações de embalagem.
- `/perfil`: identidade, segurança, contatos e preferências sob demanda.
- `/login`, `/recuperar-senha`, `/convites/aceitar`: autenticação e ingresso.

A existência de uma rota ou de um botão não substitui autorização na API e no
banco. Consulte [Escalas](SCHEDULES.md) e [BAL por plantão](BALANCES.md).
