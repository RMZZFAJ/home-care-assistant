# GUI-03 — Regularizar contingência

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Família/admin e participantes legítimos. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Contingência física e conciliação, processo a homologar.
Gatilho: navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo:
Registrar fato fora do app e retornar com autoria, data e sem duplicação.

## Composição e sequência

Dossiê do fato físico, datas/origem/provas; comparação com registro já
existente; revisão proporcional.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

PDF final completo assinado e comunicação legítima proporcional inclusive
desligado quando cabível.

## Ações e efeito

Primária: **Revisar regularização**. Secundárias: Anexar registro físico;
Consultar origem; Voltar.

Consequência: Não duplica ledger nem atribui aceite a pessoa ausente. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-166-01 — Fato físico**. RADIO_OR_SELECT. Ordem 166.1; Sim em
  contingência. Máscara/autocomplete: Opções finitas com rótulo humano; sem
  opção material preaceita; off. Dependência/validação:
  REQ/COM/ENT/BAL/consumo não intercambiáveis. Ajuda/exemplo: “Recebimento
  parcial de entrega.”. Erro: Revise fato físico: REQ/COM/ENT/BAL/consumo não
  intercambiáveis..

- **CTRL-166-02 — Tipo de processo**. RADIO_OR_SELECT. Ordem 166.2; Sim em
  contingência. Máscara/autocomplete: Opções finitas com rótulo humano; sem
  opção material preaceita; off. Dependência/validação:
  REQ/COM/ENT/BAL/consumo não intercambiáveis. Ajuda/exemplo: “Recebimento
  parcial de entrega.”. Erro: Revise tipo de processo: REQ/COM/ENT/BAL/consumo
  não intercambiáveis..

- **CTRL-167-01 — Paciente**. TEXT_INPUT. Ordem 167.1; Sim quando conhecida.
  Máscara/autocomplete: Sem máscara artificial; preservar texto e limite do
  contrato; off. Dependência/validação: Desconhecido declarado; não criar UUID
  fictício. Ajuda/exemplo: Protocolo do papel/documento relacionado.. Erro:
  Revise paciente: Desconhecido declarado; não criar UUID fictício..

- **CTRL-167-02 — Referência conhecida**. TEXT_INPUT. Ordem 167.2; Sim quando
  conhecida. Máscara/autocomplete: Sem máscara artificial; preservar texto e
  limite do contrato; off. Dependência/validação: Desconhecido declarado; não
  criar UUID fictício. Ajuda/exemplo: Protocolo do papel/documento
  relacionado.. Erro: Revise referência conhecida: Desconhecido declarado; não
  criar UUID fictício..

- **CTRL-168-01 — Data do fato**. DATE_INPUT. Ordem 168.1; Conhecida ou
  desconhecido explícito. Máscara/autocomplete: DD/MM/AAAA na apresentação;
  ISO no transporte; não inferir fuso; off. Dependência/validação: Não
  substituir pela data de digitação. Ajuda/exemplo: Separar registro posterior
  de fato anterior.. Erro: Revise data do fato: Não substituir pela data de
  digitação..

- **CTRL-168-02 — Hora do fato**. TIME_INPUT. Ordem 168.2; Conhecida ou
  desconhecido explícito. Máscara/autocomplete: HH:mm com data de fim/+1dia
  quando aplicável; off. Dependência/validação: Não substituir pela data de
  digitação. Ajuda/exemplo: Separar registro posterior de fato anterior..
  Erro: Revise hora do fato: Não substituir pela data de digitação..

- **CTRL-168-03 — Fuso do fato**. SEARCHABLE_TIMEZONE. Ordem 168.3; Conhecida
  ou desconhecido explícito. Máscara/autocomplete: Zona IANA configurada,
  exemplo America/Sao_Paulo; off. Dependência/validação: Não substituir pela
  data de digitação. Ajuda/exemplo: Separar registro posterior de fato
  anterior.. Erro: Revise fuso do fato: Não substituir pela data de
  digitação..

- **CTRL-169-01 — Pessoa que realizou**. TEXT_INPUT. Ordem 169.1; Conforme
  fato. Máscara/autocomplete: Sem máscara artificial; preservar texto e limite
  do contrato; off. Dependência/validação: Não atribuir presença pelo
  escalado. Ajuda/exemplo: Assinatura física tem origem própria.. Erro: Revise
  pessoa que realizou: Não atribuir presença pelo escalado..

- **CTRL-169-02 — Pessoa que recebeu**. TEXT_INPUT. Ordem 169.2; Conforme
  fato. Máscara/autocomplete: Sem máscara artificial; preservar texto e limite
  do contrato; off. Dependência/validação: Não atribuir presença pelo
  escalado. Ajuda/exemplo: Assinatura física tem origem própria.. Erro: Revise
  pessoa que recebeu: Não atribuir presença pelo escalado..

- **CTRL-170-01 — Material**. SEARCHABLE_COMBOBOX. Ordem 170.1; Quando
  movimento/conferência. Máscara/autocomplete: Busca por nome/alias
  autorizado; seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Distinguir zero, desconhecido, expedição e aceite.
  Ajuda/exemplo: Não somar previsão ao saldo real.. Erro: Revise material:
  Distinguir zero, desconhecido, expedição e aceite..

- **CTRL-170-02 — Unidade**. TEXT_INPUT. Ordem 170.2; Quando
  movimento/conferência. Máscara/autocomplete: Sem máscara artificial;
  preservar texto e limite do contrato; off. Dependência/validação: Distinguir
  zero, desconhecido, expedição e aceite. Ajuda/exemplo: Não somar previsão ao
  saldo real.. Erro: Revise unidade: Distinguir zero, desconhecido, expedição
  e aceite..

- **CTRL-170-03 — Quantidade física**. DECIMAL_TEXT_INPUT. Ordem 170.3; Quando
  movimento/conferência. Máscara/autocomplete: Vírgula/ponto; inputmode
  decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Distinguir zero, desconhecido, expedição e aceite.
  Ajuda/exemplo: Não somar previsão ao saldo real.. Erro: Revise quantidade
  física: Distinguir zero, desconhecido, expedição e aceite..

- **CTRL-170-04 — Custódia**. TEXT_INPUT. Ordem 170.4; Quando
  movimento/conferência. Máscara/autocomplete: Sem máscara artificial;
  preservar texto e limite do contrato; off. Dependência/validação: Distinguir
  zero, desconhecido, expedição e aceite. Ajuda/exemplo: Não somar previsão ao
  saldo real.. Erro: Revise custódia: Distinguir zero, desconhecido, expedição
  e aceite..

- **CTRL-171-01 — Ressalva**. TEXTAREA. Ordem 171.1; Quando relevante.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Preservar
  original/derivado e privacidade. Ajuda/exemplo: A foto não prova sozinha que
  o fato ocorreu.. Erro: Revise ressalva: Preservar original/derivado e
  privacidade..

- **CTRL-171-02 — Evidência física**. FILE_PICKER. Ordem 171.2; Quando
  relevante. Máscara/autocomplete: MIME/bytes/limite do transporte; não
  extensão apenas; off. Dependência/validação: Preservar original/derivado e
  privacidade. Ajuda/exemplo: A foto não prova sozinha que o fato ocorreu..
  Erro: Revise evidência física: Preservar original/derivado e privacidade..

- **CTRL-172-01 — Conciliador**. SEARCHABLE_COMBOBOX. Ordem 172.1; Ao retornar
  ao app. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por
  ID; nenhum ID digitado como autorização; off. Dependência/validação: Dupla
  conferência conforme P05; chave do fato físico. Ajuda/exemplo: Conciliador
  não se passa pelo recebedor.. Erro: Revise conciliador: Dupla conferência
  conforme P05; chave do fato físico..

- **CTRL-172-02 — Decisão**. RADIO_OR_SELECT. Ordem 172.2; Ao retornar ao app.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Dupla conferência conforme P05; chave
  do fato físico. Ajuda/exemplo: Conciliador não se passa pelo recebedor..
  Erro: Revise decisão: Dupla conferência conforme P05; chave do fato físico..

- **CTRL-C7-017 — Motivo e base da regularização**. TEXTAREA. Ordem C7.17;
  Conforme etapa; leitura de servidor ou escolha explícita; sem confirmação
  material por default. Máscara/autocomplete: Conforme tipo; string decimal
  exata/data local com fuso; identificador opaco só leitura; off.
  Dependência/validação: Fato, motivo excepcional, autoridade, medidas,
  ressalvas e evidências. Ajuda/exemplo: Sem inventar declaração pessoal.
  Erro: Revise motivo e base da regularização. Fato, motivo excepcional,
  autoridade, medidas, ressalvas e evidências.

- **CTRL-C7-018 — Comunicar envolvidos com segurança**. CHECKLIST. Ordem
  C7.18; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: Pessoa/canal/base legítima; proporcional,
  inclusive desligado quando cabível. Ajuda/exemplo: Tentativa não comprova
  leitura/recebimento. Erro: Revise comunicar envolvidos com segurança.
  Pessoa/canal/base legítima; proporcional, inclusive desligado quando
  cabível.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-GUI-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-029.

Critérios C9 relacionados: C-AC-002, C-AC-003, C-AC-004, C-AC-006, C-AC-007,
C-AC-008, C-AC-040, C-AC-062, C-AC-063, C-AC-112, C-AC-114, C-AC-115,
C-AC-117, C-AC-118, C-AC-119, C-AC-120, C-AC-121, C-NEW-AC-026, C-NEW-AC-027,
C7-AC-002, C7-AC-006, C7-AC-007, C7-AC-008, C7-AC-009. A associação é por
domínio; cada caso preserva seu discriminante específico e não significa que
todos os critérios foram executados nesta tela. Fonte funcional:
[USER_GUIDES_AND_CONTINUITY](../../C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).
