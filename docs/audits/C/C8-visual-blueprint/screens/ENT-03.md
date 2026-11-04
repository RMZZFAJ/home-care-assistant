# ENT-03 — Conferir entrega pessoalmente

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Recebedor designado e leitores autorizados. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /fichas/:id, atual a alterar. Gatilho: navegar pela tarefa ou
abrir o alvo contextual autorizado. Objetivo: Conferir tudo ou indicar
divergências; ver trânsito, aceites e responsável.

## Composição e sequência

Resumo origem/trânsito/destino; todas as linhas e quantidades; bloco exclusivo
do recebedor para declaração.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Somente recebedor; linhas não divergentes também aparecem no resumo de aceite
integral.

## Ações e efeito

Primária: **Confirmar meu recebimento**. Secundárias: Informar divergência;
Ver histórico; Resolver diferença quando autorizado.

Consequência: Credita somente aceito real uma vez. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-028-01 — Origem**. RADIO_OR_SELECT. Ordem 28.1; Sim, contexto de
  intenção visível. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: FAMILY e CARE_TEAM
  distintos; autorização em cada direção. Ajuda/exemplo: “Da família para a
  equipe.”. Erro: Revise origem: FAMILY e CARE_TEAM distintos; autorização em
  cada direção..

- **CTRL-028-02 — Destino**. RADIO_OR_SELECT. Ordem 28.2; Sim, contexto de
  intenção visível. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: FAMILY e CARE_TEAM
  distintos; autorização em cada direção. Ajuda/exemplo: “Da família para a
  equipe.”. Erro: Revise destino: FAMILY e CARE_TEAM distintos; autorização em
  cada direção..

- **CTRL-029-01 — Material**. SEARCHABLE_COMBOBOX. Ordem 29.1; Sim, vazio.
  Máscara/autocomplete: Busca nome/alias; ID selecionado; off.
  Dependência/validação: Positivo/exato; saldo disponível na origem;
  unidade/fator junto. Ajuda/exemplo: “3 unidades saem da família.”. Erro:
  Revise material: Positivo/exato; saldo disponível na origem; unidade/fator
  junto..

- **CTRL-029-02 — Quantidade expedida**. DECIMAL_TEXT_INPUT. Ordem 29.2; Sim,
  vazio. Máscara/autocomplete: Vírgula/ponto; string exata; unidade junto; sem
  arredondar; off. Dependência/validação: Positivo/exato; saldo disponível na
  origem; unidade/fator junto. Ajuda/exemplo: “3 unidades saem da família.”.
  Erro: Revise quantidade expedida: Positivo/exato; saldo disponível na
  origem; unidade/fator junto..

- **CTRL-030-01 — REQs atendidas**. SEARCHABLE_COMBOBOX. Ordem 30.1; Não,
  nenhuma. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por
  ID; nenhum ID digitado como autorização; off. Dependência/validação: Mesmo
  paciente/produto, justificativa se várias necessidades. Ajuda/exemplo:
  Vincular não duplica material ou crédito.. Erro: Revise reqs atendidas:
  Mesmo paciente/produto, justificativa se várias necessidades..

- **CTRL-034-01 — Conferência integral**. TEXT_INPUT. Ordem 34.1; Escolha
  explícita, nunca por silêncio. Máscara/autocomplete: Sem máscara artificial;
  preservar texto e limite do contrato; off. Dependência/validação: Resumo de
  todas as linhas e quantidades. Ajuda/exemplo: “Confirmo que recebi os
  materiais listados.”. Erro: Revise conferência integral: Resumo de todas as
  linhas e quantidades..

- **CTRL-038-01 — Resolução da diferença**. SEARCHABLE_COMBOBOX. Ordem 38.1;
  Sim ao conciliar. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Quantidade positiva até pendência; motivo 3–1000.
  Ajuda/exemplo: Cada opção tem movimento e significado próprios.. Erro:
  Revise resolução da diferença: Quantidade positiva até pendência; motivo
  3–1000..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ENT-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `ent`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-018, SC-039, SC-041, OVL-021.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-028, C-AC-042, C-AC-043,
C-AC-044, C-AC-048, C-AC-050, C-AC-074, C-AC-077, C-AC-079, C-AC-089,
C-AC-096, C-AC-101, C-AC-103, C-AC-105, C-NEW-AC-006, C-NEW-AC-007,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-016, C-NEW-AC-022, C-NEW-AC-028,
C7-AC-002, C7-AC-010. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ENT](../../C3-functional-specification/ENT.md).
