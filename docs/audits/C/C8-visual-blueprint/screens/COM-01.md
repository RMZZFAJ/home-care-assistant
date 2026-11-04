# COM-01 — Solicitar aquisição

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Família/admin com capacidade. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /fichas/com, atual a alterar. Gatilho: navegar pela tarefa ou
abrir o alvo contextual autorizado. Objetivo: Solicitar compra/doação;
selecionar materiais e quantidades previstas; salvar/emitir.

## Composição e sequência

Origem compra/doação no topo; busca, unidades/apresentação e previsto; revisão
antes de emitir.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Título acompanha origem; sem campos financeiros obrigatórios.

## Ações e efeito

Primária: **Revisar aquisição**. Secundárias: Salvar rascunho; Voltar.

Consequência: Previsão não credita estoque. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-014-01 — Origem**. RADIO_OR_SELECT. Ordem 14.1; Sim, escolha
  explícita. Máscara/autocomplete: Opções finitas com rótulo humano; sem opção
  material preaceita; off. Dependência/validação: `purchase`/`donation`;
  título correspondente. Ajuda/exemplo: “Compra ou doação?”, sem chamar toda
  COM de compra.. Erro: Revise origem: `purchase`/`donation`; título
  correspondente..

- **CTRL-015-01 — Material**. SEARCHABLE_COMBOBOX. Ordem 15.1; Ao menos um,
  vazio. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por
  ID; nenhum ID digitado como autorização; off. Dependência/validação: Único
  por linha, até 1000. Ajuda/exemplo: Seleção manual e alias; sem produto
  implícito pelo scan.. Erro: Revise material: Único por linha, até 1000..

- **CTRL-016-01 — Previsto**. DECIMAL_TEXT_INPUT. Ordem 16.1; Sim por linha,
  vazio. Máscara/autocomplete: Vírgula/ponto; inputmode decimal; precisão
  antes da coerção; zero só onde permitido; off. Dependência/validação:
  Positivo, até 1 bilhão, até seis casas e precisão da unidade. Ajuda/exemplo:
  “Quantidade que pretende adquirir: 10 unidades.”. Erro: Revise previsto:
  Positivo, até 1 bilhão, até seis casas e precisão da unidade..

- **CTRL-017-01 — Apresentação**. SEARCHABLE_COMBOBOX. Ordem 17.1; Não,
  unidade base. Máscara/autocomplete: Busca por nome/alias autorizado; seleção
  por ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Conversão finita/exata, snapshot do fator/código. Ajuda/exemplo: “2 pacotes
  de 10 = 20 unidades.”. Erro: Revise apresentação: Conversão finita/exata,
  snapshot do fator/código..

- **CTRL-024-01 — Observações**. TEXTAREA. Ordem 24.1; Não, vazio.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Até 2000 na ficha; até
  1000 na aquisição. Ajuda/exemplo: Comprovante financeiro não é obrigatório..
  Erro: Revise observações: Até 2000 na ficha; até 1000 na aquisição..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-COM-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `com/newPurchase`; ausência de exemplo no HTML é declarada, sem
novo mockup equivalente. B1: SC-010, OVL-019.

Critérios C9 relacionados: C-AC-015, C-AC-028, C-AC-035, C-AC-044, C-AC-058,
C-AC-074, C-AC-077, C-AC-089, C-AC-109, C-NEW-AC-005, C-NEW-AC-022. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional: [COM](../../C3-functional-specification/COM.md).
