# ADM-02 — Administrar recursos autorizados

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Admin local ou global no contexto explícito. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /admin seções atuais. Gatilho: navegar pela tarefa ou abrir o
alvo contextual autorizado. Objetivo: Pacientes, vínculos, catálogo, convites,
auditoria e fila técnica conforme capacidades.

## Composição e sequência

Navegação por tarefas e lista/drawer por seção; identidade local/global sempre
visível.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não expor todas as seções por apenas esconder botão; autorização no servidor.

## Ações e efeito

Primária: **Abrir seção autorizada**. Secundárias: Buscar; Convidar; Abrir
preparação se global.

Consequência: Cada ação respeita escopo real; isActive=false não é ignorado.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-153-01 — Paciente**. READ_ONLY_DESCRIPTION. Ordem 153.1; Sim.
  Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Global e local explícitos. Ajuda/exemplo: Nenhuma
  seleção no browser concede acesso.. Erro: Revise paciente: Global e local
  explícitos..

- **CTRL-153-02 — Modo de atuação**. READ_ONLY_DESCRIPTION. Ordem 153.2; Sim.
  Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Global e local explícitos. Ajuda/exemplo: Nenhuma
  seleção no browser concede acesso.. Erro: Revise modo de atuação: Global e
  local explícitos..

- **CTRL-154-01 — Nome do paciente**. RADIO_OR_SELECT. Ordem 154.1; Sim ao
  cadastrar. Máscara/autocomplete: Opções finitas com rótulo humano; sem opção
  material preaceita; off. Dependência/validação: Nome com 2–160 caracteres;
  isActive=false deve ser respeitado; isDevelopment identificado.
  Ajuda/exemplo: Ambiente fictício não vira operação por renomear paciente..
  Erro: Revise nome do paciente: Nome com 2–160 caracteres; isActive=false
  deve ser respeitado; isDevelopment identificado..

- **CTRL-154-02 — Estado ativo**. CHECKBOX_OR_SWITCH. Ordem 154.2; Sim ao
  cadastrar. Máscara/autocomplete: Sem máscara; rótulo descreve efeito; vazio
  não equivale a concordância; off. Dependência/validação: Nome com 2–160
  caracteres; isActive=false deve ser respeitado; isDevelopment identificado.
  Ajuda/exemplo: Ambiente fictício não vira operação por renomear paciente..
  Erro: Revise estado ativo: Nome com 2–160 caracteres; isActive=false deve
  ser respeitado; isDevelopment identificado..

- **CTRL-155-01 — Administrador inicial**. EMAIL_INPUT. Ordem 155.1; Sim na
  criação com primeiro vínculo. Máscara/autocomplete: Formato e-mail; sem
  autocapitalização; email. Dependência/validação: Autoridade de criação
  global não substitui vínculo operacional. Ajuda/exemplo: “Quem administrará
  esta residência?”. Erro: Revise administrador inicial: Autoridade de criação
  global não substitui vínculo operacional..

- **CTRL-156-01 — Seção**. RADIO_OR_SELECT. Ordem 156.1; Não, estado de
  consulta explícito. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Termo/cursor por
  paciente e seção. Ajuda/exemplo: Rótulo “Catálogo do paciente” difere de
  “Unidades”.. Erro: Revise seção: Termo/cursor por paciente e seção..

- **CTRL-156-02 — Buscar**. RADIO_OR_SELECT. Ordem 156.2; Não, estado de
  consulta explícito. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Termo/cursor por
  paciente e seção. Ajuda/exemplo: Rótulo “Catálogo do paciente” difere de
  “Unidades”.. Erro: Revise buscar: Termo/cursor por paciente e seção..

- **CTRL-157-01 — Estado**. RADIO_OR_SELECT. Ordem 157.1; Defaults declarados.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Início/fim válidos; paginação estável
  por data+ID. Ajuda/exemplo: “Pendentes sob minha responsabilidade.”. Erro:
  Revise estado: Início/fim válidos; paginação estável por data+ID..

- **CTRL-157-02 — Tipo**. RADIO_OR_SELECT. Ordem 157.2; Defaults declarados.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Início/fim válidos; paginação estável
  por data+ID. Ajuda/exemplo: “Pendentes sob minha responsabilidade.”. Erro:
  Revise tipo: Início/fim válidos; paginação estável por data+ID..

- **CTRL-157-03 — Data inicial**. DATE_INPUT. Ordem 157.3; Defaults
  declarados. Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no
  transporte; não inferir fuso; off. Dependência/validação: Início/fim
  válidos; paginação estável por data+ID. Ajuda/exemplo: “Pendentes sob minha
  responsabilidade.”. Erro: Revise data inicial: Início/fim válidos; paginação
  estável por data+ID..

- **CTRL-157-04 — Data final**. DATE_INPUT. Ordem 157.4; Defaults declarados.
  Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no transporte; não
  inferir fuso; off. Dependência/validação: Início/fim válidos; paginação
  estável por data+ID. Ajuda/exemplo: “Pendentes sob minha responsabilidade.”.
  Erro: Revise data final: Início/fim válidos; paginação estável por data+ID..

- **CTRL-157-05 — Responsável**. SEARCHABLE_COMBOBOX. Ordem 157.5; Defaults
  declarados. Máscara/autocomplete: Busca por nome/alias autorizado; seleção
  por ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Início/fim válidos; paginação estável por data+ID. Ajuda/exemplo: “Pendentes
  sob minha responsabilidade.”. Erro: Revise responsável: Início/fim válidos;
  paginação estável por data+ID..

- **CTRL-158-01 — Referência direta**. READ_ONLY_DESCRIPTION. Ordem 158.1; Se
  abrir link de tarefa. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: GET por ID independente da janela recente.
  Ajuda/exemplo: Acesso negado não enumera outro paciente.. Erro: Revise
  referência direta: GET por ID independente da janela recente..

- **CTRL-159-01 — Página**. READ_ONLY_DESCRIPTION. Ordem 159.1; Somente
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Indicar total conhecido ou existência de próxima
  página. Ajuda/exemplo: Não rotular 100 recentes como todos.. Erro: Revise
  página: Indicar total conhecido ou existência de próxima página..

- **CTRL-159-02 — Cursor**. READ_ONLY_DESCRIPTION. Ordem 159.2; Somente
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Indicar total conhecido ou existência de próxima
  página. Ajuda/exemplo: Não rotular 100 recentes como todos.. Erro: Revise
  cursor: Indicar total conhecido ou existência de próxima página..

- **CTRL-159-03 — Total consultado**. READ_ONLY_DESCRIPTION. Ordem 159.3;
  Somente leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Indicar total conhecido ou existência de próxima
  página. Ajuda/exemplo: Não rotular 100 recentes como todos.. Erro: Revise
  total consultado: Indicar total conhecido ou existência de próxima página..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ADM-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `staff/setup`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-020, SC-021, SC-030, OVL-001, OVL-003.

Critérios C9 relacionados: C-AC-005, C-AC-011, C-AC-013, C-AC-014, C-AC-016,
C-AC-018, C-AC-019, C-AC-020, C-AC-024, C-AC-026, C-AC-033, C-AC-037,
C-AC-038, C-AC-059, C-AC-060, C-AC-061, C-AC-071, C-AC-075, C-AC-078,
C-AC-079, C-AC-085, C-AC-095, C-AC-099, C-AC-121, C-NEW-AC-015, C-NEW-AC-016,
C7-AC-005, C7-AC-006. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ADMINISTRATIVE_OPERATIONS](../../C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).
