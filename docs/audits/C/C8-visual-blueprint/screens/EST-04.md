# EST-04 — Transferir ou devolver material

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Iniciador e contraparte/recebedor competentes. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Transferência simples, novo painel. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Selecionar
origem/destino e pessoa; processo condicional P07 vinculado à ENT.

## Composição e sequência

Diálogo origem/destino, material/q, motivo e referência opcional; pessoas e
consequências antes de solicitar.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

UI antiga só sai após equivalência; corrigir número sem movimento físico segue
processo próprio.

## Ações e efeito

Primária: **Solicitar transferência**. Secundárias: Voltar; Ver saldo da
origem.

Consequência: Solicitação não simula recebimento; usa ENT/custódia. Mostrar
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

- **CTRL-073-01 — Quantidade**. DECIMAL_TEXT_INPUT. Ordem 73.1; Sim, vazio.
  Máscara/autocomplete: Vírgula/ponto; inputmode decimal; precisão antes da
  coerção; zero só onde permitido; off. Dependência/validação: Positiva,
  finita, até 1 bilhão, até 6 casas e precisão do produto antes de coerção.
  Ajuda/exemplo: 1,5 aceita apenas em unidade fracionável.. Erro: Revise
  quantidade: Positiva, finita, até 1 bilhão, até 6 casas e precisão do
  produto antes de coerção..

- **CTRL-075-01 — Motivo**. TEXTAREA. Ordem 75.1; Sim. Máscara/autocomplete:
  Sem máscara; contador e limite do contrato visíveis; quebra de linha/reflow;
  off. Dependência/validação: 3–1000 caracteres. Ajuda/exemplo: “Entrada
  registrada em quantidade maior que a conferida.”. Erro: Revise motivo:
  3–1000 caracteres..

- **CTRL-078-01 — Origem**. SEARCHABLE_COMBOBOX. Ordem 78.1; Sim no novo
  painel. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por
  ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Autorização, saldo e P07. Ajuda/exemplo: Sem edição direta das duas colunas
  de saldo.. Erro: Revise origem: Autorização, saldo e P07..

- **CTRL-078-02 — Destino**. SEARCHABLE_COMBOBOX. Ordem 78.2; Sim no novo
  painel. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por
  ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Autorização, saldo e P07. Ajuda/exemplo: Sem edição direta das duas colunas
  de saldo.. Erro: Revise destino: Autorização, saldo e P07..

- **CTRL-079-01 — Contraparte**. SEARCHABLE_COMBOBOX. Ordem 79.1; Sim conforme
  P07. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por ID;
  nenhum ID digitado como autorização; off. Dependência/validação:
  Contrassinatura distinta de aceite físico se pessoas diferentes.
  Ajuda/exemplo: Identificar quem declara, valida e recebe.. Erro: Revise
  contraparte: Contrassinatura distinta de aceite físico se pessoas
  diferentes..

- **CTRL-079-02 — Recebedor físico**. SEARCHABLE_COMBOBOX. Ordem 79.2; Sim
  conforme P07. Máscara/autocomplete: Busca por nome/alias autorizado; seleção
  por ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Contrassinatura distinta de aceite físico se pessoas diferentes.
  Ajuda/exemplo: Identificar quem declara, valida e recebe.. Erro: Revise
  recebedor físico: Contrassinatura distinta de aceite físico se pessoas
  diferentes..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-EST-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `stock/transfer`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-016.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-022, C-AC-045, C-AC-046,
C-AC-053, C-AC-066, C-AC-068, C-AC-072, C-AC-074, C-AC-120, C-NEW-AC-008,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-023, C-NEW-AC-025, C7-AC-010. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[STOCK_AND_CUSTODY](../../C3-functional-specification/STOCK_AND_CUSTODY.md).
