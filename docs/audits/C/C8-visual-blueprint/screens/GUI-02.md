# GUI-02 — Preparar nova residência

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Somente administrador global para criação. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Roteiro da primeira residência, novo processo. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Wizard de
preparação por etapas, com criação exclusiva ao administrador global;
configuração não é homologação.

## Composição e sequência

Wizard sete etapas:
paciente/admins/equipe/catálogo/saldos/escalas-BAL/comunicação-contingência;
checklist e revisão.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Atualização O01+ supera roteiro sem wizard; família só executa configuração
local legítima.

## Ações e efeito

Primária: **Continuar preparação**. Secundárias: Salvar e retomar; Revisar
etapa; Abrir tarefa local autorizada.

Consequência: Setup não é homologação ou autorização de produção. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-174-01 — Titular**. SEARCHABLE_COMBOBOX. Ordem 174.1; P05/P13, sem
  default fictício. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Deve existir antes do uso real. Ajuda/exemplo: Não
  “monitorar depois” sem responsável.. Erro: Revise titular: Deve existir
  antes do uso real..

- **CTRL-174-02 — Substituto**. SEARCHABLE_COMBOBOX. Ordem 174.2; P05/P13, sem
  default fictício. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Deve existir antes do uso real. Ajuda/exemplo: Não
  “monitorar depois” sem responsável.. Erro: Revise substituto: Deve existir
  antes do uso real..

- **CTRL-174-03 — Prazo de resposta**. TEXT_INPUT. Ordem 174.3; P05/P13, sem
  default fictício. Máscara/autocomplete: Sem máscara artificial; preservar
  texto e limite do contrato; off. Dependência/validação: Deve existir antes
  do uso real. Ajuda/exemplo: Não “monitorar depois” sem responsável.. Erro:
  Revise prazo de resposta: Deve existir antes do uso real..

- **CTRL-C7-004 — Mostrar guia no primeiro acesso**. CHECKBOX_OR_SWITCH. Ordem
  C7.4; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: Configuração por administração autorizada;
  usuário pode reabrir no perfil. Ajuda/exemplo: Escolha explícita no
  cadastro/vínculo; sem mudar permissões. Erro: Revise mostrar guia no
  primeiro acesso. Configuração por administração autorizada; usuário pode
  reabrir no perfil.

- **CTRL-C7-009 — Paciente e residência**. TEXT_INPUT. Ordem C7.9; Conforme
  etapa; leitura de servidor ou escolha explícita; sem confirmação material
  por default. Máscara/autocomplete: Conforme tipo; string decimal exata/data
  local com fuso; identificador opaco só leitura; off. Dependência/validação:
  Nome2–160 e estado escolhido respeitado; sem fixtures em operação.
  Ajuda/exemplo: Nova residência somente pelo global. Erro: Revise paciente e
  residência. Nome2–160 e estado escolhido respeitado; sem fixtures em
  operação.

- **CTRL-C7-010 — Fuso da residência**. SEARCHABLE_TIMEZONE. Ordem C7.10;
  Conforme etapa; leitura de servidor ou escolha explícita; sem confirmação
  material por default. Máscara/autocomplete: Conforme tipo; string decimal
  exata/data local com fuso; identificador opaco só leitura; off.
  Dependência/validação: Zona IANA escolhida; não herdar do aparelho.
  Ajuda/exemplo: America/Sao_Paulo. Erro: Revise fuso da residência. Zona IANA
  escolhida; não herdar do aparelho.

- **CTRL-C7-011 — Administrador familiar inicial**. EMAIL_INPUT. Ordem C7.11;
  Conforme etapa; leitura de servidor ou escolha explícita; sem confirmação
  material por default. Máscara/autocomplete: Conforme tipo; string decimal
  exata/data local com fuso; identificador opaco só leitura; email.
  Dependência/validação: E-mail confirmado explicitamente e vínculo inicial
  autorizado. Ajuda/exemplo: Global não recebe capacidade operacional por
  criar. Erro: Revise administrador familiar inicial. E-mail confirmado
  explicitamente e vínculo inicial autorizado.

- **CTRL-C7-012 — Equipe a vincular**. SEARCHABLE_COMBOBOX. Ordem C7.12;
  Conforme etapa; leitura de servidor ou escolha explícita; sem confirmação
  material por default. Máscara/autocomplete: Conforme tipo; string decimal
  exata/data local com fuso; identificador opaco só leitura; off.
  Dependência/validação: Pessoas/credenciais individuais e convites com aceite
  pessoal. Ajuda/exemplo: Sem contas compartilhadas. Erro: Revise equipe a
  vincular. Pessoas/credenciais individuais e convites com aceite pessoal.

- **CTRL-C7-013 — Materiais e apresentações**. MULTISELECT_SEARCH. Ordem
  C7.13; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: Adotar modelo explicitamente; unidades/fatores
  preservados. Ajuda/exemplo: Catálogo começa sem dados de outro paciente.
  Erro: Revise materiais e apresentações. Adotar modelo explicitamente;
  unidades/fatores preservados.

- **CTRL-C7-014 — Saldo físico inicial por custódia**. DECIMAL_TEXT_INPUT.
  Ordem C7.14; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: Origem/motivo/quantidade reais; movimento
  próprio de abertura. Ajuda/exemplo: Não criar contagens passadas fictícias.
  Erro: Revise saldo físico inicial por custódia. Origem/motivo/quantidade
  reais; movimento próprio de abertura.

- **CTRL-C7-015 — Escalas e regime BAL**. CONFIGURATION_SUMMARY. Ordem C7.15;
  Conforme etapa; leitura de servidor ou escolha explícita; sem confirmação
  material por default. Máscara/autocomplete: Conforme tipo; string decimal
  exata/data local com fuso; identificador opaco só leitura; off.
  Dependência/validação: Horários/fuso/recorrência, revisão facultativa no
  primeiro uso. Ajuda/exemplo: Preparação encaminha aos formulários
  autorizados. Erro: Revise escalas e regime bal. Horários/fuso/recorrência,
  revisão facultativa no primeiro uso.

- **CTRL-C7-016 — Comunicação e contingência**. CONFIGURATION_SUMMARY. Ordem
  C7.16; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: P02 por tipo ainda bloqueada,
  avisos/donos/canais reais e backup a contratar. Ajuda/exemplo: Configuração
  não é homologação. Erro: Revise comunicação e contingência. P02 por tipo
  ainda bloqueada, avisos/donos/canais reais e backup a contratar.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-GUI-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `setup`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-021.

Critérios C9 relacionados: C-AC-002, C-AC-003, C-AC-004, C-AC-006, C-AC-007,
C-AC-008, C-AC-040, C-AC-062, C-AC-063, C-AC-112, C-AC-114, C-AC-115,
C-AC-117, C-AC-118, C-AC-119, C-AC-120, C-AC-121, C-NEW-AC-026, C-NEW-AC-027,
C7-AC-002, C7-AC-006, C7-AC-007, C7-AC-008, C7-AC-009. A associação é por
domínio; cada caso preserva seu discriminante específico e não significa que
todos os critérios foram executados nesta tela. Fonte funcional:
[USER_GUIDES_AND_CONTINUITY](../../C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).
