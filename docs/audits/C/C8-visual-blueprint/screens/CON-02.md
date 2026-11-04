# CON-02 — Registrar informação operacional

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Relator competente. Banco/API revalidam capacidade, alvo e
versão; menu/ID/escala não concedem autorização.

Rota/superfície: Novo relato, atual a preservar/ampliar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Informar falta ou
consumo em texto, opcionalmente estruturado.

## Composição e sequência

Drawer tipo falta/consumo, custódia e texto; linhas estruturadas opcionais no
relato.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Feedback diz sem desconto e próxima pessoa; texto não interpretado
automaticamente.

## Ações e efeito

Primária: **Registrar relato**. Secundárias: Salvar rascunho; Voltar.

Consequência: Nenhum débito antes de confirmação competente. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-095-01 — Tipo**. RADIO_OR_SELECT. Ordem 95.1; Sim, escolha explícita.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Falta nunca gera débito de consumo.
  Ajuda/exemplo: “Quero registrar uma informação para conferência.”. Erro:
  Revise tipo: Falta nunca gera débito de consumo..

- **CTRL-096-01 — Custódia**. SEARCHABLE_COMBOBOX. Ordem 96.1; Sim.
  Máscara/autocomplete: Busca por nome/alias autorizado; seleção por ID;
  nenhum ID digitado como autorização; off. Dependência/validação: Não permite
  consultar saldo familiar geral à equipe. Ajuda/exemplo: “Onde ocorreu?”.
  Erro: Revise custódia: Não permite consultar saldo familiar geral à equipe..

- **CTRL-097-01 — Relato original**. TEXTAREA. Ordem 97.1; Sim, vazio.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: 3–2000 caracteres.
  Ajuda/exemplo: “Foi usada uma unidade do material X.”. Erro: Revise relato
  original: 3–2000 caracteres..

- **CTRL-098-01 — Material**. SEARCHABLE_COMBOBOX. Ordem 98.1; Obrigatório
  para confirmar consumo. Máscara/autocomplete: Busca por nome/alias
  autorizado; seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Mesmo paciente, elegibilidade e unidade.
  Ajuda/exemplo: Não interpretar nome livre como correspondência certa.. Erro:
  Revise material: Mesmo paciente, elegibilidade e unidade..

- **CTRL-099-01 — Quantidade**. DECIMAL_TEXT_INPUT. Ordem 99.1; Obrigatória em
  linha estruturada de consumo. Máscara/autocomplete: Vírgula/ponto; inputmode
  decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Positiva/exata, precisão vigente antes de coerção.
  Ajuda/exemplo: “1 unidade.”. Erro: Revise quantidade: Positiva/exata,
  precisão vigente antes de coerção..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CON-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-019, OVL-035.

Critérios C9 relacionados: C-AC-020, C-AC-035, C-AC-047, C-AC-050, C-AC-055,
C-AC-059, C-AC-065, C-AC-089, C-AC-091, C-AC-095, C-AC-096, C-NEW-AC-010,
C-NEW-AC-016. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional:
[CONSUMPTION_AND_OCCURRENCES](../../C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).
