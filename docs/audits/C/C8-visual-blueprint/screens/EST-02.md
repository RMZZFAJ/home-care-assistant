# EST-02 — Registrar movimento familiar

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Ator com capacidade de estoque. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Movimento familiar no estoque, atual a alterar. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Entrada,
retirada ou compensação referenciada; revisar e registrar.

## Composição e sequência

Drawer ação/material/quantidade/unidade; referência obrigatória em
compensação; resumo antes5→depois4.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Sem direção por sinal negativo; correção precisa fato original compatível.

## Ações e efeito

Primária: **Revisar movimento**. Secundárias: Voltar; Anexar evidência;
Consultar origem.

Consequência: Movimento motivado, nunca edição direta do saldo. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-071-01 — Material**. SEARCHABLE_COMBOBOX. Ordem 71.1; Sim ao
  movimentar. Máscara/autocomplete: Busca por nome/alias autorizado; seleção
  por ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Ativo para nova operação normal; inativo tem caminho específico.
  Ajuda/exemplo: Unidade e precisão visíveis.. Erro: Revise material: Ativo
  para nova operação normal; inativo tem caminho específico..

- **CTRL-072-01 — Ação**. RADIO_OR_SELECT. Ordem 72.1; Sim, escolha explícita.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Direção não inferida de sinal
  negativo. Ajuda/exemplo: “Retirar 1 unidade do estoque familiar.”. Erro:
  Revise ação: Direção não inferida de sinal negativo..

- **CTRL-073-01 — Quantidade**. DECIMAL_TEXT_INPUT. Ordem 73.1; Sim, vazio.
  Máscara/autocomplete: Vírgula/ponto; inputmode decimal; precisão antes da
  coerção; zero só onde permitido; off. Dependência/validação: Positiva,
  finita, até 1 bilhão, até 6 casas e precisão do produto antes de coerção.
  Ajuda/exemplo: 1,5 aceita apenas em unidade fracionável.. Erro: Revise
  quantidade: Positiva, finita, até 1 bilhão, até 6 casas e precisão do
  produto antes de coerção..

- **CTRL-074-01 — Movimento original**. SEARCHABLE_COMBOBOX. Ordem 74.1; Sim
  para correção. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Mesmo paciente/produto/custódia e fato compatível;
  obrigatório também API/RPC. Ajuda/exemplo: “Corrigir a entrada de 2 unidades
  registrada em…”. Erro: Revise movimento original: Mesmo
  paciente/produto/custódia e fato compatível; obrigatório também API/RPC..

- **CTRL-075-01 — Motivo**. TEXTAREA. Ordem 75.1; Sim. Máscara/autocomplete:
  Sem máscara; contador e limite do contrato visíveis; quebra de linha/reflow;
  off. Dependência/validação: 3–1000 caracteres. Ajuda/exemplo: “Entrada
  registrada em quantidade maior que a conferida.”. Erro: Revise motivo:
  3–1000 caracteres..

- **CTRL-076-01 — Antes/depois**. READ_ONLY_DESCRIPTION. Ordem 76.1; Sim no
  resumo. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Versão/ledger atual e direção/unidade. Ajuda/exemplo:
  “Família: 5 → 4 unidades.”. Erro: Revise antes/depois: Versão/ledger atual e
  direção/unidade..

- **CTRL-077-01 — Anexo**. TEXT_INPUT. Ordem 77.1; Opcional.
  Máscara/autocomplete: Sem máscara artificial; preservar texto e limite do
  contrato; off. Dependência/validação: Regra de anexos e recuperação por
  tentativa. Ajuda/exemplo: Não bloquear consulta do movimento já confirmado
  por falha de anexo.. Erro: Revise anexo: Regra de anexos e recuperação por
  tentativa..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-EST-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `stock`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-016, OVL-038, OVL-039.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-022, C-AC-045, C-AC-046,
C-AC-053, C-AC-066, C-AC-068, C-AC-072, C-AC-074, C-AC-120, C-NEW-AC-008,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-023, C-NEW-AC-025, C7-AC-010. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[STOCK_AND_CUSTODY](../../C3-functional-specification/STOCK_AND_CUSTODY.md).
