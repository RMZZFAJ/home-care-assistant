# REQ-02 — Revisar requisição

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Autor da REQ. Banco/API revalidam capacidade, alvo e
versão; menu/ID/escala não concedem autorização.

Rota/superfície: Revisão do wizard, atual a alterar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Conferir paciente,
observações e ciência aplicável; Emitir requisição.

## Composição e sequência

Cabeçalho paciente/autor; cartões por item com observação/urgência; notas e
resumo de emissão.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não imprimir quantidade a comprar como campo de pedido; campos da revisão são
leitura e link Editar leva à etapa exata.

## Ações e efeito

Primária: **Emitir requisição**. Secundárias: Voltar e editar; Salvar
rascunho.

Consequência: Só emissão confirmada cria documento oficial; não compra.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-001-01 — Paciente**. READ_ONLY_DESCRIPTION. Ordem 1.1; Sim, contexto
  selecionado. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Revalidar vínculo na emissão. Ajuda/exemplo: “Você
  está solicitando para Residência Exemplo.”. Erro: Revise paciente: Revalidar
  vínculo na emissão..

- **CTRL-002-01 — Materiais**. SEARCHABLE_COMBOBOX. Ordem 2.1; Ao menos um
  material ou extra; vazio. Máscara/autocomplete: Busca por nome/alias
  autorizado; seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: IDs únicos, até 1000 linhas herdadas; alias busca.
  Ajuda/exemplo: “Escolha os materiais de que precisa.”. Erro: Revise
  materiais: IDs únicos, até 1000 linhas herdadas; alias busca..

- **CTRL-003-01 — Estoque observado**. DECIMAL_TEXT_INPUT. Ordem 3.1; Não,
  vazio. Máscara/autocomplete: Vírgula/ponto; inputmode decimal; precisão
  antes da coerção; zero só onde permitido; off. Dependência/validação:
  0–100000, precisão da unidade até seis casas; valor original exato.
  Ajuda/exemplo: “Quanto você contou agora? Ex.: 0 ou 1,5.”. Erro: Revise
  estoque observado: 0–100000, precisão da unidade até seis casas; valor
  original exato..

- **CTRL-004-01 — Não sei informar**. CHECKBOX_OR_SWITCH. Ordem 4.1; Não,
  desmarcado. Máscara/autocomplete: Sem máscara; rótulo descreve efeito; vazio
  não equivale a concordância; off. Dependência/validação: Exclusivo com valor
  observado; não altera ledger. Ajuda/exemplo: “Use quando não puder contar.”.
  Erro: Revise não sei informar: Exclusivo com valor observado; não altera
  ledger..

- **CTRL-005-01 — Urgente**. CHECKBOX_OR_SWITCH. Ordem 5.1; Sim como boolean,
  false. Máscara/autocomplete: Sem máscara; rótulo descreve efeito; vazio não
  equivale a concordância; off. Dependência/validação: Não inferir por saldo
  mínimo. Ajuda/exemplo: “Precisa de atenção mais rápida.”. Erro: Revise
  urgente: Não inferir por saldo mínimo..

- **CTRL-006-01 — Justificativa de repetição**. TEXTAREA. Ordem 6.1;
  Condicional se necessidade anterior pendente; vazio. Máscara/autocomplete:
  Sem máscara; contador e limite do contrato visíveis; quebra de linha/reflow;
  off. Dependência/validação: 3–1000 caracteres, preserva vínculo anterior.
  Ajuda/exemplo: “Ainda precisamos do material após atendimento parcial.”.
  Erro: Revise justificativa de repetição: 3–1000 caracteres, preserva vínculo
  anterior..

- **CTRL-007-01 — Item extra**. TEXT_INPUT. Ordem 7.1; Nome se extra
  adicionado; vazio. Máscara/autocomplete: Sem máscara artificial; preservar
  texto e limite do contrato; off. Dependência/validação: 1–200 caracteres,
  até 20 extras, identidade própria. Ajuda/exemplo: “Material não encontrado
  no catálogo.”. Erro: Revise item extra: 1–200 caracteres, até 20 extras,
  identidade própria..

- **CTRL-008-01 — Observação do extra**. TEXTAREA. Ordem 8.1; Conforme linha
  extra. Máscara/autocomplete: Sem máscara; contador e limite do contrato
  visíveis; quebra de linha/reflow; off. Dependência/validação: Zero
  explícito/unknown/unfilled distintos. Ajuda/exemplo: Não criar produto
  automaticamente.. Erro: Revise observação do extra: Zero
  explícito/unknown/unfilled distintos..

- **CTRL-009-01 — Observações gerais**. TEXTAREA. Ordem 9.1; Não, lista vazia.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Até 50 entradas de
  1–1000 caracteres. Ajuda/exemplo: “Embalagem encontrada aberta”, sem dado
  clínico desnecessário.. Erro: Revise observações gerais: Até 50 entradas de
  1–1000 caracteres..

- **CTRL-013-01 — Versão e intenção**. READ_ONLY_DESCRIPTION. Ordem 13.1; Sim
  na ação. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Conflito se conteúdo diverge ou versão muda.
  Ajuda/exemplo: Não pedir UUID ao usuário.. Erro: Revise versão e intenção:
  Conflito se conteúdo diverge ou versão muda..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-REQ-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `req/reqReview`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-009.

Critérios C9 relacionados: C-AC-025, C-AC-026, C-AC-036, C-AC-041, C-AC-049,
C-AC-073, C-AC-089, C-AC-105, C-NEW-AC-003, C-NEW-AC-004, C-NEW-AC-024,
C-NEW-AC-028, C7-AC-012. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[REQ](../../C3-functional-specification/REQ.md).
