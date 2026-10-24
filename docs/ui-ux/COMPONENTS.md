# Componentes e responsabilidade

## Contexto e navegação

- ThemeProvider: tema Fluent e registro Griffel no SSR/streaming.
- WorkspaceProvider: contexto confirmado pela API, troca explícita de vínculo
  e descarte de respostas antigas.
- WorkspaceShell: cabeçalho, perfil, navegação lateral e navegação operacional.
- AdministrationNavigation: áreas administrativas disponíveis por capacidade;
  atuação global apresenta somente as operações administrativas suportadas.

## Listas e edição

- CatalogueManagement: busca, situação, paginação e edição de produtos.
- MembershipManagement: busca, edição de vínculo e confirmação de revogação.
- GlobalAccounts: identidades globais, edição e revisão antes da aplicação.
- RecordDrawer: edição contextual, preservação de valores, confirmação de
  descarte, bloqueio durante envio e retorno de foco ao acionador.
- SettingsSection: edição de perfil sob demanda, mantendo os campos montados.
- PolicyRules: resumo por grupo e snapshot da política durante a edição.
- PermissionMatrix: capacidades por função/pessoa, herança e confirmação crítica.
- NotificationMatrix: canais por evento/função e opções contextuais; reconcilia
  com o servidor depois de sucesso, conflito ou falha.

As matrizes mantêm rolagem dentro da própria tabela. A página não precisa rolar
horizontalmente para alcançar filtros, abas ou ações.

## Operação

- Dashboard gerencial: decisões, recebimentos, ciência, arquivamento e saldos.
- Dashboard operacional: tarefas pessoais ou acompanhamento da equipe.
- DeliveryInbox: destinatário e estado, consulta paginada autorizada pela API.
- StepNavigator: etapas, retorno e rolagem da etapa ativa.
- StatusBadge: estado com texto e cor semântica.
- Dialog: confirmação acessível das operações definitivas.

As regras de autorização e persistência permanecem na API e nas RPCs. Os
componentes não calculam competências a partir da identidade global nem
transformam projeções em saldos oficiais.
