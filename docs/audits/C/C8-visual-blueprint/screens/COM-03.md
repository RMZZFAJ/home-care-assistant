# COM-03 — Conferir parcela recebida

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Família/validador competente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Parcelas no detalhe, atual a alterar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Informar chegada;
validar ou rejeitar parcela identificável, com motivo.

## Composição e sequência

Lista de parcelas com ID legível, autor/hora e quantidades; detalhe e motivo
de rejeição.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não pedir nova validação de parcela já validada; nenhuma linha recebe o
restante como default.

## Ações e efeito

Primária: **Validar esta parcela**. Secundárias: Rejeitar com motivo; Informar
nova chegada.

Consequência: Crédito exato uma vez ao validar a parcela. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-020-01 — Recebido nesta parcela**. DECIMAL_TEXT_INPUT. Ordem 20.1;
  Sim ao informar chegada, vazio. Máscara/autocomplete: Vírgula/ponto;
  inputmode decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Quantidade física desta parcela, sem preencher o
  restante automaticamente. Ajuda/exemplo: “Chegaram 2 unidades agora.”. Erro:
  Revise recebido nesta parcela: Quantidade física desta parcela, sem
  preencher o restante automaticamente..

- **CTRL-021-01 — Parcela e autor**. READ_ONLY_DESCRIPTION. Ordem 21.1; Sim,
  somente leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: ID correlacionado ao evento, não escolhido pelo
  browser. Ajuda/exemplo: “Chegada informada por Maria às…”. Erro: Revise
  parcela e autor: ID correlacionado ao evento, não escolhido pelo browser..

- **CTRL-022-01 — Validado/rejeitado**. RADIO_OR_SELECT. Ordem 22.1; Sim ao
  decidir. Máscara/autocomplete: Opções finitas com rótulo humano; sem opção
  material preaceita; off. Dependência/validação: Boolean não nulo;
  capability/política aplicáveis. Ajuda/exemplo: Validar gera crédito;
  rejeitar não apaga a declaração.. Erro: Revise validado/rejeitado: Boolean
  não nulo; capability/política aplicáveis..

- **CTRL-023-01 — Motivo de rejeição**. TEXTAREA. Ordem 23.1; Sim na rejeição.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: 3–1000 caracteres.
  Ajuda/exemplo: “Quantidade declarada ainda não conferida.”. Erro: Revise
  motivo de rejeição: 3–1000 caracteres..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-COM-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `com`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-039, OVL-021.

Critérios C9 relacionados: C-AC-015, C-AC-028, C-AC-035, C-AC-044, C-AC-058,
C-AC-074, C-AC-077, C-AC-089, C-AC-109, C-NEW-AC-005, C-NEW-AC-022. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional: [COM](../../C3-functional-specification/COM.md).
